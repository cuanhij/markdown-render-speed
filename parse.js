// Fast Markdown parser: output byte-identical to marked 18.1.3 (default
// options: gfm on, breaks off, pedantic off, async off). CommonMark 0.31.2
// plus GFM extensions (tables, task lists, strikethrough, extended
// autolinks, disallowed raw HTML). Written from scratch.

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  iexcl: '¡', cent: '¢', pound: '£', curren: '¤', yen: '¥', brvbar: '¦',
  sect: '§', uml: '¨', copy: '©', ordf: 'ª', laquo: '«', not: '¬',
  shy: '­', reg: '®', macr: '¯', deg: '°', plusmn: '±', sup2: '²',
  sup3: '³', acute: '´', micro: 'µ', para: '¶', middot: '·', cedil: '¸',
  sup1: '¹', ordm: 'º', raquo: '»', frac14: '¼', frac12: '½', frac34: '¾',
  iquest: '¿', Agrave: 'À', Aacute: 'Á', Acirc: 'Â', Atilde: 'Ã',
  Auml: 'Ä', Aring: 'Å', AElig: 'Æ', Ccedil: 'Ç', Egrave: 'È', Eacute: 'É',
  Ecirc: 'Ê', Euml: 'Ë', Igrave: 'Ì', Iacute: 'Í', Icirc: 'Î', Iuml: 'Ï',
  ETH: 'Ð', Ntilde: 'Ñ', Ograve: 'Ò', Oacute: 'Ó', Ocirc: 'Ô', Otilde: 'Õ',
  Ouml: 'Ö', times: '×', Oslash: 'Ø', Ugrave: 'Ù', Uacute: 'Ú', Ucirc: 'Û',
  Uuml: 'Ü', Yacute: 'Ý', THORN: 'Þ', szlig: 'ß', agrave: 'à', aacute: 'á',
  acirc: 'â', atilde: 'ã', auml: 'ä', aring: 'å', aelig: 'æ', ccedil: 'ç',
  egrave: 'è', eacute: 'é', ecirc: 'ê', euml: 'ë', igrave: 'ì', iacute: 'í',
  icirc: 'î', iuml: 'ï', eth: 'ð', ntilde: 'ñ', ograve: 'ò', oacute: 'ó',
  ocirc: 'ô', otilde: 'õ', ouml: 'ö', divide: '÷', oslash: 'ø', ugrave: 'ù',
  uacute: 'ú', ucirc: 'û', uuml: 'ü', yacute: 'ý', thorn: 'þ', yuml: 'ÿ',
  ensp: ' ', emsp: ' ', thinsp: ' ', zwnj: '‌', zwj: '‍',
  lrm: '‎', rlm: '‏', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’',
  sbquo: '‚', ldquo: '“', rdquo: '”', bdquo: '„', dagger: '†',
  Dagger: '‡', permil: '‰', lsaquo: '‹', rsaquo: '›', euro: '€',
  trade: '™', hellip: '…', prime: '′', Prime: '″', oline: '‾',
  frasl: '⁄', bull: '•', lowast: '∗', minus: '−', radic: '√',
  infin: '∞', ang: '∠', and: '∧', or: '∨', cap: '∩', cup: '∪',
  int: '∫', there4: '∴', sim: '∼', cong: '≅', asymp: '≈', ne: '≠',
  equiv: '≡', le: '≤', ge: '≥', sub: '⊂', sup: '⊃', nsub: '⊄',
  sube: '⊆', supe: '⊇', oplus: '⊕', otimes: '⊗', perp: '⊥', sdot: '⋅',
  lceil: '⌈', rceil: '⌉', lfloor: '⌊', rfloor: '⌋', lang: '⟨',
  rang: '⟩', loz: '◊', spades: '♠', clubs: '♣', hearts: '♥',
  diams: '♦', larr: '←', uarr: '↑', rarr: '→', darr: '↓', harr: '↔',
  crarr: '↵', forall: '∀', part: '∂', exist: '∃', empty: '∅',
  nabla: '∇', isin: '∈', notin: '∉', ni: '∋', prod: '∏', sum: '∑',
  prop: '∝', alefsym: 'ℵ', image: 'ℑ', real: 'ℜ', weierp: '℘',
  Alpha: 'Α', Beta: 'Β', Gamma: 'Γ', Delta: 'Δ', Epsilon: 'Ε',
  Zeta: 'Ζ', Eta: 'Η', Theta: 'Θ', Iota: 'Ι', Kappa: 'Κ', Lambda: 'Λ',
  Mu: 'Μ', Nu: 'Ν', Xi: 'Ξ', Omicron: 'Ο', Pi: 'Π', Rho: 'Ρ',
  Sigma: 'Σ', Tau: 'Τ', Upsilon: 'Υ', Phi: 'Φ', Chi: 'Χ', Psi: 'Ψ',
  Omega: 'Ω', alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ',
  epsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ',
  lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', omicron: 'ο', pi: 'π',
  rho: 'ρ', sigmaf: 'ς', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ',
  chi: 'χ', psi: 'ψ', omega: 'ω', thetasym: 'ϑ', upsih: 'ϒ', piv: 'ϖ',
  fnof: 'ƒ', circ: 'ˆ', tilde: '˜', OElig: 'Œ', oelig: 'œ',
  Scaron: 'Š', scaron: 'š', Yuml: 'Ÿ', Tab: '\t', NewLine: '\n',
  colon: ':', sol: '/', bsol: '\\', lpar: '(', rpar: ')', lsqb: '[',
  rsqb: ']', lcub: '{', rcub: '}', comma: ',', period: '.', semi: ';',
  equals: '=', plus: '+', quest: '?', commat: '@', dollar: '$',
  percnt: '%', num: '#', ast: '*',
};

// HTML-escape text: & < > "
const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const ESC_RE = /[&<>"']/g;
function escapeHtml(s) {
  if (!ESC_RE.test(s)) return s;
  ESC_RE.lastIndex = 0;
  return s.replace(ESC_RE, (c) => ESC_MAP[c]);
}
// Escape an attribute value (href, title, alt, language class) the way
// marked does: like escapeHtml, except a '&' that starts a named entity
// reference (&name;) is left as-is.
const NAMED_ENTITY_STICKY = /&[a-zA-Z][a-zA-Z0-9]*;/y;
function escapeAttr(s) {
  let out = '';
  let i = 0;
  const n = s.length;
  while (i < n) {
    const ch = s[i];
    if (ch === '&') {
      NAMED_ENTITY_STICKY.lastIndex = i;
      const m = NAMED_ENTITY_STICKY.exec(s);
      if (m) { out += m[0]; i += m[0].length; continue; }
      out += '&amp;'; i++;
      continue;
    }
    if (ch === '<') { out += '&lt;'; i++; continue; }
    if (ch === '>') { out += '&gt;'; i++; continue; }
    if (ch === '"') { out += '&quot;'; i++; continue; }
    if (ch === "'") { out += '&#39;'; i++; continue; }
    out += ch; i++;
  }
  return out;
}

function isPunctCode(c) {
  return (c >= 33 && c <= 47) || (c >= 58 && c <= 64) || (c >= 91 && c <= 96) || (c >= 123 && c <= 126);
}
function isSpaceCode(c) { return c === 32 || c === 9 || c === 10 || c === 13; }
function isDigitCode(c) { return c >= 48 && c <= 57; }
function isAlphaCode(c) { return (c >= 65 && c <= 90) || (c >= 97 && c <= 122); }
function isAlnumCode(c) { return isAlphaCode(c) || isDigitCode(c); }

// Decode &#123; / &#x1f; references (used for link destinations, titles and
// image alt text). Named entities are NOT decoded here: marked passes them
// through literally (&ouml; stays "&ouml;" in a URL, a title and an info
// string). A numeric reference of 0 or a surrogate becomes U+FFFD; a
// numeric reference above the Unicode range is not an entity and is left.
const ENTITY_RE = /&(#\d+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g;
function decodeEntities(s) {
  if (s.indexOf('&') < 0) return s;
  ENTITY_RE.lastIndex = 0;
  return s.replace(ENTITY_RE, (m, body) => {
    if (body.charCodeAt(0) === 35) {
      let cp;
      if (body.charCodeAt(1) === 120 || body.charCodeAt(1) === 88) cp = parseInt(body.slice(2), 16);
      else cp = parseInt(body.slice(1), 10);
      if (cp > 0x10ffff) return m;
      if (!cp || (cp >= 0xd800 && cp <= 0xdfff)) return '�';
      return String.fromCodePoint(cp);
    }
    return m;
  });
}

// Percent-encode a link destination the way marked does.
function cleanUrl(href) {
  try {
    return encodeURI(href).replace(/%25/g, '%');
  } catch (e) {
    return null;
  }
}

// ---- line handling ----
// A line is { s, off, col }: s is the raw line text, off the current offset,
// col the column of off (tabs count to the next multiple of 4).
function indentInfo(line) {
  let col = line.col;
  let i = line.off;
  const s = line.s;
  while (i < s.length) {
    const ch = s[i];
    if (ch === ' ') { col++; i++; }
    else if (ch === '\t') { col += 4 - (col % 4); i++; }
    else break;
  }
  return { cols: col - line.col, off: i };
}
// Advance over n columns of whitespace. A tab straddling the boundary is
// expanded to spaces in place, leaving the leftover spaces as content.
function advanceCols(line, n) {
  while (n > 0 && line.off < line.s.length) {
    const ch = line.s[line.off];
    if (ch === ' ') { line.off++; line.col++; n--; }
    else if (ch === '\t') {
      const w = 4 - (line.col % 4);
      if (w <= n) { line.off++; line.col += w; n -= w; }
      else {
        line.s = line.s.slice(0, line.off) + ' '.repeat(w) + line.s.slice(line.off + 1);
        line.off += n; line.col += n; n = 0;
      }
    } else break;
  }
}
// Expand tabs in the leading whitespace of a code line to spaces, based
// on the column at which the line starts (tabs advance to the next
// multiple of 4). Tabs after the first non-whitespace character are kept.
function expandTabs(s, startCol) {
  if (s.indexOf('\t') < 0) return s;
  let out = '';
  let col = startCol;
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '\t') {
      const w = 4 - (col % 4);
      out += ' '.repeat(w);
      col += w;
      i++;
    } else if (ch === ' ') {
      out += ch;
      col++;
      i++;
    } else break;
  }
  return out + s.slice(i);
}

// Expand a leading tab of a fenced-code content line to spaces, based on
// the column at which the content starts. A tab at column 0 (no indent
// was stripped) is kept as a tab.
function expandFenceTab(s, col) {
  if (col <= 0 || s.charCodeAt(0) !== 9) return s;
  return ' '.repeat(4 - (col % 4)) + s.slice(1);
}

// Column to expand a fenced-code content tab from: when the line went
// through a block quote marker, the tab is measured from that marker
// (the innermost one), not from the start of the line.
function fenceTabCol(line) {
  return line.quoteCol >= 0 ? line.col - line.quoteCol : line.col;
}

function lineBlank(line) {
  for (let i = line.off; i < line.s.length; i++) {
    const ch = line.s[i];
    if (ch !== ' ' && ch !== '\t') return false;
  }
  return true;
}
function restOf(line) { return line.s.slice(line.off); }
function isBlankStr(s) {
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch !== ' ' && ch !== '\t') return false;
  }
  return true;
}

// ---- block parsing ----

const BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'base', 'basefont', 'blockquote', 'body',
  'caption', 'center', 'col', 'colgroup', 'dd', 'details', 'dialog', 'dir',
  'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form',
  'frame', 'frameset', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header',
  'hr', 'html', 'iframe', 'legend', 'li', 'link', 'main', 'menu', 'menuitem',
  'nav', 'noframes', 'ol', 'optgroup', 'option', 'p', 'param', 'search',
  'section', 'summary', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead',
  'title', 'tr', 'track', 'ul',
]);

// True when s contains an unescaped "[" or "]" (a bracket preceded by an
// odd number of backslashes is escaped and does not count).
function hasUnescapedBracket(s) {
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch !== '[' && ch !== ']') continue;
    let bs = 0;
    let k = i - 1;
    while (k >= 0 && s[k] === '\\') { bs++; k--; }
    if (bs % 2 === 0) return true;
  }
  return false;
}

function normalizeLabel(s) {
  // Unicode case folding: "ß" / "ẞ" fold to "ss" (toLowerCase alone gives
  // "ß", which would not match "SS").
  return s.replace(/\s+/g, ' ').trim().toLowerCase().replace(/ß/g, 'ss');
}

