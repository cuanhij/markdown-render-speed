// A fast, dependency-free Markdown renderer.
//
// parse(markdown) returns byte for byte the HTML that marked 18.1.3 renders
// with its default options (GFM on, breaks off, pedantic off, async off).
// It is written from the CommonMark 0.31.2 and GFM 0.29 specifications plus
// marked's observable behaviour on their examples, as a single pass over
// lines for blocks and a single pass with a delimiter stack for inline
// content. It keeps no state between calls: every parse is computed from
// the string it is given, with nothing cached across cases.

const ESCAPABLE = '!\"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';

function isSpace(c) {
  return c === 32 || c === 9 || c === 10 || c === 13 || c === 11 || c === 12;
}

function isAsciiPunct(c) {
  return (c >= 33 && c <= 47) || (c >= 58 && c <= 64) || (c >= 91 && c <= 96) || (c >= 123 && c <= 126);
}

// Unicode punctuation or symbol, following the CommonMark definition
// (a character in Unicode category P or S). Fast paths for ASCII, then a
// small range table for the Latin-1 and general punctuation blocks that
// actually appear in text; anything else falls back to a regex test that
// is only reached for non-ASCII characters.
const PUNCT_RE = /[\p{P}\p{S}]/u;
function isPunctCh(ch) {
  const c = ch.charCodeAt(0);
  if (c < 128) return isAsciiPunct(c);
  if (c < 256) {
    return (c >= 161 && c <= 191 && c !== 166 && c !== 167 && c !== 169 && c !== 171 && c !== 172 && c !== 174 && c !== 176 && c !== 177 && c !== 182 && c !== 183 && c !== 187 && c !== 188 && c !== 189 && c !== 190) ||
      c === 215 || c === 247;
  }
  return PUNCT_RE.test(ch);
}

function isAlphaNumCh(ch) {
  const c = ch.charCodeAt(0);
  if (c < 128) return (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
  return /[\p{L}\p{N}]/u.test(ch);
}

// Word characters for an email/URL boundary: [A-Za-z0-9._+-].
function isWordCh(ch) {
  const c = ch.charCodeAt(0);
  if (c < 128) return (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 46 || c === 95 || c === 43 || c === 45;
  return false;
}

function isWhitespaceCh(ch) {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v' || ch === '\u00a0' || ch === '\u1680' || (ch >= '\u2000' && ch <= '\u200a') || ch === '\u2028' || ch === '\u2029' || ch === '\u202f' || ch === '\u205f' || ch === '\u3000' || ch === '\ufeff';
}

// Escape &, <, >, " and ' for HTML. With encode, every & is escaped; without
// it, an & that starts a character reference (&name;, &#123;, &#x1f;) is left
// alone, exactly as marked's escapeHtmlEntities does.
function escapeHtml(s, encode) {
  let out = '';
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    let rep = null;
    if (c === 38) { // &
      if (encode) rep = '&amp;';
      else {
        let j = i + 1;
        if (j < s.length && s.charCodeAt(j) === 35) { // #
          j++;
          if (j < s.length && (s.charCodeAt(j) === 120 || s.charCodeAt(j) === 88)) {
            j++;
            const h0 = j;
            while (j < s.length && ((s.charCodeAt(j) >= 48 && s.charCodeAt(j) <= 57) || (s.charCodeAt(j) >= 65 && s.charCodeAt(j) <= 70) || (s.charCodeAt(j) >= 97 && s.charCodeAt(j) <= 102))) j++;
            if (j > h0 && j < s.length && s.charCodeAt(j) === 59 && j - h0 <= 6) continue;
          } else {
            const d0 = j;
            while (j < s.length && s.charCodeAt(j) >= 48 && s.charCodeAt(j) <= 57) j++;
            if (j > d0 && j < s.length && s.charCodeAt(j) === 59 && j - d0 <= 7) continue;
          }
        } else {
          const w0 = j;
          while (j < s.length) {
            const wc = s.charCodeAt(j);
            if ((wc >= 48 && wc <= 57) || (wc >= 65 && wc <= 90) || (wc >= 97 && wc <= 122) || wc === 95) j++;
            else break;
          }
          if (j > w0 && j < s.length && s.charCodeAt(j) === 59) continue;
        }
        rep = '&amp;';
      }
    } else if (c === 60) rep = '&lt;';
    else if (c === 62) rep = '&gt;';
    else if (c === 34) rep = '&quot;';
    else if (c === 39) rep = '&#39;';
    if (rep !== null) {
      if (start < i) out += s.slice(start, i);
      out += rep;
      start = i + 1;
    }
  }
  if (start === 0) return s;
  if (start < s.length) out += s.slice(start);
  return out;
}

// Decode numeric character references in a run of plain text, as marked
// does: &#35; becomes #, &#x41; becomes A, zero / out of range / surrogate
// becomes U+FFFD, &#38; becomes &amp;, and a bare & that is not part of a
// numeric reference becomes &amp; so it cannot join its neighbours into a
// new reference. Named references are left alone.
function decodeNumeric(s) {
  if (s.indexOf('&') < 0) return s;
  let out = '';
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) !== 38) continue;
    // numeric reference?
    let j = i + 1;
    let code = -1;
    let ok = false;
    if (j < s.length && s.charCodeAt(j) === 35) {
      j++;
      if (j < s.length && (s.charCodeAt(j) === 120 || s.charCodeAt(j) === 88)) {
        j++;
        const h0 = j;
        let v = 0;
        while (j < s.length && j - h0 < 6) {
          const c = s.charCodeAt(j);
          let d = -1;
          if (c >= 48 && c <= 57) d = c - 48;
          else if (c >= 65 && c <= 70) d = c - 55;
          else if (c >= 97 && c <= 102) d = c - 87;
          if (d < 0) break;
          v = v * 16 + d;
          j++;
        }
        if (j > h0 && j < s.length && s.charCodeAt(j) === 59) { code = v; ok = true; }
      } else {
        const d0 = j;
        let v = 0;
        while (j < s.length && j - d0 < 7) {
          const c = s.charCodeAt(j);
          if (c < 48 || c > 57) break;
          v = v * 10 + (c - 48);
          j++;
        }
        if (j > d0 && j < s.length && s.charCodeAt(j) === 59) { code = v; ok = true; }
      }
      if (ok) {
        if (start < i) out += s.slice(start, i);
        if (code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) out += '\ufffd';
        else if (code === 38) out += '&amp;';
        else out += String.fromCodePoint(code);
        i = j;
        start = j + 1;
        continue;
      }
    }
    // bare & that is not the start of any valid reference: escape it.
    let k = i + 1;
    let valid = false;
    if (k < s.length && s.charCodeAt(k) === 35) {
      k++;
      if (k < s.length && (s.charCodeAt(k) === 120 || s.charCodeAt(k) === 88)) {
        k++;
        const h0 = k;
        while (k < s.length && ((s.charCodeAt(k) >= 48 && s.charCodeAt(k) <= 57) || (s.charCodeAt(k) >= 65 && s.charCodeAt(k) <= 70) || (s.charCodeAt(k) >= 97 && s.charCodeAt(k) <= 102))) k++;
        if (k > h0 && k < s.length && s.charCodeAt(k) === 59 && k - h0 <= 6) valid = true;
      } else {
        const d0 = k;
        while (k < s.length && s.charCodeAt(k) >= 48 && s.charCodeAt(k) <= 57) k++;
        if (k > d0 && k < s.length && s.charCodeAt(k) === 59 && k - d0 <= 7) valid = true;
      }
    } else {
      const w0 = k;
      while (k < s.length) {
        const wc = s.charCodeAt(k);
        if ((wc >= 48 && wc <= 57) || (wc >= 65 && wc <= 90) || (wc >= 97 && wc <= 122) || wc === 95) k++;
        else break;
      }
      if (k > w0 && k < s.length && s.charCodeAt(k) === 59) valid = true;
    }
    if (!valid) {
      if (start < i) out += s.slice(start, i);
      out += '&amp;';
      start = i + 1;
    }
  }
  if (start === 0) return s;
  if (start < s.length) out += s.slice(start);
  return out;
}

function cleanUrl(href) {
  try {
    return encodeURI(href).replace(/%25/g, '%');
  } catch {
    return null;
  }
}

// Link labels are matched case-insensitively with a Unicode case fold,
// internal whitespace collapsed to one space, ends trimmed.
function normalizeLabel(label) {
  return label.trim().replace(/\s+/g, ' ').toLowerCase().toUpperCase().toLowerCase();
}

// Index of the closing bracket that balances the bracket at position 0 of
// `str` when scanning for pair b (e.g. '()'): -1 if none, -2 if unbalanced
// with more opens than closes, otherwise the index of the unmatched close.
function findClosingBracket(str, b) {
  if (str.indexOf(b[0]) === -1 && str.indexOf(b[1]) === -1) return -1;
  let level = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === '\\') i++;
    else if (c === b[0]) level++;
    else if (c === b[1]) {
      level--;
      if (level < 0) return i;
    }
  }
  return level > 0 ? -2 : -1;
}

function rtrimChar(s, ch) {
  let i = s.length;
  while (i > 0 && s.charCodeAt(i - 1) === ch) i--;
  return s.slice(0, i);
}

