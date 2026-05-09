import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..', '..');

const serverIndex = readFileSync(path.join(root, 'server', 'index.ts'), 'utf8');
const legalPages = readFileSync(path.join(root, 'server', 'legal-pages.ts'), 'utf8');

assert(serverIndex.includes("app.get('/privacy'"), 'Expected /privacy route');
assert(serverIndex.includes("app.get('/terms'"), 'Expected /terms route');
assert(legalPages.includes('Tokenized URLs'), 'Expected terms to explain tokenized URLs');
assert(legalPages.includes('Agent access'), 'Expected privacy policy to explain agent access');
assert(legalPages.includes('Do not put passwords, API keys'), 'Expected sensitive-data boundary');

console.log('✓ legal pages are wired for plugin marketplace policy links');