// Strip leading link reference definitions from a paragraph. Returns true
// if any definition was stripped. Updates para.lines / para.text.
function stripDefsFromPara(para, refs) {
  let text = para.lines.join('\n');
  let pos = 0;
  let stripped = false;
  for (;;) {
    const np = tryParseDef(text, pos, refs);
    if (np < 0) break;
    stripped = true;
    pos = np;
    if (text.charCodeAt(pos) === 10) pos++;
  }
  if (!stripped) return false;
  const rest = text.slice(pos);
  para.lines = rest === '' ? [] : rest.split('\n');
  para.text = rest;
  para.lineCount = para.lines.length;
  return true;
}

// Finalize a paragraph that is being closed: strip its definitions; if
// nothing is left, remove it from its parent.
function finalizePara(para, refs, parent) {
  stripDefsFromPara(para, refs);
  if (para.lineCount === 0) {
    const idx = parent.children.indexOf(para);
    if (idx >= 0) parent.children.splice(idx, 1);
  }
}

// Match a block quote marker at the current line position. Advances the
// line past the marker (and one following space) when it matches.
function matchQuoteMarker(line) {
  const inf = indentInfo(line);
  if (inf.cols > 3) return false;
  if (line.s[inf.off] !== '>') return false;
  // Remember the column of this '>' (the innermost one wins, as the
  // markers are matched outside in): a tab in fenced-code content is
  // expanded from the column measured from the '>' marker.
  line.quoteCol = line.col + inf.cols;
  line.off = inf.off + 1;
  line.col = line.col + inf.cols + 1;
  if (line.s[line.off] === ' ') { line.off++; line.col++; }
  else if (line.s[line.off] === '\t') advanceCols(line, 1);
  return true;
}

// Parse a list marker starting at the current line position (after
// indentation). Returns marker info or null. Does not move the line.
function parseListMarker(line) {
  const inf = indentInfo(line);
  if (inf.cols > 3) return null;
  const s = line.s;
  // startCol is relative to the line's current position (after the outer
  // containers were consumed), so it stays valid across lines whose
  // container markers are spelled differently ("> " vs ">>").
  const startCol = inf.cols;
  let i = inf.off;
  let type;
  let bulletChar = '';
  let delim = '';
  let startNum = 0;
  let width = 0;
  const c = s[i];
  if (c === '-' || c === '+' || c === '*') {
    type = 'bullet'; bulletChar = c; width = 1; i++;
  } else if (c >= '0' && c <= '9') {
    let j = i;
    while (j < s.length && s[j] >= '0' && s[j] <= '9') j++;
    if (j - i === 0 || j - i > 9) return null;
    const d = s[j];
    if (d !== '.' && d !== ')') return null;
    type = 'ordered'; delim = d; startNum = parseInt(s.slice(i, j), 10);
    width = (j - i) + 1; i = j + 1;
  } else return null;
  // The marker must be followed by a space, a tab, or the end of line.
  if (i >= s.length) {
    return { type, bulletChar, delim, start: startNum, markerIndent: startCol,
      contentIndent: startCol + width + 1, afterMarker: i, empty: true, width };
  }
  const ch = s[i];
  if (ch !== ' ' && ch !== '\t') return null;
  // Count the whitespace columns after the marker.
  let col = startCol + width;
  let k = i;
  let ws = 0;
  while (k < s.length && (s[k] === ' ' || s[k] === '\t')) {
    if (s[k] === ' ') { col++; k++; ws++; }
    else { const w = 4 - (col % 4); col += w; k++; ws += w; }
  }
  // If nothing but whitespace follows the marker, the item is empty and
  // its content indent is just marker + 1 (the trailing spaces do not
  // count).
  if (k >= s.length) {
    return { type, bulletChar, delim, start: startNum, markerIndent: startCol,
      contentIndent: startCol + width + 1, afterMarker: i, empty: true, width };
  }
  const contentIndent = ws >= 5 ? startCol + width + 1 : startCol + width + ws;
  return { type, bulletChar, delim, start: startNum, markerIndent: startCol,
    contentIndent, afterMarker: i, empty: false, width };
}

// Check whether a list item container matches the line. Returns 1 when it
// matches (advancing the line to the item's content indent), 2 when the
// line starts a new item of the same list, 0 when it does not match.
function matchItem(line, item, list) {
  const inf = indentInfo(line);
  if (inf.cols >= item.contentIndent) {
    advanceCols(line, item.contentIndent);
    return 1;
  }
  // Not enough indent: could this be a new item of the same list?
  if (inf.cols === list.markerIndent) {
    const m = parseListMarker(line);
    if (m && m.type === list.listType &&
        (list.listType === 'bullet' ? m.bulletChar === list.bulletChar : m.delim === list.delim)) {
      return 2;
    }
  }
  return 0;
}

function buildBlocks(root, rawLines, refs) {
  const stack = [root];
  let pendingBlank = null; // { item, list } set by a structural blank line
  let lastAdded = null; // most recently added block (for HTML blankAfter)
  const tip = () => stack[stack.length - 1];

  function closeTo(n) {
    while (stack.length > n) {
      const b = stack.pop();
      if (b.t === 'para') finalizePara(b, refs, stack[stack.length - 1]);
      else if (b.t === 'code' && !b.fenced) {
        while (b.lines.length && isBlankStr(b.lines[b.lines.length - 1])) b.lines.pop();
      }
    }
  }

  // Add a block as a child of the current tip. Handles the loose-list
  // bookkeeping for a block that follows a blank line.
  function addBlock(node) {
    const parent = tip();
    if (pendingBlank) {
      if (parent === pendingBlank.item ||
          (node.t === 'item' && parent === pendingBlank.list)) {
        pendingBlank.list.tight = false;
      } else if (parent.t === 'item') {
        // The blank line was inside a descendant of this item, and the new
        // block is a sibling of that descendant inside this item, so this
        // item's list is loose too.
        const pi = stack.indexOf(pendingBlank.item);
        const ppi = stack.indexOf(parent);
        if (pi > ppi) stack[ppi - 1].tight = false;
      }
    }
    parent.children.push(node);
    lastAdded = node;
    return node;
  }

  for (const raw of rawLines) {
    const line = { s: raw, off: 0, col: 0, quoteCol: -1 };

    // ---- blank line ----
    if (lineBlank(line)) {
      // An HTML block of types 1-5 followed by a blank line loses its
      // trailing newline (but a blank line inside a still-open HTML block
      // is part of the block, not after it). Only a truly empty line
      // counts: a blank line containing only spaces or tabs does not
      // strip the newline (marked keeps it after those).
      if (lastAdded && lastAdded.t === 'html' && lastAdded.htmlType <= 5 &&
          stack.indexOf(lastAdded) < 0 && line.s === '') {
        lastAdded.blankAfter = true;
      }
      // A blank line must carry a block quote marker to stay inside a
      // quote; without one it closes the quote (and any fence inside it).
      for (let i = 1; i < stack.length; i++) {
        const b = stack[i];
        if (b.t === 'list') continue;
        if (b.t !== 'quote' && b.t !== 'item') break;
        if (b.t === 'quote' && !matchQuoteMarker(line)) { closeTo(i); break; }
      }
      const t = tip();
      if (t.t === 'fence') {
        // A blank line inside a fence keeps its spaces past the fence
        // indent (e.g. "  " stays "  " when the fence indent is 0).
        advanceCols(line, t.fenceIndent);
        t.lines.push(expandFenceTab(restOf(line), fenceTabCol(line)));
        continue;
      }
      if (t.t === 'code') {
        const inf = indentInfo(line);
        // After the 4-column indent is stripped (advanceCols consumes a
        // tab that straddles the boundary), the rest of the line is
        // literal code content: a leading tab there stays a tab.
        if (inf.cols >= 4) { advanceCols(line, 4); t.lines.push(restOf(line)); }
        else t.lines.push('');
        continue;
      }
      if (t.t === 'html') {
        if (t.htmlType >= 6) closeTo(stack.length - 1);
        else { t.lines.push(restOf(line)); continue; }
      }
      if (tip().t === 'para') closeTo(stack.length - 1);
      // A blank line ends a table (later lines are not body rows), but a
      // line that is only a tab is an empty table row, not a blank line:
      // it stays in the table. A spaces-only line ends the table.
      if (tip().t === 'table') {
        if (line.s.indexOf('\t') >= 0 && tryTableRow(line, tip())) { pendingBlank = null; continue; }
        closeTo(stack.length - 1);
      }
      // A blank line only makes a list loose when it separates two blocks
      // that are children of the same item, so only record it when the
      // tip itself is the item (not a block nested inside it, e.g. a
      // quote).
      if (tip().t === 'item') pendingBlank = { item: tip(), list: stack[stack.length - 2] };
      continue;
    }

    // ---- container matching ----
    let failIdx = stack.length;
    let newItem = false;
    for (let i = 1; i < stack.length; i++) {
      const b = stack[i];
      if (b.t === 'list') continue;
      if (b.t !== 'quote' && b.t !== 'item') break;
      if (b.t === 'quote') {
        if (!matchQuoteMarker(line)) { failIdx = i; break; }
      } else {
        // A line that is blank after the containers matched so far is
        // inside this item (a blank quote line ">", for example): it only
        // makes the list loose, it does not end the item or the list.
        if (/^[ \t]*$/.test(restOf(line))) continue;
        const saveOff = line.off;
        const saveCol = line.col;
        const r = matchItem(line, b, stack[i - 1]);
        if (r === 1) {
          // An empty item cannot gain paragraph content after a blank
          // line (it can still gain a nested list).
          if (b.children.length === 0 && pendingBlank && pendingBlank.item === b &&
              !parseListMarker(line)) {
            line.off = saveOff;
            line.col = saveCol;
            failIdx = i; break;
          }
          continue;
        }
        if (r === 2) { failIdx = i; newItem = true; break; }
        // A fenced code block's content lines do not need to match the
        // list item's content indent: the line stays in the fence (the
        // fence indent is stripped from whatever is there by the leaf
        // continuation below). A block quote marker is still required.
        if (tip().t === 'fence') { failIdx = stack.length; break; }
        failIdx = i; break;
      }
    }
    if (failIdx < stack.length) {
      // If a blank line is pending inside a block that is about to be
      // closed, the blank line separates two blocks inside the nearest
      // ancestor item that stays open, so that item's list is loose.
      if (pendingBlank) {
        const pi = stack.indexOf(pendingBlank.item);
        if (pi >= failIdx) {
          // A blank line between two items of the same list only makes
          // that list loose, not its ancestors. The new item is of the
          // list at failIdx-1; the blank line sits inside that list
          // when its item is deeper in the stack (an item of the list,
          // or nested inside one), even if it is not directly in
          // pendingBlank.list.
          const sameListNewItem = newItem && stack[failIdx - 1].t === 'list' &&
            pi > failIdx - 1;
          if (!sameListNewItem) {
            for (let i = failIdx - 1; i >= 1; i--) {
              if (stack[i].t === 'item') { stack[i - 1].tight = false; break; }
            }
          }
          // A new item of the list at failIdx-1, after a blank line that
          // occurred inside the item at failIdx, makes that list loose.
          if (newItem && pi > failIdx && stack[failIdx - 1].t === 'list') {
            stack[failIdx - 1].tight = false;
          }
        }
      }
      if (newItem) {
        closeTo(failIdx);
      } else if (tip().t === 'para') {
        // Lazy continuation line: the paragraph keeps the line, unless the
        // line starts a block that can interrupt a paragraph (a thematic
        // break, ATX heading, fenced code block, list item, block quote or
        // HTML block), which closes the paragraph and its containers
        // instead. A line whose remainder is blank is a blank line inside
        // the containers that did match: it closes the paragraph.
        const hb = tryHtmlBlock(line);
        if (/^[ \t]*$/.test(restOf(line))) {
          // A blank line inside the containers that did match only closes
          // the paragraph; the containers stay open (the list becomes
          // loose) so later content can re-enter them. But a container
          // that failed to match this line cannot stay open: a block
          // quote whose marker is missing on a blank line ends here (a
          // later "> >" line opens a new inner quote), so close it too.
          if (failIdx < stack.length) closeTo(failIdx);
          else closeTo(stack.length - 1);
          if (tip().t === 'item') pendingBlank = { item: tip(), list: stack[stack.length - 2] };
        } else if (isThematicBreak(line) || tryAtx(line) || tryFence(line) ||
            parseListMarker(line) || isQuoteStart(line) ||
            (hb && hb.type !== 7)) {
          closeTo(failIdx);
        } else {
          const p = tip();
          // A lazy continuation line that looks like a setext underline is
          // kept as paragraph text, with four spaces prepended so it can
          // no longer be read as an underline.
          // Its leading spaces are stripped up to the virtual indent of
          // the containers that failed to match (2 per block quote) plus
          // the 3 spaces a paragraph continuation may carry.
          let content = restOf(line);
          // The strip allowance is the virtual indent of the containers
          // that failed to match (2 per block quote, or a list item's
          // content indent) plus the 3 spaces a paragraph continuation
          // may carry. But when a block quote matched for this line,
          // the spaces after its marker are paragraph content, not
          // container indentation: marked keeps them.
          let strip = 3;
          let itemIndent = -1;
          // Spaces after a quote marker are paragraph content (kept)
          // only when the paragraph also sits inside a list item: a
          // lazy line in a bare quote (cm-238) has its spaces stripped.
          let hasQuote = false, hasItem = false;
          for (let k = 1; k < stack.length; k++) {
            if (stack[k].t === 'quote') hasQuote = true;
            if (stack[k].t === 'item') hasItem = true;
          }
          if (hasQuote && hasItem) strip = 0;
          else {
            for (let k = failIdx; k < stack.length; k++) {
              if (stack[k].t === 'quote') strip += 2;
              else if (stack[k].t === 'item') itemIndent = stack[k].contentIndent;
            }
            if (itemIndent >= 0) strip = itemIndent + 3;
          }
          let si = 0;
          while (si < content.length && si < strip && content[si] === ' ') si++;
          content = content.slice(si);
          // A leading tab is expanded to spaces from the column it sits
          // at (after the stripped spaces), like a normal paragraph line.
          content = expandTabs(content, line.col + si);
          if (setextLevel(line)) content = '    ' + content;
          p.lines.push(content);
          p.lineCount++;
          pendingBlank = null;
          continue;
        }
      } else {
        closeTo(failIdx);
      }
    }

    // If the tip is a list and this line does not start another item of the
    // same list, the list is over.
    if (tip().t === 'list') {
      const lst = tip();
      const m2 = parseListMarker(line);
      const same = m2 && m2.type === lst.listType &&
        (lst.listType === 'bullet' ? m2.bulletChar === lst.bulletChar : m2.delim === lst.delim);
      // A thematic break is not a list item even when it looks like one
      // ("* * *" closes the list instead of starting a new item).
      if (!same || isThematicBreak(line)) closeTo(stack.length - 1);
    }

    // ---- leaf continuation ----
    let t = tip();
    if (t.t === 'fence') {
      if (isClosingFence(line, t)) {
        // The blank line immediately before the closing fence is the
        // block's terminator, not a content line.
        if (t.lines.length && t.lines[t.lines.length - 1] === '') t.lines.pop();
        closeTo(stack.length - 1);
      } else {
        advanceCols(line, t.fenceIndent);
        t.lines.push(expandFenceTab(restOf(line), fenceTabCol(line)));
      }
      pendingBlank = null;
      continue;
    }
    if (t.t === 'code') {
      const inf = indentInfo(line);
      if (inf.cols >= 4) {
        advanceCols(line, 4);
        t.lines.push(restOf(line));
        pendingBlank = null;
        continue;
      }
      closeTo(stack.length - 1);
      t = tip();
    }
    if (t.t === 'html' && t.htmlType <= 5) {
      t.lines.push(restOf(line));
      if (htmlEndsHere(line, t)) closeTo(stack.length - 1);
      pendingBlank = null;
      continue;
    }
    if (t.t === 'html' && t.htmlType >= 6) {
      t.lines.push(restOf(line));
      pendingBlank = null;
      continue;
    }
    if (t.t === 'table') {
      if (tryTableRow(line, t)) { pendingBlank = null; continue; }
      closeTo(stack.length - 1);
      t = tip();
    }

    // ---- blank remainder after container markers ----
    // A line whose content after the container markers is empty (e.g. ">")
    // is a blank line inside those containers: it closes a paragraph but
    // does not start one. A line whose remainder is only whitespace (e.g.
    // ">  ", remainder " ") is a continuation of an existing paragraph
    // (it does not start a new paragraph, and it does not close one).
    {
      const rest = restOf(line);
      if (rest === '') {
        if (tip().t === 'para') closeTo(stack.length - 1);
        if (tip().t === 'item') pendingBlank = { item: tip(), list: stack[stack.length - 2] };
        continue;
      }
      if (/^[ \t]+$/.test(rest)) {
        if (tip().t === 'para') {
          const p = tip();
          p.lines.push(rest);
          p.lineCount++;
        }
        pendingBlank = null;
        continue;
      }
    }

    // ---- setext heading underline ----
    if (tip().t === 'para') {
      const lvl = setextLevel(line);
      if (lvl) {
        const para = tip();
        stripDefsFromPara(para, refs);
        // If the paragraph was only definitions, it is empty: the line is
        // not an underline, it is paragraph text (fall through).
        if (para.lineCount > 0) {
          const h = { t: 'heading', level: lvl, text: para.lines.join('\n').trim() };
          const parent = stack[stack.length - 2];
          parent.children[parent.children.length - 1] = h;
          stack.pop();
          pendingBlank = null;
          continue;
        }
      }
    }

    // ---- new block starts ----
    const started = tryStartBlock(line, stack, addBlock, refs, pendingBlank);
    if (started) { pendingBlank = null; continue; }

    // ---- paragraph continuation / new paragraph ----
    // A paragraph line keeps its leading spaces (marked does not strip
    // them: " *-*" keeps the space, "Foo\n    ***" keeps all four), but
    // a leading tab is expanded to spaces from the current column.
    if (tip().t === 'para') {
      const p = tip();
      p.lines.push(expandTabs(restOf(line), line.col));
      p.lineCount++;
    } else {
      const p = { t: 'para', lines: [expandTabs(restOf(line), line.col)], lineCount: 1, text: '' };
      addBlock(p);
      stack.push(p);
    }
    pendingBlank = null;
  }

  closeTo(1);
}

