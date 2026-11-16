import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parse } from './parse.js';

// Harness driver: read the case list, render each markdown document
// with parse(), and dump the HTML results in order as a JSON array.
const input = JSON.parse(readFileSync('/input/cases.json', 'utf8'));
const rendered = [];
for (const c of input) rendered.push(parse(c.markdown));
mkdirSync('/output', { recursive: true });
writeFileSync('/output/html.json', JSON.stringify(rendered));
