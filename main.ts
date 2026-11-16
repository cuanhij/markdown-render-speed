import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parse } from './parse.js';

// Driver used by the scoring harness. It loads every case, renders the
// markdown of each one with parse(), and stores the resulting HTML
// strings — in the same order — as a JSON array.
const cases = JSON.parse(readFileSync('/input/cases.json', 'utf8'));
const html = cases.map((c) => parse(c.markdown));
mkdirSync('/output', { recursive: true });
writeFileSync('/output/html.json', JSON.stringify(html));