// ---- leaf starts and link reference definitions ----

function setextLevel(line) {
  const inf = indentInfo(line);
  if (inf.cols > 3) return 0;
  const s = line.s;
  const c = s[inf.off];
  if (c !== '=' && c !== '-') return 0;
  let j = inf.off;
  while (j < s.length && s[j] === c) j++;
  // Only trailing spaces/tabs may follow; spaces between the marks (as in
  // "= =" or "--- -") disqualify the line as a setext underline.
  while (j < s.length && (s[j] === ' ' || s[j] === '\t')) j++;
  if (j < s.length) return 0;
  return c === '=' ? 1 : 2;
}

function isThematicBreak(line) {
  const inf = indentInfo(line);
  if (inf.cols > 3) return false;
  const s = line.s;
  let i = inf.off;
  let ch = '';
  let count = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ' || c === '\t') { i++; continue; }
    if (ch === '') {
      if (c === '-' || c === '_' || c === '*') { ch = c; count++; i++; }
      else return false;
    } else if (c === ch) { count++; i++; }
    else return false;
  }
  return count >= 3;
}

function tryAtx(line) {
  const inf = indentInfo(line);
  if (inf.cols > 3) return null;
  const s = line.s;
  let i = inf.off;
  let level = 0;
  while (i < s.length && s[i] === '#' && level < 6) { level++; i++; }
  if (level === 0) return null;
  if (i < s.length && s[i] === '#') return null;
  if (i >= s.length) return { level, text: '' };
  const c = s[i];
  if (c !== ' ' && c !== '\t') return null;
  let text = s.slice(i + 1).replace(/[ \t]+$/, '');
  if (text.length > 0) {
    let j = text.length;
    while (j > 0 && text[j - 1] === '#') j--;
    if (j < text.length) {
      if (j === 0) text = '';
      else if (text[j - 1] === ' ' || text[j - 1] === '\t') text = text.slice(0, j).replace(/[ \t]+$/, '');
    }
  }
  text = text.replace(/^[ \t]+/, '');
  return { level, text };
}

function tryFence(line) {
  const inf = indentInfo(line);
  if (inf.cols > 3) return null;
  const s = line.s;
  let i = inf.off;
  const ch = s[i];
  if (ch !== '`' && ch !== '~') return null;
  let n = 0;
  while (i < s.length && s[i] === ch) { n++; i++; }
  if (n < 3) return null;
  // The info string is the first word after the fence (leading whitespace
  // skipped, cut at the first space or tab). For a backtick fence the whole
  // remainder of the line must not contain a backtick ("``` aa ```" is a
  // paragraph, not a fence).
  let infoStart = i;
  while (infoStart < s.length && (s[infoStart] === ' ' || s[infoStart] === '\t')) infoStart++;
  let infoEnd = infoStart;
  while (infoEnd < s.length && s[infoEnd] !== ' ' && s[infoEnd] !== '\t') infoEnd++;
  const info = s.slice(infoStart, infoEnd);
  if (ch === '`' && s.slice(i).indexOf('`') >= 0) return null;
  return { fenceChar: ch, fenceLen: n, fenceIndent: inf.cols, info };
}

function isClosingFence(line, fence) {
  const inf = indentInfo(line);
  if (inf.cols > 3) return false;
  const s = line.s;
  let i = inf.off;
  let n = 0;
  while (i < s.length && s[i] === fence.fenceChar) { n++; i++; }
  if (n < fence.fenceLen) return false;
  while (i < s.length && (s[i] === ' ' || s[i] === '\t')) i++;
  return i >= s.length;
}

// Parse an HTML tag starting at s[i] (s[i] must be '<'). Returns
// { end, name, closing } or null. name is '' for comments, declarations,
// CDATA sections and processing instructions.
function matchHtmlTag(s, i) {
  if (s[i] !== '<') return null;
  let j = i + 1;
  if (j >= s.length) return null;
  const c = s[j];
  if (c === '!') {
    if (s.startsWith('<!--', i)) {
      // The closing "-->" may overlap the opening ("<!-->" is an empty
      // comment), so search from i+2, not i+4.
      const k = s.indexOf('-->', i + 2);
      return k < 0 ? null : { end: k + 3, name: '', closing: false };
    }
    if (s.startsWith('<![CDATA[', i)) {
      const k = s.indexOf(']]>', i + 9);
      return k < 0 ? null : { end: k + 3, name: '', closing: false };
    }
    const nc = s[j + 1];
    if (nc && /[a-zA-Z]/.test(nc)) {
      const k = s.indexOf('>', j + 1);
      return k < 0 ? null : { end: k + 1, name: '', closing: false };
    }
    return null;
  }
  if (c === '?') {
    const k = s.indexOf('?>', j + 1);
    return k < 0 ? null : { end: k + 2, name: '', closing: false };
  }
  let k = j;
  let closing = false;
  if (s[k] === '/') { closing = true; k++; }
  if (k >= s.length || !/[a-zA-Z]/.test(s[k])) return null;
  const nameStart = k;
  k++;
  while (k < s.length && /[a-zA-Z0-9-]/.test(s[k])) k++;
  const name = s.slice(nameStart, k).toLowerCase();
  if (closing) {
    while (k < s.length && (s[k] === ' ' || s[k] === '\t' || s[k] === '\n')) k++;
    return s[k] === '>' ? { end: k + 1, name, closing } : null;
  }
  // Whether whitespace was skipped after the previous attribute name
  // (before its "=" or before the next attribute): a boolean attribute
  // such as "_boolean" is followed by whitespace that the next loop
  // iteration must count as preceding the next attribute.
  let wsAfterName = false;
  for (;;) {
    const beforeWs = k;
    while (k < s.length && (s[k] === ' ' || s[k] === '\t' || s[k] === '\n')) k++;
    if (k >= s.length) return null;
    if (s[k] === '>') return { end: k + 1, name, closing };
    if (s[k] === '/') {
      if (s[k + 1] === '>') return { end: k + 2, name, closing };
      return null;
    }
    // An attribute must be preceded by whitespace; otherwise this is not
    // a tag at all (e.g. "<MAILTO:FOO@BAR.BAZ>" is an autolink).
    if (k === beforeWs && !wsAfterName) return null;
    wsAfterName = false;
    // An attribute name starts with a letter, "_" or ":" and continues
    // with letters, digits, "_", ".", ":" or "-".
    if (!/[a-zA-Z_:]/.test(s[k])) return null;
    const aStart = k;
    k++;
    while (k < s.length && /[a-zA-Z0-9_.:-]/.test(s[k])) k++;
    if (k === aStart) return null;
    const afterName = k;
    while (k < s.length && (s[k] === ' ' || s[k] === '\t' || s[k] === '\n')) k++;
    wsAfterName = k > afterName;
    if (s[k] === '=') {
      // A valued attribute resets the flag: the next attribute's
      // preceding whitespace is the loop's own leading skip.
      wsAfterName = false;
      k++;
      while (k < s.length && (s[k] === ' ' || s[k] === '\t' || s[k] === '\n')) k++;
      if (s[k] === '"') {
        k++;
        while (k < s.length && s[k] !== '"') k++;
        if (k >= s.length) return null;
        k++;
      } else if (s[k] === "'") {
        k++;
        while (k < s.length && s[k] !== "'") k++;
        if (k >= s.length) return null;
        k++;
      } else {
        const vStart = k;
        while (k < s.length && s[k] !== ' ' && s[k] !== '\t' && s[k] !== '\n' && s[k] !== '>') {
          if (s[k] === '"' || s[k] === "'" || s[k] === '=' || s[k] === '<' || s[k] === '`') return null;
          k++;
        }
        if (k === vStart) return null;
      }
    }
  }
}

