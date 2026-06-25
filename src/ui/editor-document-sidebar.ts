import {
  deleteOwnedDocument,
  filterAccountDocumentsByTitle,
  formatRelativeTime,
  getLocalOwnerSecret,
  loadAccountDocuments,
  loadAccountMe,
  loadRecentDocs,
  loginAccount,
  logoutAccount,
  registerAccount,
  removeAccountDocumentVisit,
  removeRecentDoc,
  sortAccountDocumentsByCreatedAtDesc,
  type AccountDocument,
  type AccountUser,
  type RecentDoc,
} from './recent-docs';

type EditorDocumentSidebarOptions = {
  getCurrentHref(): string;
  getCurrentSlug(): string | null;
  onSelectDocument?(document: { slug: string; href: string; title: string }): void | Promise<void>;
};

export type EditorDocumentSidebarController = {
  refresh(): Promise<void>;
  destroy(): void;
};

type AuthMode = 'login' | 'register';

const SIDEBAR_WIDTH_STORAGE_KEY = 'zoon.editor.documentSidebar.width';
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'zoon.editor.documentSidebar.collapsed';
const SIDEBAR_DEFAULT_WIDTH = 272;
const SIDEBAR_MIN_WIDTH = 236;
const SIDEBAR_MAX_WIDTH = 420;
const SIDEBAR_MAX_VIEWPORT_RATIO = 0.34;
const SIDEBAR_COLLAPSED_WIDTH = 48;

function createButton(label: string, variant: 'primary' | 'secondary' = 'secondary'): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `document-sidebar-button ${variant}`;
  button.textContent = label;
  return button;
}

function createStatus(message: string): HTMLElement {
  const status = document.createElement('div');
  status.className = 'document-sidebar-status';
  status.textContent = message;
  return status;
}

function isCurrentDocument(slug: string, href: string, options: EditorDocumentSidebarOptions): boolean {
  const currentSlug = options.getCurrentSlug();
  if (currentSlug && currentSlug === slug) return true;
  return href === options.getCurrentHref();
}

function documentHrefFromAccount(doc: AccountDocument): string {
  return doc.webUrl;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function getSidebarMaxWidth(): number {
  const viewportLimit = Math.floor(window.innerWidth * SIDEBAR_MAX_VIEWPORT_RATIO);
  return Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, viewportLimit));
}

function clampSidebarWidth(width: number): number {
  return clamp(Math.round(width), SIDEBAR_MIN_WIDTH, getSidebarMaxWidth());
}

function readStoredSidebarWidth(): number {
  try {
    const raw = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    const value = raw ? Number.parseInt(raw, 10) : SIDEBAR_DEFAULT_WIDTH;
    return clampSidebarWidth(Number.isFinite(value) ? value : SIDEBAR_DEFAULT_WIDTH);
  } catch {
    return clampSidebarWidth(SIDEBAR_DEFAULT_WIDTH);
  }
}

function writeStoredSidebarWidth(width: number): void {
  try {
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(clampSidebarWidth(width)));
  } catch {
    // Local preference persistence is best-effort.
  }
}

function readStoredSidebarCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeStoredSidebarCollapsed(collapsed: boolean): void {
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed));
  } catch {
    // Local preference persistence is best-effort.
  }
}

function createAuthField(form: HTMLFormElement, options: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  autocomplete?: string;
}): HTMLInputElement {
  const label = document.createElement('label');
  label.className = 'document-sidebar-auth-field';
  const text = document.createElement('span');
  text.textContent = options.label;
  const input = document.createElement('input');
  input.name = options.name;
  input.type = options.type ?? 'text';
  input.placeholder = options.placeholder ?? '';
  input.setAttribute('autocomplete', options.autocomplete ?? 'off');
  label.append(text, input);
  form.appendChild(label);
  return input;
}

class EditorDocumentSidebar implements EditorDocumentSidebarController {
  private readonly root: HTMLElement;
  private readonly options: EditorDocumentSidebarOptions;
  private panel: HTMLElement;
  private body: HTMLElement;
  private backdrop: HTMLElement;
  private mobileToggle: HTMLButtonElement;
  private collapseToggle: HTMLButtonElement;
  private resizeHandle: HTMLElement;
  private authModal: HTMLElement | null = null;
  private currentUser: AccountUser | null = null;
  private accountDocuments: AccountDocument[] | null = null;
  private query = '';
  private sidebarWidth = SIDEBAR_DEFAULT_WIDTH;
  private collapsed = false;
  private resizePointerId: number | null = null;
  private resizeStartX = 0;
  private resizeStartWidth = SIDEBAR_DEFAULT_WIDTH;
  private destroyed = false;
  private refreshSeq = 0;

