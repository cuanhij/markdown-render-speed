# markdown-render-speed

A fast Markdown parser with zero dependencies. It converts Markdown to
HTML that is byte-identical to what marked 18.1.3 produces with its
default options (GFM enabled, breaks disabled, pedantic off, sync mode).

## How to use it

```js
import { parse } from './parse.js';

parse('# Hello\n\nSome *emphasised* text.');
// '<h1>Hello</h1>\n<p>Some <em>emphasised</em> text.</p>\n'
```

`parse(markdown)` takes a single Markdown document and returns its HTML.
It handles CommonMark 0.31.2 plus the GFM additions: tables, task list
items, strikethrough, extended autolinks, and disallowed raw HTML.

## What is in this repo

- `parse.js` — the parser, one self-contained ES module.
- `main.ts` — the driver the scoring harness runs: it reads the cases
  from `/input/cases.json` and writes all rendered HTML to
  `/output/html.json`.

## License

MIT — the full license text is in `LICENSE`.
