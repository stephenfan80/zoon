import type { Node as ProseMirrorNode } from '@milkdown/prose/model';
import {
  canonicalizeStoredMarks,
  isAI,
  isHuman,
  normalizeQuote,
  type StoredMark,
} from '../src/formats/marks.js';
import { buildTextIndex } from '../src/editor/utils/text-range.js';
import { getHeadlessMilkdownParser, parseMarkdownWithHtmlFallback } from './milkdown-headless.js';

const DEFAULT_INITIAL_AI_ACTOR = 'ai:zoon-template';

function normalizeInitialActor(actor: string | null | undefined): string {
  const trimmed = typeof actor === 'string' ? actor.trim() : '';
  if (trimmed && (isHuman(trimmed) || isAI(trimmed))) return trimmed;
  return DEFAULT_INITIAL_AI_ACTOR;
}

function hasAuthoredMarks(marks: Record<string, StoredMark>): boolean {
  return Object.values(marks).some((mark) => mark.kind === 'authored');
}

function findTextOffsetRange(
  textPositions: Array<number | null>,
  from: number,
  to: number,
): { startRel?: string; endRel?: string } {
  const startOffset = textPositions.findIndex((pos) => typeof pos === 'number' && pos >= from);
  if (startOffset < 0) return {};

  let endOffset = -1;
  for (let index = 0; index < textPositions.length; index += 1) {
    const pos = textPositions[index];
    if (typeof pos === 'number' && pos < to) {
      endOffset = index + 1;
    }
  }

  if (endOffset <= startOffset) return {};
  return {
    startRel: `char:${startOffset}`,
    endRel: `char:${endOffset}`,
  };
}

export function buildInitialAuthoredMarksFromDoc(
  doc: ProseMirrorNode,
  actor: string | null | undefined,
  createdAt = new Date().toISOString(),
): Record<string, StoredMark> {
  const by = normalizeInitialActor(actor);
  const textIndex = buildTextIndex(doc);
  const marks: Record<string, StoredMark> = {};

  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    const quote = normalizeQuote(node.textContent);
    if (!quote) return true;

    const from = pos;
    const to = pos + node.nodeSize;
    const rel = textIndex ? findTextOffsetRange(textIndex.positions, from, to) : {};
    const id = `authored:${by}:${from}-${to}`;

    marks[id] = {
      kind: 'authored',
      by,
      createdAt,
      range: { from, to },
      quote,
      ...rel,
    };
    return true;
  });

  return canonicalizeStoredMarks(marks);
}

export async function seedInitialAuthoredMarks(
  markdown: string,
  actor: string | null | undefined,
  createdAt = new Date().toISOString(),
): Promise<Record<string, StoredMark>> {
  const parser = await getHeadlessMilkdownParser();
  const parsed = parseMarkdownWithHtmlFallback(parser, markdown ?? '');
  if (!parsed.doc) return canonicalizeStoredMarks({});
  return buildInitialAuthoredMarksFromDoc(parsed.doc as ProseMirrorNode, actor, createdAt);
}

export async function ensureInitialAuthoredMarks(
  markdown: string,
  existingMarks: Record<string, unknown>,
  actor: string | null | undefined,
): Promise<Record<string, StoredMark>> {
  const canonicalExisting = canonicalizeStoredMarks(existingMarks);
  if (hasAuthoredMarks(canonicalExisting)) return canonicalExisting;

  const seeded = await seedInitialAuthoredMarks(markdown, actor);
  return canonicalizeStoredMarks({
    ...canonicalExisting,
    ...seeded,
  });
}
