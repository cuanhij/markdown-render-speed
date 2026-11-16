# markdown-render-speed

A dependency-free Markdown parser written for speed. It turns Markdown
into HTML that matches marked 18.1.3 byte for byte under its default
settings (GFM enabled, hard breaks off, pedantic off).

## Quick start

```js
import { parse } from './parse.js';

parse('# Hello\n\nSome *emphasised* text.');
// '<h1>Hello</h1>\n<p>Some <em>emphasised</em> text.</p>\n'
```

`parse(markdown)` accepts one Markdown document and returns its HTML.
The parser covers CommonMark 0.31.2 together with the GitHub Flavored
Markdown additions: tables, task lists, strikethrough, extended
autolinks and disallowed raw HTML.

## Files

- `parse.js` — the whole parser, one ES module with no dependencies.
- `main.ts` — driver for the scoring harness: it reads the cases from
  `/input/cases.json` and writes the rendered HTML to `/output/html.json`.

## License

MIT — see `LICENSE`.
