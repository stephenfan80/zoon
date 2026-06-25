import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  findPreviewableImageUrls,
  isPreviewableImageUrl,
} from '../editor/plugins/image-url-preview.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const root = process.cwd();
const editor = readFileSync(path.join(root, 'src/editor/index.ts'), 'utf8');
const html = readFileSync(path.join(root, 'src/index.html'), 'utf8');

assert(isPreviewableImageUrl('https://cdn.example.com/photo.png'), 'Direct png URLs should preview');
assert(isPreviewableImageUrl('https://cdn.example.com/photo.jpg?width=1200'), 'Direct jpg URLs with query params should preview');
assert(isPreviewableImageUrl('https://pbs.twimg.com/media/example?format=jpg&name=large'), 'Common image format query URLs should preview');
assert(isPreviewableImageUrl('https://example.com/file?content-type=image/webp'), 'Common image MIME query URLs should preview');
assert(!isPreviewableImageUrl('https://example.com/article'), 'Plain article URLs should not preview');
assert(!isPreviewableImageUrl('https://example.com/photo?auto=format'), 'Generic auto=format queries should not preview without an image format');
assert(!isPreviewableImageUrl('javascript:alert(1)'), 'Non-http URLs should not preview');

const matches = findPreviewableImageUrls('图 https://cdn.example.com/a.webp. 文 https://example.com/post');
assert(matches.length === 1, `Expected one image URL match, got ${matches.length}`);
assert(matches[0]?.url === 'https://cdn.example.com/a.webp', 'Image URL matching should strip trailing punctuation');

assert(editor.includes("import { imageUrlPreviewPlugin } from './plugins/image-url-preview';"), 'Editor should import the image URL preview plugin');
assert(editor.includes('.use(imageUrlPreviewPlugin)'), 'Editor should register the image URL preview plugin');
assert(html.includes('.image-url-preview'), 'Editor CSS should include the image URL preview block');
assert(html.includes('md 文档中还是 URL') === false, 'Implementation should not hard-code requirement text into the UI');

console.log('✓ image URL preview detection and wiring');
