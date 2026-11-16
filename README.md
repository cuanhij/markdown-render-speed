# markdown-render-speed

A Markdown parser with no dependencies, written for raw speed. It
renders Markdown to HTML that matches marked 18.1.3 byte for byte under
the default configuration (GFM on, hard breaks off, pedantic off, sync).

## Usage

```js
import { parse } from './parse.js';

parse('# Hello\n\nSome *emphasised* text.');
// '<h1>Hello</h1>\n<p>Some <em>emphasised</em> text.</p>\n'
```

`parse(markdown)` takes one Markdown document and returns its HTML.
Coverage includes CommonMark 0.31.2 plus the GFM extensions: tables,
task-list items, strikethrough, extended autolinks, and disallowed raw
HTML handling.

## Layout

- `parse.js` — the parser itself, a single self-contained ES module.
- `main.ts` — the harness driver: it reads cases from
  `/input/cases.json` and writes the rendered HTML array to
  `/output/html.json`.

## License

MIT — see `LICENSE` for the full text.
