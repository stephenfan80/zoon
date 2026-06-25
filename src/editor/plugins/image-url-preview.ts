import { $prose } from '@milkdown/kit/utils';
import type { Node as ProseMirrorNode } from '@milkdown/kit/prose/model';
import { Plugin, PluginKey } from '@milkdown/kit/prose/state';
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view';

type ImageUrlPreviewState = {
  decorations: DecorationSet;
};

export type ImageUrlMatch = {
  url: string;
  from: number;
  to: number;
};

const imageUrlPreviewKey = new PluginKey<ImageUrlPreviewState>('image-url-preview');
const URL_PATTERN = /https?:\/\/[^\s<>"'`]+/gi;
const IMAGE_EXTENSION_PATTERN = /\.(?:png|jpe?g|gif|webp|avif|svg)$/i;
const IMAGE_QUERY_VALUE_PATTERN = /^(?:png|jpe?g|gif|webp|avif|svg)$/i;
const IMAGE_MIME_VALUE_PATTERN = /^image\/(?:png|jpe?g|gif|webp|avif|svg\+xml)$/i;
const IMAGE_QUERY_KEYS = ['format', 'fm', 'ext', 'type', 'content-type', 'content_type'];

function stripTrailingUrlPunctuation(rawUrl: string): string {
  let url = rawUrl;
  while (/[.,;:!?\])}]+$/.test(url)) {
    url = url.slice(0, -1);
  }
  return url;
}

function getImageQueryValue(parsed: URL): string | null {
  for (const key of IMAGE_QUERY_KEYS) {
    const value = parsed.searchParams.get(key);
    if (!value) continue;
    const normalized = value.trim().replace(/^\./, '');
    if (IMAGE_QUERY_VALUE_PATTERN.test(normalized) || IMAGE_MIME_VALUE_PATTERN.test(normalized)) {
      return normalized;
    }
  }
  return null;
}

export function isPreviewableImageUrl(rawUrl: string): boolean {
  const url = stripTrailingUrlPunctuation(rawUrl.trim());
  if (!url) return false;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

  const pathname = decodeURIComponent(parsed.pathname).toLowerCase();
  if (IMAGE_EXTENSION_PATTERN.test(pathname)) return true;

  return getImageQueryValue(parsed) !== null;
}

export function findPreviewableImageUrls(text: string): ImageUrlMatch[] {
  const matches: ImageUrlMatch[] = [];
  URL_PATTERN.lastIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const rawUrl = match[0];
    const url = stripTrailingUrlPunctuation(rawUrl);
    if (!isPreviewableImageUrl(url)) continue;

    const from = match.index ?? 0;
    matches.push({
      url,
      from,
      to: from + url.length,
    });
  }

  return matches;
}

function hasCodeMark(node: ProseMirrorNode): boolean {
  return node.marks.some((mark) => mark.type.name === 'code');
}

function createImagePreviewWidget(url: string): HTMLElement {
  const wrapper = document.createElement('span');
  wrapper.className = 'image-url-preview';
  wrapper.setAttribute('contenteditable', 'false');

  const image = document.createElement('img');
  image.src = url;
  image.alt = '图片预览';
  image.loading = 'lazy';
  image.decoding = 'async';
  image.referrerPolicy = 'no-referrer';
  image.addEventListener('error', () => {
    wrapper.dataset.error = 'true';
    wrapper.textContent = '图片无法预览';
  });

  wrapper.appendChild(image);
  return wrapper;
}

export function buildImageUrlPreviewDecorations(doc: ProseMirrorNode): DecorationSet {
  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (node.type.name === 'code_block') return false;
    if (!node.isText || !node.text) return true;
    if (hasCodeMark(node)) return true;

    for (const match of findPreviewableImageUrls(node.text)) {
      decorations.push(
        Decoration.widget(pos + match.to, () => createImagePreviewWidget(match.url), {
          key: `image-url-preview-${pos + match.from}-${match.url}`,
          side: 1,
        })
      );
    }

    return true;
  });

  return DecorationSet.create(doc, decorations);
}

export const imageUrlPreviewPlugin = $prose(() => {
  return new Plugin<ImageUrlPreviewState>({
    key: imageUrlPreviewKey,
    state: {
      init: (_, state) => ({
        decorations: buildImageUrlPreviewDecorations(state.doc),
      }),
      apply(tr, pluginState, _oldState, newState) {
        if (!tr.docChanged) return pluginState;
        return {
          decorations: buildImageUrlPreviewDecorations(newState.doc),
        };
      },
    },
    props: {
      decorations(state) {
        return imageUrlPreviewKey.getState(state)?.decorations ?? DecorationSet.empty;
      },
    },
  });
});

export default imageUrlPreviewPlugin;
