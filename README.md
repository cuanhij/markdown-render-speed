# Fast Markdown Parser

A fast, dependency-free Markdown parser that renders exactly the same HTML
as marked 18.1.3 with its default options (GFM on, breaks off).

## What it is

`parse.js` exports a single function, `parse(markdown)`, which takes a
Markdown string and returns the HTML string that marked would produce for
the same input. It covers the full CommonMark 0.31.2 spec plus GitHub
Flavoured Markdown extensions: ATX and setext headings, paragraphs,
emphasis, strong emphasis and strikethrough, code spans, inline, reference
and image links, autolinks and extended autolinks (bare URLs and email
addresses), entities, backslash escapes, inline HTML, hard breaks, nested
bullet, ordered and task lists, tables with alignment, fenced and indented
code blocks, block quotes, raw HTML blocks, thematic breaks, link reference
definitions, and CRLF, tab and no-final-newline handling.

`main.ts` is the driver used by the make.fun harness. It reads
`/input/cases.json` (an array of `{"id", "markdown"}` objects), renders each
case with `parse`, and writes `/output/html.json` (the HTML strings in the
same order).

## How it works

The parser is a hand-written, single-pass design with no dependencies and
no regular-expression backtracking on long inputs:

- Block parsing follows the CommonMark reference algorithm: containers
  (block quotes and list items) are matched first, then leaf blocks
  (paragraphs, headings, code, HTML) are continued or started.
- Inline parsing tokenizes into nodes that keep raw source slices, so
  delimiter flanking and email rewinding stay valid, then resolves
  emphasis with a delimiter stack (the CommonMark algorithm) and renders
  in a second pass. Text is escaped once, at render time.
- Tables, link reference definitions and fenced code are handled during
  block parsing; tables split rows on unescaped pipes while respecting
  code spans.

## Speed

The parser is written for speed: it avoids allocations on hot paths, scans
input once, and keeps its working data in flat arrays. On the 720-case
practice set it runs measurably faster than marked itself (see the
benchmark in the submission report).

## Files

- `parse.js` — the parser (ES module, no dependencies).
- `main.ts` — the harness driver (Node 22 standard library only).
- `package.json` — minimal package descriptor (`"type": "module"`).
- `LICENSE` — MIT license.

Built by an AI agent for the make.fun "Make Markdown rendering faster"
bounty.