  private handleResizePointerMove = (event: PointerEvent): void => {
    if (this.resizePointerId !== event.pointerId) return;
    const nextWidth = clampSidebarWidth(this.resizeStartWidth + event.clientX - this.resizeStartX);
    this.setSidebarWidth(nextWidth, false);
  };

  private handleResizePointerEnd = (event: PointerEvent): void => {
    if (this.resizePointerId !== event.pointerId) return;
    this.resizePointerId = null;
    document.body.classList.remove('document-sidebar-resizing');
    try {
      this.resizeHandle.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }
    window.removeEventListener('pointermove', this.handleResizePointerMove);
    window.removeEventListener('pointerup', this.handleResizePointerEnd);
    window.removeEventListener('pointercancel', this.handleResizePointerEnd);
    writeStoredSidebarWidth(this.sidebarWidth);
  };

  private handleViewportResize = (): void => {
    this.setSidebarWidth(this.sidebarWidth, false);
  };

  constructor(root: HTMLElement, options: EditorDocumentSidebarOptions) {
    this.root = root;
    this.options = options;
    this.sidebarWidth = readStoredSidebarWidth();
    this.collapsed = readStoredSidebarCollapsed();

    this.mobileToggle = document.createElement('button');
    this.mobileToggle.type = 'button';
    this.mobileToggle.className = 'document-sidebar-mobile-toggle';
    this.mobileToggle.textContent = '文档';
    this.mobileToggle.setAttribute('aria-label', '打开文档列表');
    this.mobileToggle.addEventListener('click', () => this.setMobileOpen(true));

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'document-sidebar-backdrop';
    this.backdrop.addEventListener('click', () => this.setMobileOpen(false));

    this.panel = document.createElement('aside');
    this.panel.className = 'document-sidebar-panel';
    this.panel.setAttribute('aria-label', '历史文档');

    this.body = document.createElement('div');
    this.body.className = 'document-sidebar-body';

    this.collapseToggle = document.createElement('button');
    this.collapseToggle.type = 'button';
    this.collapseToggle.className = 'document-sidebar-collapse document-sidebar-icon-button';
    this.collapseToggle.addEventListener('click', () => this.setCollapsed(!this.collapsed));

    this.resizeHandle = document.createElement('div');
    this.resizeHandle.className = 'document-sidebar-resize-handle';
    this.resizeHandle.setAttribute('role', 'separator');
    this.resizeHandle.setAttribute('aria-orientation', 'vertical');
    this.resizeHandle.setAttribute('aria-label', '调整历史文档列表宽度');
    this.resizeHandle.tabIndex = 0;
    this.resizeHandle.addEventListener('pointerdown', (event) => this.startResize(event));
    this.resizeHandle.addEventListener('dblclick', () => this.setSidebarWidth(SIDEBAR_DEFAULT_WIDTH, true));
    this.resizeHandle.addEventListener('keydown', (event) => this.handleResizeKeydown(event));

    this.root.replaceChildren(this.panel, this.resizeHandle);
    document.body.append(this.mobileToggle, this.backdrop);
    this.renderShell();
    this.applyLayoutState();
    window.addEventListener('resize', this.handleViewportResize, { passive: true });
  }

  async refresh(): Promise<void> {
    const seq = ++this.refreshSeq;
    this.renderLoading();
    const user = await loadAccountMe();
    if (this.destroyed || seq !== this.refreshSeq) return;
    this.currentUser = user;
    if (!user) {
      this.accountDocuments = null;
      this.renderSignedOut();
      return;
    }

    this.renderSignedInLoading(user);
    const documents = await loadAccountDocuments(50);
    if (this.destroyed || seq !== this.refreshSeq) return;
    this.accountDocuments = documents;
    this.renderSignedIn(user, documents);
  }

  destroy(): void {
    this.destroyed = true;
    this.closeAuthModal();
    this.setMobileOpen(false);
    this.setCollapsed(false, false);
    window.removeEventListener('resize', this.handleViewportResize);
    window.removeEventListener('pointermove', this.handleResizePointerMove);
    window.removeEventListener('pointerup', this.handleResizePointerEnd);
    window.removeEventListener('pointercancel', this.handleResizePointerEnd);
    document.body.classList.remove('document-sidebar-resizing');
    this.mobileToggle.remove();
    this.backdrop.remove();
    this.root.replaceChildren();
  }

