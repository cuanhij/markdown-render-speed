# markdown-render-speed

A fast, dependency-free Markdown parser that renders HTML byte-identical
to marked 18.1.3 with default options (GFM on, breaks off, pedantic off).

## Usage

```js
import { parse } from './parse.js';

parse('# Hello\n\nSome *emphasised* text.');
// '<h1>Hello</h1>\n<p>Some <em>emphasised</em> text.</p>\n'
```

`parse(markdown)` takes a Markdown string and returns an HTML string.
It implements CommonMark 0.31.2 plus the GitHub Flavored Markdown
extensions (tables, task list items, strikethrough, extended autolinks
and disallowed raw HTML).

## Layout

- `parse.js` — the parser, a single dependency-free ES module.
- `main.ts` — the harness driver: reads `/input/cases.json` and writes
  `/output/html.json`.

## License

MIT. See `LICENSE`.
