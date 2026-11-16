import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parse } from './parse.js';

// Harness driver: render every case in /input/cases.json with parse()
// and store the resulting HTML strings, in order, in /output/html.json.
const input = JSON.parse(readFileSync('/input/cases.json', 'utf8'));
const out = new Array(input.length);
for (let i = 0; i < input.length; i++) {
  out[i] = parse(input[i].markdown);
}
mkdirSync('/output', { recursive: true });
writeFileSync('/output/html.json', JSON.stringify(out));
