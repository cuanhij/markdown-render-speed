// Driver for the fast Markdown renderer in parse.js.
// Reads every case from /input/cases.json (or MAKEFUN_INPUT_DIR), renders
// each case alone with parse(), and writes the HTML strings, in order,
// as a JSON array to /output/html.json (or MAKEFUN_OUTPUT_DIR).

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from './parse.js';

const inputDir = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const cases = JSON.parse(readFileSync(join(inputDir, 'cases.json'), 'utf8')) as { id: string; markdown: string }[];
const html: string[] = new Array(cases.length);
for (let i = 0; i < cases.length; i++) {
  html[i] = parse(cases[i].markdown);
}
writeFileSync(join(outputDir, 'html.json'), JSON.stringify(html));