  private renderShell(): void {
    const header = document.createElement('div');
    header.className = 'document-sidebar-header';

    const titleWrap = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'document-sidebar-title';
    title.textContent = '文档';
    const subtitle = document.createElement('div');
    subtitle.className = 'document-sidebar-subtitle';
    subtitle.textContent = '历史文档';
    titleWrap.className = 'document-sidebar-title-wrap';
    titleWrap.append(title, subtitle);

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'document-sidebar-close';
    close.textContent = '×';
    close.setAttribute('aria-label', '关闭文档列表');
    close.addEventListener('click', () => this.setMobileOpen(false));

    header.append(titleWrap, this.collapseToggle, close);
    this.panel.replaceChildren(header, this.body);
    this.updateCollapseToggle();
  }

  private renderLoading(): void {
    this.body.replaceChildren(createStatus('加载文档中…'));
  }

  private renderSignedInLoading(user: AccountUser): void {
    this.body.replaceChildren(this.createAccountHeader(user), createStatus('加载文档中…'));
  }

  private renderSignedOut(): void {
    const authCard = document.createElement('div');
    authCard.className = 'document-sidebar-auth-card';

    const copy = document.createElement('p');
    copy.className = 'document-sidebar-auth-copy';
    copy.textContent = '登录后内容会跟账号绑定，其他设备端也能看到。';

    const actions = document.createElement('div');
    actions.className = 'document-sidebar-auth-actions';
    const login = createButton('登录', 'primary');
    const register = createButton('注册');
    login.addEventListener('click', () => this.openAuthModal('login'));
    register.addEventListener('click', () => this.openAuthModal('register'));
    actions.append(login, register);
    authCard.append(copy, actions);

    let list = this.createRecentList(loadRecentDocs(), false);
    const search = this.createSearchInput('搜索本机文档标题', () => {
      const next = this.createRecentList(loadRecentDocs(), false);
      list.replaceWith(next);
      list = next;
    });
    const label = this.createSectionLabel('本机最近文档');
    this.body.replaceChildren(authCard, search, label, list);
  }

  private renderSignedIn(user: AccountUser, documents: AccountDocument[] | null): void {
    const accountHeader = this.createAccountHeader(user);
    const label = this.createSectionLabel(documents ? '按创建时间排序' : '暂时显示本机最近文档');
    let list = documents
      ? this.createAccountDocumentList(documents)
      : this.createRecentList(loadRecentDocs(), true);
    const search = this.createSearchInput('搜索文档标题', () => {
      const next = this.accountDocuments
        ? this.createAccountDocumentList(this.accountDocuments)
        : this.createRecentList(loadRecentDocs(), true);
      list.replaceWith(next);
      list = next;
    });
    this.body.replaceChildren(accountHeader, search, label, list);
  }

  private createAccountHeader(user: AccountUser): HTMLElement {
    const row = document.createElement('div');
    row.className = 'document-sidebar-account-row';

    const identity = document.createElement('div');
    identity.style.cssText = 'min-width:0;flex:1 1 auto;';
    const name = document.createElement('div');
    name.className = 'document-sidebar-title';
    name.textContent = user.name || '我的文档';
    const email = document.createElement('div');
    email.className = 'document-sidebar-subtitle';
    email.textContent = user.email;
    identity.append(name, email);

    const logout = createButton('退出');
    logout.addEventListener('click', async () => {
      logout.disabled = true;
      logout.textContent = '退出中…';
      await logoutAccount();
      this.currentUser = null;
      await this.refresh();
    });

    row.append(identity, logout);
    return row;
  }

  private createSearchInput(placeholder: string, onQueryChange: () => void): HTMLInputElement {
    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'document-sidebar-search';
    search.placeholder = placeholder;
    search.setAttribute('aria-label', placeholder);
    search.value = this.query;
    search.addEventListener('input', () => {
      this.query = search.value;
      onQueryChange();
    });
    return search;
  }

  private createSectionLabel(text: string): HTMLElement {
    const label = document.createElement('div');
    label.className = 'document-sidebar-section-label';
    label.textContent = text;
    return label;
  }

