import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

type CreatedDocument = {
  url: string;
  slug: string;
};

const selectAllShortcut = process.platform === 'darwin' ? 'Meta+A' : 'Control+A';

async function createDocument(request: APIRequestContext, title: string, markdown: string): Promise<CreatedDocument> {
  const response = await request.post('/api/public/documents', {
    data: { title, markdown },
  });
  expect(response.ok()).toBe(true);
  return response.json() as Promise<CreatedDocument>;
}

async function openDocument(page: Page, doc: CreatedDocument, markdown: string, expectedText = 'This sentence have grammar issue'): Promise<void> {
  await page.goto(`${doc.url}&commentUi=v2`);
  const anonymousContinue = page.getByRole('button', { name: '匿名继续' });
  if (await anonymousContinue.waitFor({ state: 'visible', timeout: 2_000 }).then(() => true).catch(() => false)) {
    await anonymousContinue.click();
    await expect(anonymousContinue).toBeHidden();
  }
  await page.waitForFunction(() => typeof (window as any).proof?.loadDocument === 'function');
  await page.evaluate((content) => {
    const proof = (window as any).proof;
    proof.deactivateShareRuntime?.();
    proof.isReadOnly = false;
    proof.loadDocument(content, { allowShareContentMutation: true });
    proof.updateEditableState?.();
  }, markdown);
  const editor = page.locator('.ProseMirror');
  await expect(editor).toBeVisible();
  await expect(editor).toHaveAttribute('contenteditable', 'true');
  await expect(editor).toContainText(expectedText);
}

async function selectDocumentText(page: Page): Promise<void> {
  const editor = page.locator('.ProseMirror');
  await editor.click();
  await page.keyboard.press(selectAllShortcut);
  await expect.poll(async () => {
    return page.evaluate(() => window.getSelection()?.toString() ?? '');
  }).not.toBe('');
}

async function selectExactText(page: Page, text: string): Promise<void> {
  await page.evaluate((needle) => {
    const editor = document.querySelector('.ProseMirror') as HTMLElement | null;
    if (!editor) throw new Error('Editor not found');
    editor.focus();

    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const content = node.textContent ?? '';
      const index = content.indexOf(needle);
      if (index >= 0) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + needle.length);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
        editor.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        return;
      }
      node = walker.nextNode();
    }
    throw new Error(`Text not found: ${needle}`);
  }, text);

  await expect.poll(async () => {
    return page.evaluate(() => window.getSelection()?.toString() ?? '');
  }).toBe(text);
}

test('right-click quick grammar action creates a visible @zoon comment', async ({ page, request }) => {
  const markdown = '# Agent quick action E2E\n\nThis sentence have grammar issue.\n';
  const doc = await createDocument(
    request,
    'Agent quick action E2E',
    markdown,
  );
  await openDocument(page, doc, markdown);
  await selectDocumentText(page);

  const editorBox = await page.locator('.ProseMirror').boundingBox();
  expect(editorBox).not.toBeNull();
  await page.mouse.click(editorBox!.x + 80, editorBox!.y + 80, { button: 'right' });

  await expect(page.locator('.proof-context-menu')).toBeVisible();
  await page.locator('[data-action="quick-actions"]').hover();
  await page.locator('[data-quick-action="fix-grammar"]').click();

  await page.waitForFunction(() => {
    const marks = (window as any).proof?.getAllMarks?.() ?? [];
    return marks.some((mark: any) => (
      mark.kind === 'comment'
      && String(mark.data?.text ?? '').includes('@zoon 修复这段文字的语法问题')
      && !String(mark.data?.text ?? '').includes('@proof 修复这段文字的语法问题')
    ));
  });

  await page.locator('.mark-comment').first().click({ force: true });
  await expect(page.getByText('@zoon 修复这段文字的语法问题')).toBeVisible();
  await expect(page.getByText('@proof 修复这段文字的语法问题')).toHaveCount(0);
});

test('desktop Suggest action creates a replacement suggestion mark', async ({ page, request }) => {
  const markdown = '# Selection suggest E2E\n\nThis sentence have grammar issue.\n';
  const doc = await createDocument(
    request,
    'Selection suggest E2E',
    markdown,
  );
  await openDocument(page, doc, markdown);
  await selectExactText(page, 'This sentence have grammar issue.');

  const suggestButton = page.locator('.mark-selection-bar button').filter({ hasText: '建议' });
  await expect(suggestButton).toBeVisible();
  await page.evaluate(() => {
    (window as any).__lastZoonPromptMessage = null;
    window.prompt = (message?: string) => {
      (window as any).__lastZoonPromptMessage = String(message ?? '');
      throw new Error(`Unexpected browser prompt: ${message ?? ''}`);
    };
  });
  await suggestButton.click();

  await expect(page.getByText('提出替换建议')).toBeVisible();
  await expect(page.getByText('原文')).toBeVisible();
  await expect(page.getByText('建议改成')).toBeVisible();

  const publishButton = page.getByRole('button', { name: '发布建议' });
  const textarea = page.locator('.mark-suggestion-composer textarea.mark-suggestion-textarea');
  await expect(publishButton).toBeDisabled();
  await textarea.fill('   ');
  await expect(publishButton).toBeDisabled();
  await textarea.fill('This sentence have grammar issue.');
  await expect(publishButton).toBeDisabled();
  await textarea.fill('This sentence has a grammar issue.');
  await expect(publishButton).toBeEnabled();
  await publishButton.click();

  await expect.poll(async () => {
    return page.evaluate(() => (window as any).__lastZoonPromptMessage ?? '');
  }).toBe('');
  await page.waitForFunction(() => {
    const suggestions = (window as any).proof?.getPendingMarkSuggestions?.() ?? [];
    return suggestions.some((mark: any) => (
      mark.kind === 'replace'
      && String(mark.data?.content ?? '').includes('This sentence has a grammar issue.')
    ));
  });
});

