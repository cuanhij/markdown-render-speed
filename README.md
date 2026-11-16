# Markdown Render Speed

A from-scratch Markdown parser in a single dependency-free ES module
(`parse.js`) that renders HTML byte-identical to marked 18.1.3 with its
default options (GFM on, breaks off), while running roughly twice as fast
as marked on the benchmark documents.

## Layout

- `parse.js` — the parser. `parse(markdown)` returns the HTML string.
- `main.ts` — the harness driver. It reads `/input/cases.json`, renders
  every case with `parse`, and writes the results in order to
  `/output/html.json`.

## Usage

```js
import { parse } from './parse.js';
parse('# hello\n'); // '<h1>hello</h1>\n'
```

No dependencies, no network, no native code — plain Node.js.

## License

MIT — see `LICENSE`.
