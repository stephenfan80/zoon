import type { Node as ProseMirrorNode } from '@milkdown/kit/prose/model';
import { TextSelection } from '@milkdown/kit/prose/state';
import type { EditorView } from '@milkdown/kit/prose/view';
import type { Mark, CommentData } from '../editor/plugins/marks';

const OUTLINE_MIN_HEADINGS = 4;
const ACTIVE_HEADING_VIEWPORT_Y = 160;
const NAV_SCROLL_OFFSET_RATIO = 0.32;
const OUTLINE_OPEN_STORAGE_KEY = 'zoon.editor.outlineOpen';

function readStoredOutlineOpen(): boolean {
  try {
    return window.localStorage.getItem(OUTLINE_OPEN_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeStoredOutlineOpen(open: boolean): void {
  try {
    window.localStorage.setItem(OUTLINE_OPEN_STORAGE_KEY, open ? '1' : '0');
  } catch {
    // localStorage can be unavailable in private contexts.
  }
}

export type EditorNavigationController = {
  update(view: EditorView, comments: Mark[]): void;
  destroy(): void;
};

type OutlineItem = {
  id: string;
  level: number;
  text: string;
  pos: number;
};

type EditorNavigationOptions = {
  onNavigateToMark(markId: string): boolean;
  onNavigateToNextComment(): string | null;
  onNavigateToPrevComment(): string | null;
};

export function createEditorNavigation(options: EditorNavigationOptions): EditorNavigationController {
  return new EditorNavigation(options);
}

export function collectEditorOutline(doc: ProseMirrorNode): OutlineItem[] {
  const items: OutlineItem[] = [];

  doc.descendants((node, pos) => {
    if (node.type.name !== 'heading') return true;

    const text = node.textContent.trim();
    if (!text) return false;

    const level = Number(node.attrs.level ?? 1);
    items.push({
      id: `heading-${pos}-${items.length}`,
      level: Number.isFinite(level) ? Math.max(1, Math.min(level, 6)) : 1,
      text,
      pos,
    });

    return false;
  });

  return items;
}

function getActorName(actor: string): string {
  const normalized = String(actor || '').trim();
  if (!normalized) return 'Unknown';
  return normalized.replace(/^(human|ai|system):/, '');
}

function getCommentText(mark: Mark): string {
  const data = mark.data as CommentData | undefined;
  const text = data?.text?.trim() || mark.quote?.trim() || 'Comment';
  return text.replace(/\s+/g, ' ').slice(0, 120);
}

function clampPos(view: EditorView, pos: number): number {
  const size = view.state.doc.content.size;
  return Math.max(0, Math.min(pos, size));
}

function scrollWindowToPos(view: EditorView, pos: number): void {
  const target = clampPos(view, pos);
  const coords = view.coordsAtPos(target);
  const offset = Math.min(window.innerHeight * NAV_SCROLL_OFFSET_RATIO, 220);
  const top = Math.max(0, coords.top + window.scrollY - offset);
  window.scrollTo({ top, behavior: 'smooth' });
}

function selectNearPos(view: EditorView, pos: number): void {
  const target = clampPos(view, pos);
  const $pos = view.state.doc.resolve(target);
  const selection = TextSelection.near($pos, 1);
  const tr = view.state.tr
    .setSelection(selection)
    .setMeta('addToHistory', false);
  view.dispatch(tr);
  view.focus();
}

function shouldBlockPanelScroll(panel: HTMLElement, deltaY: number): boolean {
  if (deltaY === 0) return false;

  const maxScrollTop = Math.max(0, panel.scrollHeight - panel.clientHeight);
  if (maxScrollTop <= 1) return true;

  const scrollTop = panel.scrollTop;
  const atTop = scrollTop <= 0;
  const atBottom = scrollTop >= maxScrollTop - 1;

  return (deltaY < 0 && atTop) || (deltaY > 0 && atBottom);
}

function installPanelScrollBoundaryGuard(panel: HTMLElement): () => void {
  let lastTouchY: number | null = null;
  const activeListenerOptions: AddEventListenerOptions = { passive: false };

  const handleWheel = (event: WheelEvent): void => {
    event.stopPropagation();
    if (shouldBlockPanelScroll(panel, event.deltaY)) {
      event.preventDefault();
    }
  };

  const handleTouchStart = (event: TouchEvent): void => {
    event.stopPropagation();
    lastTouchY = event.touches[0]?.clientY ?? null;
  };

  const handleTouchMove = (event: TouchEvent): void => {
    event.stopPropagation();
    const touchY = event.touches[0]?.clientY ?? null;
    if (touchY === null || lastTouchY === null) {
      lastTouchY = touchY;
      return;
    }

    const deltaY = lastTouchY - touchY;
    lastTouchY = touchY;
    if (shouldBlockPanelScroll(panel, deltaY)) {
      event.preventDefault();
    }
  };

  panel.addEventListener('wheel', handleWheel, activeListenerOptions);
  panel.addEventListener('touchstart', handleTouchStart, activeListenerOptions);
  panel.addEventListener('touchmove', handleTouchMove, activeListenerOptions);

  return () => {
    panel.removeEventListener('wheel', handleWheel, activeListenerOptions);
    panel.removeEventListener('touchstart', handleTouchStart, activeListenerOptions);
    panel.removeEventListener('touchmove', handleTouchMove, activeListenerOptions);
  };
}

class EditorNavigation implements EditorNavigationController {
  private readonly options: EditorNavigationOptions;
  private readonly root: HTMLElement;
  private readonly outlineShell: HTMLElement;
  private readonly outlineToggle: HTMLButtonElement;
  private readonly outlinePanel: HTMLElement;
  private readonly commentShell: HTMLElement;
  private readonly commentToggle: HTMLButtonElement;
  private readonly commentPanel: HTMLElement;
  private view: EditorView | null = null;
  private outline: OutlineItem[] = [];
  private comments: Mark[] = [];
  private outlineOpen = readStoredOutlineOpen();
  private commentsOpen = false;
  private activeHeadingId: string | null = null;
  private raf: number | null = null;
  private readonly destroyScrollBoundaryGuards: Array<() => void> = [];

  constructor(options: EditorNavigationOptions) {
    this.options = options;
    this.root = document.createElement('div');
    this.root.className = 'editor-human-nav';
    this.root.hidden = true;

    this.outlineShell = document.createElement('div');
    this.outlineShell.className = 'editor-outline-nav';
    this.outlineToggle = document.createElement('button');
    this.outlineToggle.type = 'button';
    this.outlineToggle.className = 'editor-nav-toggle editor-outline-toggle';
    this.outlineToggle.setAttribute('aria-expanded', 'false');
    this.outlineToggle.setAttribute('aria-label', '打开目录');
    const outlineToggleIcon = document.createElement('span');
    outlineToggleIcon.className = 'editor-outline-toggle-icon';
    outlineToggleIcon.setAttribute('aria-hidden', 'true');
    const outlineToggleLabel = document.createElement('span');
    outlineToggleLabel.className = 'editor-outline-toggle-label';
    outlineToggleLabel.textContent = '目录';
    this.outlineToggle.append(outlineToggleIcon, outlineToggleLabel);
    this.outlinePanel = document.createElement('div');
    this.outlinePanel.className = 'editor-nav-panel editor-outline-panel';
    this.outlinePanel.hidden = true;
    this.outlineShell.append(this.outlineToggle, this.outlinePanel);

    this.commentShell = document.createElement('div');
    this.commentShell.className = 'editor-comment-nav';
    this.commentToggle = document.createElement('button');
    this.commentToggle.type = 'button';
    this.commentToggle.className = 'editor-nav-toggle editor-comment-toggle';
    this.commentToggle.setAttribute('aria-expanded', 'false');
    this.commentToggle.setAttribute('aria-label', 'Open unresolved comments');
    this.commentPanel = document.createElement('div');
    this.commentPanel.className = 'editor-nav-panel editor-comment-panel';
    this.commentPanel.hidden = true;
    this.commentShell.append(this.commentToggle, this.commentPanel);
    this.destroyScrollBoundaryGuards.push(
      installPanelScrollBoundaryGuard(this.outlinePanel),
      installPanelScrollBoundaryGuard(this.commentPanel)
    );

    this.root.append(this.outlineShell, this.commentShell);
    document.body.appendChild(this.root);

    this.outlineToggle.addEventListener('click', () => {
      this.outlineOpen = !this.outlineOpen;
      this.commentsOpen = false;
      writeStoredOutlineOpen(this.outlineOpen);
      this.render();
    });

    this.commentToggle.addEventListener('click', () => {
      this.commentsOpen = !this.commentsOpen;
      this.outlineOpen = false;
      writeStoredOutlineOpen(false);
      this.render();
    });

    document.addEventListener('pointerdown', this.handleDocumentPointerDown, true);
    window.addEventListener('scroll', this.handleScroll, { passive: true });
    window.addEventListener('resize', this.handleResize, { passive: true });
  }

  update(view: EditorView, comments: Mark[]): void {
    this.view = view;
    this.outline = collectEditorOutline(view.state.doc);
    this.comments = comments
      .filter((mark) => mark.kind === 'comment' && !mark.orphaned)
      .sort((a, b) => (a.range?.from ?? 0) - (b.range?.from ?? 0));
    this.updateActiveHeading();
    this.render();
  }

  destroy(): void {
    document.removeEventListener('pointerdown', this.handleDocumentPointerDown, true);
    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('resize', this.handleResize);
    if (this.raf !== null) {
      window.cancelAnimationFrame(this.raf);
      this.raf = null;
    }
    for (const destroyGuard of this.destroyScrollBoundaryGuards) {
      destroyGuard();
    }
    this.destroyScrollBoundaryGuards.length = 0;
    this.root.remove();
  }

  private handleScroll = (): void => {
    this.scheduleActiveHeadingUpdate();
  };

  private handleResize = (): void => {
    this.scheduleActiveHeadingUpdate();
  };

  private handleDocumentPointerDown = (event: PointerEvent): void => {
    if (!this.outlineOpen && !this.commentsOpen) return;

    const target = event.target;
    if (!(target instanceof Node)) return;
    if (this.root.contains(target)) return;

    this.outlineOpen = false;
    this.commentsOpen = false;
    writeStoredOutlineOpen(false);
    this.render();
  };

  private scheduleActiveHeadingUpdate(): void {
    if (this.raf !== null) return;
    this.raf = window.requestAnimationFrame(() => {
      this.raf = null;
      const changed = this.updateActiveHeading();
      if (changed) this.renderOutlinePanel();
    });
  }

  private shouldShowOutline(): boolean {
    return this.outline.length >= OUTLINE_MIN_HEADINGS;
  }

  private shouldShowComments(): boolean {
    return this.comments.length > 0;
  }

  private updateActiveHeading(): boolean {
    if (!this.view || !this.shouldShowOutline()) {
      const changed = this.activeHeadingId !== null;
      this.activeHeadingId = null;
      return changed;
    }

    let active: OutlineItem | null = null;
    for (const item of this.outline) {
      try {
        const coords = this.view.coordsAtPos(clampPos(this.view, item.pos));
        if (coords.top <= ACTIVE_HEADING_VIEWPORT_Y) {
          active = item;
        }
      } catch {
        continue;
      }
    }

    const nextId = active?.id ?? this.outline[0]?.id ?? null;
    const changed = this.activeHeadingId !== nextId;
    this.activeHeadingId = nextId;
    return changed;
  }

  private render(): void {
    const showOutline = this.shouldShowOutline();
    const showComments = this.shouldShowComments();
    this.root.hidden = !showOutline && !showComments;
    this.outlineShell.hidden = !showOutline;
    this.commentShell.hidden = !showComments;

    if (!showOutline) {
      this.outlineOpen = false;
    }
    if (!showComments) this.commentsOpen = false;

    this.outlineToggle.setAttribute('aria-expanded', String(this.outlineOpen));
    this.outlineShell.dataset.open = String(this.outlineOpen);
    this.outlineToggle.setAttribute(
      'aria-label',
      `${this.outlineOpen ? '收合' : '打开'}目录，共 ${this.outline.length} 个标题`
    );
    this.commentToggle.setAttribute('aria-expanded', String(this.commentsOpen));
    this.outlinePanel.hidden = !this.outlineOpen;
    this.commentPanel.hidden = !this.commentsOpen;

    this.commentToggle.textContent = `Comments ${this.comments.length}`;

    this.renderOutlinePanel();
    this.renderCommentPanel();
  }

  private renderOutlinePanel(): void {
    if (!this.outlineOpen) return;

    this.outlinePanel.replaceChildren();
    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'editor-outline-panel-header';
    header.setAttribute('aria-label', '收合目录');
    const headerIcon = document.createElement('span');
    headerIcon.className = 'editor-outline-panel-chevron';
    headerIcon.setAttribute('aria-hidden', 'true');
    const headerLabel = document.createElement('span');
    headerLabel.textContent = '收合目录';
    header.append(headerIcon, headerLabel);
    header.addEventListener('click', () => {
      this.outlineOpen = false;
      writeStoredOutlineOpen(false);
      this.render();
    });
    this.outlinePanel.appendChild(header);

    const list = document.createElement('div');
    list.className = 'editor-outline-list';

    for (const item of this.outline) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'editor-outline-item';
      button.dataset.level = String(item.level);
      button.dataset.active = String(item.id === this.activeHeadingId);
      button.textContent = item.text;
      button.addEventListener('click', () => {
        if (!this.view) return;
        selectNearPos(this.view, item.pos);
        scrollWindowToPos(this.view, item.pos);
        this.activeHeadingId = item.id;
        this.outlineOpen = false;
        writeStoredOutlineOpen(false);
        this.render();
      });
      list.appendChild(button);
    }

    this.outlinePanel.appendChild(list);
  }

  private renderCommentPanel(): void {
    if (!this.commentsOpen) return;

    this.commentPanel.replaceChildren();
    const header = document.createElement('div');
    header.className = 'editor-nav-panel-title';
    header.textContent = `Unresolved comments (${this.comments.length})`;

    const controls = document.createElement('div');
    controls.className = 'editor-comment-controls';

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'editor-nav-icon-button';
    prev.textContent = 'Prev';
    prev.addEventListener('click', () => {
      this.options.onNavigateToPrevComment();
    });

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'editor-nav-icon-button';
    next.textContent = 'Next';
    next.addEventListener('click', () => {
      this.options.onNavigateToNextComment();
    });

    controls.append(prev, next);
    this.commentPanel.append(header, controls);

    const list = document.createElement('div');
    list.className = 'editor-comment-list';

    for (const mark of this.comments) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'editor-comment-item';
      button.addEventListener('click', () => {
        this.options.onNavigateToMark(mark.id);
        this.commentsOpen = false;
        this.render();
      });

      const meta = document.createElement('span');
      meta.className = 'editor-comment-meta';
      meta.textContent = getActorName(mark.by);

      const body = document.createElement('span');
      body.className = 'editor-comment-preview';
      body.textContent = getCommentText(mark);

      button.append(meta, body);
      list.appendChild(button);
    }

    this.commentPanel.appendChild(list);
  }
}