test('custom Zoon prompt creates a task comment without calling quick-action', async ({ page, request }) => {
  const markdown = '# Custom fallback E2E\n\n这段说明需要改得更具体。\n';
  const selectedText = '这段说明需要改得更具体。';
  const prompt = '请改得更像产品经理写的明确动作';
  const doc = await createDocument(
    request,
    'Custom fallback E2E',
    markdown,
  );
  await openDocument(page, doc, markdown, selectedText);
  await selectExactText(page, selectedText);

  let quickActionRequests = 0;
  await page.route(`**/api/agent/${doc.slug}/quick-action`, async (route) => {
    quickActionRequests += 1;
    await route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        code: 'PROJECTION_STALE',
        error: 'Document projection is stale; retry after repair completes',
        fallback: 'none',
        retryAfterMs: 500,
      }),
    });
  });

  const selectionRect = await page.evaluate(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) throw new Error('No DOM selection');
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    return { x: rect.left + Math.min(40, rect.width / 2), y: rect.top + rect.height / 2 };
  });
  await page.mouse.click(selectionRect.x, selectionRect.y, { button: 'right' });

  await expect(page.locator('.proof-context-menu')).toBeVisible();
  await page.locator('[data-action="ask-proof"]').click();
  await expect(page.locator('.agent-input-dialog-title')).toHaveText('交给 Zoon');
  await page.locator('.agent-input-dialog-textarea').fill(prompt);
  await page.locator('.agent-input-dialog-submit').click();

  await page.waitForFunction((expectedPrompt) => {
    const marks = (window as any).proof?.getAllMarks?.() ?? [];
    return marks.some((mark: any) => (
      mark.kind === 'comment'
      && String(mark.data?.text ?? '').includes(`@zoon ${expectedPrompt}`)
    ));
  }, prompt);
  expect(quickActionRequests).toBe(0);
  await expect(page.getByText('DeepSeek 改稿失败')).toHaveCount(0);
});

test('right-click task comment creates an explicit @zoon request', async ({ page, request }) => {
  const markdown = '# Task comment E2E\n\n这段话需要后续处理。\n';
  const selectedText = '这段话需要后续处理。';
  const doc = await createDocument(
    request,
    'Task comment E2E',
    markdown,
  );
  await openDocument(page, doc, markdown, selectedText);
  await selectExactText(page, selectedText);

  const selectionRect = await page.evaluate(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) throw new Error('No DOM selection');
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    return { x: rect.left + Math.min(40, rect.width / 2), y: rect.top + rect.height / 2 };
  });
  await page.mouse.click(selectionRect.x, selectionRect.y, { button: 'right' });

  await expect(page.locator('.proof-context-menu')).toBeVisible();
  await expect(page.locator('[data-action="add-comment"]')).toContainText('添加 @zoon 任务评论');
  await page.locator('[data-action="add-comment"]').click();

  const composer = page.locator('.mark-popover-composer');
  await expect(composer).toBeVisible();
  const textarea = composer.locator('textarea.mark-popover-textarea');
  await expect(textarea).toHaveValue('@zoon 请看这里');
  await composer.getByRole('button', { name: '发布' }).click();

  await page.waitForFunction(() => {
    const marks = (window as any).proof?.getAllMarks?.() ?? [];
    return marks.some((mark: any) => (
      mark.kind === 'comment'
      && String(mark.data?.text ?? '').includes('@zoon 请看这里')
    ));
  });
});

test('desktop selection action bar stays anchored near selected text', async ({ page, request }) => {
  const markdown = [
    '# Selection position E2E',
    '',
    '把设计原型方案以图片形式输出，便于快速比较方向、讨论细节并进入后续迭代。',
    '',
  ].join('\n');
  const selectedText = '把设计原型方案以图片形式输出';
  const doc = await createDocument(
    request,
    'Selection position E2E',
    markdown,
  );
  await openDocument(page, doc, markdown, selectedText);
  await selectExactText(page, selectedText);

  const bar = page.locator('.mark-selection-bar');
  await expect(bar).toBeVisible();

  const metrics = await page.evaluate(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) throw new Error('No DOM selection');
    const selectionRect = selection.getRangeAt(0).getBoundingClientRect();
    const barEl = document.querySelector('.mark-selection-bar') as HTMLElement | null;
    if (!barEl) throw new Error('Selection bar not found');
    const barRect = barEl.getBoundingClientRect();
    return {
      selectionCenter: selectionRect.left + (selectionRect.width / 2),
      selectionTop: selectionRect.top,
      selectionBottom: selectionRect.bottom,
      barCenter: barRect.left + (barRect.width / 2),
      barTop: barRect.top,
      barBottom: barRect.bottom,
    };
  });

  expect(Math.abs(metrics.barCenter - metrics.selectionCenter)).toBeLessThan(180);
  expect(
    metrics.barBottom <= metrics.selectionTop
    || metrics.barTop >= metrics.selectionBottom
    || Math.abs(metrics.barCenter - metrics.selectionCenter) < 80
  ).toBe(true);
});
