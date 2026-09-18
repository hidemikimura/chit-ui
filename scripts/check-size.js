// Fails the build when the single-file bundle exceeds the gzip budget.
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';

const LIMIT_KB = 30;
const files = ['dist/chit-ui.min.js', 'dist/chit-ui.iife.min.js'];

let failed = false;
for (const file of files) {
  const gzipped = gzipSync(readFileSync(file)).length / 1024;
  const over = gzipped > LIMIT_KB;
  failed ||= over;
  console.log(`${over ? 'FAIL' : 'ok  '} ${file}  ${gzipped.toFixed(1)} KB gzip (limit ${LIMIT_KB} KB)`);
}
if (failed) process.exit(1);