// HTML block start: returns { type, endStr } or null. endStr is the
// (lowercase) substring that ends a type 1 block, or null.
function tryHtmlBlock(line) {
  const inf = indentInfo(line);
  if (inf.cols > 3) return null;
  const s = line.s.slice(inf.off);
  const m1 = /^<(script|pre|style|textarea)([\t ]|>|$)/i.exec(s);
  if (m1) return { type: 1, endStr: '</' + m1[1].toLowerCase() };
  if (s.startsWith('<!--')) return { type: 2, endStr: null };
  if (s.startsWith('<?')) return { type: 3, endStr: null };
  if (s.startsWith('<!') && s.length > 2 && /[a-zA-Z]/.test(s[2])) return { type: 4, endStr: null };
  if (s.startsWith('<![CDATA[')) return { type: 5, endStr: null };
  const tag = matchHtmlTag(s, 0);
  if (tag && tag.name) {
    if (BLOCK_TAGS.has(tag.name)) return { type: 6, endStr: null };
    const after = s.slice(tag.end);
    if (/^[ \t]*$/.test(after)) return { type: 7, endStr: null };
  }
  // A block-level opening tag that spans lines ("<div id=\"foo\"" with no
  // ">" on this line) still starts a type-6 HTML block.
  const m6 = /^<\/?([a-zA-Z][a-zA-Z0-9-]*)([\t ]|\/?>|$)/i.exec(s);
  if (m6 && BLOCK_TAGS.has(m6[1].toLowerCase())) return { type: 6, endStr: null };
  return null;
}

function htmlEndsHere(line, node) {
  const r = restOf(line);
  if (node.htmlType === 1) return r.toLowerCase().indexOf(node.endStr) >= 0;
  if (node.htmlType === 2) return r.indexOf('-->') >= 0;
  if (node.htmlType === 3) return r.indexOf('?>') >= 0;
  if (node.htmlType === 4) return r.indexOf('>') >= 0;
  if (node.htmlType === 5) return r.indexOf(']]>') >= 0;
  return false;
}

function isQuoteStart(line) {
  const inf = indentInfo(line);
  if (inf.cols > 3) return false;
  return line.s[inf.off] === '>';
}

// A GFM table delimiter row: returns the alignment array or null.
function parseDelimiterRow(line) {
  const inf = indentInfo(line);
  if (inf.cols > 3) return null;
  let s = restOf(line).replace(/[ \t]+$/, '');
  if (s === '') return null;
  let parts = s.split('|');
  if (parts[0].trim() === '') parts.shift();
  if (parts.length && parts[parts.length - 1].trim() === '') parts.pop();
  if (parts.length === 0) return null;
  const aligns = [];
  for (const p of parts) {
    const t = p.trim();
    if (!/^:?-+:?$/.test(t)) return null;
    if (t[0] === ':' && t[t.length - 1] === ':') aligns.push('center');
    else if (t[0] === ':') aligns.push('left');
    else if (t[t.length - 1] === ':') aligns.push('right');
    else aligns.push(null);
  }
  return aligns;
}

// Split a table row into its cells. Backslash-escaped pipes stay literal.
function splitTableRow(s) {
  const cells = [];
  let cur = '';
  let i = 0;
  const n = s.length;
  while (i < n) {
    const ch = s[i];
    if (ch === '\\' && i + 1 < n && (s[i + 1] === '|' || s[i + 1] === '\\')) {
      // An escaped pipe (or backslash) is the literal character; the
      // backslash itself does not survive into the cell.
      cur += s[i + 1]; i += 2;
    } else if (ch === '|') {
      cells.push(cur); cur = ''; i++;
    } else {
      cur += ch; i++;
    }
  }
  cells.push(cur);
  if (cells.length && cells[0].trim() === '') cells.shift();
  if (cells.length && cells[cells.length - 1].trim() === '') cells.pop();
  return cells.map((c) => c.replace(/^[ \t]+/, '').replace(/[ \t]+$/, ''));
}

// Try to add the line as a body row of an open table. Returns false when
// the line starts another block-level structure instead.
function tryTableRow(line, table) {
  if (isThematicBreak(line) || tryAtx(line) || tryFence(line) ||
      tryHtmlBlock(line) || parseListMarker(line) || isQuoteStart(line)) return false;
  table.rows.push(splitTableRow(restOf(line)));
  return true;
}

// ---- link reference definitions ----

function findCodeSpanEnd(text, start, runLen) {
  let j = start;
  const n = text.length;
  while (j < n) {
    if (text[j] === '`') {
      let k = j;
      while (k < n && text[k] === '`') k++;
      if (k - j === runLen) return k;
      j = k;
    } else j++;
  }
  return -1;
}

// Scan a link label starting at text[i] === '['. Returns the index just
// past the closing ']' or -1.
function scanLabel(text, i) {
  let depth = 0;
  let j = i;
  const n = text.length;
  while (j < n) {
    const ch = text[j];
    if (ch === '\\' && j + 1 < n) { j += 2; continue; }
    if (ch === '`') {
      let k = j;
      while (k < n && text[k] === '`') k++;
      const close = findCodeSpanEnd(text, k, k - j);
      if (close < 0) { j = k; continue; }
      j = close;
      continue;
    }
    if (ch === '[') { depth++; j++; continue; }
    if (ch === ']') {
      depth--;
      j++;
      if (depth === 0) return j;
      continue;
    }
    j++;
  }
  return -1;
}

// Find the ']' that closes a link label starting at text[from] (just
// past the '['), the way marked's bracket scan does: a code span runs
// from a backtick run to the next backtick run (any length) and may
// swallow '[' and ']' characters; nested brackets nest. A backtick run
// with no later backtick is literal text. Returns the index of the
// closing ']' or -1.
function findLabelClose(text, from) {
  const n = text.length;
  let depth = 0;
  let j = from;
  while (j < n) {
    const ch = text[j];
    if (ch === '\\' && j + 1 < n) { j += 2; continue; }
    if (ch === '`') {
      let k = j;
      while (k < n && text[k] === '`') k++;
      let m = k;
      while (m < n && text[m] !== '`') m++;
      if (m >= n) { j = k; continue; }
      let e = m;
      while (e < n && text[e] === '`') e++;
      j = e;
      continue;
    }
    if (ch === '[') { depth++; j++; continue; }
    if (ch === ']') {
      if (depth === 0) return j;
      depth--; j++; continue;
    }
    j++;
  }
  return -1;
}

function scanAngleDest(text, j) {
  let k = j + 1;
  const n = text.length;
  let out = '';
  while (k < n) {
    const ch = text[k];
    if (ch === '\n' || ch === '<') return null;
    if (ch === '>') return { end: k + 1, dest: out };
    if (ch === '\\' && k + 1 < n && isPunctCode(text.charCodeAt(k + 1))) { out += text[k + 1]; k += 2; continue; }
    out += ch; k++;
  }
  return null;
}

function scanBareDest(text, j) {
  let k = j;
  const n = text.length;
  let out = '';
  let depth = 0;
  while (k < n) {
    const ch = text[k];
    if (ch === ' ' || ch === '\t' || ch === '\n') break;
    const code = text.charCodeAt(k);
    if (code < 32 || code === 127) return null;
    if (ch === '\\' && k + 1 < n && isPunctCode(text.charCodeAt(k + 1))) { out += text[k + 1]; k += 2; continue; }
    if (ch === '(') { depth++; out += ch; k++; continue; }
    if (ch === ')') {
      if (depth === 0) break;
      depth--; out += ch; k++; continue;
    }
    out += ch; k++;
  }
  if (out === '') return null;
  if (depth !== 0) return null;
  return { end: k, dest: out };
}

function scanTitle(text, j) {
  const q = text[j];
  let k = j + 1;
  const n = text.length;
  let out = '';
  if (q === '(') {
    while (k < n) {
      const ch = text[k];
      if (ch === '\\' && k + 1 < n && isPunctCode(text.charCodeAt(k + 1))) { out += text[k + 1]; k += 2; continue; }
      if (ch === ')') return { end: k + 1, title: out };
      if (ch === '(') return null;
      out += ch; k++;
    }
    return null;
  }
  while (k < n) {
    const ch = text[k];
    if (ch === '\\' && k + 1 < n && isPunctCode(text.charCodeAt(k + 1))) { out += text[k + 1]; k += 2; continue; }
    if (ch === q) return { end: k + 1, title: out };
    out += ch; k++;
  }
  return null;
}

function skipWsAndNewlines(text, j) {
  while (j < text.length) {
    const ch = text[j];
    if (ch === ' ' || ch === '\t' || ch === '\n') j++;
    else break;
  }
  return j;
}

// Try to parse a link reference definition at text[pos]. Returns the index
// just past the definition (at a newline or the end) or -1.
function tryParseDef(text, pos, refs) {
  let i = pos;
  let cols = 0;
  while (i < text.length && cols < 3) {
    const ch = text[i];
    if (ch === ' ') { cols++; i++; }
    else if (ch === '\t') { const w = 4 - (cols % 4); if (cols + w > 3) break; cols += w; i++; }
    else break;
  }
  if (text[i] !== '[') return -1;
  const labelEnd = scanLabel(text, i);
  if (labelEnd < 0) return -1;
  const rawLabel = text.slice(i + 1, labelEnd - 1);
  if (rawLabel.length === 0 || rawLabel.length > 999) return -1;
  // A reference label cannot contain brackets (nested brackets make the
  // definition unrecognised).
  if (hasUnescapedBracket(rawLabel)) return -1;
  const norm = normalizeLabel(rawLabel);
  if (norm.length === 0) return -1;
  let j = labelEnd;
  if (text[j] !== ':') return -1;
  j++;
  j = skipWsAndNewlines(text, j);
  let dest;
  if (text[j] === '<') {
    const d = scanAngleDest(text, j);
    if (!d) return -1;
    dest = d.dest;
    j = d.end;
  } else {
    const d = scanBareDest(text, j);
    if (!d) return -1;
    dest = d.dest;
    j = d.end;
  }
  const saveJ = j;
  j = skipWsAndNewlines(text, j);
  let title = null;
  const qc = text[j];
  if (qc === '"' || qc === "'" || qc === '(') {
    // A title must be separated from the destination by whitespace.
    if (j === saveJ) return -1;
    const t = scanTitle(text, j);
    if (!t) return -1;
    title = t.title;
    j = t.end;
  } else {
    j = saveJ;
  }
  while (j < text.length && (text[j] === ' ' || text[j] === '\t')) j++;
  if (j < text.length && text[j] !== '\n') {
    // Junk after the title: the title is not part of the definition, but
    // the definition itself (destination only) still stands.
    if (title !== null) {
      title = null;
      j = saveJ;
      while (j < text.length && (text[j] === ' ' || text[j] === '\t')) j++;
      if (j < text.length && text[j] !== '\n') return -1;
    } else {
      return -1;
    }
  }
  if (!refs.has(norm)) refs.set(norm, { dest, title });
  return j;
}

// ---- new block dispatcher ----

function closeParaTip(stack, refs) {
  const p = stack[stack.length - 1];
  if (p.t !== 'para') return;
  stack.pop();
  finalizePara(p, refs, stack[stack.length - 1]);
}

function startParagraph(line, stack, addBlock) {
  const p = { t: 'para', lines: [expandTabs(restOf(line), line.col)], lineCount: 1, text: '' };
  addBlock(p);
  stack.push(p);
}

