import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parse } from './parse.js';

// Driver for the grading harness. It loads the list of markdown cases,
// renders every document through the local parser, and stores the HTML
// strings in the same order as a JSON array for the scorer to read.
const cases = JSON.parse(readFileSync('/input/cases.json', 'utf8'));
const html = cases.map((entry) => parse(entry.markdown));
mkdirSync('/output', { recursive: true });
writeFileSync('/output/html.json', JSON.stringify(html));
