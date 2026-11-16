import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parse } from './parse.js';

// Scoring driver: load the case list, render each document through
// parse(), and save the HTML strings in the same order.
const cases = JSON.parse(readFileSync('/input/cases.json', 'utf8'));
const html = cases.map((c) => parse(c.markdown));
mkdirSync('/output', { recursive: true });
writeFileSync('/output/html.json', JSON.stringify(html));
