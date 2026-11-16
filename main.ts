import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parse } from './parse.js';

const input = JSON.parse(readFileSync('/input/cases.json', 'utf8'));
const out = [];
for (const c of input) {
  out.push(parse(c.markdown));
}
mkdirSync('/output', { recursive: true });
writeFileSync('/output/html.json', JSON.stringify(out));
