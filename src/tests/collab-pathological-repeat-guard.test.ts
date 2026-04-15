import * as Y from 'yjs';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function createFragmentDoc(text: string): Y.Doc {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment('prosemirror');
  const paragraph = new Y.XmlElement('paragraph');
  const xmlText = new Y.XmlText();
  xmlText.insert(0, text);
  paragraph.insert(0, [xmlText]);
  fragment.insert(0, [paragraph]);
  return doc;
}

async function run(): Promise<void> {
  const {
    detectPathologicalProjectionRepeat,
    evaluateProjectionSafety,
    registerProjectionPathologyCooldown,
  } = await import('../../server/collab.ts');

  const base = '# Heading\n\nParagraph with enough content to exceed the minimum base length threshold. '.repeat(8);
  const repeated3 = base.repeat(3);
  const repeated2 = base.repeat(2);
  const slightlyDifferent = `${base}${base.slice(0, base.length - 3)}xyz`;

  assert(detectPathologicalProjectionRepeat(base, repeated3) === 3, 'Expected repeat=3 to be detected');
  assert(detectPathologicalProjectionRepeat(base, repeated2) === 0, 'Expected repeat=2 to be ignored');
  assert(detectPathologicalProjectionRepeat(base, base) === 0, 'Expected identical markdown to be ignored');
  assert(detectPathologicalProjectionRepeat(base, slightlyDifferent) === 0, 'Expected non-exact repetition to be ignored');

  const shortBase = 'short text';
  assert(detectPathologicalProjectionRepeat(shortBase, shortBase.repeat(10)) === 0, 'Expected short baseline to be ignored');

  const fragmentDoc = createFragmentDoc('alpha beta gamma');
  const maxCharsCandidate = 'x'.repeat(1_500_001);
  const maxCharsSafety = evaluateProjectionSafety(base, maxCharsCandidate, fragmentDoc);
  assert(maxCharsSafety.safe === false, 'Expected max chars guard to block oversized projection');
  assert(maxCharsSafety.reason === 'max_chars_exceeded', `Expected max chars reason, got ${String(maxCharsSafety.reason)}`);

  // Growth guard still fires when explicitly tightened via env (defaults allow more headroom
  // for real paste/overwrite flows; see the bypass/overwrite assertions below).
  const prevMultiplier = process.env.COLLAB_PROJECTION_GUARD_MAX_GROWTH_MULTIPLIER;
  const prevBypass = process.env.COLLAB_PROJECTION_GUARD_SMALL_BASELINE_BYPASS_ENABLED;
  process.env.COLLAB_PROJECTION_GUARD_MAX_GROWTH_MULTIPLIER = '8';
  process.env.COLLAB_PROJECTION_GUARD_SMALL_BASELINE_BYPASS_ENABLED = 'false';
  try {
    // Non-repeating candidate of ~7k chars so canonicalReplay / pathological_repeat detectors stay silent
    // and the growth_multiplier check is the one that fires.
    let uniqueGrowthCandidate = '';
    let idx = 0;
    while (uniqueGrowthCandidate.length < 7000) {
      uniqueGrowthCandidate += `唯一片段-${idx}-${idx * 37 + 11}\n`;
      idx += 1;
    }
    const growthSafety = evaluateProjectionSafety(base, uniqueGrowthCandidate, fragmentDoc);
    assert(growthSafety.safe === false, 'Expected growth multiplier guard to block explosive projection');
    assert(growthSafety.reason === 'growth_multiplier_exceeded', `Expected growth reason, got ${String(growthSafety.reason)}`);
  } finally {
    if (prevMultiplier === undefined) delete process.env.COLLAB_PROJECTION_GUARD_MAX_GROWTH_MULTIPLIER;
    else process.env.COLLAB_PROJECTION_GUARD_MAX_GROWTH_MULTIPLIER = prevMultiplier;
    if (prevBypass === undefined) delete process.env.COLLAB_PROJECTION_GUARD_SMALL_BASELINE_BYPASS_ENABLED;
    else process.env.COLLAB_PROJECTION_GUARD_SMALL_BASELINE_BYPASS_ENABLED = prevBypass;
  }

  // Regression: slug 8t82okgt — baseline ≈ 2 chars (empty new doc), user pastes 16k content,
  // must pass under default guards (small-baseline bypass).
  {
    let pasted = '';
    for (let i = 0; i < 300; i++) {
      pasted += `段落 ${i}：独一无二的内容片段编号 ${i * 37 + 11}。\n\n`;
    }
    const emptyBase = '\n\n';
    const fragment = createFragmentDoc(pasted);
    const safety = evaluateProjectionSafety(emptyBase, pasted, fragment);
    assert(
      safety.safe === true,
      `Expected 16k paste into fresh doc to pass default guards, got reason=${String(safety.reason)}`,
    );
    fragment.destroy();
  }

  // Regression: 500k transcript pasted into fresh doc must pass (top of user's batch-paste range).
  {
    let longContent = '';
    for (let i = 0; i < 16000; i++) {
      longContent += `独一内容 ${i}：字符串唯一编号 ${i * 13 + 5}。\n`;
    }
    assert(longContent.length >= 300_000, `Expected long content to be large enough, got ${longContent.length}`);
    assert(longContent.length <= 500_000, `Expected long content within bypass limit, got ${longContent.length}`);
    const emptyBase = '';
    const fragment = createFragmentDoc(longContent);
    const safety = evaluateProjectionSafety(emptyBase, longContent, fragment);
    assert(
      safety.safe === true,
      `Expected 300k-500k paste into empty doc to pass default guards, got reason=${String(safety.reason)}`,
    );
    fragment.destroy();
  }

  // Regression: existing 5k doc fully replaced by 80k content (ctrl+A → paste).
  // Growth = 16x, above old 8x default, below new 50x default.
  {
    let existing = '';
    for (let i = 0; i < 400; i++) {
      existing += `原有内容 ${i}：编号 ${i * 7}。\n`;
    }
    assert(existing.length >= 5000, `Expected baseline ≥5k, got ${existing.length}`);
    let replacement = '';
    for (let i = 0; i < 4000; i++) {
      replacement += `替换内容 ${i}：唯一 ${i * 23 + 3}。\n`;
    }
    assert(replacement.length >= 70_000, `Expected replacement ≥70k, got ${replacement.length}`);
    const fragment = createFragmentDoc(replacement);
    const safety = evaluateProjectionSafety(existing, replacement, fragment);
    assert(
      safety.safe === true,
      `Expected 16x overwrite on 5k doc to pass default guards, got reason=${String(safety.reason)}`,
    );
    fragment.destroy();
  }

  const repeatSafety = evaluateProjectionSafety(base, repeated3, fragmentDoc);
  assert(repeatSafety.safe === false, 'Expected pathological repeat guard to block repeated projection');
  assert(repeatSafety.reason === 'pathological_repeat', `Expected pathological repeat reason, got ${String(repeatSafety.reason)}`);

  const driftCandidate = 'lorem ipsum dolor sit amet consectetur adipiscing elit '.repeat(80);
  const driftBaseline = 'baseline filler '.repeat(600);
  const driftSafety = evaluateProjectionSafety(driftBaseline, driftCandidate, fragmentDoc);
  assert(driftSafety.safe === false, 'Expected fragment-markdown drift guard to block diverged projection');
  assert(driftSafety.reason === 'fragment_markdown_drift', `Expected fragment drift reason, got ${String(driftSafety.reason)}`);

  const safeCandidate = 'alpha beta gamma';
  const safeSafety = evaluateProjectionSafety('alpha beta gamma', safeCandidate, fragmentDoc);
  assert(safeSafety.safe === true, `Expected matching fragment/markdown to be safe, got ${String(safeSafety.reason)}`);

  const cooldownState = new Map<string, {
    fingerprint: string;
    reason: string;
    untilMs: number;
    suppressedCount: number;
  }>();
  const firstCooldown = registerProjectionPathologyCooldown(
    cooldownState,
    'slug-a',
    'pathological_repeat',
    'pathological_repeat:repeat3',
    10_000,
    60_000,
  );
  assert(firstCooldown.suppressed === false, 'Expected first pathology registration not to be suppressed');
  const secondCooldown = registerProjectionPathologyCooldown(
    cooldownState,
    'slug-a',
    'pathological_repeat',
    'pathological_repeat:repeat3',
    10_100,
    60_000,
  );
  assert(secondCooldown.suppressed === true, 'Expected repeated pathology fingerprint to be suppressed within cooldown');
  assert(secondCooldown.suppressedCount === 1, `Expected suppressed count=1, got ${secondCooldown.suppressedCount}`);
  const changedFingerprint = registerProjectionPathologyCooldown(
    cooldownState,
    'slug-a',
    'pathological_repeat',
    'pathological_repeat:repeat4',
    10_200,
    60_000,
  );
  assert(changedFingerprint.suppressed === false, 'Expected changed pathology fingerprint not to be suppressed');
  const afterCooldown = registerProjectionPathologyCooldown(
    cooldownState,
    'slug-a',
    'pathological_repeat',
    'pathological_repeat:repeat4',
    80_500,
    60_000,
  );
  assert(afterCooldown.suppressed === false, 'Expected pathology cooldown to expire and allow re-registration');

  fragmentDoc.destroy();

  console.log('✓ collab pathological projection repeat guard');
}

run().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