// Split a table row on unescaped pipes, trimming cells and dropping the
// empty cells a leading or trailing pipe creates; pad or cut to `count`.
function splitCells(row, count) {
  const cells = [];
  let cur = '';
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    if (c === '\\' && i + 1 < row.length && row[i + 1] === '|') {
      cur += '\\|';
      i++;
    } else if (c === '|') {
      cells.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  cells.push(cur);
  if (cells.length > 0 && cells[0].trim() === '') cells.shift();
  if (cells.length > 0 && cells[cells.length - 1].trim() === '') cells.pop();
  if (count) {
    if (cells.length > count) cells.length = count;
    else while (cells.length < count) cells.push('');
  }
  for (let i = 0; i < cells.length; i++) {
    cells[i] = cells[i].trim().replace(/\\\|/g, '|');
  }
  return cells;
}

// Expand tabs in `line` to the next multiple of 4 columns, starting at `col`.
function expandTabs(line, col) {
  if (line.indexOf('\t') < 0) return line;
  let out = '';
  let c = col;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '\t') {
      const add = 4 - (c % 4);
      out += '    '.slice(0, add);
      c += add;
    } else {
      out += ch;
      c++;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Inline parsing
// ---------------------------------------------------------------------------
// Nodes are small arrays: ['t', text, raw?] plain text (raw: inside a raw
// block, so it is kept literally), ['esc', ch] a backslash escape,
// ['code', text] a code span, ['html', text] an inline tag,
// ['br'] a hard break, ['link', href, title, children, autolink],
// ['img', href, title, alt], ['delim', ch, len, canOpen, canClose] a
// delimiter run (turned into em/strong/del by the delimiter stack),
// ['em', children], ['strong', children], ['del', children].

// next character that needs individual handling in the inline scanner
// (a token starter, an escape, an entity, a newline, or whitespace)
const NEXT_SPECIAL = /[\[!`*_~<\\&\n \t]/g;

function backpedal(s) {
  // marked's _backpedal, scanned left to right like its regex:
  // (?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+
  // A plain run stops at any of ?!.,:;*_'"~()&; a ( ... ) group (no nested
  // parens) is consumed whole, so a `)` closing an inner `(` is kept; a
  // run of ?!.,:;*_'"~) is only consumed when more text follows it, so a
  // trailing run of it goes; a `&` that starts a trailing `&name;` entity
  // is not consumed, so the entity goes entirely. A lone trailing `&` is
  // kept.
  const n = s.length;
  const EXCL = '?!.,:;*_\'"~()&';
  const PUNCT = '?!.,:;*_\'"~)';
  let i = 0;
  while (i < n) {
    const c = s[i];
    if (EXCL.indexOf(c) < 0) {
      while (i < n && EXCL.indexOf(s[i]) < 0) i++;
    } else if (c === '(') {
      const close = s.indexOf(')', i + 1);
      if (close < 0) break;
      i = close + 1;
    } else if (c === '&') {
      // a trailing &name; entity is not consumed
      let j = i + 1;
      while (j < n && /[a-zA-Z0-9]/.test(s[j])) j++;
      if (j > i + 1 && j < n && s[j] === ';' && j === n - 1) break;
      i++;
    } else if (PUNCT.indexOf(c) >= 0) {
      let j = i;
      while (j < n && PUNCT.indexOf(s[j]) >= 0) j++;
      if (j === n) break;
      i = j;
    } else break;
  }
  return s.slice(0, i);
}

// marked's masked source, used only by the emStrong/del closer scan:
// links, code spans, html and escapes are masked (to the same length)
// so their delimiters do not count as emphasis closers. The masking
// regexes are deliberately simple — blockSkip's code regex pairs the
// first backtick run with the next run of the same length, even across
// a link label boundary, so a mismatched `` ``url` `` in a label makes
// it swallow the link destination and following text as a spurious
// code span, hiding the `_`s inside it from the emphasis scan.
const ANYPUNCT_OUTSIDE_CODE = /(`+)(?:[^`]|[^`][\s\S]*?[^`])\1(?!`)|`+|\\([\p{P}\p{S}])/gu;
const BLOCKSKIP = /\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)|(?<!`)()(?<b>`+)[^`]+\k<b>(?!`)|<(?! )[^<>]*?>/g;

function maskSrc(src, refs) {
  let m = src;
  // Mask out reflinks (only when reference links are defined and the
  // text holds a '['); a candidate holding a link is not a link, so
  // mask the links it holds instead. Images are exempt.
  if (refs && refs.size > 0 && src.includes('[')) {
    const maskReflink = (match0) => {
      const refStart = match0.lastIndexOf('[');
      if (!refs.has(normalizeLabel(match0.slice(refStart + 1, -1)))) return match0;
      if (refStart > 1 && match0.charAt(0) !== '!') {
        const text = match0.slice(1, refStart - 1);
        if (linkInText(text, refs)) {
          return '[' + text.replace(REFLINK_SEARCH, maskReflink) + '][' + 'a'.repeat(match0.length - refStart - 2) + ']';
        }
      }
      return '[' + 'a'.repeat(match0.length - 2) + ']';
    };
    m = m.replace(REFLINK_SEARCH, maskReflink);
  }
  // Mask out escaped characters and the backticks inside code spans
  // (the span's own backticks stay, so blockSkip still skips it).
  m = m.replace(ANYPUNCT_OUTSIDE_CODE, (match0, code, punct) => {
    if (punct) return '+'.repeat(match0.length);
    if (code) return code + match0.slice(code.length, -code.length).replace(/`/g, '+') + code;
    return match0;
  });
  // Mask out links, code spans and html tags to [aaa...].
  m = m.replace(BLOCKSKIP, (match0) => '[' + 'a'.repeat(match0.length - 2) + ']');
  return m;
}

// Does this link text hold a link already? An image does not count.
function linkInText(text, refs) {
  if (!text.includes('[')) return false;
  for (const match of text.matchAll(BLOCKSKIP)) {
    // blockSkip also matches code spans and html; only a match starting
    // with `[` is a link, and the `!` of an image is left out of the
    // match, so read the character before it
    if (match[0][0] === '[' && text.charAt(match.index - 1) !== '!') return true;
  }
  for (const match of text.matchAll(REFLINK_SEARCH)) {
    const match0 = match[0];
    const refStart = match0.lastIndexOf('[');
    if (match0.charAt(0) === '!' || !refs.has(normalizeLabel(match0.slice(refStart + 1, -1)))) continue;
    if (refStart > 1 && linkInText(match0.slice(1, refStart - 1), refs)) continue;
    return true;
  }
  return false;
}

const REFLINK_SEARCH = /!?\[((?:[^\[\]\\`]*(?:\[(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\]))){0,999}?[^\[\]\\`]*?)\]\[((?!\s*\])(?:\\[\s\S]|[^\[\]\\]){1,999})\]|!?\[((?!\s*\])(?:\\[\s\S]|[^\[\]\\]){1,999})\](?:\[\])?(?!\()/g;

// Try to match an inline HTML tag at src[i] (i points at '<').
// Returns the tag text or ''.
function matchTag(src, i) {
  const n = src.length;
  if (src.startsWith('<!--', i)) {
    // `<!-->` and `<!--->` are empty comments ending at the `>`
    if (src.startsWith('<!-->', i)) return src.slice(i, i + 5);
    if (src.startsWith('<!--->', i)) return src.slice(i, i + 6);
    const end = src.indexOf('-->', i + 4);
    if (end < 0) return '';
    return src.slice(i, end + 3);
  }
  if (src.startsWith('<?', i)) {
    const end = src.indexOf('?>', i + 2);
    if (end < 0) return '';
    return src.slice(i, end + 2);
  }
  if (src.startsWith('<![CDATA[', i)) {
    const end = src.indexOf(']]>', i + 9);
    if (end < 0) return '';
    return src.slice(i, end + 3);
  }
  if (src.startsWith('<!', i)) {
    // declaration: <! + letter, up to the next >
    if (i + 2 < n && /[a-zA-Z]/.test(src[i + 2])) {
      const end = src.indexOf('>', i + 2);
      if (end < 0) return '';
      return src.slice(i, end + 1);
    }
    return '';
  }
  // closing tag
  if (src.startsWith('</', i)) {
    let j = i + 2;
    if (j >= n || !/[a-zA-Z]/.test(src[j])) return '';
    j++;
    while (j < n && /[a-zA-Z0-9-]/.test(src[j])) j++;
    while (j < n && (src[j] === ' ' || src[j] === '\t')) j++;
    if (j < n && src[j] === '>') return src.slice(i, j + 1);
    return '';
  }
  // open tag
  let j = i + 1;
  if (j >= n || !/[a-zA-Z]/.test(src[j])) return '';
  j++;
  while (j < n && /[a-zA-Z0-9-]/.test(src[j])) j++;
  // marked's attribute regex requires whitespace before each attribute;
  // after the tag name and after a valued attribute, whitespace is
  // required (needWs). After a valueless attribute the whitespace was
  // already consumed by the `=` probe, so no whitespace is needed.
  let needWs = true;
  while (j < n) {
    // whitespace then an attribute, or the tag end
    let k = j;
    while (k < n && (src[k] === ' ' || src[k] === '\t' || src[k] === '\n' || src[k] === '\r' || src[k] === '\f')) k++;
    if (k < n && src[k] === '/') {
      if (k + 1 < n && src[k + 1] === '>') return src.slice(i, k + 2);
      return '';
    }
    if (k < n && src[k] === '>') return src.slice(i, k + 1);
    if (k === j && needWs) return '';
    j = k;
    needWs = true;
    // attribute name
    if (j >= n || !/[a-zA-Z:_]/.test(src[j])) return '';
    j++;
    while (j < n && /[\w.:-]/.test(src[j])) j++;
    // optional = value
    let m = j;
    while (m < n && (src[m] === ' ' || src[m] === '\t' || src[m] === '\n' || src[m] === '\r' || src[m] === '\f')) m++;
    if (m < n && src[m] === '=') {
      m++;
      while (m < n && (src[m] === ' ' || src[m] === '\t' || src[m] === '\n' || src[m] === '\r' || src[m] === '\f')) m++;
      if (m < n && (src[m] === '"' || src[m] === "'")) {
        const q = src[m];
        m++;
        while (m < n && src[m] !== q) m++;
        if (m >= n) return '';
        m++;
      } else {
        const v0 = m;
        while (m < n && src[m] !== ' ' && src[m] !== '\t' && src[m] !== '\n' && src[m] !== '\r' && src[m] !== '\f' && src[m] !== '"' && src[m] !== "'" && src[m] !== '=' && src[m] !== '<' && src[m] !== '>' && src[m] !== '`') m++;
        if (m === v0) return '';
      }
      j = m;
      needWs = true;
    } else {
      // valueless attribute: the whitespace after it was consumed by
      // the probe, so the next attribute needs no further whitespace
      j = m;
      needWs = false;
    }
  }
  return '';
}

// Whether the label's closing `]` sits inside an inline HTML tag or an
// autolink that starts inside the label (marked's isLabelEndInsideToken):
// the link is then not a link at all. contentStart is the index in src
// where the label's content begins.
function labelEndInsideToken(src, contentStart, label) {
  if (label.indexOf('<') < 0) return false;
  const n = src.length;
  for (let i = 0; i < label.length; i++) {
    if (label[i] === '\\') { i++; continue; }
    if (label[i] === '`') {
      // skip a code span so a `<` inside it is not seen as a tag
      let k = i;
      while (k < n && label[k] === '`') k++;
      const run = k - i;
      let p = k;
      let found = -1;
      while (p < label.length) {
        if (label[p] === '`') {
          let q = p;
          while (q < label.length && label[q] === '`') q++;
          if (q - p === run) { found = q; break; }
          p = q;
        } else p++;
      }
      if (found >= 0) { i = found - 1; continue; }
    }
    if (label[i] !== '<') continue;
    const pos = contentStart + i;
    const tag = matchTag(src, pos);
    if (tag !== '') {
      if (tag.length > label.length - i) return true;
      i += tag.length - 1;
      continue;
    }
    const end = src.indexOf('>', pos + 1);
    if (end > pos + 1) {
      const inner = src.slice(pos + 1, end);
      if (/^[a-zA-Z][a-zA-Z0-9+.-]{1,31}:[^ <>\x00-\x1f]+$/.test(inner) ||
          /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(inner)) {
        const len = end - pos + 1;
        if (len > label.length - i) return true;
        i += len - 1;
      }
    }
  }
  return false;
}

// Scan a link label starting at src[i] == '['. Returns {label, end} where
// end is the index just after the closing ']', or null. The label may hold
// one level of nested brackets, escapes and code spans.
function scanLabel(src, i) {
  const n = src.length;
  let depth = 0;
  let j = i + 1;
  while (j < n) {
    const c = src[j];
    if (c === '\\') { j += 2; continue; }
    if (c === '`') {
      // a code span in a label is a backtick run, non-backtick content,
      // and the NEXT backtick run (of any length — marked's label grammar
      // does not require the runs to match); skip past it so a `]` inside
      // it does not close the label. But when the run is two or more
      // backticks immediately before `]`, the `` ``+(?=\]) `` alternative
      // wins: the label ends there (the regex is lazy, so it prefers the
      // short label over a code span whose closer is far away in later
      // text). Only search for a closer when the run is not right before
      // `]`.
      let k = j;
      while (k < n && src[k] === '`') k++;
      const run = k - j;
      if (run >= 2 && k < n && src[k] === ']') { j = k; continue; }
      let p = k;
      let found = -1;
      while (p < n) {
        if (src[p] === '`') {
          let q = p;
          while (q < n && src[q] === '`') q++;
          found = q;
          break;
        }
        p++;
      }
      if (found < 0) {
        // no closer and not right before `]`: a lone backtick, or a run
        // followed by more label text, makes the label unmatchable
        return null;
      }
      j = found;
      continue;
    }
    if (c === '[') {
      depth++;
      // a label may hold a bracket group holding a bracket pair
      // (two levels of nesting), but no more
      if (depth > 2) return null;
      j++;
      continue;
    }
    if (c === ']') {
      if (depth === 0) return { label: src.slice(i + 1, j), end: j + 1 };
      depth--;
      j++;
      continue;
    }
    if (c === '\n') {
      // a label may span lines, but not across a blank line
      if (j + 1 < n && src[j + 1] === '\n') return null;
    }
    j++;
  }
  return null;
}

// Parse a link destination and optional title at src[i] (i points just
// after the label's ']' and the '(' has been consumed by the caller, or at
// the start of the destination). Returns {href, title, end} where end is
// the index just after the closing ')', or null.
function parseLinkDest(src, i) {
  const n = src.length;
  let j = i;
  // skip spaces, tabs and newlines after '('
  while (j < n && (src[j] === ' ' || src[j] === '\t' || src[j] === '\n')) j++;
  let href = '';
  if (j < n && src[j] === '<') {
    // `<...>` up to the first unescaped `>` on the line (may be empty,
    // may hold spaces and parens); a `<` or newline inside ends it
    // without a match. An escaped `>` does not close it, so if the only
    // `>` is escaped the destination never closes and the link fails.
    let k = j + 1;
    let ok = false;
    while (k < n) {
      const c = src[k];
      if (c === '\\') { k += 2; continue; }
      if (c === '\n' || c === '<') break;
      if (c === '>') { ok = true; break; }
      k++;
    }
    if (!ok) return null;
    href = src.slice(j + 1, k);
    j = k + 1;
  } else {
    // bare destination: no spaces or control chars, balanced parens
    let k = j;
    let level = 0;
    while (k < n) {
      const c = src[k];
      if (c === ' ' || c === '\t' || c === '\n' || c.charCodeAt(0) < 32) break;
      if (c === '\\') { k += 2; continue; }
      if (c === '(') level++;
      else if (c === ')') {
        if (level === 0) break;
        level--;
      }
      k++;
    }
    if (level > 0) return null;
    href = src.slice(j, k);
    j = k;
  }
  // optional title
  let title = '';
  let k = j;
  // title may be separated by spaces/tabs, or a newline with spaces
  let t = k;
  while (t < n && (src[t] === ' ' || src[t] === '\t')) t++;
  let nl = false;
  if (t < n && src[t] === '\n') {
    nl = true;
    t++;
    while (t < n && (src[t] === ' ' || src[t] === '\t')) t++;
  }
  if (t < n && (src[t] === '"' || src[t] === "'" || src[t] === '(')) {
    const open = src[t];
    const close = open === '(' ? ')' : open;
    let p = t + 1;
    let ok = false;
    while (p < n) {
      const c = src[p];
      if (c === '\\') { p += 2; continue; }
      if (c === close) { ok = true; break; }
      if (open !== '"' && (c === '\n')) {
        // single-quoted and paren titles may not span a blank line
        if (p + 1 < n && src[p + 1] === '\n') break;
      }
      if (open === '(' && c === ')') break;
      p++;
    }
    if (ok) {
      title = src.slice(t + 1, p);
      // unescape punctuation in title/dest later via unescapePunct
      j = p + 1;
      k = j;
    } else if (open === '"') {
      // a double-quoted title may not span lines without closing; fail title
      // only if the rest cannot be a link at all: treat as no title
    }
  }
  // skip trailing spaces/newlines, expect ')'
  while (k < n && (src[k] === ' ' || src[k] === '\t' || src[k] === '\n')) k++;
  if (k >= n || src[k] !== ')') return null;
  // the ')' that ends the link must not be escaped: count backslashes before it
  let b = k - 1;
  let bs = 0;
  while (b >= 0 && src[b] === '\\') { bs++; b--; }
  if (bs % 2 === 1) return null;
  return { href, title, end: k + 1 };
}

// Remove backslash escapes of punctuation characters.
function unescapePunct(s) {
  if (s.indexOf('\\') < 0) return s;
  let out = '';
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && i + 1 < s.length && ESCAPABLE.indexOf(s[i + 1]) >= 0) {
      if (start < i) out += s.slice(start, i);
      out += s[i + 1];
      i++;
      start = i + 1;
    }
  }
  if (start === 0) return s;
  if (start < s.length) out += s.slice(start);
  return out;
}

// Plain-text rendering of inline nodes (for image alt text).
function nodesToText(nodes) {
  let out = '';
  for (const nd of nodes) {
    const t = nd[0];
    if (t === 't') out += nd[1];
    else if (t === 'esc') out += nd[1];
    else if (t === 'code') out += nd[1];
    else if (t === 'html') out += nd[1];
    else if (t === 'br') out += '';
    else if (t === 'link') out += nodesToText(nd[3]);
    else if (t === 'em' || t === 'strong' || t === 'del') out += nodesToText(nd[1]);
    else if (t === 'img') out += nd[3];
    else if (t === 'delim') out += nd[1].repeat(nd[2]);
  }
  return out;
}

// Try an extended autolink (GFM url) at src[i]. prevCh is the character
// before i in the source (or '' at the start). Returns {end, href, text}
// or null. Only called when not inside a link.
function tryUrl(src, i, prevCh) {
  const n = src.length;
  // www. — only after whitespace, *, _, ~, ( or the start
  if (src.startsWith('www.', i) && (i === 0 || prevCh === ' ' || prevCh === '\t' || prevCh === '\n' || prevCh === '*' || prevCh === '_' || prevCh === '~' || prevCh === '(')) {
    let j = i;
    while (j < n && src[j] !== ' ' && src[j] !== '\t' && src[j] !== '\n' && src[j] !== '<') j++;
    let text = backpedal(src.slice(i, j));
    if (text.length <= 4) return null;
    return { end: i + text.length, href: 'http://' + text, text };
  }
  // mailto: / xmpp: email (xmpp: may have one path segment of
  // alphanumerics, @ and . after the email, e.g. xmpp:foo@bar.baz/txt)
  if (src.startsWith('mailto:', i) || src.startsWith('xmpp:', i)) {
    const proto = src.startsWith('mailto:', i) ? 'mailto:' : 'xmpp:';
    const rest = tryEmail(src, i + proto.length);
    if (!rest) return null;
    if (rest.end === -1) return { end: -1, href: null, text: null, fullEnd: rest.fullEnd };
    let end = rest.end;
    if (proto === 'xmpp:' && end < n && src[end] === '/') {
      let k = end + 1;
      while (k < n && (isAlphaNumCh(src[k]) || src[k] === '@' || src[k] === '.')) k++;
      if (k > end + 1) end = k;
    }
    const text = src.slice(i, end);
    return { end, href: text, text, fullEnd: rest.fullEnd };
  }
  // scheme:// — the GFM url rule only allows http, https, ftp
  // (case-insensitive), so check those prefixes directly instead of a
  // regex over a fresh slice at every word start
  const c0 = src.charCodeAt(i);
  if (c0 === 104 || c0 === 72 || c0 === 102 || c0 === 70) { // h/H/f/F
    const low = src.slice(i, i + 8).toLowerCase();
    let protoLen = 0;
    if (low.startsWith('https://')) protoLen = 8;
    else if (low.startsWith('http://')) protoLen = 7;
    else if (low.startsWith('ftp://')) protoLen = 6;
    if (protoLen > 0) {
      let j = i + protoLen;
      while (j < n && src[j] !== ' ' && src[j] !== '\t' && src[j] !== '\n' && src[j] !== '<') j++;
      let text = backpedal(src.slice(i, j));
      if (text.length <= protoLen) return null;
      return { end: i + text.length, href: text, text };
    }
  }
  // bare email, at a word start
  if (prevCh !== '' && isWordCh(prevCh)) return null;
  const em = tryEmail(src, i);
  if (!em) return null;
  // end -1: only a full match exists (the lookahead failed); the caller
  // accepts it only when the following char is an emphasis closer
  if (em.end === -1) return { end: -1, href: null, text: null, fullEnd: em.fullEnd };
  return { end: em.end, href: 'mailto:' + em.text, text: em.text, fullEnd: em.fullEnd };
}

// marked's GFM email: local part, @, domain labels; the regex backtracks
// the domain (dropping trailing labels) when a word char or '-' follows,
// so `a@b.c_` matches `a@b` and `a@b.c_d` matches the whole thing.
// fullEnd is the end of the longest domain match (ignoring the lookahead),
// used when a trailing `_` is an emphasis closer rather than part of the
// address (marked tokenizes the emphasis span first, so the closer is
// invisible to the email regex there).
const EMAIL_RE = /^[A-Za-z0-9._+-]+@[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\w-])/;
const EMAIL_FULL_RE = /^[A-Za-z0-9._+-]+@[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+/;
function tryEmail(src, i) {
  const n = src.length;
  // cheap pre-check: a local part followed by '@' must be nearby
  let j = i;
  while (j < n && j < i + 64 && isWordCh(src[j])) j++;
  if (j === i || j >= n || src[j] !== '@') return null;
  const slice = src.slice(i, i + 320);
  const full = EMAIL_FULL_RE.exec(slice);
  if (!full) return null;
  const fullEnd = i + full[0].length;
  const m = EMAIL_RE.exec(slice);
  // the lookahead failed (the full match ends before a word char or '-'):
  // the address is only valid if that char is an emphasis closer, which
  // the caller checks (end -1 marks "full match only")
  if (!m) return { end: -1, text: null, fullEnd };
  return { end: i + m[0].length, text: m[0], fullEnd };
}

// Flanking for a delimiter run: prev is the char before the run ('' at
// start), next is the char after it ('' at end). The start/end of the
// string count as whitespace.
function flanking(prev, next) {
  const prevWs = prev === '' || isWhitespaceCh(prev);
  const nextWs = next === '' || isWhitespaceCh(next);
  const prevPunct = prev !== '' && isPunctCh(prev);
  const nextPunct = next !== '' && isPunctCh(next);
  const left = !nextWs && (!nextPunct || prevWs || prevPunct);
  const right = !prevWs && (!prevPunct || nextWs || nextPunct);
  return { left, right };
}

// Scan inline content of `src` into nodes, then resolve emphasis.
// refs is the document's link reference map. ctx carries inLink /
// inRawBlock across nested scans; linkEmitted is set on ctx when a link
// node is produced.
// any inline-markup starter: link/code/emphasis/tag/escape/entity.
// A run with none of these, no URL/email marker (a bare URL has no
// markup starter of its own), and no hard-break run (two or more
// spaces/tabs before a newline) is plain text — one text node, no scan.
const HAS_INLINE = /[\[!`*_~<\\&]/;
const HARD_BREAK_RUN = /[ \t]{2,}\n/;
function scanInline(src, refs, ctx) {
  const n = src.length;
  if (!HAS_INLINE.test(src) && src.indexOf('www.') < 0 && src.indexOf('://') < 0 && src.indexOf('mailto:') < 0 && src.indexOf('xmpp:') < 0 && src.indexOf('@') < 0 && !HARD_BREAK_RUN.test(src)) return [['t', src, ctx.inRawBlock]];
  const nodes = [];
  let buf = '';
  // marked's masked source for this inline run (only needed when an
  // emphasis delimiter is present); a delimiter run hidden by it —
  // inside a link, code span or tag as blockSkip sees it — is not a
  // delimiter at all. It only changes anything when a backtick is
  // present: links, tags and escapes are already isolated by the
  // sub-contexts and escape handling, and only blockSkip's simple code
  // regex can mis-pair backticks across a link label boundary.
  const masked = (src.includes('`') && (src.includes('*') || src.includes('_') || src.includes('~'))) ? maskSrc(src, refs) : null;
  const flush = () => {
    if (buf !== '') {
      // the text was accumulated under the current raw-block state
      nodes.push(['t', buf, ctx.inRawBlock]);
      buf = '';
    }
  };
  // One delimiter node per character of a run. Marked's tokenizer tries a
  // run as an opener at every offset inside it (so `**foo*` opens at the
  // second star), with the whole run's length used for rules 9-10, so the
  // entries must be per character. Flanking is per run (the char before
  // the run and the char after it); the per-char lLength is the run
  // length minus the offset. The entries are built by buildDelims from
  // the nodes, so addDelim only creates the nodes here.
  const addDelim = (ch, run) => {
    // a run hidden by the masked source (inside a link, code span or
    // tag as marked's blockSkip sees it) is not a delimiter at all:
    // it is plain text, so it can neither open nor close emphasis
    if (masked) {
      let hidden = false;
      for (let k = 0; k < run; k++) {
        if (masked[i + k] !== ch) { hidden = true; break; }
      }
      if (hidden) { buf += ch.repeat(run); return; }
    }
    flush();
    // for `_`, record whether the run can open/close from the source
    // chars around it (an intra-word `_` can do neither, so it is not a
    // real delimiter: it does not break a word for email matching, and it
    // cannot be the opener that lets an email extend past a `_` closer)
    let canOpen = false, canClose = false;
    if (ch === '_') {
      const prevCh = i === 0 ? '' : src[i - 1];
      const nextCh = i + run >= n ? '' : src[i + run];
      const f = flanking(prevCh, nextCh);
      canOpen = f.left && (!f.right || (prevCh !== '' && isPunctCh(prevCh)));
      canClose = f.right && (!f.left || (nextCh !== '' && isPunctCh(nextCh)));
    }
    for (let k = 0; k < run; k++) {
      nodes.push(['delim', ch, 1, canOpen, canClose]);
    }
  };

  let i = 0;
  while (i < n) {
    const c = src[i];
    // hard break: two or more spaces, or a backslash, before a newline
    if (c === ' ' || c === '\t') {
      // look ahead: run of spaces/tabs then a newline?
      let j = i;
      while (j < n && (src[j] === ' ' || src[j] === '\t')) j++;
      if (j < n && src[j] === '\n' && j - i >= 2) {
        // hard break only if the rest is not blank to the end
        let k = j + 1;
        while (k < n && (src[k] === ' ' || src[k] === '\t')) k++;
        if (k < n && src[k] !== '\n') {
          // strip the trailing spaces from buf
          buf = buf.replace(/ +$/, '');
          flush();
          nodes.push(['br']);
          i = k;
          continue;
        }
      }
      buf += src.slice(i, j);
      i = j;
      continue;
    }
    if (c === '\n') { buf += '\n'; i++; continue; }
    // fast path: bulk-append a run of plain text up to the next
    // character that needs individual handling. Only mid-word: at a
    // word start a URL/email may begin here and extend past a `_`
    // delimiter (which ends the run), so the run's own markers cannot
    // prove there is none. Safe mid-word because every URL/email start
    // contains one of www. :// mailto: xmpp: @, and a URL/email never
    // spans a special character, so a run free of those markers holds
    // no link. (The run stops before any of `[!` + '`' + `*_~<\&\n \t`,
    // so it never crosses a token boundary.)
    {
      const prev = i === 0 ? '' : src[i - 1];
      let atWordStart = prev === '' || !isWordCh(prev);
      if (!atWordStart && prev === '_') {
        const lastNd = nodes.length > 0 ? nodes[nodes.length - 1] : null;
        atWordStart = !!(lastNd && lastNd[0] === 'delim' && lastNd[1] === '_' && (lastNd[3] || lastNd[4]));
      }
      if (!atWordStart) {
        NEXT_SPECIAL.lastIndex = i;
        const sm = NEXT_SPECIAL.exec(src);
        const nextIdx = sm ? sm.index : n;
        if (nextIdx > i) {
          const seg = src.slice(i, nextIdx);
          if (seg.indexOf('www.') < 0 && seg.indexOf('://') < 0 && seg.indexOf('mailto:') < 0 && seg.indexOf('xmpp:') < 0 && seg.indexOf('@') < 0) {
            buf += seg;
            i = nextIdx;
            continue;
          }
        }
      }
    }
    if (c === '\\') {
      if (i + 1 < n) {
        const d = src[i + 1];
        if (d === '\n') {
          // backslash hard break, unless the rest is blank to the end
          let k = i + 2;
          while (k < n && (src[k] === ' ' || src[k] === '\t')) k++;
          if (k < n && src[k] !== '\n') {
            flush();
            nodes.push(['br']);
            i = k;
            continue;
          }
          buf += '\\';
          i++;
          continue;
        }
        if (ESCAPABLE.indexOf(d) >= 0) {
          flush();
          nodes.push(['esc', d]);
          i += 2;
          continue;
        }
      }
      buf += '\\';
      i++;
      continue;
    }
    if (c === '`') {
      let j = i;
      while (j < n && src[j] === '`') j++;
      const run = j - i;
      // find a closing run of the same length
      let p = j;
      let close = -1;
      while (p < n) {
        if (src[p] === '`') {
          let q = p;
          while (q < n && src[q] === '`') q++;
          if (q - p === run) { close = p; break; }
          p = q;
        } else p++;
      }
      if (close < 0) {
        buf += '`'.repeat(run);
        i = j;
        continue;
      }
      let text = src.slice(j, close).replace(/\n/g, ' ');
      if (text.length >= 2 && text[0] === ' ' && text[text.length - 1] === ' ' && /[^ ]/.test(text)) {
        text = text.slice(1, -1);
      }
      flush();
      nodes.push(['code', text]);
      i = close + run;
      continue;
    }
    if (c === '<') {
      // autolink <scheme:...> or <email>
      let matched = false;
      if (!ctx.inLink || true) {
        const end = src.indexOf('>', i + 1);
        if (end > i + 1) {
          const inner = src.slice(i + 1, end);
          // scheme autolink: a 2-32 character scheme, then `:`, then no
          // spaces or angle brackets (a one-letter scheme is not one)
          if (/^[a-zA-Z][a-zA-Z0-9+.-]{1,31}:[^ <>\x00-\x1f]+$/.test(inner)) {
            flush();
            // an autolink's text is a single text node, not re-scanned;
            // autolinks do not set linkEmitted (only outputLink does), so
            // one inside a link label does not reject the outer link
            nodes.push(['link', inner, '', [['t', inner, false, true]], true, '<', '>']);
            i = end + 1;
            matched = true;
          } else if (/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(inner)) {
            flush();
            nodes.push(['link', 'mailto:' + inner, '', [['t', inner, false, true]], true, '<', '>']);
            i = end + 1;
            matched = true;
          }
        }
      }
      if (!matched) {
        const tag = matchTag(src, i);
        if (tag !== '') {
          flush();
          nodes.push(['html', tag]);
          const low = tag.toLowerCase();
          // marked's tag tokenizer flips the document-level inLink /
          // inRawBlock state (startATag /^<a /i", endATag /^<\/a>/i,
          // start/endPreScriptTag /^(<\/?)(pre|code|kbd|script)(\s|>)/i);
          // the state persists across blocks until a closing tag resets it
          if (/^<a /.test(low)) ctx.inLink = true;
          else if (/^<\/a>/.test(low)) ctx.inLink = false;
          if (/^<(pre|code|kbd|script)[\s>]/.test(low)) ctx.inRawBlock = true;
          else if (/^<\/(pre|code|kbd|script)[\s>]/.test(low)) ctx.inRawBlock = false;
          i += tag.length;
          matched = true;
        }
      }
      if (matched) continue;
      buf += '<';
      i++;
      continue;
    }
    if (c === '!' && i + 1 < n && src[i + 1] === '[') {
      const r = tryLink(src, i, refs, ctx, true);
      if (r && tryLink.lastNode) {
        flush();
        nodes.push(tryLink.lastNode);
        i = r.end;
        continue;
      }
      buf += '!';
      i++;
      continue;
    }
    if (c === '[') {
      const r = tryLink(src, i, refs, ctx, false);
      if (r && tryLink.lastNode) {
        flush();
        nodes.push(tryLink.lastNode);
        i = r.end;
        continue;
      }
      buf += '[';
      i++;
      continue;
    }
    if (c === '*' || c === '_' || c === '~') {
      let j = i;
      while (j < n && src[j] === c) j++;
      // every character is a delimiter node; buildDelims works out which
      // offsets of a run can open or close (for `~` only the last two
      // positions of a long run can open, and a long run never closes)
      addDelim(c, j - i);
      i = j;
      continue;
    }
    if (!ctx.inLink && isAlphaNumCh(c)) {
      const prev = i === 0 ? '' : src[i - 1];
      // fast path: a letter/digit in the middle of a word cannot start
      // a URL/email (except a scheme, which starts with h/f), so it is
      // plain text. A `_` delimiter node just emitted does break the
      // word, so check that case only when the previous char is `_`.
      if (prev !== '' && isWordCh(prev) && c !== 'h' && c !== 'H' && c !== 'f' && c !== 'F') {
        if (prev !== '_') { buf += c; i++; continue; }
        const lastNd = nodes.length > 0 ? nodes[nodes.length - 1] : null;
        if (!(lastNd && lastNd[0] === 'delim' && lastNd[1] === '_' && (lastNd[3] || lastNd[4]))) { buf += c; i++; continue; }
      }
      // a `_` that was just emitted as an emphasis delimiter is not part
      // of the word (it is a delimiter node, not text), so an email may
      // start right after an opener like `__`; treat it as a boundary
      // a `_` that is a real delimiter (can open or close) breaks the
      // word; an intra-word `_` does not, so an email cannot start after it
      const lastNd = nodes.length > 0 ? nodes[nodes.length - 1] : null;
      const prevIsDelim = prev === '_' && lastNd && lastNd[0] === 'delim' && lastNd[1] === '_' && (lastNd[3] || lastNd[4]);
      const effPrev = prevIsDelim ? ' ' : prev;
      const wordStart = effPrev === '' || !isWordCh(effPrev);
      // a scheme (http/https/ftp) matches even mid-word
      // (`ahttp://x` links the http:// part); www./mailto:/xmpp:/email
      // need a word start
      if (wordStart || c === 'h' || c === 'H' || c === 'f' || c === 'F') {
        const u = tryUrl(src, i, effPrev);
        if (u) {
          // an email whose domain was backtracked (or only matched in
          // full) because a `_` follows it: if that `_` is an emphasis
          // closer for an enclosing `_` opener, marked's emphasis-first
          // tokenization never lets the email regex see it, so the full
          // domain is the address
          let end = u.end, href = u.href, text = u.text;
          let ok = true;
          if (u.fullEnd && src[u.fullEnd] === '_') {
            const after = src[u.fullEnd + 1];
            const closerCanClose = after === undefined || !/[A-Za-z0-9]/.test(after);
            // the opener must be a `_` delimiter that can actually open
            // (an intra-word `_` cannot, so it does not count)
            let hasUnderscoreOpener = false;
            for (let q = 0; q < nodes.length; q++) {
              if (nodes[q][0] === 'delim' && nodes[q][1] === '_' && nodes[q][3]) { hasUnderscoreOpener = true; break; }
            }
            if (closerCanClose && hasUnderscoreOpener) {
              end = u.fullEnd;
              text = src.slice(i, end);
              // a bare email's href is mailto: + the address; a mailto:/
              // xmpp: URL's href is the URL itself (already in the text)
              href = (text.startsWith('mailto:') || text.startsWith('xmpp:')) ? text : 'mailto:' + text;
            } else if (u.end === -1) {
              ok = false;
            }
          } else if (u.end === -1) {
            ok = false;
          }
          if (ok) {
            flush();
            // an extended autolink does not set linkEmitted either; its
            // source is the bare URL/email itself, so its first/last
            // source chars are the URL's (used for emphasis flanking)
            nodes.push(['link', href, '', [['t', text, false, true]], true, text.charAt(0), text.charAt(text.length - 1)]);
            i = end;
            continue;
          }
        }
      }
      buf += c;
      i++;
      continue;
    }
    buf += c;
    i++;
  }
  flush();
  processEmphasis(nodes);
  return nodes;
}

// Try to parse a link or image starting at src[i] ('[' or '![').
// On success pushes the node and returns {end}; on failure returns null
// (the caller then treats the bracket as literal text).
function tryLink(src, i, refs, ctx, isImage) {
  const start = isImage ? i + 1 : i;
  const lab = scanLabel(src, start);
  if (!lab) return null;
  // a tag or autolink starting inside the label that runs past the
  // label's `]` means this is not a link at all
  if (labelEndInsideToken(src, start + 1, lab.label)) return null;
  const label = lab.label;
  let j = lab.end;
  const n = src.length;
  // inline link; if the destination is not a link, fall through to the
  // reference forms below (marked tries reflink/nolink after link fails,
  // so `[foo](not a link)` still resolves `[foo]` against a definition)
  if (j < n && src[j] === '(') {
    const dest = parseLinkDest(src, j + 1);
    if (dest) {
      const href = unescapePunct(dest.href);
      const title = dest.title ? unescapePunct(dest.title) : '';
      const text = label.replace(/\\([\[\]])/g, '$1');
      // marked's outputLink: scan the label with inLink forced true and
      // linkEmitted cleared, then restore the outer inLink; a link inside
      // the label rejects this link (and undoes its raw-block flips), while
      // an accepted link keeps the label's raw-block flips
      const outerInLink = ctx.inLink, outerInRawBlock = ctx.inRawBlock, outerLinkEmitted = ctx.linkEmitted;
      ctx.inLink = true; ctx.linkEmitted = false;
      const kids = scanInline(text, refs, ctx);
      const textHasLink = ctx.linkEmitted;
      ctx.linkEmitted = outerLinkEmitted; ctx.inLink = outerInLink;
      if (!isImage && textHasLink) { ctx.inRawBlock = outerInRawBlock; return null; }
      if (!isImage) ctx.linkEmitted = true;
      const node = isImage
        ? ['img', href, title, nodesToText(kids), src.slice(i, dest.end)]
        : ['link', href, title, kids, false];
      // push into the caller's nodes: handled by returning the node
      tryLink.lastNode = node;
      return { end: dest.end };
    }
    // the destination is not a link: fall through to the reference
    // forms below, using the label alone as a shortcut reference
  }
  // reference link [label][ref], collapsed [label][], shortcut [label]
  let refLabel = null;
  if (j < n && src[j] === '[') {
    const lab2 = scanLabel(src, j);
    if (!lab2) return null;
    refLabel = lab2.label === '' ? label : lab2.label;
    j = lab2.end;
  } else {
    refLabel = label;
  }
  if (refLabel === '' || refLabel === undefined) return null;
  const link = refs.get(normalizeLabel(refLabel));
  if (!link) {
    // marked emits a text token of just the first character
    tryLink.lastNode = null;
    return null;
  }
  const text = label.replace(/\\([\[\]])/g, '$1');
  // same outputLink save/restore as the inline form above
  const outerInLink = ctx.inLink, outerInRawBlock = ctx.inRawBlock, outerLinkEmitted = ctx.linkEmitted;
  ctx.inLink = true; ctx.linkEmitted = false;
  const kids = scanInline(text, refs, ctx);
  const textHasLink = ctx.linkEmitted;
  ctx.linkEmitted = outerLinkEmitted; ctx.inLink = outerInLink;
  if (!isImage && textHasLink) { ctx.inRawBlock = outerInRawBlock; return null; }
  if (!isImage) ctx.linkEmitted = true;
  const node = isImage
    ? ['img', link.href, link.title || '', nodesToText(kids), src.slice(i, j)]
    : ['link', link.href, link.title || '', kids, false];
  tryLink.lastNode = node;
  return { end: j };
}

// ---------------------------------------------------------------------------
// Block parsing
// ---------------------------------------------------------------------------

function isBlankLine(line) {
  for (let i = 0; i < line.length; i++) {
    const c = line.charCodeAt(i);
    if (c !== 32 && c !== 9) return false;
  }
  return true;
}

// Leading indentation in columns (space = 1, tab = next multiple of 4),
// and the index where the non-whitespace content starts.
function lineIndent(line) {
  let col = 0, i = 0;
  while (i < line.length) {
    const c = line.charCodeAt(i);
    if (c === 32) { col++; i++; }
    else if (c === 9) { col += 4 - (col % 4); i++; }
    else break;
  }
  return { col, i };
}

// Remove the indented-code indent: marked's codeRemoveIndent
// /^(?: {0,3}\t| {1,4})/ — 0-3 spaces plus a tab, or 1-4 spaces. A tab
// after four spaces is NOT removed (it is content, not indent).
function stripCodeIndent(line) {
  let i = 0;
  while (i < line.length && line[i] === ' ' && i < 3) i++;
  if (i < line.length && line[i] === '\t') return line.slice(i + 1);
  let j = 0;
  while (j < line.length && line[j] === ' ' && j < 4) j++;
  return line.slice(j);
}

const BLOCK_TAGS = new Set(('address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h1|h2|h3|h4|h5|h6|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul').split('|'));

// ATX heading: returns {level, text} or null.
function atxHeading(line) {
  const { col, i } = lineIndent(line);
  if (col > 3) return null;
  let j = i;
  let hashes = 0;
  while (j < line.length && line[j] === '#') { hashes++; j++; }
  if (hashes === 0 || hashes > 6) return null;
  if (j < line.length && line[j] !== ' ' && line[j] !== '\t') return null;
  let text = line.slice(j).trim();
  // closing sequence: a run of #s preceded by a space, or the whole text
  if (/^#+$/.test(text)) text = '';
  else {
    const m = /^(.*?)[ \t]+#+$/.exec(text);
    if (m) text = m[1].trim();
  }
  return { level: hashes, text };
}

// Fenced code start: returns {ch, len, info, indentStr} or null.
// indentStr is the leading whitespace before the fence, used to remove
// the same amount of indentation from the content lines.
function fenceStart(line) {
  const { col, i } = lineIndent(line);
  if (col > 3) return null;
  const ch = line[i];
  if (ch !== '`' && ch !== '~') return null;
  let j = i;
  while (j < line.length && line[j] === ch) j++;
  const len = j - i;
  if (len < 3) return null;
  const info = line.slice(j);
  if (ch === '`' && info.indexOf('`') >= 0) return null;
  return { ch, len, info: info.trim(), indentStr: line.slice(0, i) };
}

// Remove up to `count` leading whitespace characters (spaces or tabs)
// from a line, as marked's indentCodeCompensation does for fenced code.
function stripFenceIndent(line, count) {
  if (count <= 0) return line;
  let k = 0;
  while (k < line.length && k < count && (line[k] === ' ' || line[k] === '\t')) k++;
  return line.slice(k);
}

// Thematic break.
function isHr(line) {
  const { col, i } = lineIndent(line);
  if (col > 3) return null;
  const ch = line[i];
  if (ch !== '-' && ch !== '_' && ch !== '*') return null;
  let count = 0;
  let j = i;
  while (j < line.length) {
    const c = line[j];
    if (c === ch) { count++; j++; }
    else if (c === ' ' || c === '\t') j++;
    else return null;
  }
  return count >= 3 ? ch : null;
}

// Setext underline: returns 1 for =, 2 for -, else 0.
function setextLevel(line) {
  const { col, i } = lineIndent(line);
  if (col > 3) return 0;
  const ch = line[i];
  if (ch !== '=' && ch !== '-') return 0;
  let j = i;
  while (j < line.length && line[j] === ch) j++;
  while (j < line.length && (line[j] === ' ' || line[j] === '\t')) j++;
  if (j !== line.length) return 0;
  return ch === '=' ? 1 : 2;
}

// HTML block start at a line: returns the type (1-7) or 0.
// Types 1-6 can interrupt a paragraph; type 7 cannot.
function htmlBlockType(line) {
  const { col, i } = lineIndent(line);
  if (col > 3) return 0;
  const rest = line.slice(i);
  const low = rest.toLowerCase();
  // type 1: <pre, <script, <style, <textarea followed by space, > or end
  if (/^<(pre|script|style|textarea)(?:[\s>]|$)/.test(low)) return 1;
  if (rest.startsWith('<!--')) return 2;
  if (rest.startsWith('<?')) return 3;
  if (/^<![a-zA-Z]/.test(rest)) return 4;
  if (rest.startsWith('<![CDATA[')) return 5;
  // type 6: a block-level tag, open or close
  const m6 = /^<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:[ \t]+|\n|\/?>)|$)/.exec(rest);
  if (m6 && BLOCK_TAGS.has(m6[1].toLowerCase())) return 6;
  // type 7: a complete open or close tag alone on the line
  if (rest[0] === '<') {
    const tag = matchTag(rest, 0);
    if (tag !== '') {
      const after = rest.slice(tag.length);
      if (/^[ \t]*$/.test(after)) return 7;
    }
  }
  return 0;
}

// List marker: returns {marker, ordered, num, markerLen, rest} or null.
// markerLen is the length of the (indent + marker) string.
function listMarker(line) {
  const { col, i } = lineIndent(line);
  if (col > 3) return null;
  const ch = line[i];
  if (ch === '-' || ch === '+' || ch === '*') {
    if (i + 1 < line.length && line[i + 1] !== ' ' && line[i + 1] !== '\t') return null;
    return { marker: ch, ordered: false, num: 0, markerLen: i + 1, rest: line.slice(i + 1) };
  }
  if (ch >= '0' && ch <= '9') {
    let j = i;
    while (j < line.length && line[j] >= '0' && line[j] <= '9') j++;
    if (j - i > 9) return null;
    if (j < line.length && (line[j] === '.' || line[j] === ')')) {
      if (j + 1 < line.length && line[j + 1] !== ' ' && line[j + 1] !== '\t') return null;
      return { marker: line.slice(i, j + 1), ordered: true, num: +line.slice(i, j), markerLen: j + 1, rest: line.slice(j + 1) };
    }
  }
  return null;
}

// A line that can interrupt a paragraph at the top level: ATX heading,
// fence, hr, blockquote, list (non-empty, ordered only from 1), html
// types 1-6. (Setext and table are handled separately.)
function paragraphInterrupt(line, anyList) {
  const { col, i } = lineIndent(line);
  if (col > 3 || isBlankLine(line)) return false;
  const rest = line.slice(i);
  if (rest[0] === '#') {
    let j = i, hashes = 0;
    while (j < line.length && line[j] === '#') { hashes++; j++; }
    if (hashes >= 1 && hashes <= 6 && (j >= line.length || line[j] === ' ' || line[j] === '\t')) return true;
  }
  if (rest[0] === '`' || rest[0] === '~') {
    if (fenceStart(line)) return true;
  }
  if (isHr(line)) return true;
  if (rest[0] === '>') return true;
  const ht = htmlBlockType(line);
  if (ht >= 1 && ht <= 6) return true;
  const m = listMarker(line);
  if (m) {
    // inside a list item (or a blockquote's lazy lines) a bare marker of
    // any number starts a sibling list, so it interrupts the paragraph;
    // at the top level only non-empty lists starting from 1 can interrupt
    if (anyList) return true;
    if (!m.ordered || m.num === 1) {
      // the item must be non-empty: something other than spaces after it
      if (m.rest.trim() !== '') return true;
    }
  }
  return false;
}

// For blockquote paragraphs, any list marker interrupts.
function bqParagraphInterrupt(line) {
  if (isBlankLine(line)) return true;
  const { col, i } = lineIndent(line);
  if (col > 3) return false;
  const rest = line.slice(i);
  if (rest[0] === '#') {
    let j = i, hashes = 0;
    while (j < line.length && line[j] === '#') { hashes++; j++; }
    if (hashes >= 1 && hashes <= 6 && (j >= line.length || line[j] === ' ' || line[j] === '\t')) return true;
  }
  if ((rest[0] === '`' || rest[0] === '~') && fenceStart(line)) return true;
  if (isHr(line)) return true;
  if (rest[0] === '>') return true;
  const ht = htmlBlockType(line);
  if (ht >= 1 && ht <= 6) return true;
  if (listMarker(line)) return true;
  return false;
}

// Parse a link reference definition starting at lines[i]. The definition
// may span up to three lines (label, destination, title). Returns
// {label, href, title, end, raw} or null. `raw` is the source text of the
// definition (used when a definition is merged into a paragraph).
// Parse a link reference definition starting at lines[i], following
// marked's def regex: label (may span lines, never across a blank line),
// `:`, optional spaces / one newline, destination (bare or `<...>` which
// may be empty), optional title (on the same line or the next, and it
// may span lines), then only spaces to the end of the line. If a title
// is attempted but fails (or is followed by junk), the definition still
// stands without a title, provided the destination's line ends cleanly.
function parseDef(lines, i) {
  const n = lines.length;
  const take = Math.min(12, n - i);
  const s = lines.slice(i, i + take).join('\n');
  const m = s.length;
  // line index (relative to i) of offset p: count of newlines before p
  const lineOf = (p) => {
    let l = 0;
    for (let k = 0; k < p && k < m; k++) if (s[k] === '\n') l++;
    return l;
  };
  let p = 0;
  let col = 0;
  while (p < m && s[p] === ' ' && col < 4) { p++; col++; }
  if (col > 3 || s[p] !== '[') return null;
  // label
  p++;
  let label = '';
  let labelOk = false;
  while (p < m) {
    const c = s[p];
    if (c === '\\') {
      if (p + 1 >= m) return null;
      label += s.slice(p, p + 2);
      p += 2;
      continue;
    }
    if (c === ']') { labelOk = true; p++; break; }
    if (c === '[') return null;
    if (c === '\n') {
      // a newline inside the label is allowed unless the next line is
      // blank (spaces then a newline)
      let q = p + 1;
      while (q < m && (s[q] === ' ' || s[q] === '\t')) q++;
      if (q >= m || s[q] === '\n') return null;
      label += '\n';
      p++;
      continue;
    }
    label += c;
    p++;
  }
  if (!labelOk || label.trim() === '') return null;
  // ':'
  if (p >= m || s[p] !== ':') return null;
  p++;
  // spaces, optionally one newline with spaces, before the destination
  while (p < m && (s[p] === ' ' || s[p] === '\t')) p++;
  if (p < m && s[p] === '\n') {
    p++;
    while (p < m && (s[p] === ' ' || s[p] === '\t')) p++;
  }
  if (p >= m) return null;
  // destination
  let href = '';
  if (s[p] === '<') {
    // `<...>` up to the first `>` on the line (may be empty)
    let k = p + 1;
    while (k < m && s[k] !== '\n' && s[k] !== '>') k++;
    if (k >= m || s[k] !== '>') return null;
    href = s.slice(p + 1, k);
    p = k + 1;
  } else {
    if (s[p] === ' ' || s[p] === '\t' || s[p] === '\n') return null;
    let k = p;
    while (k < m && s[k] !== ' ' && s[k] !== '\t' && s[k] !== '\n') k++;
    href = s.slice(p, k);
    p = k;
  }
  // optional title: must be preceded by a space/tab or a newline
  let title = '';
  let endP = p;
  let q = p;
  let skippedWs = false;
  while (q < m && (s[q] === ' ' || s[q] === '\t')) { q++; skippedWs = true; }
  if (q < m && s[q] === '\n') {
    q++;
    skippedWs = true;
    while (q < m && (s[q] === ' ' || s[q] === '\t')) q++;
  }
  if (skippedWs && q < m && (s[q] === '"' || s[q] === "'" || s[q] === '(')) {
    const open = s[q];
    const close = open === '(' ? ')' : open;
    let k = q + 1;
    let ok = false;
    while (k < m) {
      const c = s[k];
      if (c === '\\') { k += 2; continue; }
      if (c === close) { ok = true; break; }
      if (open === '(' && c === '(') break;
      if (open === "'" && c === '\n' && s[k + 1] === '\n') break;
      k++;
    }
    if (ok) {
      // after the title only spaces to the end of the line
      let r = k + 1;
      while (r < m && (s[r] === ' ' || s[r] === '\t')) r++;
      if (r >= m || s[r] === '\n') {
        title = s.slice(q + 1, k);
        endP = r;
      }
    }
  }
  if (endP === p) {
    // no title: the rest of the destination's line must be only spaces
    let r = p;
    while (r < m && (s[r] === ' ' || s[r] === '\t')) r++;
    if (r < m && s[r] !== '\n') return null;
    endP = r;
  }
  const endLine = i + lineOf(endP);
  const raw = lines.slice(i, endLine + 1).join('\n');
  return { label: normalizeLabel(label), href: unescapePunct(href), title: title ? unescapePunct(title) : '', end: endLine + 1, raw };
}

// Table delimiter row: returns the array of alignments (null/left/center/
// right) or null. The row must contain a | or a :.
function tableDelimiter(line) {
  const { col, i } = lineIndent(line);
  if (col > 3) return null;
  const rest = line.slice(i);
  if (rest.indexOf('|') < 0 && rest.indexOf(':') < 0) return null;
  // split into cells on |, dropping empty leading/trailing cells
  const parts = rest.split('|');
  if (parts.length > 0 && parts[0].trim() === '') parts.shift();
  if (parts.length > 0 && parts[parts.length - 1].trim() === '') parts.pop();
  if (parts.length === 0) return null;
  const aligns = [];
  for (const p of parts) {
    const c = p.trim();
    if (!/^:?-+:?$/.test(c)) return null;
    if (/^:-+:$/.test(c)) aligns.push('center');
    else if (/^:-+$/.test(c)) aligns.push('left');
    else if (/^-+:$/.test(c)) aligns.push('right');
    else aligns.push(null);
  }
  return aligns;
}

// Try to parse a table starting at lines[i] (header) with the delimiter at
// lines[i+1]. Returns {block, end} or null.
function tryTable(lines, i) {
  if (i + 1 >= lines.length) return null;
  const aligns = tableDelimiter(lines[i + 1]);
  if (!aligns) return null;
  // the header must have exactly as many cells as the delimiter row;
  // body rows are padded or truncated to that count instead
  const header = splitCells(lines[i]);
  if (header.length !== aligns.length) return null;
  const rows = [];
  let j = i + 2;
  while (j < lines.length) {
    const line = lines[j];
    // the table body regex ends a row run on a line of only spaces
    // (` *\n`); a line holding a tab is still a row (of empty cells)
    if (/^ *$/.test(line)) break;
    // a row line must not start a block that interrupts a table
    if (paragraphInterrupt(line, false)) break;
    // indented code ends the table, but only a line with content after
    // the indent (a whitespace-only line is a row, not code)
    const ind = lineIndent(line);
    if (ind.col >= 4 && ind.i < line.length) break;
    rows.push(splitCells(line, aligns.length));
    j++;
  }
  return {
    block: { t: 'table', align: aligns, head: header, body: rows },
    end: j,
  };
}

// Parse a paragraph starting at lines[i] (top = true at the document and
// blockquote level, false inside list items). Returns {block, end} where
// block is a paragraph or a setext heading.
function parseParagraph(lines, i, top, refs) {
  const n = lines.length;
  const textLines = [lines[i]];
  let j = i + 1;
  while (j < n) {
    const line = lines[j];
    if (isBlankLine(line)) {
      // a line of only spaces is paragraph text when it is the last line
      // (marked's paragraph regex only treats it as blank when a newline
      // follows it); an empty last line is just the trailing newline.
      // Only at the top level: inside a list item state.top is false, so
      // the paragraph is a one-line text token and a trailing spaces-only
      // line is a separate space token, never paragraph text.
      if (top && j === n - 1 && line.length > 0) { textLines.push(line); j++; }
      break;
    }
    // setext underline: the paragraph becomes a heading (text trimmed)
    const sl = setextLevel(line);
    if (sl) {
      return { block: { t: 'h', level: sl, text: textLines.join('\n').trim() }, end: j + 1 };
    }
    // a table starting at this line ends the paragraph here
    if (tryTable(lines, j)) break;
    // any other interrupting block start ends the paragraph; inside a
    // list item (top = false) the paragraph is one-line text tokens, so
    // a list marker of any number interrupts it
    if (paragraphInterrupt(line, !top)) break;
    if (lineIndent(line).col >= 4) {
      // indented code: at the top level it stays in the paragraph as-is;
      // nested, it is merged with four columns removed
      textLines.push(top ? line : stripCodeIndent(line));
      j++;
      continue;
    }
    textLines.push(line);
    j++;
  }
  return { block: { t: 'p', text: textLines.join('\n') }, end: j };
}

// Parse blocks from lines, appending to `blocks`. `mergeFirst` is true
// when a preceding paragraph (from an earlier blockquote frame) may absorb
// a leading indented code block or definition.
function parseBlocksInto(lines, top, refs, blocks, mergeFirst, state) {
  const n = lines.length;
  let i = 0;
  let firstBlock = true;
  // a blank line skipped between two top-level blocks (marked's space
  // token spanning a blank line); used for list loose/tight detection.
  // It fires when any content (even a definition, which makes no block)
  // follows the blank line after a block.
  let skippedBlank = false;
  const pushBlock = (b) => {
    skippedBlank = false;
    blocks.push(b);
  };
  while (i < n) {
    const line = lines[i];
    if (isBlankLine(line)) { skippedBlank = true; i++; continue; }
    if (state && skippedBlank && blocks.length > 0) state.hasInternalBlank = true;
    skippedBlank = false;
    const { col } = lineIndent(line);
    // indented code
    if (col >= 4) {
      const codeLines = [];
      let j = i;
      while (j < n) {
        const l = lines[j];
        if (isBlankLine(l)) { codeLines.push(stripCodeIndent(l)); j++; continue; }
        if (lineIndent(l).col < 4) break;
        codeLines.push(stripCodeIndent(l));
        j++;
      }
      // trim trailing blank lines
      while (codeLines.length > 0 && codeLines[codeLines.length - 1] === '') codeLines.pop();
      const text = codeLines.join('\n');
      if (mergeFirst && firstBlock && blocks.length > 0 && blocks[blocks.length - 1].t === 'p') {
        const p = blocks[blocks.length - 1];
        p.text += '\n' + text;
        skippedBlank = false;
      } else {
        pushBlock({ t: 'code', text, lang: '' });
      }
      i = j;
      firstBlock = false;
      continue;
    }
    // ATX heading
    const atx = atxHeading(line);
    if (atx) {
      pushBlock({ t: 'h', level: atx.level, text: atx.text });
      i++;
      firstBlock = false;
      continue;
    }
    // fenced code
    const fence = fenceStart(line);
    if (fence) {
      const codeLines = [];
      let j = i + 1;
      let closed = false;
      while (j < n) {
        const l = lines[j];
        const { col: c2, i: i2 } = lineIndent(l);
        if (c2 <= 3 && l[i2] === fence.ch) {
          let k = i2;
          while (k < l.length && l[k] === fence.ch) k++;
          if (k - i2 >= fence.len) {
            let m = k;
            while (m < l.length && (l[m] === ' ' || l[m] === '\t')) m++;
            if (m === l.length) { closed = true; break; }
          }
        }
        codeLines.push(l);
        j++;
      }
      // the fence's own indentation is removed from each content line,
      // but only for backtick fences: marked's indentCodeCompensation
      // regex is /^(\s+)(?:```)/, which never matches a tilde fence
      const comp = fence.ch === '`' ? codeLines.map(l => stripFenceIndent(l, fence.indentStr.length)) : codeLines;
      pushBlock({ t: 'code', text: comp.join('\n'), lang: unescapePunct(fence.info).split(/\s+/)[0] || '' });
      i = closed ? j + 1 : j;
      firstBlock = false;
      continue;
    }
    // thematic break
    if (isHr(line)) {
      pushBlock({ t: 'hr' });
      i++;
      firstBlock = false;
      continue;
    }
    // blockquote
    if (lineIndent(line).col <= 3 && line[lineIndent(line).i] === '>') {
      const r = parseBlockquote(lines, i, refs);
      if (r) {
        pushBlock(r.block);
        i = r.end;
        firstBlock = false;
        continue;
      }
    }
    // list
    if (listMarker(line) && !isHr(line)) {
      const r = parseList(lines, i, refs);
      if (r) {
        pushBlock(r.block);
        i = r.end;
        firstBlock = false;
        continue;
      }
    }
    // html block
    const ht = htmlBlockType(line);
    if (ht) {
      const r = parseHtmlBlock(lines, i, ht);
      pushBlock(r.block);
      i = r.end;
      firstBlock = false;
      continue;
    }
    // link reference definition
    const def = parseDef(lines, i);
    if (def) {
      if (mergeFirst && firstBlock && blocks.length > 0 && blocks[blocks.length - 1].t === 'p') {
        blocks[blocks.length - 1].text += '\n' + def.raw;
      } else if (!refs.has(def.label)) {
        refs.set(def.label, { href: def.href, title: def.title });
      }
      i = def.end;
      firstBlock = false;
      continue;
    }
    // table
    const table = tryTable(lines, i);
    if (table) {
      pushBlock(table.block);
      i = table.end;
      firstBlock = false;
      continue;
    }
    // paragraph (or setext heading)
    const para = parseParagraph(lines, i, top, refs);
    // a blockquote frame's first paragraph merges into the paragraph the
    // previous frame left open
    if (mergeFirst && firstBlock && para.block.t === 'p' && blocks.length > 0 && blocks[blocks.length - 1].t === 'p') {
      blocks[blocks.length - 1].text += '\n' + para.block.text;
      skippedBlank = false;
    } else {
      pushBlock(para.block);
    }
    i = para.end;
    firstBlock = false;
  }
  return blocks;
}

function parseBlocks(lines, top, refs) {
  return parseBlocksInto(lines, top, refs, [], false);
}

// Remove trailing blank lines, but keep a single trailing newline
// (marked's trimTrailingBlankLines).
function trimTrailingBlankLinesStr(s) {
  const parts = s.split('\n');
  let end = parts.length - 1;
  while (end >= 0 && /^[ \t]*$/.test(parts[end])) end--;
  if (parts.length - end <= 2) return s;
  return parts.slice(0, end + 1).join('\n');
}

// The source text of lines[i..j-1], including the newline after the last
// line when one follows it in the input.
function rawOfLines(lines, i, j) {
  let s = lines.slice(i, j).join('\n');
  if (j - 1 < lines.length - 1) s += '\n';
  return s;
}

// HTML block: collect lines until the end condition for its type.
function parseHtmlBlock(lines, i, type) {
  const n = lines.length;
  const out = [lines[i]];
  let j = i + 1;
  if (type === 1) {
    // ends at the matching closing tag (or the end of the input)
    const { i: ii } = lineIndent(lines[i]);
    // the opening tag may continue on the next line (`<style\n  type=...>`)
    const m = /^<(pre|script|style|textarea)(?:[\s>]|$)/i.exec(lines[i].slice(ii));
    const closeTag = m ? '</' + m[1].toLowerCase() + '>' : null;
    if (closeTag && lines[i].toLowerCase().indexOf(closeTag) < 0) {
      while (j < n) {
        out.push(lines[j]);
        if (lines[j].toLowerCase().indexOf(closeTag) >= 0) { j++; break; }
        j++;
      }
    }
  } else if (type === 2) {
    // ends at -->
    if (lines[i].indexOf('-->') < 0) {
      while (j < n) {
        out.push(lines[j]);
        if (lines[j].indexOf('-->') >= 0) { j++; break; }
        j++;
      }
    }
  } else if (type === 3) {
    if (lines[i].indexOf('?>') < 0) {
      while (j < n) {
        out.push(lines[j]);
        if (lines[j].indexOf('?>') >= 0) { j++; break; }
        j++;
      }
    }
  } else if (type === 4) {
    if (lines[i].indexOf('>') < 0) {
      while (j < n) {
        out.push(lines[j]);
        if (lines[j].indexOf('>') >= 0) { j++; break; }
        j++;
      }
    }
  } else if (type === 5) {
    if (lines[i].indexOf(']]>') < 0) {
      while (j < n) {
        out.push(lines[j]);
        if (lines[j].indexOf(']]>') >= 0) { j++; break; }
        j++;
      }
    }
  } else {
    // types 6 and 7: end at a blank line
    while (j < n && !isBlankLine(lines[j])) { out.push(lines[j]); j++; }
  }
  // The raw also swallows following empty lines (types 1-5) or blank lines
  // with spaces (types 6-7); trailing blank lines are then trimmed.
  let k = j;
  if (type === 6 || type === 7) {
    while (k < n && isBlankLine(lines[k])) k++;
  } else {
    while (k < n && lines[k] === '') k++;
  }
  const text = trimTrailingBlankLinesStr(rawOfLines(lines, i, k));
  return { block: { t: 'html', text }, end: k };
}

// The block-start checks inside a list item use at most indent-1 spaces
// of indentation, capped at 3 (marked's cachedIndentRegex).
function checkIndent(indent) {
  return Math.max(0, Math.min(3, indent - 1));
}

// A bullet at up to `indent` spaces of indentation, followed by a space,
// a tab, or the end of the line. More leading spaces than `indent` means
// the block does not start here (the helpers below must not re-allow
// spaces after this point).
function bulletAt(line, indent) {
  indent = checkIndent(indent);
  let i = 0;
  while (i < line.length && line[i] === ' ' && i < indent) i++;
  if (line[i] === ' ') return false;
  if (i >= line.length) return false;
  const ch = line[i];
  if (ch === '-' || ch === '+' || ch === '*') {
    return i + 1 >= line.length || line[i + 1] === ' ' || line[i + 1] === '\t';
  }
  if (ch >= '0' && ch <= '9') {
    let j = i;
    while (j < line.length && line[j] >= '0' && line[j] <= '9') j++;
    if (j - i > 9) return false;
    if (j < line.length && (line[j] === '.' || line[j] === ')')) {
      return j + 1 >= line.length || line[j + 1] === ' ' || line[j + 1] === '\t';
    }
  }
  return false;
}

function hrAt(line, indent) {
  indent = checkIndent(indent);
  let i = 0;
  while (i < line.length && line[i] === ' ' && i < indent) i++;
  if (line[i] === ' ') return false;
  return isHr(line.slice(i));
}

function fenceAt(line, indent) {
  indent = checkIndent(indent);
  let i = 0;
  while (i < line.length && line[i] === ' ' && i < indent) i++;
  if (line[i] === ' ') return null;
  return fenceStart(line.slice(i));
}

function headingAt(line, indent) {
  indent = checkIndent(indent);
  let i = 0;
  while (i < line.length && line[i] === ' ' && i < indent) i++;
  if (line[i] === ' ') return null;
  return atxHeading(line.slice(i));
}

function htmlBeginAt(line, indent) {
  indent = checkIndent(indent);
  let i = 0;
  while (i < line.length && line[i] === ' ' && i < indent) i++;
  if (line[i] === ' ') return 0;
  const t = htmlBlockType(line.slice(i));
  return t >= 1 && t <= 6 ? t : 0;
}

function bqAt(line, indent) {
  indent = checkIndent(indent);
  let i = 0;
  while (i < line.length && line[i] === ' ' && i < indent) i++;
  if (line[i] === ' ') return false;
  return line[i] === '>';
}

// Whether `line\nnextLine` is a valid setext heading (used for the lazy
// setext continuation inside list items).
function isLheadingPair(line, nextLine) {
  if (line.trim() === '') return false;
  if (setextLevel(nextLine) === 0) return false;
  // the text line must not start a block that interrupts a heading
  // (inside a list item a marker of any number interrupts)
  if (paragraphInterrupt(line, true)) return false;
  if (lineIndent(line).col >= 4) return false;
  return true;
}

// Parse a list starting at lines[i]. Returns {block, end} or null.
function parseList(lines, i, refs) {
  const n = lines.length;
  const m0 = listMarker(lines[i]);
  if (!m0 || isHr(lines[i])) return null;
  const ordered = m0.ordered;
  const bullCh = ordered ? m0.marker[m0.marker.length - 1] : m0.marker;
  const start = ordered ? m0.num : 0;
  const items = [];
  let j = i;
  const rawStart = i;
  while (j < n) {
    const line = lines[j];
    const m = listMarker(line);
    if (!m) break;
    if (m.ordered !== ordered) break;
    if (!ordered && m.marker !== m0.marker) break;
    if (ordered && m.marker[m.marker.length - 1] !== bullCh) break;
    if (isHr(line)) break;
    const bulletIndent = m.markerLen;
    // the first line's content, with leading tabs expanded from the marker
    let lead = 0;
    const rest = m.rest;
    while (lead < rest.length && (rest[lead] === ' ' || rest[lead] === '\t')) lead++;
    const line2 = expandTabs(rest.slice(0, lead), bulletIndent) + rest.slice(lead);
    let blankLine = line2.trim() === '';
    let indent;
    const itemLines = [];
    if (blankLine) {
      indent = bulletIndent + 1;
    } else {
      let ind = 0;
      while (ind < line2.length && line2[ind] === ' ') ind++;
      if (ind > 4) ind = 1;
      itemLines.push(line2.slice(ind));
      indent = ind + bulletIndent;
    }
    // an item that begins with a blank line, followed by another blank line,
    // is empty and ends here
    if (blankLine && j + 1 < n && isBlankLine(lines[j + 1])) {
      items.push({ lines: [], blankAtEnd: true });
      j += 2;
      continue;
    }
    // continuation lines; `prev` is the previous (dedented) line, used for
    // the lazy-continuation checks
    let prev = line2;
    let k = j + 1;
    while (k < n) {
      const rawLine = lines[k];
      const nextLine = rawLine;
      // expand leading tabs from column 0 for the indent check
      let l2 = 0;
      while (l2 < nextLine.length && (nextLine[l2] === ' ' || nextLine[l2] === '\t')) l2++;
      const nextLineWithoutTabs = expandTabs(nextLine.slice(0, l2), 0) + nextLine.slice(l2);
      if (fenceAt(nextLine, indent)) break;
      if (headingAt(nextLine, indent)) break;
      if (htmlBeginAt(nextLine, indent)) break;
      if (bqAt(nextLine, indent)) break;
      if (bulletAt(nextLine, indent)) break;
      if (hrAt(nextLine, indent)) break;
      let firstNonSpace = 0;
      while (firstNonSpace < nextLineWithoutTabs.length && nextLineWithoutTabs[firstNonSpace] === ' ') firstNonSpace++;
      if (firstNonSpace >= indent || nextLine.trim() === '') {
        itemLines.push(nextLineWithoutTabs.slice(indent));
      } else {
        if (blankLine) break;
        // the previous line must not have been an indented code block
        let p = 0;
        const prevExpanded = prev.replace(/\t/g, '    ');
        while (p < prevExpanded.length && prevExpanded[p] === ' ') p++;
        if (p >= 4) break;
        if (fenceAt(prev, indent)) break;
        if (headingAt(prev, indent)) break;
        if (htmlBeginAt(prev, indent)) break;
        if (hrAt(prev, indent)) break;
        // a lazy setext continuation gets four spaces prepended
        if (/^ {0,3}(?:=+|-+) *$/.test(nextLine) && isLheadingPair(prev, nextLine)) {
          itemLines.push('    ' + nextLineWithoutTabs.replace(/^ {0,3}/, ''));
        } else {
          itemLines.push(nextLine);
        }
      }
      blankLine = nextLine.trim() === '';
      k++;
      prev = nextLineWithoutTabs.slice(indent);
    }
    items.push({ lines: itemLines, blankAtEnd: false });
    j = k;
  }
  if (items.length === 0) return null;
  // loose: a blank line between two top-level blocks inside an item, or
  // any non-last item ending with a blank line. Blank lines inside a
  // nested list do not make the outer list loose.
  let loose = false;
  for (let x = 0; x < items.length; x++) {
    const ls = items[x].lines;
    if (x < items.length - 1 && ls.length > 0 && isBlankLine(ls[ls.length - 1])) { loose = true; break; }
    if (x < items.length - 1 && items[x].blankAtEnd) { loose = true; break; }
  }
  // trim trailing blank lines of the last item; marked trims the list
  // raw, so those blank lines are not consumed by the list either (the
  // enclosing context sees them as a blank-line gap)
  const lastLines = items[items.length - 1].lines;
  let trailingBlank = 0;
  while (lastLines.length > 0 && isBlankLine(lastLines[lastLines.length - 1])) { lastLines.pop(); trailingBlank++; }
  const endJ = j - trailingBlank;
  // parse each item's blocks (nested context); a blank line between two
  // of an item's top-level blocks makes the whole list loose
  const parsedItems = [];
  for (const it of items) {
    const text = it.lines.join('\n');
    const task = /^\[[ xX]\][ \t]+\S/.test(text);
    const state = {};
    const blocks = parseBlocksInto(it.lines, false, refs, [], false, state);
    if (state.hasInternalBlank) loose = true;
    let checked = false;
    if (task && blocks.length > 0 && blocks[0].t === 'p') {
      const m = /^\[([ xX])\][ \t]+/.exec(blocks[0].text);
      if (m) {
        checked = m[1] !== ' ';
        blocks[0].text = blocks[0].text.slice(m[0].length);
        blocks[0].cb = checked;
      }
    }
    parsedItems.push({ blocks, task: task && blocks.length > 0 && blocks[0].t === 'p' && blocks[0].cb !== undefined });
  }
  return {
    block: {
      t: ordered ? 'ol' : 'ul',
      start,
      loose,
      items: parsedItems,
      rawLines: lines.slice(rawStart, endJ),
    },
    end: endJ,
  };
}

// The content after a blockquote marker, or null if the line is not one.
function bqMarker(line) {
  const { col, i } = lineIndent(line);
  if (col > 3 || line[i] !== '>') return null;
  let j = i + 1;
  if (j < line.length && (line[j] === ' ' || line[j] === '\t')) j++;
  return line.slice(j);
}

// Turn a blockquote frame's raw lines into the inner text: expand tabs
// after the marker, neutralize setext-looking lines, strip the markers.
function stripBqFrame(frameText) {
  const lines = frameText.split('\n');
  for (let n = 0; n < lines.length; n++) {
    const line = lines[n];
    const m = /^( {0,3}>)([ \t]+)/.exec(line);
    if (m) {
      lines[n] = m[1] + expandTabs(m[2], m[1].length) + line.slice(m[1].length + m[2].length);
    }
  }
  let out = lines.join('\n');
  out = out.replace(/\n {0,3}((?:=+|-+)[ \t]*)(?=\n|$)/g, '\n    $1');
  out = out.replace(/^ {0,3}>[ \t]?/gm, '');
  return out;
}

// Re-parse a nested blockquote with continuation lines appended. The
// continuation lines belong to the same nesting frame as the nested
// blockquote, which already had one '>' marker stripped, so strip one
// marker from them too (marked's blockquoteSetextReplace2); otherwise a
// restated marker after a lazy line is re-parsed as a spurious deeper
// blockquote.
function bqWithContinuation(bqBlock, restLines, refs) {
  const stripped = restLines.map(l => l.replace(/^ {0,3}>[ \t]?/, ''));
  const r = parseBlockquote(bqBlock.rawLines.concat(stripped), 0, refs);
  if (!r) return null;
  return { block: r.block, consumed: r.block.rawLines.length - bqBlock.rawLines.length };
}

function listWithContinuation(listBlock, restLines, refs) {
  const r = parseList(listBlock.rawLines.concat(restLines), 0, refs);
  if (!r) return null;
  return { block: r.block, consumed: r.block.rawLines.length - listBlock.rawLines.length };
}

// Parse a blockquote starting at lines[i]. Returns {block, end} or null.
function parseBlockquote(lines, i, refs) {
  const n = lines.length;
  if (bqMarker(lines[i]) === null) return null;
  // Step 1: gather the lines the blockquote regex matches.
  const matched = [];
  let j = i;
  let paraOpen = false;
  while (j < n) {
    const line = lines[j];
    const content = bqMarker(line);
    if (content !== null) {
      matched.push({ raw: line, content });
      paraOpen = content.trim() !== '';
      j++;
    } else if (paraOpen && !isBlankLine(line) && !bqParagraphInterrupt(line)) {
      matched.push({ raw: line, content: null });
      j++;
    } else break;
  }
  if (matched.length === 0) return null;
  // Step 2: the frame loop.
  const blocks = [];
  let idx = 0;
  let consumed = 0;
  while (idx < matched.length) {
    const frame = [];
    let inBq = false;
    let k = idx;
    while (k < matched.length) {
      if (matched[k].content !== null) { frame.push(matched[k].raw); inBq = true; k++; }
      else if (!inBq) { frame.push(matched[k].raw); k++; }
      else break;
    }
    const frameText = stripBqFrame(frame.join('\n'));
    const frameLines = frameText.split('\n');
    parseBlocksInto(frameLines, true, refs, blocks, blocks.length > 0);
    idx = k;
    consumed = idx;
    if (idx >= matched.length) break;
    const last = blocks[blocks.length - 1];
    if (!last) break;
    if (last.t === 'code' || last.t === 'h' || last.t === 'hr' || last.t === 'html' || last.t === 'table') break;
    if (last.t === 'bq' || last.t === 'ul' || last.t === 'ol') {
      const rest = matched.slice(idx).map(m => m.raw);
      const r = last.t === 'bq' ? bqWithContinuation(last, rest, refs) : listWithContinuation(last, rest, refs);
      if (!r || r.consumed <= 0) break;
      blocks[blocks.length - 1] = r.block;
      idx += r.consumed;
      consumed = idx;
      if (idx < matched.length && matched[idx].content !== null) continue;
      break;
    }
    // otherwise continue with the next frame (a paragraph continuation)
  }
  return {
    block: { t: 'bq', blocks, rawLines: matched.slice(0, consumed).map(m => m.raw) },
    end: i + consumed,
  };
}

// ---------------------------------------------------------------------------
// Emphasis resolution, following marked's forward scan from each opener:
// from an opener, scan forward for closers, skipping left-only runs and
// (under CommonMark rules 9-10) ambiguous runs, then wrap the inside and
// resolve emphasis inside it recursively.
// ---------------------------------------------------------------------------

function firstCharOf(nodes) {
  for (const nd of nodes) {
    const t = nd[0];
    if (t === 't' || t === 'esc') return nd[1].charAt(0);
    if (t === 'code') return '`';
    if (t === 'html') return '<';
    if (t === 'br') return '\n';
    if (t === 'delim') return nd[1];
    // a link's source first char: '[' for a bracketed link, '<' for an
    // angle autolink, the URL's first char for a bare autolink (stored
    // in nd[5] when the link was built)
    if (t === 'link') return nd[5] !== undefined ? nd[5] : '[';
    if (t === 'img') return '!';
    if (t === 'em' || t === 'strong' || t === 'del') return nd[2] || '*';
  }
  return '';
}

function lastCharOf(nodes) {
  for (let k = nodes.length - 1; k >= 0; k--) {
    const nd = nodes[k];
    const t = nd[0];
    if (t === 't' || t === 'esc') {
      if (nd[1].length > 0) return nd[1].charAt(nd[1].length - 1);
    }
    if (t === 'code') return '`';
    if (t === 'html') return '>';
    if (t === 'br') return '\n';
    if (t === 'delim') return nd[1];
    // a link's source last char: ']' (or ')' — both punctuation) for a
    // bracketed link, '>' for an angle autolink, the URL's last char for
    // a bare autolink (stored in nd[6] when the link was built)
    if (t === 'link') return nd[6] !== undefined ? nd[6] : ']';
    if (t === 'img') return ']';
    if (t === 'em' || t === 'strong' || t === 'del') return nd[2] || '*';
  }
  return '';
}

// Build delimiter entries from a nodes array, grouping consecutive
// same-char delimiter nodes into runs. One entry per character: an
// opener at offset k in a run of length L has lLength L-k (marked tries
// a run at every offset), runLength L for rules 9-10, and midRun when
// the source character before it is the same delimiter. Flanking is
// per run, from the source char before the run (runPrev) and the char
// after it (next).
function buildDelims(nodes) {
  const delims = [];
  let i = 0;
  while (i < nodes.length) {
    const nd = nodes[i];
    if (nd[0] !== 'delim') { i++; continue; }
    const ch = nd[1];
    let j = i;
    while (j < nodes.length && nodes[j][0] === 'delim' && nodes[j][1] === ch) j++;
    const runLen = j - i;
    const runPrev = i === 0 ? '' : lastCharOf([nodes[i - 1]]);
    const next = j >= nodes.length ? '' : firstCharOf([nodes[j]]);
    const f = flanking(runPrev, next);
    let canOpen = f.left, canClose = f.right;
    if (ch === '_') {
      canOpen = f.left && (!f.right || (runPrev !== '' && isPunctCh(runPrev)));
      canClose = f.right && (!f.left || (next !== '' && isPunctCh(next)));
    }
    if (ch === '~') {
      canOpen = next !== '' && !isWhitespaceCh(next);
      canClose = runPrev !== '' && !isWhitespaceCh(runPrev);
    }
    const runPrevPunct = runPrev === '*' || runPrev === '_' || (runPrev !== '' && isPunctCh(runPrev));
    const nextIsPunct = next !== '' && isPunctCh(next);
    const openerCanClose = runPrev !== '' && runPrev.trim() !== '' && (nextIsPunct || (ch === '*' && !runPrevPunct));
    for (let k = 0; k < runLen; k++) {
      // a `~` run of three or more: marked's delimiter regexes only ever
      // match one or two tildes, and a match starting before the last two
      // positions is followed by another `~`, so it never opens or closes
      const valid = ch !== '~' || runLen < 3 || k >= runLen - 2;
      delims.push({
        node: nodes[i + k], ch, runLen, posInRun: k,
        lLength: ch === '~' ? Math.min(runLen - k, 2) : runLen - k,
        midRun: k > 0 || runPrev === ch,
        canOpen: valid && canOpen, canClose: valid && canClose,
        runPrev, next, openerCanClose, used: false,
      });
    }
    i = j;
  }
  return delims;
}

// Whether the delimiter at nodes[cIdx] is an orphan inside a pair of the
// opposite delimiter (`*` inside `__...__`, `_` inside `**...**`): marked's
// closer regex (`^[^_*]*?__[^_*]*?\*[^_*]*?(?=__)`) skips such a delimiter
// entirely, so it neither closes nor counts as a left-only run. The `__`
// before the candidate must be the FIRST delimiter after the opener, and
// the candidate must be the next delimiter after that `__` (a closing
// `__` of an inner strong does not make the `*` after it an orphan).
function isOrphan(nodes, openerIdx, cIdx, ch) {
  const other = ch === '*' ? '_' : '*';
  // first delimiter after the opener
  let f = openerIdx + 1;
  while (f < cIdx && nodes[f][0] !== 'delim') f++;
  if (f >= cIdx || nodes[f][1] !== other) return false;
  // it must be a run of at least two of the opposite char
  let runEnd = f;
  while (runEnd + 1 < nodes.length && nodes[runEnd + 1][0] === 'delim' && nodes[runEnd + 1][1] === other) runEnd++;
  if (runEnd - f + 1 < 2) return false;
  // the next delimiter after that run must be the candidate itself
  let nx = runEnd + 1;
  while (nx < cIdx && nodes[nx][0] !== 'delim') nx++;
  if (nx !== cIdx) return false;
  // after the candidate, the next delimiter must be a run of >= 2
  let a = cIdx + 1;
  while (a < nodes.length && nodes[a][0] !== 'delim') a++;
  if (a >= nodes.length || nodes[a][1] !== other) return false;
  let aRun = 1;
  let k = a + 1;
  while (k < nodes.length && nodes[k][0] === 'delim' && nodes[k][1] === other) { aRun++; k++; }
  return aRun >= 2;
}

function processEmphasis(nodes) {
  const delims = buildDelims(nodes);
  let di = 0;
  while (di < delims.length) {
    const D = delims[di];
    if (D.used || !D.canOpen) { di++; continue; }
    const lLength = D.lLength;
    const runLength = D.runLen;
    let delimTotal = lLength;
    let midDelimTotal = 0;
    let closer = null;
    let rLength = 0;
    if (D.ch === '~') {
      for (let ci = di + 1; ci < delims.length; ci++) {
        const C = delims[ci];
        if (C.used || C.ch !== '~' || C.posInRun !== 0) continue;
        const cLen = Math.min(C.runLen, 2);
        if (cLen !== lLength) continue;
        if (!C.canOpen && !C.canClose) continue;
        if (C.canOpen && !C.canClose) { delimTotal += cLen; continue; }
        delimTotal -= cLen;
        if (delimTotal > 0) continue;
        closer = C;
        rLength = Math.min(cLen, cLen + delimTotal);
        break;
      }
    } else {
      for (let ci = di + 1; ci < delims.length; ci++) {
        const C = delims[ci];
        if (C.used || C.ch !== D.ch || C.posInRun !== 0) continue;
        if (!C.canOpen && !C.canClose) continue;
        // an orphan inside a pair of the opposite delimiter is skipped
        if (isOrphan(nodes, nodes.indexOf(D.node), nodes.indexOf(C.node), D.ch)) continue;
        const cLeftOnly = C.canOpen && !C.canClose;
        const cEither = C.canOpen && C.canClose;
        if (cLeftOnly) { delimTotal += C.runLen; continue; }
        if (cEither || D.canClose) {
          if (D.midRun && cEither) break;
          if (runLength % 3 !== 0 && (runLength + C.runLen) % 3 === 0) {
            midDelimTotal += C.runLen;
            continue;
          }
        }
        delimTotal -= C.runLen;
        if (delimTotal > 0) continue;
        closer = C;
        rLength = Math.min(C.runLen, C.runLen + delimTotal + midDelimTotal);
        break;
      }
    }
    if (!closer) { di++; continue; }
    const use = D.ch === '~' ? lLength : (Math.min(lLength, rLength) % 2 === 1 ? 1 : 2);
    const oIdx = nodes.indexOf(D.node);
    const cIdx = nodes.indexOf(closer.node);
    if (oIdx < 0 || cIdx < 0 || oIdx >= cIdx) { di++; continue; }
    // the span consumes `use` opener chars from oIdx and `use` closer
    // chars ending at cIdx + rLength - 1; the opener's spare chars and
    // the closer's spare chars (rLength - use of them) stay inside
    const children = nodes.slice(oIdx + use, cIdx + rLength - use);
    processEmphasis(children);
    const kind = D.ch === '~' ? 'del' : (use === 2 ? 'strong' : 'em');
    const wrap = [kind, children, D.ch];
    // mark every entry whose node is consumed or moved inside as used
    for (let k = di; k < delims.length; k++) {
      const e = delims[k];
      if (e.used) continue;
      const idx = nodes.indexOf(e.node);
      if (idx >= oIdx && idx < cIdx + rLength) e.used = true;
    }
    // the closer's characters beyond rLength stay after the span; their
    // run now starts after the span's raw, so its previous character is
    // the delimiter itself (recompute flanking)
    if (closer.runLen > rLength) {
      for (let k = di + 1; k < delims.length; k++) {
        const e = delims[k];
        if (e.used || e.ch !== closer.ch) continue;
        const idx = nodes.indexOf(e.node);
        if (idx < cIdx + rLength || idx >= cIdx + closer.runLen) continue;
        // the remaining characters form a new, shorter run starting here
        e.runLen = closer.runLen - rLength;
        e.posInRun = e.posInRun - rLength;
        e.runPrev = closer.ch;
        e.midRun = true;
        const f = flanking(closer.ch, e.next);
        let canOpen = f.left, canClose = f.right;
        if (e.ch === '_') {
          canOpen = f.left && (!f.right || isPunctCh(closer.ch));
          canClose = f.right && (!f.left || (e.next !== '' && isPunctCh(e.next)));
        }
        if (e.ch === '~') {
          canOpen = e.next !== '' && !isWhitespaceCh(e.next);
          canClose = !isWhitespaceCh(closer.ch);
        }
        e.canOpen = canOpen;
        e.canClose = canClose;
        const runPrevPunct = closer.ch === '*' || closer.ch === '_' || isPunctCh(closer.ch);
        e.openerCanClose = closer.ch.trim() !== '' && ((e.next !== '' && isPunctCh(e.next)) || (e.ch === '*' && !runPrevPunct));
      }
    }
    nodes.splice(oIdx, (cIdx + rLength) - oIdx, wrap);
    di++;
  }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

// renderInline appends the HTML for a node list into `out` (an array),
// so nested spans do not build and re-concatenate intermediate strings
function renderInline(nodes, out) {
  for (const nd of nodes) {
    const t = nd[0];
    if (t === 't') {
      if (nd[2]) out.push(nd[1]);
      else if (nd[3]) out.push(escapeHtml(nd[1], false));
      else out.push(escapeHtml(decodeNumeric(nd[1]), false));
    } else if (t === 'esc') {
      out.push(escapeHtml(nd[1], false));
    } else if (t === 'code') {
      out.push('<code>', escapeHtml(nd[1], true), '</code>');
    } else if (t === 'html') {
      out.push(nd[1]);
    } else if (t === 'br') {
      out.push('<br>');
    } else if (t === 'link') {
      const href = cleanUrl(nd[1]);
      if (href === null) {
        renderInline(nd[3], out);
      } else {
        out.push('<a href="', escapeHtml(href, false), '"');
        if (nd[2]) out.push(' title="', escapeHtml(nd[2], false), '"');
        out.push('>');
        renderInline(nd[3], out);
        out.push('</a>');
      }
    } else if (t === 'img') {
      const href = cleanUrl(nd[1]);
      if (href === null) {
        out.push(escapeHtml(nd[4], false));
      } else {
        out.push('<img src="', escapeHtml(href, false), '" alt="', escapeHtml(nd[3], false), '"');
        if (nd[2]) out.push(' title="', escapeHtml(nd[2], false), '"');
        out.push('>');
      }
    } else if (t === 'delim') {
      out.push(nd[1].repeat(nd[2]));
    } else if (t === 'em') {
      out.push('<em>');
      renderInline(nd[1], out);
      out.push('</em>');
    } else if (t === 'strong') {
      out.push('<strong>');
      renderInline(nd[1], out);
      out.push('</strong>');
    } else if (t === 'del') {
      out.push('<del>');
      renderInline(nd[1], out);
      out.push('</del>');
    }
  }
}

function checkboxHtml(checked) {
  return '<input ' + (checked ? 'checked="" ' : '') + 'disabled="" type="checkbox"> ';
}

// `doc` is the document-level inline state (marked's Lexer state): an
// unclosed `<a>` tag sets inLink and an unclosed <pre>/<script>/etc sets
// inRawBlock, and both persist across blocks until a closing tag resets
// them. One object per parse() call, shared by every top-level scanInline.
function renderBlocks(blocks, tight, refs, doc, out) {
  for (const b of blocks) {
    if (b.t === 'p') {
      if (!tight) out.push('<p>');
      if (b.cb !== undefined) out.push(checkboxHtml(b.cb));
      renderInline(scanInline(b.text, refs, doc), out);
      if (!tight) out.push('</p>\n');
    } else if (b.t === 'h') {
      out.push('<h', b.level, '>');
      renderInline(scanInline(b.text, refs, doc), out);
      out.push('</h', b.level, '>\n');
    } else if (b.t === 'code') {
      const code = b.text ? b.text.replace(/\n$/, '') + '\n' : '';
      out.push('<pre><code');
      if (b.lang) out.push(' class="language-', escapeHtml(b.lang, false), '"');
      out.push('>', escapeHtml(code, true), '</code></pre>\n');
    } else if (b.t === 'hr') {
      out.push('<hr>\n');
    } else if (b.t === 'html') {
      out.push(b.text);
    } else if (b.t === 'bq') {
      out.push('<blockquote>\n');
      renderBlocks(b.blocks, false, refs, doc, out);
      out.push('</blockquote>\n');
    } else if (b.t === 'ul' || b.t === 'ol') {
      const tag = b.t;
      const startAttr = (tag === 'ol' && b.start !== 1) ? ' start="' + b.start + '"' : '';
      out.push('<', tag, startAttr, '>\n');
      for (const item of b.items) {
        out.push('<li>');
        renderBlocks(item.blocks, !b.loose, refs, doc, out);
        out.push('</li>\n');
      }
      out.push('</', tag, '>\n');
    } else if (b.t === 'table') {
      out.push('<table>\n<thead>\n<tr>\n');
      for (let k = 0; k < b.head.length; k++) {
        out.push(b.align[k] ? '<th align="' + b.align[k] + '">' : '<th>');
        renderInline(scanInline(b.head[k], refs, doc), out);
        out.push('</th>\n');
      }
      out.push('</tr>\n</thead>\n');
      if (b.body.length > 0) {
        out.push('<tbody>');
        for (const row of b.body) {
          out.push('<tr>\n');
          for (let k = 0; k < row.length; k++) {
            out.push(b.align[k] ? '<td align="' + b.align[k] + '">' : '<td>');
            renderInline(scanInline(row[k], refs, doc), out);
            out.push('</td>\n');
          }
          out.push('</tr>\n');
        }
        out.push('</tbody>');
      }
      out.push('</table>\n');
    }
  }
}

export function parse(markdown) {
  const src = markdown.indexOf('\r') < 0 ? markdown : markdown.replace(/\r\n?/g, '\n');
  const lines = src.split('\n');
  const refs = new Map();
  const blocks = parseBlocks(lines, true, refs);
  const doc = { inLink: false, inRawBlock: false, linkEmitted: false };
  const out = [];
  renderBlocks(blocks, false, refs, doc, out);
  return out.join('');
}