  private createAccountDocumentList(documents: AccountDocument[]): HTMLElement {
    const list = document.createElement('div');
    list.className = 'document-sidebar-list';
    const visibleDocuments = filterAccountDocumentsByTitle(
      sortAccountDocumentsByCreatedAtDesc(documents),
      this.query,
    );

    if (visibleDocuments.length === 0) {
      list.appendChild(createStatus(this.query.trim() ? '没有找到相关文档。' : '还没有账号文档。'));
      return list;
    }

    for (const doc of visibleDocuments.slice(0, 50)) {
      const href = documentHrefFromAccount(doc);
      list.appendChild(this.createRow({
        slug: doc.slug,
        href,
        title: doc.title || 'Untitled',
        meta: doc.isOwned ? '我创建的文档' : '打开过的文档',
        time: this.formatCreatedAt(doc.createdAt),
        actionLabel: doc.isOwned ? '删除' : '移除',
        actionDanger: doc.isOwned,
        onAction: async () => {
          if (doc.isOwned) {
            await deleteOwnedDocument(doc.slug);
          } else {
            const removed = await removeAccountDocumentVisit(doc.slug);
            if (!removed) throw new Error('暂时无法从我的文档移除。');
            removeRecentDoc(doc.slug);
          }
          await this.refresh();
        },
      }));
    }
    return list;
  }

  private createRecentList(entries: RecentDoc[], showUnavailableHint: boolean): HTMLElement {
    const list = document.createElement('div');
    list.className = 'document-sidebar-list';
    const normalized = this.query.trim().toLocaleLowerCase();
    const recents = entries.filter((entry) => (
      !normalized || (entry.title || 'Untitled').toLocaleLowerCase().includes(normalized)
    ));

    if (showUnavailableHint) {
      list.appendChild(createStatus('账号文档库暂时不可用，先显示本机最近文档。'));
    }

    if (recents.length === 0) {
      list.appendChild(createStatus(normalized ? '没有找到相关本机文档。' : '还没有本机最近文档。'));
      return list;
    }

    for (const entry of recents.slice(0, 20)) {
      const ownerSecret = getLocalOwnerSecret(entry.slug);
      list.appendChild(this.createRow({
        slug: entry.slug,
        href: entry.href,
        title: entry.title || 'Untitled',
        meta: '本机最近打开',
        time: formatRelativeTime(entry.ts),
        actionLabel: ownerSecret ? '删除' : '移除',
        actionDanger: Boolean(ownerSecret),
        onAction: async () => {
          if (ownerSecret) await deleteOwnedDocument(entry.slug, ownerSecret);
          else removeRecentDoc(entry.slug);
          if (this.currentUser) await this.refresh();
          else this.renderSignedOut();
        },
      }));
    }
    return list;
  }