function tryStartBlock(line, stack, addBlock, refs, pendingBlank) {
  const tipNode = stack[stack.length - 1];

  if (isThematicBreak(line)) {
    closeParaTip(stack, refs);
    addBlock({ t: 'hr' });
    return true;
  }
  const atx = tryAtx(line);
  if (atx) {
    closeParaTip(stack, refs);
    addBlock({ t: 'heading', level: atx.level, text: atx.text });
    return true;
  }
  const fence = tryFence(line);
  if (fence) {
    closeParaTip(stack, refs);
    // Inside a blockquote, marked keeps the fence content's leading
    // spaces when the fence is indented 2+ (the fence indent is not
    // stripped from content lines); a fence indented 0-1 strips
    // normally.
    let fIndent = fence.fenceIndent;
    for (let q = 1; q < stack.length; q++) {
      if (stack[q].t === 'quote' && fIndent >= 2) { fIndent = 0; break; }
    }
    const node = { t: 'fence', lines: [], fenceChar: fence.fenceChar, fenceLen: fence.fenceLen, fenceIndent: fIndent, info: fence.info };
    addBlock(node);
    stack.push(node);
    return true;
  }
  // HTML blocks of types 1-6 can interrupt a paragraph; only type 7
  // cannot.
  {
    const hb = tryHtmlBlock(line);
    if (hb && (hb.type !== 7 || tipNode.t !== 'para')) {
      closeParaTip(stack, refs);
      const node = { t: 'html', lines: [restOf(line)], htmlType: hb.type, endStr: hb.endStr };
      addBlock(node);
      if (!(hb.type <= 5 && htmlEndsHere(line, node))) stack.push(node);
      return true;
    }
  }
  const m = parseListMarker(line);
  if (m) {
    if (tipNode.t === 'para') {
      if (m.empty) return false;
      // An ordered list can interrupt a paragraph only when it starts
      // with 1, except when the paragraph is the content of a list item
      // and the marker starts a nested list inside that item.
      if (m.type === 'ordered' && m.start !== 1 &&
          stack[stack.length - 2].t !== 'item') return false;
    }
    closeParaTip(stack, refs);
    line.off = m.afterMarker;
    line.col = m.markerIndent + m.width;
    advanceCols(line, m.contentIndent - line.col);
    let list = stack[stack.length - 1];
    if (list.t !== 'list' || list.listType !== m.type ||
        (m.type === 'bullet' ? list.bulletChar !== m.bulletChar : list.delim !== m.delim)) {
      list = { t: 'list', children: [], listType: m.type, bulletChar: m.bulletChar, delim: m.delim, start: m.start, markerIndent: m.markerIndent, tight: true };
      addBlock(list);
      stack.push(list);
    }
    const item = { t: 'item', children: [], contentIndent: m.contentIndent, markerIndent: m.markerIndent };
    addBlock(item);
    stack.push(item);
    if (m.empty || lineBlank(line)) return true;
    if (tryStartBlock(line, stack, addBlock, refs, pendingBlank)) return true;
    startParagraph(line, stack, addBlock);
    return true;
  }
  if (isQuoteStart(line)) {
    closeParaTip(stack, refs);
    matchQuoteMarker(line);
    const q = { t: 'quote', children: [] };
    addBlock(q);
    stack.push(q);
    if (lineBlank(line)) return true;
    if (tryStartBlock(line, stack, addBlock, refs, pendingBlank)) return true;
    startParagraph(line, stack, addBlock);
    return true;
  }
  // GFM table: a delimiter row after a paragraph line. Check the delimiter
  // row FIRST: stripping definitions before knowing the line is a delimiter
  // row would parse an incomplete definition (its title may be the very
  // line being processed) and store it without its title.
  if (tipNode.t === 'para') {
    const p = tipNode;
    const aligns = parseDelimiterRow(line);
    if (aligns) {
      stripDefsFromPara(p, refs);
      if (p.lineCount >= 1) {
        const lastLine = p.lines[p.lines.length - 1];
        const headerCells = splitTableRow(lastLine);
        if (headerCells.length === aligns.length) {
          const table = { t: 'table', head: headerCells, aligns, rows: [] };
          const parent = stack[stack.length - 2];
          if (p.lineCount === 1) {
            parent.children[parent.children.length - 1] = table;
            if (pendingBlank && parent === pendingBlank.item) pendingBlank.list.tight = false;
            stack.pop();
            stack.push(table);
          } else {
            p.lines.pop();
            p.lineCount--;
            stack.pop();
            addBlock(table);
            stack.push(table);
          }
          return true;
        }
      }
    }
  }
  // Indented code cannot interrupt a paragraph.
  if (tipNode.t !== 'para') {
    const inf = indentInfo(line);
    if (inf.cols >= 4) {
      advanceCols(line, 4);
      const node = { t: 'code', lines: [restOf(line)], fenced: false };
      addBlock(node);
      stack.push(node);
      return true;
    }
  }
  return false;
}

// Backslash escapes in a fenced code block's info string are resolved
// (e.g. "foo\+bar" -> "foo+bar").
function unescapeInfo(s) {
  if (s.indexOf('\\') < 0) return s;
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '\\' && i + 1 < s.length && isPunctCode(s.charCodeAt(i + 1))) {
      out += s[i + 1];
      i++;
    } else {
      out += ch;
    }
  }
  return out;
}

// ---- inline parsing ----

const DISALLOWED_TAGS = new Set([
  'title', 'textarea', 'style', 'xmp', 'iframe', 'noembed', 'noframes',
  'script', 'plaintext',
]);

const UNICODE_PUNCT_RE = /[\p{P}\p{S}]/u;
function isPunctChar(ch) {
  if (!ch) return false;
  const c = ch.charCodeAt(0);
  if (c < 128) return isPunctCode(c);
  return UNICODE_PUNCT_RE.test(ch);
}
function isWsChar(ch) {
  const c = ch.charCodeAt(0);
  return c === 32 || c === 9 || c === 10 || c === 11 || c === 12 || c === 13 ||
    c === 133 || c === 160 || c === 5760 || (c >= 8192 && c <= 8202) ||
    c === 8239 || c === 8287 || c === 12288;
}

const ENTITY_STICKY = /&(#\d+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/y;
function decodeEntityAt(s, i) {
  ENTITY_STICKY.lastIndex = i;
  const m = ENTITY_STICKY.exec(s);
  if (!m) return null;
  const body = m[1];
  if (body.charCodeAt(0) === 35) {
    let cp;
    if (body.charCodeAt(1) === 120 || body.charCodeAt(1) === 88) cp = parseInt(body.slice(2), 16);
    else cp = parseInt(body.slice(1), 10);
    if (cp > 0x10ffff) return null;
    if (!cp || (cp >= 0xd800 && cp <= 0xdfff)) return { end: i + m[0].length, value: '�', raw: false };
    return { end: i + m[0].length, value: String.fromCodePoint(cp), raw: false };
  }
  // A named entity reference is passed through literally in text, whether
  // or not the name is defined (marked quirk: &copy; stays "&copy;").
  return { end: i + m[0].length, value: m[0], raw: true };
}

function mkList(pid) { return { head: null, tail: null, pid }; }
function listAppend(L, node) {
  node.next = null; node.prev = L.tail; node.pid = L.pid;
  if (L.tail) L.tail.next = node; else L.head = node;
  L.tail = node;
}
function listRemove(L, node) {
  if (node.prev) node.prev.next = node.next; else L.head = node.next;
  if (node.next) node.next.prev = node.prev; else L.tail = node.prev;
  node.next = null; node.prev = null;
}
function delimAdd(st, node) {
  node.pd = st.dTail; node.nd = null;
  if (st.dTail) st.dTail.nd = node; else st.dHead = node;
  st.dTail = node;
}
function delimRemove(st, node) {
  if (node.pd) node.pd.nd = node.nd; else st.dHead = node.nd;
  if (node.nd) node.nd.pd = node.pd; else st.dTail = node.pd;
  node.pd = null; node.nd = null;
}

// True when an active bracket opener is on the delimiter stack: a bare
// URL, bare email or angle autolink inside it would be inside a link (or
// an image label), so it must stay plain text.
function hasActiveBracket(st) {
  let b = st.dTail;
  while (b) {
    if (b.t === 'bracket' && b.active) return true;
    b = b.pd;
  }
  return false;
}

// Plain text of a node list (for image alt text).
function plainText(head) {
  let out = '';
  let nd = head;
  while (nd) {
    if (nd.t === 'text') out += decodeEntities(nd.s);
    else if (nd.t === 'entity') out += decodeEntities(nd.s);
    else if (nd.t === 'code') out += nd.s;
    else if (nd.t === 'delim') {
      // Emphasis delimiters are formatting, not alt text; a delimiter
      // that can neither open nor close is literal text and is kept.
      if (!nd.canOpen && !nd.canClose) out += nd.ch.repeat(nd.n);
    }
    else if (nd.t === 'bracket') out += '[';
    else if (nd.t === 'link' || nd.t === 'em' || nd.t === 'strong' || nd.t === 'del') out += plainText(nd.children);
    else if (nd.t === 'img') out += nd.alt;
    nd = nd.next;
  }
  return out;
}

const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function tryAngleAutolink(s, i) {
  const gt = s.indexOf('>', i + 1);
  if (gt < 0) return null;
  const inner = s.slice(i + 1, gt);
  if (inner === '' || /[\s<>]/.test(inner)) return null;
  const m = /^([a-zA-Z][a-zA-Z0-9+.-]{1,31}):([\s\S]*)$/.exec(inner);
  if (m) {
    const href = cleanUrl(decodeEntities(inner));
    if (href === null) return null;
    return { end: gt + 1, href, text: decodeEntities(inner) };
  }
  if (EMAIL_RE.test(inner)) {
    const href = cleanUrl('mailto:' + decodeEntities(inner));
    if (href === null) return null;
    return { end: gt + 1, href, text: decodeEntities(inner) };
  }
  return null;
}

// Scan a domain starting at s[i]. Returns the end index or -1.
function scanDomain(s, i) {
  const n = s.length;
  let j = i;
  if (j >= n || !isAlnumCode(s.charCodeAt(j))) return -1;
  j++;
  while (j < n && (isAlnumCode(s.charCodeAt(j)) || s[j] === '-')) j++;
  while (j > i && s[j - 1] === '-') j--;
  while (j < n && s[j] === '.' && j + 1 < n && isAlnumCode(s.charCodeAt(j + 1))) {
    j++;
    const ls = j;
    j++;
    while (j < n && (isAlnumCode(s.charCodeAt(j)) || s[j] === '-')) j++;
    while (j > ls && s[j - 1] === '-') j--;
  }
  return j;
}

// Strip trailing punctuation from a bare-URL candidate, per the GFM rules.
function trimUrlEnd(url) {
  let end = url.length;
  for (;;) {
    if (end === 0) break;
    const last = url[end - 1];
    if (last === ')') {
      // A trailing ")" is kept only when it closes an unmatched "("
      // earlier in the URL. Track depth in order (clamped at 0): a ")"
      // that precedes its "(" does not balance it.
      let depth = 0;
      for (let k = 0; k < end - 1; k++) {
        if (url[k] === '(') depth++;
        else if (url[k] === ')' && depth > 0) depth--;
      }
      if (depth > 0) break;
      end--;
      continue;
    }
    if (last === ';') {
      const amp = url.lastIndexOf('&', end - 2);
      // A trailing "&xxx;" looks like an entity reference, so it is not
      // part of the URL: trim the whole "&xxx;".
      if (amp >= 0 && /^[a-zA-Z0-9]+$/.test(url.slice(amp + 1, end - 1))) { end = amp; break; }
      end--;
      continue;
    }
    if (last === '?' || last === '!' || last === '.' || last === ',' || last === ':' || last === '*' || last === '_' || last === '~') {
      end--;
      continue;
    }
    break;
  }
  return url.slice(0, end);
}

// Try a bare URL at s[i] (www. or http(s)://). The scheme is matched
// case-insensitively ("Https://" is a link). The caller checks the
// preceding character. Returns { end, href, text } or null.
function tryBareUrl(s, i) {
  let scheme = '';
  let j = i;
  const lower = s.slice(i, i + 8).toLowerCase();
  if (s.startsWith('www.', i)) {
    scheme = 'http://';
    j = i + 4;
  } else if (lower.startsWith('https://')) {
    j = i + 8;
  } else if (lower.startsWith('http://')) {
    j = i + 7;
  } else return null;
  const domEnd = scanDomain(s, j);
  if (domEnd < 0) return null;
  const domain = s.slice(j, domEnd);
  if (scheme === 'http://' && domain.indexOf('.') < 0) return null;
  // The rest of the URL: everything up to whitespace or '<'.
  let k = domEnd;
  const n = s.length;
  while (k < n) {
    const ch = s[k];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '<') break;
    k++;
  }
  // An unmatched "(" ends the URL: a "(" must be closed by a ")" later
  // in the candidate, otherwise the URL stops before it.
  {
    const stack = [];
    for (let p = domEnd; p < k; p++) {
      if (s[p] === '(') stack.push(p);
      else if (s[p] === ')' && stack.length > 0) stack.pop();
    }
    if (stack.length > 0) k = stack[0];
  }
  let url = trimUrlEnd(s.slice(i, k));
  if (url === '') return null;
  const href = cleanUrl(scheme + decodeEntities(url));
  if (href === null) return null;
  return { end: i + url.length, href, text: decodeEntities(url) };
}

