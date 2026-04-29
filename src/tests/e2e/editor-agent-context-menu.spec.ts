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

async function openDocument(page: Page, doc: CreatedDocument, markdown: string): Promise<void> {
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
  await expect(editor).toContainText('This sentence have grammar issue');
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
      && String(mark.data?.text ?? '').includes('@zoon Fix any grammar issues in this text')
      && !String(mark.data?.text ?? '').includes('@proof Fix any grammar issues in this text')
    ));
  });

  await page.locator('.mark-comment').first().click({ force: true });
  await expect(page.getByText('@zoon Fix any grammar issues in this text')).toBeVisible();
  await expect(page.getByText('@proof Fix any grammar issues in this text')).toHaveCount(0);
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

  const suggestButton = page.locator('.mark-selection-bar button').filter({ hasText: 'Suggest' });
  await expect(suggestButton).toBeVisible();
  await page.evaluate(() => {
    (window as any).__lastZoonPromptMessage = null;
    window.prompt = (message?: string) => {
      (window as any).__lastZoonPromptMessage = String(message ?? '');
      return 'This sentence has a grammar issue.';
    };
  });
  await suggestButton.click();

  await expect.poll(async () => {
    return page.evaluate(() => (window as any).__lastZoonPromptMessage ?? '');
  }).toContain('建议替换为');
  await page.waitForFunction(() => {
    const suggestions = (window as any).proof?.getPendingMarkSuggestions?.() ?? [];
    return suggestions.some((mark: any) => (
      mark.kind === 'replace'
      && String(mark.data?.content ?? '').includes('This sentence has a grammar issue.')
    ));
  });
});
