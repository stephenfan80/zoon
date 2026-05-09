/**
 * Suggestion Mark Schemas for Milkdown
 *
 * Three marks for track changes functionality:
 * - insertion: new content added (green highlight)
 * - deletion: content marked for removal (red strikethrough)
 * - modification: content with changed attributes (yellow)
 */

import { $markSchema, $markAttr } from '@milkdown/kit/utils';
import type { Attrs } from '@milkdown/kit/prose/model';

// Insertion mark attributes
export const insertionAttr = $markAttr('insertion', () => ({
  suggestionId: {},
  createdAt: {},
  authorId: {},
}));

// Insertion mark schema - new content
export const insertionMarkSchema = $markSchema('insertion', (ctx) => ({
  attrs: {
    suggestionId: { default: null },
    createdAt: { default: null },
    authorId: { default: 'unknown' },
  },
  inclusive: true,
  spanning: true,
  parseDOM: [{
    tag: 'span.suggestion-insertion',
    getAttrs: (dom: HTMLElement): Attrs => ({
      suggestionId: parseInt(dom.getAttribute('data-suggestion-id') || '0', 10) || null,
      createdAt: dom.getAttribute('data-created-at'),
      authorId: dom.getAttribute('data-author-id') || 'unknown',
    }),
  }],
  toDOM: (mark) => {
    const attrs = ctx.get(insertionAttr.key)(mark);
    return [
      'span',
      {
        class: 'suggestion-insertion',
        'data-suggestion-id': mark.attrs.suggestionId,
        'data-created-at': mark.attrs.createdAt,
        'data-author-id': mark.attrs.authorId,
        style: 'background-color: rgba(232, 201, 125, 0.18); border-bottom: 1px solid rgba(140, 111, 42, 0.38); border-radius: 3px;',
        ...attrs,
      },
      0,
    ];
  },
  parseMarkdown: {
    match: () => false,
    runner: () => {},
  },
  toMarkdown: {
    match: (mark) => mark.type.name === 'insertion',
    runner: () => false,
  },
}));

// Deletion mark attributes
export const deletionAttr = $markAttr('deletion', () => ({
  suggestionId: {},
  createdAt: {},
  authorId: {},
}));

// Deletion mark schema - content to be removed
export const deletionMarkSchema = $markSchema('deletion', (ctx) => ({
  attrs: {
    suggestionId: { default: null },
    createdAt: { default: null },
    authorId: { default: 'unknown' },
  },
  inclusive: false,
  spanning: true,
  parseDOM: [{
    tag: 'span.suggestion-deletion',
    getAttrs: (dom: HTMLElement): Attrs => ({
      suggestionId: parseInt(dom.getAttribute('data-suggestion-id') || '0', 10) || null,
      createdAt: dom.getAttribute('data-created-at'),
      authorId: dom.getAttribute('data-author-id') || 'unknown',
    }),
  }],
  toDOM: (mark) => {
    const attrs = ctx.get(deletionAttr.key)(mark);
    return [
      'span',
      {
        class: 'suggestion-deletion',
        'data-suggestion-id': mark.attrs.suggestionId,
        'data-created-at': mark.attrs.createdAt,
        'data-author-id': mark.attrs.authorId,
        style: 'background-color: rgba(232, 201, 125, 0.11); text-decoration: line-through; text-decoration-thickness: 0.08em; text-decoration-color: rgba(140, 111, 42, 0.34); color: rgba(54, 50, 45, 0.62);',
        ...attrs,
      },
      0,
    ];
  },
  parseMarkdown: {
    match: () => false,
    runner: () => {},
  },
  toMarkdown: {
    match: (mark) => mark.type.name === 'deletion',
    runner: () => false,
  },
}));

// Modification mark attributes
export const modificationAttr = $markAttr('modification', () => ({
  suggestionId: {},
  createdAt: {},
  authorId: {},
  originalAttrs: {},
}));

// Modification mark schema - changed attributes
export const modificationMarkSchema = $markSchema('modification', (ctx) => ({
  attrs: {
    suggestionId: { default: null },
    createdAt: { default: null },
    authorId: { default: 'unknown' },
    originalAttrs: { default: null },
  },
  inclusive: false,
  spanning: true,
  parseDOM: [{
    tag: 'span.suggestion-modification',
    getAttrs: (dom: HTMLElement): Attrs => ({
      suggestionId: parseInt(dom.getAttribute('data-suggestion-id') || '0', 10) || null,
      createdAt: dom.getAttribute('data-created-at'),
      authorId: dom.getAttribute('data-author-id') || 'unknown',
      originalAttrs: dom.getAttribute('data-original-attrs'),
    }),
  }],
  toDOM: (mark) => {
    const attrs = ctx.get(modificationAttr.key)(mark);
    return [
      'span',
      {
        class: 'suggestion-modification',
        'data-suggestion-id': mark.attrs.suggestionId,
        'data-created-at': mark.attrs.createdAt,
        'data-author-id': mark.attrs.authorId,
        'data-original-attrs': mark.attrs.originalAttrs,
        style: 'background-color: rgba(234, 179, 8, 0.25); border-bottom: 2px dashed rgb(234, 179, 8);',
        ...attrs,
      },
      0,
    ];
  },
  parseMarkdown: {
    match: () => false,
    runner: () => {},
  },
  toMarkdown: {
    match: (mark) => mark.type.name === 'modification',
    runner: () => false,
  },
}));

// Export all for registration
export const suggestionMarkPlugins = [
  insertionAttr,
  insertionMarkSchema,
  deletionAttr,
  deletionMarkSchema,
  modificationAttr,
  modificationMarkSchema,
];
