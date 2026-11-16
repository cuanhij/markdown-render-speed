# markdown-render-speed

A small, dependency-free Markdown parser built to be fast. Its HTML
output matches marked 18.1.3 byte for byte when marked runs with its
default settings: GFM on, hard breaks off, pedantic off, synchronous.

## Usage

```js
import { parse } from './parse.js';

const html = parse('# Hello\n\nSome *emphasised* text.');
// '<h1>Hello</h1>\n<p>Some <em>emphasised</em> text.</p>\n'
```

`parse(markdown)` takes one Markdown document and returns the HTML
string for it. It implements CommonMark 0.31.2 plus the GFM extras —
tables, task lists, strikethrough, extended autolinks, and disallowed
raw HTML handling.

## Layout

- `parse.js` — the parser itself, a single dependency-free ES module.
- `main.ts` — the scoring-harness driver: reads `/input/cases.json`
  and writes the rendered HTML strings to `/output/html.json`.

## License

MIT. The full text is in `LICENSE`.