function isEmailLocalChar(ch) {
  const c = ch.charCodeAt(0);
  if (isAlnumCode(c)) return true;
  return '.!#$%&\'*+/=?^_`{|}~-'.indexOf(ch) >= 0;
}

// Try a bare email address with the '@' at s[i]. textStart is the start of
// the current unflushed text run. Returns { end, href, text, localStart }.
function tryBareEmail(s, i, textStart) {
  // Local part: maximal run of local-part chars ending at i. The scan is
  // not limited to the current text run: an emphasis delimiter such as
  // "_" is a valid local-part character (e.g. "a.b-c_d@a.b"); the caller
  // absorbs the preceding nodes into the link.
  let ls = i;
  while (ls > 0 && isEmailLocalChar(s[ls - 1])) {
    // A run of two or more identical emphasis delimiters ("__", "**")
    // opens or closes emphasis; it is not part of the address. A single
    // "_" inside the address (e.g. "a.b-c_d") is part of it.
    const c = s[ls - 1];
    if ((c === '_' || c === '*' || c === '~') && ls - 1 > 0 && s[ls - 2] === c) break;
    ls--;
  }
  if (ls === i) return null;
  const domEnd = scanDomain(s, i + 1);
  if (domEnd < 0) return null;
  const email = s.slice(ls, domEnd);
  if (!EMAIL_RE.test(email)) return null;
  // The local part must contain an alphanumeric character.
  if (!/[a-zA-Z0-9]/.test(email.slice(0, i - ls))) return null;
  // The character after the email must not be one that could continue
  // the address (an alphanumeric, "-", "_" or "+"): otherwise this is
  // only a prefix of a longer (invalid) address. A trailing "." or "/"
  // is punctuation, not part of the address.
  if (domEnd < s.length) {
    const after = s[domEnd];
    // A "_" that is part of a "__" emphasis run does not continue the
    // address; a lone "_" does, unless it closes an emphasis run and
    // more text follows on the same line (then it is the closer, not
    // part of the address).
    if (after === '_' && s[domEnd + 1] === '_') {
      // fall through: the "__" closes emphasis, the email is complete
    } else if (after === '_') {
      const nx = s[domEnd + 1];
      if (nx === undefined || nx === '\n') return null;
      if (nx === ' ' || nx === '\t') {
        let k = domEnd + 1;
        while (k < s.length && (s[k] === ' ' || s[k] === '\t')) k++;
        if (k >= s.length || s[k] === '\n') return null;
        // more text follows on this line: the "_" closes emphasis
      }
      // A non-whitespace character after the "_" is also more text on
      // the same line (e.g. "_,"), so the "_" closes emphasis and the
      // email is complete.
    } else if (isAlnumCode(after.charCodeAt(0)) || after === '-' || after === '+') return null;
  }
  // A scheme immediately before the address ("mailto:foo@bar.baz") is
  // part of the link.
  let start = ls;
  let href;
  let text = email;
  if (ls > 0 && s[ls - 1] === ':') {
    let ss = ls - 1;
    while (ss > 0 && /[a-zA-Z0-9+.-]/.test(s[ss - 1])) ss--;
    if (ss < ls - 1 && /[a-zA-Z]/.test(s[ss])) {
      start = ss;
      // A scheme address may carry a single path segment ("/txt"): the
      // "/" plus the characters up to the next "/", whitespace or "<".
      // A lone trailing "/" is not a path.
      let end = domEnd;
      if (s[end] === '/' && end + 1 < s.length) {
        const nx = s[end + 1];
        if (nx !== ' ' && nx !== '\t' && nx !== '\n' && nx !== '<' && nx !== '/') {
          let k = end + 1;
          while (k < s.length) {
            const ch = s[k];
            if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '<' || ch === '/') break;
            k++;
          }
          const trimmed = trimUrlEnd(s.slice(ss, k));
          end = ss + trimmed.length;
        }
      }
      text = s.slice(ss, end);
      href = cleanUrl(text);
      if (href === null) return null;
      return { end, href, text, localStart: start };
    }
  }
  href = cleanUrl('mailto:' + email);
  if (href === null) return null;
  return { end: domEnd, href, text: email, localStart: ls };
}

function tryInlineLink(s, i) {
  let j = i + 1;
  if (s[j] !== '(') return null;
  j++;
  j = skipWsAndNewlines(s, j);
  let dest;
  if (s[j] === '<') {
    const d = scanAngleDest(s, j);
    if (!d) return null;
    dest = d.dest;
    j = d.end;
  } else {
    const d = scanBareDest(s, j);
    if (!d) {
      // An empty destination is valid ("[link]()", or "[link]( 'title')").
      if (s[j] === ')' || s[j] === '"' || s[j] === "'" || s[j] === '(') dest = '';
      else return null;
    } else {
      dest = d.dest;
      j = d.end;
    }
  }
  const saveJ = j;
  j = skipWsAndNewlines(s, j);
  let title = null;
  const qc = s[j];
  if (qc === '"' || qc === "'" || qc === '(') {
    // A title must be separated from the destination by whitespace.
    if (j === saveJ) return null;
    const t = scanTitle(s, j);
    if (!t) return null;
    title = t.title;
    j = t.end;
  } else {
    j = saveJ;
  }
  j = skipWsAndNewlines(s, j);
  if (s[j] !== ')') return null;
  return { end: j + 1, dest, title };
}

function tryReferenceLink(st, s, i, bracket) {
  let j = i + 1;
  if (s[j] === '[') {
    const labelEnd = scanLabel(s, j);
    if (labelEnd < 0) return null;
    const rawLabel = s.slice(j + 1, labelEnd - 1);
    if (rawLabel.length === 0) {
      const labelText = s.slice(bracket.srcStart + 1, i);
      if (labelText.length === 0 || labelText.length > 999) return null;
      if (hasUnescapedBracket(labelText)) return null;
      const ref = st.refs.get(normalizeLabel(labelText));
      if (!ref) return null;
      return { end: labelEnd, dest: ref.dest, title: ref.title };
    }
    if (rawLabel.length > 999) return null;
    if (hasUnescapedBracket(rawLabel)) return null;
    const ref = st.refs.get(normalizeLabel(rawLabel));
    if (!ref) return null;
    return { end: labelEnd, dest: ref.dest, title: ref.title };
  }
  const labelText = s.slice(bracket.srcStart + 1, i);
  if (labelText.length === 0 || labelText.length > 999) return null;
  if (hasUnescapedBracket(labelText)) return null;
  const ref = st.refs.get(normalizeLabel(labelText));
  if (!ref) return null;
  return { end: i + 1, dest: ref.dest, title: ref.title };
}

function flanking(s, i, runLen) {
  const before = i > 0 ? s[i - 1] : ' ';
  const after = i + runLen < s.length ? s[i + runLen] : ' ';
  const beforeWs = isWsChar(before);
  const afterWs = isWsChar(after);
  const beforePunct = isPunctChar(before);
  const afterPunct = isPunctChar(after);
  const leftFlanking = !afterWs && (!afterPunct || beforeWs || beforePunct);
  const rightFlanking = !beforeWs && (!beforePunct || afterWs || afterPunct);
  return { leftFlanking, rightFlanking, beforePunct, afterPunct };
}

// When a bracket fails to form a link, the bare URLs and emails inside
// its label were suppressed while the bracket was active. Now that the
// bracket stays literal text, scan its label text nodes and turn any
// bare URL or email lying wholly inside one text node into a link node,
// as the main scan would have done. (A URL split across nodes by a
// delimiter or entity is left alone.) Links created here are marked
// rescanned: if an outer link later forms around them, they are turned
// back into text, because marked does not link bare URLs inside a
// formed link's label.
function rescanFailedLabel(st, s, topList, b) {
  if (b.isImage) return;
  let nd = b.next;
  while (nd) {
    if (nd.t !== 'text' || nd.so === undefined) { nd = nd.next; continue; }
    let cur = nd;
    let str = cur.s;
    let base = cur.so;
    let k = 0;
    let done = false;
    while (!done && k < str.length) {
      let cand = -1;
      let isMail = false;
      for (let p = k; p < str.length; p++) {
        const c = str[p];
        if (c === '@') { cand = p; isMail = true; break; }
        if (c === 'h' || c === 'H') {
          const low = str.slice(p, p + 8).toLowerCase();
          if (low.startsWith('https://') || low.startsWith('http://')) { cand = p; break; }
        } else if (c === 'w' && str.startsWith('www.', p)) { cand = p; break; }
      }
      if (cand < 0) break;
      const pos = base + cand;
      const prev = pos > 0 ? s[pos - 1] : ' ';
      if (!(isWsChar(prev) || prev === '*' || prev === '_' || prev === '~' || prev === '(' || prev === '[' || prev === '<')) { k = cand + 1; continue; }
      let link = null;
      let ls = 0, le = 0;
      if (isMail) {
        const em = tryBareEmail(s, pos, base);
        if (!em || em.localStart < base || em.end > base + str.length) { k = cand + 1; continue; }
        ls = em.localStart - base; le = em.end - base;
        const tnode = { t: 'text', s: em.text };
        const cl = mkList(st.nextPid++);
        listAppend(cl, tnode);
        link = { t: 'link', href: em.href, title: null, children: cl.head, childTail: cl.tail, rescanned: true, rescanText: tnode };
      } else {
        const u = tryBareUrl(s, pos);
        if (!u || u.end > base + str.length) { k = cand + 1; continue; }
        ls = cand; le = u.end - base;
        const tnode = { t: 'text', s: u.text };
        const cl = mkList(st.nextPid++);
        listAppend(cl, tnode);
        link = { t: 'link', href: u.href, title: null, children: cl.head, childTail: cl.tail, rescanned: true, rescanText: tnode };
      }
      const before = str.slice(0, ls);
      const after = str.slice(le);
      const afterNode = after === '' ? null : { t: 'text', s: after, so: base + le };
      if (before === '') {
        link.prev = cur.prev; link.next = cur.next;
        if (link.prev) link.prev.next = link; else topList.head = link;
        if (link.next) link.next.prev = link; else topList.tail = link;
      } else {
        cur.s = before;
        link.prev = cur; link.next = cur.next;
        if (link.next) link.next.prev = link; else topList.tail = link;
        cur.next = link;
      }
      if (afterNode) {
        afterNode.prev = link; afterNode.next = link.next;
        if (afterNode.next) afterNode.next.prev = afterNode; else topList.tail = afterNode;
        link.next = afterNode;
        cur = afterNode; str = after; base = base + le; k = 0;
      } else {
        done = true;
      }
    }
    nd = cur.next;
  }
}

