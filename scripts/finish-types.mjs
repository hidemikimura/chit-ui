/**
 * Copies the hand-written global declarations into the emitted types and makes
 * the package entry point reference them.
 *
 * tsc generates a .d.ts per source file, but the tag-name map and the event map
 * are declarations no JSDoc can express. Without the reference below, a
 * TypeScript consumer gets the class but not `document.querySelector('chit-ui')`
 * or a typed `addEventListener('chat-submit', ...)`.
 */
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';

const REFERENCE = '/// <reference path="./global.d.ts" />\n';
const entry = 'dist/types/index.d.ts';

copyFileSync('src/global.d.ts', 'dist/types/global.d.ts');

const current = readFileSync(entry, 'utf8');
if (!current.startsWith(REFERENCE)) writeFileSync(entry, REFERENCE + current);

console.log('types: global declarations linked from the entry point');