  private createRow(options: {
    slug: string;
    href: string;
    title: string;
    meta: string;
    time: string;
    actionLabel: string;
    actionDanger: boolean;
    onAction(): Promise<void>;
  }): HTMLElement {
    const row = document.createElement('div');
    row.className = 'document-sidebar-row';

    const card = document.createElement('a');
    card.className = 'document-sidebar-card';
    card.href = options.href;
    card.title = options.title;
    if (isCurrentDocument(options.slug, options.href, this.options)) {
      card.setAttribute('aria-current', 'page');
    }
    card.addEventListener('click', (event) => {
      if (
        event.button !== 0
        || event.metaKey
        || event.ctrlKey
        || event.shiftKey
        || event.altKey
      ) {
        return;
      }
      if (this.options.onSelectDocument) {
        event.preventDefault();
        void Promise.resolve(this.options.onSelectDocument({
          slug: options.slug,
          href: options.href,
          title: options.title,
        })).catch((error) => {
          window.alert(error instanceof Error ? error.message : '文档切换失败，请稍后重试。');
        });
      }
      this.setMobileOpen(false);
    });

    const title = document.createElement('span');
    title.className = 'document-sidebar-card-title';
    title.textContent = options.title;
    const meta = document.createElement('span');
    meta.className = 'document-sidebar-card-meta';
    meta.textContent = options.time ? `${options.meta} · ${options.time}` : options.meta;
    card.append(title, meta);

    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'document-sidebar-action';
    action.textContent = options.actionLabel;
    action.dataset.danger = String(options.actionDanger);
    action.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const confirmed = window.confirm(
        options.actionDanger
          ? `确定删除「${options.title}」吗？删除后分享链接将不可访问。`
          : `从文档列表里移除「${options.title}」吗？原文档不会被删除。`,
      );
      if (!confirmed || action.disabled) return;
      action.disabled = true;
      action.textContent = options.actionDanger ? '删除中…' : '移除中…';
      try {
        await options.onAction();
      } catch (error) {
        window.alert(error instanceof Error ? error.message : '操作失败，请稍后重试。');
        action.disabled = false;
        action.textContent = options.actionLabel;
      }
    });

    row.append(card, action);
    return row;
  }

  private formatCreatedAt(createdAt: string): string {
    const ts = Date.parse(createdAt);
    return Number.isFinite(ts) ? `创建于 ${formatRelativeTime(ts)}` : '';
  }

  private setMobileOpen(open: boolean): void {
    document.body.classList.toggle('document-sidebar-open', open);
    this.mobileToggle.setAttribute('aria-expanded', String(open));
  }

  private setCollapsed(collapsed: boolean, persist = true): void {
    this.collapsed = collapsed;
    document.body.classList.toggle('document-sidebar-collapsed', collapsed);
    this.root.setAttribute('aria-expanded', String(!collapsed));
    this.updateCollapseToggle();
    if (persist) writeStoredSidebarCollapsed(collapsed);
  }

  private setSidebarWidth(width: number, persist: boolean): void {
    this.sidebarWidth = clampSidebarWidth(width);
    document.documentElement.style.setProperty('--document-sidebar-width', `${this.sidebarWidth}px`);
    this.resizeHandle.setAttribute('aria-valuemin', String(SIDEBAR_MIN_WIDTH));
    this.resizeHandle.setAttribute('aria-valuemax', String(getSidebarMaxWidth()));
    this.resizeHandle.setAttribute('aria-valuenow', String(this.sidebarWidth));
    if (persist) writeStoredSidebarWidth(this.sidebarWidth);
  }

  private applyLayoutState(): void {
    document.documentElement.style.setProperty('--document-sidebar-collapsed-width', `${SIDEBAR_COLLAPSED_WIDTH}px`);
    this.setSidebarWidth(this.sidebarWidth, false);
    this.setCollapsed(this.collapsed, false);
  }

  private updateCollapseToggle(): void {
    this.collapseToggle.textContent = this.collapsed ? '展开' : '收起';
    this.collapseToggle.setAttribute(
      'aria-label',
      this.collapsed ? '展开历史文档列表' : '收起历史文档列表',
    );
    this.collapseToggle.setAttribute('aria-expanded', String(!this.collapsed));
  }

  private startResize(event: PointerEvent): void {
    if (this.collapsed || window.matchMedia('(max-width: 720px)').matches) return;
    event.preventDefault();
    this.resizePointerId = event.pointerId;
    this.resizeStartX = event.clientX;
    this.resizeStartWidth = this.sidebarWidth;
    document.body.classList.add('document-sidebar-resizing');
    try {
      this.resizeHandle.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort for older embedded browsers.
    }
    window.addEventListener('pointermove', this.handleResizePointerMove);
    window.addEventListener('pointerup', this.handleResizePointerEnd);
    window.addEventListener('pointercancel', this.handleResizePointerEnd);
  }

  private handleResizeKeydown(event: KeyboardEvent): void {
    if (this.collapsed) return;
    const step = event.shiftKey ? 24 : 12;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.setSidebarWidth(this.sidebarWidth - step, true);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.setSidebarWidth(this.sidebarWidth + step, true);
    } else if (event.key === 'Home') {
      event.preventDefault();
      this.setSidebarWidth(SIDEBAR_MIN_WIDTH, true);
    } else if (event.key === 'End') {
      event.preventDefault();
      this.setSidebarWidth(getSidebarMaxWidth(), true);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.setSidebarWidth(SIDEBAR_DEFAULT_WIDTH, true);
    }
  }

  private openAuthModal(mode: AuthMode): void {
    this.closeAuthModal();
    const modal = document.createElement('div');
    modal.className = 'document-sidebar-auth-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    const escKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') this.closeAuthModal();
    };
    document.addEventListener('keydown', escKey, true);
    this.authModal = modal;
    document.body.appendChild(modal);
    const cleanup = (): void => {
      document.removeEventListener('keydown', escKey, true);
    };
    modal.addEventListener('zoon:auth-modal-cleanup', cleanup, { once: true });
    this.renderAuthModal(mode);
  }

  private renderAuthModal(mode: AuthMode, message = ''): void {
    if (!this.authModal) return;
    const modal = this.authModal;
    modal.replaceChildren();

    const backdrop = document.createElement('div');
    backdrop.className = 'document-sidebar-auth-backdrop';
    backdrop.addEventListener('click', () => this.closeAuthModal());

    const card = document.createElement('div');
    card.className = 'document-sidebar-auth-card-modal';

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'document-sidebar-close document-sidebar-icon-button';
    close.style.display = 'inline-flex';
    close.textContent = '×';
    close.setAttribute('aria-label', '关闭登录窗口');
    close.style.position = 'absolute';
    close.style.right = '14px';
    close.style.top = '14px';
    close.addEventListener('click', () => this.closeAuthModal());

    const isRegister = mode === 'register';
    const title = document.createElement('h2');
    title.className = 'document-sidebar-auth-title';
    title.textContent = isRegister ? '创建账号' : '欢迎回来';

    const copy = document.createElement('p');
    copy.className = 'document-sidebar-auth-copy';
    copy.textContent = '登录后内容会跟账号绑定，其他设备端也能看到。';

    const tabs = document.createElement('div');
    tabs.className = 'document-sidebar-auth-tabs';
    const loginTab = document.createElement('button');
    loginTab.type = 'button';
    loginTab.className = `document-sidebar-auth-tab${isRegister ? '' : ' is-active'}`;
    loginTab.textContent = '登录';
    loginTab.addEventListener('click', () => this.renderAuthModal('login'));
    const registerTab = document.createElement('button');
    registerTab.type = 'button';
    registerTab.className = `document-sidebar-auth-tab${isRegister ? ' is-active' : ''}`;
    registerTab.textContent = '注册';
    registerTab.addEventListener('click', () => this.renderAuthModal('register'));
    tabs.append(loginTab, registerTab);

    const form = document.createElement('form');
    form.className = 'document-sidebar-auth-form';
    const email = createAuthField(form, {
      label: '邮箱',
      name: 'email',
      type: 'email',
      placeholder: 'you@example.com',
      autocomplete: 'email',
    });
    const password = createAuthField(form, {
      label: '密码',
      name: 'password',
      type: 'password',
      placeholder: isRegister ? '至少 8 位' : '输入密码',
      autocomplete: isRegister ? 'new-password' : 'current-password',
    });
    const name = isRegister ? createAuthField(form, {
      label: '昵称',
      name: 'name',
      placeholder: '显示在文档列表里',
      autocomplete: 'name',
    }) : null;
    const status = document.createElement('div');
    status.className = 'document-sidebar-auth-status';
    status.textContent = message;
    const primary = createButton(isRegister ? '创建账号' : '登录', 'primary');
    primary.type = 'submit';
    form.append(status, primary);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const emailValue = email.value.trim();
      const passwordValue = password.value;
      const nameValue = name?.value.trim() ?? '';
      if (!emailValue || !passwordValue) {
        status.textContent = '请输入邮箱和密码。';
        return;
      }
      if (isRegister && passwordValue.length < 8) {
        status.textContent = '密码至少 8 位。';
        return;
      }
      primary.disabled = true;
      primary.textContent = isRegister ? '创建中…' : '登录中…';
      status.textContent = '';
      try {
        this.currentUser = isRegister
          ? await registerAccount({ email: emailValue, password: passwordValue, name: nameValue })
          : await loginAccount({ email: emailValue, password: passwordValue });
        this.closeAuthModal();
        await this.refresh();
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : '登录失败，请稍后重试。';
        primary.disabled = false;
        primary.textContent = isRegister ? '创建账号' : '登录';
      }
    });

    card.append(close, title, copy, tabs, form);
    modal.append(backdrop, card);
    setTimeout(() => email.focus(), 0);
  }

  private closeAuthModal(): void {
    if (!this.authModal) return;
    this.authModal.dispatchEvent(new CustomEvent('zoon:auth-modal-cleanup'));
    this.authModal.remove();
    this.authModal = null;
  }
}

export function initEditorDocumentSidebar(
  options: EditorDocumentSidebarOptions,
): EditorDocumentSidebarController | null {
  const root = document.getElementById('document-sidebar-root');
  if (!root) return null;
  const sidebar = new EditorDocumentSidebar(root, options);
  void sidebar.refresh();
  return sidebar;
}