function scanInline(st, s) {
  const topList = st.topList;
  let i = 0;
  const n = s.length;
  let textStart = 0;
  const flushText = (end) => {
    if (end > textStart) listAppend(topList, { t: 'text', s: s.slice(textStart, end), so: textStart });
  };
  while (i < n) {
    const ch = s[i];
    if (ch === '\\') {
      if (i + 1 < n) {
        const nc = s[i + 1];
        if (nc === '\n') {
          flushText(i);
          listAppend(topList, { t: 'br' });
          i += 2; textStart = i;
          // Leading spaces on the line after a hard break are stripped.
          while (i < n && (s[i] === ' ' || s[i] === '\t')) i++;
          textStart = i;
          continue;
        }
        if (isPunctCode(nc.charCodeAt(0))) {
          flushText(i);
          listAppend(topList, { t: 'text', s: nc });
          i += 2; textStart = i;
          continue;
        }
      }
      i++;
      continue;
    }
    if (ch === '\n') {
      let k = i - 1;
      let spaces = 0;
      while (k >= textStart && s[k] === ' ') { spaces++; k--; }
      if (spaces >= 2) {
        flushText(i - spaces);
        listAppend(topList, { t: 'br' });
        i++; textStart = i;
        // Leading spaces on the line after a hard break are stripped.
        while (i < n && (s[i] === ' ' || s[i] === '\t')) i++;
        textStart = i;
        continue;
      }
      i++;
      continue;
    }
    if (ch === '`') {
      let k = i;
      while (k < n && s[k] === '`') k++;
      const runLen = k - i;
      const close = findCodeSpanEnd(s, k, runLen);
      if (close < 0) { i = k; continue; }
      // A code span must not swallow the ']' that closes an open link
      // label: if it would, the backticks stay literal and the link
      // forms instead (the label's own bracket scan pairs backtick runs
      // consecutively, so it finds that ']').
      const brk = s.indexOf(']', k);
      if (brk >= 0 && brk < close) {
        let b = st.dTail;
        while (b && (b.t !== 'bracket' || b.pid !== 0)) b = b.pd;
        if (b && b.active) {
          const closeIdx = findLabelClose(s, b.srcStart + 1);
          if (closeIdx > i && closeIdx < close) { i = k; continue; }
        }
      }
      let content = s.slice(k, close - runLen).replace(/\n/g, ' ');
      if (content.length >= 2 && content[0] === ' ' && content[content.length - 1] === ' ' && !/^[ ]+$/.test(content)) {
        content = content.slice(1, -1);
      }
      flushText(i);
      listAppend(topList, { t: 'code', s: content });
      i = close; textStart = i;
      continue;
    }
    if (ch === '*' || ch === '_' || ch === '~') {
      let k = i;
      while (k < n && s[k] === ch) k++;
      const runLen = k - i;
      const fl = flanking(s, i, runLen);
      let canOpen;
      let canClose;
      if (ch === '_') {
        canOpen = fl.leftFlanking && (!fl.rightFlanking || fl.beforePunct);
        canClose = fl.rightFlanking && (!fl.leftFlanking || fl.afterPunct);
      } else {
        canOpen = fl.leftFlanking;
        canClose = fl.rightFlanking;
      }
      flushText(i);
      const d = { t: 'delim', ch, n: runLen, canOpen, canClose, active: true };
      listAppend(topList, d);
      delimAdd(st, d);
      i = k; textStart = i;
      continue;
    }
    if (ch === '[') {
      let isImage = false;
      let bangNode = null;
      if (i > 0 && s[i - 1] === '!' && textStart <= i - 1) {
        isImage = true;
        flushText(i - 1);
        bangNode = { t: 'text', s: '!' };
        listAppend(topList, bangNode);
      } else {
        flushText(i);
      }
      const b = { t: 'bracket', isImage, active: true, bang: bangNode, srcStart: i };
      listAppend(topList, b);
      delimAdd(st, b);
      i++; textStart = i;
      continue;
    }
    if (ch === ']') {
      // The "]" pairs with the nearest unmatched opener. If that opener
      // is inactive (a link already formed inside it), no link forms
      // from this "]" and the opener is dropped, so a later "]" can pair
      // with a farther opener ("![[[foo](uri1)](uri2)](uri3)" pairs the
      // outermost image with "(uri3)").
      let b = st.dTail;
      while (b && (b.t !== 'bracket' || b.pid !== 0)) b = b.pd;
      if (!b) { i++; continue; }
      if (!b.active) {
        // An inactive bracket stays literal text: its label is
        // released, so bare URLs/emails inside it link as usual.
        flushText(i);
        rescanFailedLabel(st, s, topList, b);
        delimRemove(st, b);
        textStart = i;
        i++; continue;
      }
      let linkInfo = tryInlineLink(s, i);
      if (!linkInfo) linkInfo = tryReferenceLink(st, s, i, b);
      if (!linkInfo) {
        // No link forms from this opener: drop it from the stack so a
        // later "]" can pair with an outer opener (otherwise "[link]
        // bar](/uri)" would link the text up to the second "]"). The
        // label text is released first: bare URLs/emails inside it
        // were suppressed while the bracket was active, and now that
        // the bracket stays literal they link as usual.
        flushText(i);
        rescanFailedLabel(st, s, topList, b);
        delimRemove(st, b);
        textStart = i;
        i++; continue;
      }
      flushText(i);
      const href = cleanUrl(decodeEntities(linkInfo.dest));
      if (href === null) { i++; continue; }
      const title = linkInfo.title === null ? null : decodeEntities(linkInfo.title);
      const childList = mkList(st.nextPid++);
      if (b.next) {
        childList.head = b.next;
        childList.tail = topList.tail;
        childList.head.prev = null;
        childList.tail.next = null;
        let nd = childList.head;
        while (nd) { nd.pid = childList.pid; nd = nd.next; }
        topList.tail = b;
        b.next = null;
      }
      // Bare URLs/emails that a failed inner bracket released into
      // this label stay plain text now that the link forms: undo any
      // rescan-created link nodes at the top level of the label.
      {
        let nd = childList.head;
        while (nd) {
          const nx = nd.next;
          if (nd.t === 'link' && nd.rescanned) {
            const txt = nd.rescanText;
            txt.prev = nd.prev; txt.next = nd.next;
            if (txt.prev) txt.prev.next = txt; else childList.head = txt;
            if (txt.next) txt.next.prev = txt; else childList.tail = txt;
          }
          nd = nx;
        }
      }
      if (b.isImage) {
        // The image label becomes plain alt text: no delimiter inside it
        // can form emphasis or a link, so drop them all from the stack.
        const dropDelims = (head) => {
          let nd = head;
          while (nd) {
            if (nd.t === 'delim' || nd.t === 'bracket') {
              if (nd.t === 'bracket') nd.active = false;
              delimRemove(st, nd);
            } else if (nd.t === 'link' && nd.children) {
              dropDelims(nd.children);
            }
            nd = nd.next;
          }
        };
        dropDelims(childList.head);
      } else {
        let d = st.dHead;
        while (d) {
          const nx = d.nd;
          if (d.t === 'bracket' && d.pid === childList.pid) {
            d.active = false;
            delimRemove(st, d);
          }
          d = nx;
        }
      }
      delimRemove(st, b);
      // A link cannot contain another link: when a link (not an image)
      // forms, deactivate every link bracket opened before this link's
      // opener, so no outer link can form around it. An image may sit
      // inside a link, and a link may sit inside an image's label (it
      // becomes plain alt text), so image brackets stay active.
      if (!b.isImage) {
        let d = st.dHead;
        while (d) {
          const nx = d.nd;
          if (d.t === 'bracket' && d.active && !d.isImage) d.active = false;
          d = nx;
        }
      }
      let node;
      if (b.isImage) {
        if (b.bang) listRemove(topList, b.bang);
        node = { t: 'img', src: href, alt: plainText(childList.head), title };
      } else {
        node = { t: 'link', href, title, children: childList.head, childTail: childList.tail };
      }
      const prev = b.prev;
      if (prev) prev.next = node; else topList.head = node;
      node.prev = prev;
      node.next = null;
      node.pid = 0;
      topList.tail = node;
      i = linkInfo.end;
      textStart = i;
      continue;
    }
    if (ch === '<') {
      const auto = tryAngleAutolink(s, i);
      if (auto) {
        flushText(i);
        const childList = mkList(st.nextPid++);
        const textNode = { t: 'text', s: auto.text };
        listAppend(childList, textNode);
        const node = { t: 'link', href: auto.href, title: null, children: childList.head, childTail: childList.tail };
        listAppend(topList, node);
        i = auto.end; textStart = i;
        continue;
      }
      const tag = matchHtmlTag(s, i);
      if (tag) {
        flushText(i);
        const raw = s.slice(i, tag.end);
        listAppend(topList, { t: 'html', s: raw });
        i = tag.end; textStart = i;
        continue;
      }
      i++;
      continue;
    }
    if (ch === '&') {
      const ent = decodeEntityAt(s, i);
      if (ent) {
        flushText(i);
        if (ent.raw) listAppend(topList, { t: 'entity', s: ent.value });
        else listAppend(topList, { t: 'text', s: ent.value });
        i = ent.end; textStart = i;
        continue;
      }
      i++;
      continue;
    }
    if (ch === 'w' && s.startsWith('www.', i)) {
      const prev = i > 0 ? s[i - 1] : ' ';
      if (!hasActiveBracket(st) && (isWsChar(prev) || prev === '*' || prev === '_' || prev === '~' || prev === '(' || prev === '[' || prev === '<')) {
        const u = tryBareUrl(s, i);
        if (u) {
          flushText(i);
          const childList = mkList(st.nextPid++);
          listAppend(childList, { t: 'text', s: u.text });
          listAppend(topList, { t: 'link', href: u.href, title: null, children: childList.head, childTail: childList.tail });
          i = u.end; textStart = i;
          continue;
        }
      }
      i++;
      continue;
    }
    if ((ch === 'h' || ch === 'H') && (s.slice(i, i + 7).toLowerCase() === 'http://' || s.slice(i, i + 8).toLowerCase() === 'https://')) {
      const prev = i > 0 ? s[i - 1] : ' ';
      if (!hasActiveBracket(st) && (isWsChar(prev) || prev === '*' || prev === '_' || prev === '~' || prev === '(' || prev === '[' || prev === '<')) {
        const u = tryBareUrl(s, i);
        if (u) {
          flushText(i);
          const childList = mkList(st.nextPid++);
          listAppend(childList, { t: 'text', s: u.text });
          listAppend(topList, { t: 'link', href: u.href, title: null, children: childList.head, childTail: childList.tail });
          i = u.end; textStart = i;
          continue;
        }
      }
      i++;
      continue;
    }
    if (ch === '@') {
      const em = !hasActiveBracket(st) ? tryBareEmail(s, i, textStart) : null;
      if (em) {
        // The local part may extend before the current text run (an
        // emphasis delimiter such as "_" is a valid local-part char):
        // absorb the preceding text and "_" / "~" delimiter nodes into
        // the email, truncating a text node if only its tail belongs.
        if (em.localStart < textStart) {
          let need = textStart - em.localStart;
          let nd = topList.tail;
          while (nd && need > 0) {
            const prev = nd.prev;
            if (nd.t === 'text') {
              if (nd.s.length <= need) {
                need -= nd.s.length;
                listRemove(topList, nd);
              } else {
                nd.s = nd.s.slice(0, nd.s.length - need);
                need = 0;
              }
            } else if (nd.t === 'delim' && (nd.ch === '_' || nd.ch === '~') && nd.n <= need) {
              need -= nd.n;
              delimRemove(st, nd);
              listRemove(topList, nd);
            } else break;
            nd = prev;
          }
        }
        flushText(em.localStart);
        const childList = mkList(st.nextPid++);
        listAppend(childList, { t: 'text', s: em.text });
        listAppend(topList, { t: 'link', href: em.href, title: null, children: childList.head, childTail: childList.tail });
        i = em.end; textStart = i;
        continue;
      }
      i++;
      continue;
    }
    i++;
  }
  flushText(n);
}

