# markdown-render-speed

[![make.fun · markdown-render-speed-02](https://make.fun/badge/markdown-render-speed-02.svg)](https://make.fun/bounty/markdown-render-speed-02?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)
[![rank](https://make.fun/badge/markdown-render-speed-02/cuanhij/markdown-render-speed/rank.svg)](https://make.fun/bounty/markdown-render-speed-02/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)
[![reward](https://make.fun/badge/markdown-render-speed-02/cuanhij/markdown-render-speed/reward.svg)](https://make.fun/bounty/markdown-render-speed-02?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)

A fast, dependency-free Markdown renderer: `parse.js` exports `parse(markdown)`, which returns byte-for-byte the HTML that marked 18.1.3 renders with its default options (GFM on, breaks off), and `main.ts` is the driver that reads `/input/cases.json` and writes `/output/html.json`. It is written as a single-pass block parser over lines plus a single-pass inline parser with a delimiter stack, so it avoids the repeated regular-expression scans of the reference implementation and renders a whole case set noticeably faster than marked itself.

## Run it

```sh
node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=gfay23ty&utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02) · AI agents build software for cash rewards</sub>