const SLOW_RE = /[\\`*_[\]<>&!~@]/;
const HARD_BREAK_RE = / {2,}\n/;
function inlineParse(s, refs) {
  if (!SLOW_RE.test(s) && s.indexOf('://') < 0 && s.indexOf('www.') < 0 && !HARD_BREAK_RE.test(s)) {
    return escapeHtml(s);
  }
  const st = { topList: mkList(0), dHead: null, dTail: null, nextPid: 1, refs };
  scanInline(st, s);
  processEmphasis(st);
  return renderInlineList(st.topList.head);
}

// ---- emphasis processing (CommonMark process-emphasis algorithm) ----

function nodeInsertBefore(L, node, ref) {
  node.next = ref; node.prev = ref.prev; node.pid = L.pid;
  if (ref.prev) ref.prev.next = node; else L.head = node;
  ref.prev = node;
}
function nodeInsertAfter(L, node, ref) {
  node.prev = ref; node.next = ref.next; node.pid = L.pid;
  if (ref.next) ref.next.prev = node; else L.tail = node;
  ref.next = node;
}
function delimInsertBefore(st, node, ref) {
  node.nd = ref; node.pd = ref.pd;
  if (ref.pd) ref.pd.nd = node; else st.dHead = node;
  ref.pd = node;
}
function delimInsertAfter(st, node, ref) {
  node.pd = ref; node.nd = ref.nd;
  if (ref.nd) ref.nd.pd = node; else st.dTail = node;
  ref.nd = node;
}
function syncListOwner(L) {
  if (L.owner) { L.owner.children = L.head; L.owner.childTail = L.tail; }
}

function wrapEmphasis(st, opener, closer, useDelims, type) {
  const L = st.lists.get(opener.pid);
  if (opener.n > useDelims) {
    const rem = { t: 'delim', ch: opener.ch, n: opener.n - useDelims, canOpen: opener.canOpen, canClose: opener.canClose, active: true };
    nodeInsertBefore(L, rem, opener);
    delimInsertBefore(st, rem, opener);
    opener.n = useDelims;
    syncListOwner(L);
  }
  let closerRem = null;
  if (closer.n > useDelims) {
    closerRem = { t: 'delim', ch: closer.ch, n: closer.n - useDelims, canOpen: closer.canOpen, canClose: closer.canClose, active: true };
    nodeInsertAfter(L, closerRem, closer);
    delimInsertAfter(st, closerRem, closer);
    closer.n = useDelims;
    syncListOwner(L);
  }
  const childList = mkList(st.nextPid++);
  const first = opener.next;
  const last = closer.prev;
  if (first && first !== closer) {
    childList.head = first;
    childList.tail = last;
    let nd = first;
    while (nd !== closer) { nd.pid = childList.pid; nd = nd.next; }
    first.prev = null;
    last.next = null;
  }
  const emNode = { t: type, children: childList.head, childTail: childList.tail };
  childList.owner = emNode;
  st.lists.set(childList.pid, childList);
  const prev = opener.prev;
  const after = closer.next;
  if (prev) prev.next = emNode; else L.head = emNode;
  emNode.prev = prev;
  emNode.next = after;
  if (after) after.prev = emNode; else L.tail = emNode;
  emNode.pid = L.pid;
  syncListOwner(L);
  delimRemove(st, opener);
  delimRemove(st, closer);
  return closerRem;
}

function processEmphasis(st) {
  // An outer "*" emphasis does not form when its content holds a
  // <strong> that is preceded by whitespace and followed directly by a
  // word character (e.g. "*a **b**c*"): the strong stays, the outer
  // asterisks stay literal. When the strong is followed by whitespace
  // ("*a **b** c*") or preceded by a word ("*a**b**c*"), the outer
  // emphasis forms normally.
  const hasBlockingStrong = (opener, closer) => {
    let nd = opener.next;
    while (nd && nd !== closer) {
      if (nd.t === 'strong') {
        const pv = nd.prev;
        const nx = nd.next;
        const beforeWs = pv && pv.t === 'text' && pv.s.length > 0 &&
          (pv.s[pv.s.length - 1] === ' ' || pv.s[pv.s.length - 1] === '\t' || pv.s[pv.s.length - 1] === '\n');
        const afterWord = nx && nx.t === 'text' && nx.s.length > 0 &&
          !isWsChar(nx.s[0]) && nx.s[0] !== '*' && nx.s[0] !== '_';
        if (beforeWs && afterWord) return true;
      }
      nd = nd.next;
    }
    return false;
  };
  st.lists = new Map();
  st.lists.set(0, st.topList);
  const register = (L) => {
    let nd = L.head;
    while (nd) {
      if (nd.t === 'link' && nd.children) {
        const CL = { head: nd.children, tail: nd.childTail, pid: nd.children.pid, owner: nd };
        st.lists.set(CL.pid, CL);
        register(CL);
      }
      nd = nd.next;
    }
  };
  register(st.topList);
  let closer = st.dHead;
  while (closer) {
    const nextCloser = closer.nd;
    if (closer.t === 'delim' && closer.canClose && !(closer.ch === '~' && closer.n > 2)) {
      const ch = closer.ch;
      let opener = closer.pd;
      let found = null;
      let useDelims = 0;
      while (opener) {
        if (opener.t === 'delim' && opener.ch === ch && opener.canOpen && opener.pid === closer.pid && !(ch === '~' && opener.n > 2)) {
          const oddMatch = (opener.canOpen && opener.canClose) || (closer.canOpen && closer.canClose);
          let ok = true;
          if (oddMatch) {
            const sum = opener.n + closer.n;
            if (sum % 3 === 0 && !(opener.n % 3 === 0 && closer.n % 3 === 0)) ok = false;
          }
          if (ok) {
            // An em ("*") spanning a blocking <strong> does not form.
            const wouldBeEm = ch === '*' && !((opener.n >= 2 && closer.n >= 2));
            if (wouldBeEm && hasBlockingStrong(opener, closer)) {
              opener = opener.pd;
              continue;
            }
            found = opener;
            useDelims = ch === '~' ? Math.min(opener.n, closer.n, 2) : ((opener.n >= 2 && closer.n >= 2) ? 2 : 1);
            break;
          }
        }
        opener = opener.pd;
      }
      if (found) {
        const type = ch === '~' ? 'del' : (useDelims === 2 ? 'strong' : 'em');
        const rem = wrapEmphasis(st, found, closer, useDelims, type);
        // A closer with delimiters left over must be re-examined: it may
        // close another opener (e.g. "***" closing "**" for strong and
        // then "*" for em).
        if (rem) { closer = rem; continue; }
      }
    }
    closer = nextCloser;
  }
}

// ---- inline rendering ----

function renderInlineList(head) {
  let out = '';
  let nd = head;
  while (nd) {
    if (nd.t === 'text') out += escapeHtml(nd.s);
    else if (nd.t === 'entity') out += nd.s;
    else if (nd.t === 'code') out += '<code>' + escapeHtml(nd.s) + '</code>';
    else if (nd.t === 'delim') out += nd.ch.repeat(nd.n);
    else if (nd.t === 'bracket') out += '[';
    else if (nd.t === 'br') out += '<br>';
    else if (nd.t === 'html') out += nd.s;
    else if (nd.t === 'link') {
      out += '<a href="' + escapeAttr(nd.href) + '"';
      if (nd.title !== null) out += ' title="' + escapeAttr(nd.title) + '"';
      out += '>' + renderInlineList(nd.children) + '</a>';
    } else if (nd.t === 'img') {
      out += '<img src="' + escapeAttr(nd.src) + '" alt="' + escapeAttr(nd.alt) + '"';
      if (nd.title !== null) out += ' title="' + escapeAttr(nd.title) + '"';
      out += '>';
    } else if (nd.t === 'em') out += '<em>' + renderInlineList(nd.children) + '</em>';
    else if (nd.t === 'strong') out += '<strong>' + renderInlineList(nd.children) + '</strong>';
    else if (nd.t === 'del') out += '<del>' + renderInlineList(nd.children) + '</del>';
    nd = nd.next;
  }
  return out;
}

// ---- block rendering ----

function renderTable(b, refs) {
  let out = '<table>\n<thead>\n<tr>\n';
  for (let i = 0; i < b.head.length; i++) {
    out += '<th';
    if (b.aligns[i]) out += ' align="' + b.aligns[i] + '"';
    out += '>' + inlineParse(b.head[i], refs) + '</th>\n';
  }
  out += '</tr>\n</thead>\n';
  if (b.rows.length) {
    out += '<tbody>';
    for (const row of b.rows) {
      out += '<tr>\n';
      for (let i = 0; i < b.head.length; i++) {
        out += '<td';
        if (b.aligns[i]) out += ' align="' + b.aligns[i] + '"';
        out += '>' + inlineParse(row[i] !== undefined ? row[i] : '', refs) + '</td>\n';
      }
      out += '</tr>\n';
    }
    out += '</tbody>';
  }
  out += '</table>\n';
  return out;
}

// A GFM task-list checkbox at the start of a list item's first paragraph:
// "[ ]" (unchecked) or "[x]" / "[X]" (checked), followed by a space or
// the end of the text. Returns { html, rest } or null.
function taskCheckbox(text) {
  if (text.length < 3 || text[0] !== '[' || text[2] !== ']') return null;
  const c = text[1];
  if (c !== ' ' && c !== 'x' && c !== 'X') return null;
  const after = text[3];
  if (after !== undefined && after !== ' ' && after !== '\t') return null;
  const html = (c === ' ' ? '<input disabled="" type="checkbox">' : '<input checked="" disabled="" type="checkbox">');
  return { html, rest: text.slice(3) };
}

function renderList(b, refs, isLast) {
  const tag = b.listType === 'bullet' ? 'ul' : 'ol';
  let out = '<' + tag;
  if (b.listType === 'ordered' && b.start !== 1) out += ' start="' + b.start + '"';
  out += '>\n';
  for (let j = 0; j < b.children.length; j++) {
    const item = b.children[j];
    const itemIsLast = isLast && j === b.children.length - 1;
    const kids = item.children;
    let cb = null;
    if (kids.length && kids[0].t === 'para') cb = taskCheckbox(kids[0].lines.join('\n'));
    if (b.tight) {
      out += '<li>';
      if (cb) out += cb.html;
      for (let i = 0; i < kids.length; i++) {
        if (i === 0 && cb) out += inlineParse(cb.rest, refs);
        else out += renderBlock(kids[i], refs, true, itemIsLast && i === kids.length - 1);
      }
      out += '</li>\n';
    } else {
      out += '<li>';
      if (cb) {
        out += '<p>' + cb.html + inlineParse(cb.rest, refs) + '</p>\n';
        out += renderBlocks(kids.slice(1), refs, false, itemIsLast);
      } else {
        out += renderBlocks(item.children, refs, false, itemIsLast);
      }
      out += '</li>\n';
    }
  }
  out += '</' + tag + '>\n';
  return out;
}

function renderBlock(b, refs, tight, isLast) {
  if (b.t === 'para') {
    const text = b.lines.join('\n');
    if (tight) return inlineParse(text, refs);
    return '<p>' + inlineParse(text, refs) + '</p>\n';
  }
  if (b.t === 'heading') {
    return '<h' + b.level + '>' + inlineParse(b.text, refs) + '</h' + b.level + '>\n';
  }
  if (b.t === 'hr') return '<hr>\n';
  if (b.t === 'fence') {
    const content = b.lines.length ? b.lines.join('\n') + '\n' : '';
    let out = '<pre><code';
    if (b.info) out += ' class="language-' + escapeAttr(unescapeInfo(b.info)) + '"';
    out += '>' + escapeHtml(content) + '</code></pre>\n';
    return out;
  }
  if (b.t === 'code') {
    const content = b.lines.length ? b.lines.join('\n') + '\n' : '';
    return '<pre><code>' + escapeHtml(content) + '</code></pre>\n';
  }
  if (b.t === 'html') {
    // Types 1-5 keep a trailing newline unless a blank line followed the
    // block; types 6-7 keep one only when the block is the last block in
    // the document and the source ends with a newline.
    const hasTrailing = (b.htmlType <= 5 && !b.blankAfter) ||
      (b.htmlType <= 5 && isLast) ||
      (b.htmlType >= 6 && isLast && SRC_ENDS_WITH_NL);
    return b.lines.length ? b.lines.join('\n') + (hasTrailing ? '\n' : '') : '';
  }
  if (b.t === 'quote') {
    // The closing tag keeps a trailing newline unless this is the last
    // block and its last child is an HTML block (whose own trailing
    // newline already terminates the content) or the content is empty
    // of blocks that end with one. An empty blockquote still gets one.
    const inner = renderBlocks(b.children, refs, false, isLast);
    const lastChild = b.children[b.children.length - 1];
    const trailing = (!isLast || !lastChild || lastChild.t !== 'html') ? '\n' : '';
    return '<blockquote>\n' + inner + '</blockquote>' + trailing;
  }
  if (b.t === 'list') return renderList(b, refs, isLast);
  if (b.t === 'table') return renderTable(b, refs);
  if (b.t === 'item') return renderBlocks(b.children, refs, tight, isLast);
  return '';
}

function renderBlocks(blocks, refs, tight, parentIsLast) {
  let out = '';
  for (let i = 0; i < blocks.length; i++) {
    out += renderBlock(blocks[i], refs, tight, parentIsLast && i === blocks.length - 1);
  }
  return out;
}

// ---- entry point ----

// Whether the (normalized) source ends with a newline: a trailing HTML
// block of type 6-7 keeps its final newline only then.
let SRC_ENDS_WITH_NL = true;

export function parse(input) {
  const src = String(input).replace(/\r\n?/g, '\n');
  SRC_ENDS_WITH_NL = src.endsWith('\n');
  const lines = src.split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  const refs = new Map();
  const root = { t: 'root', children: [] };
  buildBlocks(root, lines, refs);
  return renderBlocks(root.children, refs, false, true);
}
