// parse.js — a dependency-free Markdown parser producing exactly the HTML
// marked 18.1.3 produces with default options (gfm on, breaks off).
// Written from the CommonMark 0.31.2 and GFM 0.29 specifications, plus the
// output conventions observed in marked's own rendering.

const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const ESC_RE = /[&<>"']/g;
// Escape, leaving an ampersand alone when it starts something that looks
// like an entity reference: &#123; &#x1f; or &word;
const ESC_NO_ENCODE_RE = /[<>"']|&(?!(#\d{1,7}|#[Xx][0-9A-Fa-f]{1,6}|\w+);)/g;
function escapeHtml(s, encode) {
  if (encode) return s.replace(ESC_RE, (ch) => ESC_MAP[ch]);
  return s.replace(ESC_NO_ENCODE_RE, (ch) => ESC_MAP[ch]);
}

// Decode numeric character references only: &#35; &#x1F600; &#0;.
// Invalid code points (0, surrogates, above U+10FFFF) become U+FFFD.
// A reference with the wrong digit count (for example &#87654321;) is not
// one at all and is left untouched.
const NUMERIC_ENTITY_RE = /&(#\d{1,7}|#[Xx][0-9A-Fa-f]{1,6});/g;
function decodeNumericEntities(s) {
  if (s.indexOf('&#') === -1) return s;
  return s.replace(NUMERIC_ENTITY_RE, (m, body) => {
    let cp;
    if (body.charCodeAt(1) === 120 || body.charCodeAt(1) === 88) cp = parseInt(body.slice(2), 16);
    else cp = parseInt(body.slice(1), 10);
    if (cp === 0 || cp > 0x10FFFF || (cp >= 0xD800 && cp <= 0xDFFF)) cp = 0xFFFD;
    return String.fromCodePoint(cp);
  });
}

// Named entities. marked only decodes these when checking a link
// destination for a dangerous protocol; in rendered text they pass through
// untouched. The table below covers the HTML 4 set plus the entities the
// CommonMark and GFM spec examples use.
const ENTITIES = {
  nbsp: ' ', iexcl: '¡', cent: '¢', pound: '£', curren: '¤', yen: '¥', brvbar: '¦',
  sect: '§', uml: '¨', copy: '©', ordf: 'ª', laquo: '«', not: '¬', shy: '­',
  reg: '®', macr: '¯', deg: '°', plusmn: '±', sup2: '²', sup3: '³', acute: '´',
  micro: 'µ', para: '¶', middot: '·', cedil: '¸', sup1: '¹', ordm: 'º', raquo: '»',
  frac14: '¼', frac12: '½', frac34: '¾', iquest: '¿', Agrave: 'À', Aacute: 'Á',
  Acirc: 'Â', Atilde: 'Ã', Auml: 'Ä', Aring: 'Å', AElig: 'Æ', Ccedil: 'Ç',
  Egrave: 'È', Eacute: 'É', Ecirc: 'Ê', Euml: 'Ë', Igrave: 'Ì', Iacute: 'Í',
  Icirc: 'Î', Iuml: 'Ï', ETH: 'Ð', Ntilde: 'Ñ', Ograve: 'Ò', Oacute: 'Ó',
  Ocirc: 'Ô', Otilde: 'Õ', Ouml: 'Ö', times: '×', Oslash: 'Ø', Ugrave: 'Ù',
  Uacute: 'Ú', Ucirc: 'Û', Uuml: 'Ü', Yacute: 'Ý', THORN: 'Þ', szlig: 'ß',
  agrave: 'à', aacute: 'á', acirc: 'â', atilde: 'ã', auml: 'ä', aring: 'å',
  aelig: 'æ', ccedil: 'ç', egrave: 'è', eacute: 'é', ecirc: 'ê', euml: 'ë',
  igrave: 'ì', iacute: 'í', icirc: 'î', iuml: 'ï', eth: 'ð', ntilde: 'ñ',
  ograve: 'ò', oacute: 'ó', ocirc: 'ô', otilde: 'õ', ouml: 'ö', divide: '÷',
  oslash: 'ø', ugrave: 'ù', uacute: 'ú', ucirc: 'û', uuml: 'ü', yacute: 'ý',
  thorn: 'þ', yuml: 'ÿ', fnof: 'ƒ', Alpha: 'Α', Beta: 'Β', Gamma: 'Γ',
  Delta: 'Δ', Epsilon: 'Ε', Zeta: 'Ζ', Eta: 'Η', Theta: 'Θ', Iota: 'Ι',
  Kappa: 'Κ', Lambda: 'Λ', Mu: 'Μ', Nu: 'Ν', Xi: 'Ξ', Omicron: 'Ο', Pi: 'Π',
  Rho: 'Ρ', Sigma: 'Σ', Tau: 'Τ', Upsilon: 'Υ', Phi: 'Φ', Chi: 'Χ', Psi: 'Ψ',
  Omega: 'Ω', alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε',
  zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ',
  nu: 'ν', xi: 'ξ', omicron: 'ο', pi: 'π', rho: 'ρ', sigmaf: 'ς', sigma: 'σ',
  tau: 'τ', upsilon: 'υ', phi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  thetasym: 'ϑ', upsih: 'ϒ', piv: 'ϖ', bull: '•', hellip: '…', prime: '′',
  Prime: '″', oline: '‾', frasl: '⁄', weierp: '℘', image: 'ℑ', real: 'ℜ',
  trade: '™', alefsym: 'ℵ', larr: '←', uarr: '↑', rarr: '→', darr: '↓',
  harr: '↔', crarr: '↵', lArr: '⇐', uArr: '⇑', rArr: '⇒', dArr: '⇓',
  hArr: '⇔', forall: '∀', part: '∂', exist: '∃', empty: '∅', nabla: '∇',
  isin: '∈', notin: '∉', ni: '∋', prod: '∏', sum: '∑', minus: '−',
  lowast: '∗', radic: '√', prop: '∝', infin: '∞', ang: '∠', and: '∧',
  or: '∨', cap: '∩', cup: '∪', int: '∫', there4: '∴', sim: '∼', cong: '≅',
  asymp: '≈', ne: '≠', equiv: '≡', le: '≤', ge: '≥', sub: '⊂', sup: '⊃',
  nsub: '⊄', sube: '⊆', supe: '⊇', oplus: '⊕', otimes: '⊗', perp: '⊥',
  sdot: '⋅', lceil: '⌈', rceil: '⌉', lfloor: '⌊', rfloor: '⌋', lang: '〈',
  rang: '〉', loz: '◊', spades: '♠', clubs: '♣', hearts: '♥', diams: '♦',
  ensp: ' ', emsp: ' ', thinsp: ' ', zwnj: '‌', zwj: '‍', lrm: '‎', rlm: '‏',
  ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', sbquo: '‚', ldquo: '“',
  rdquo: '”', bdquo: '„', dagger: '†', Dagger: '‡', permil: '‰', lsaquo: '‹',
  rsaquo: '›', euro: '€', apos: "'", quot: '"', amp: '&', lt: '<', gt: '>',
  colon: ':', Tab: '	', NewLine: '\u000A', Dcaron: 'Ď', dcaron: 'ď',
  DifferentialD: 'ⅆ', HilbertSpace: 'ℋ', ClockwiseContourIntegral: '∲',
  ngE: '≧̸', Atilde: 'Ã', OElig: 'Œ', oelig: 'œ', Scaron: 'Š', scaron: 'š',
  Yuml: 'Ÿ', Zcaron: 'Ž', zcaron: 'ž', circ: 'ˆ', tilde: '˜', ensp2: ' ',
};

// ---------- character classes ----------
// ASCII punctuation, per the CommonMark spec.
const ASCII_PUNCT = new Set('!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~');
function isAsciiPunct(ch) {
  return ch !== undefined && ch.length === 1 && ASCII_PUNCT.has(ch);
}
const PUNCT_RE = /[\p{P}\p{S}]/u;
const SPACE_RE = /\s/;
function isSpace(ch) {
  return ch !== undefined && (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v' || SPACE_RE.test(ch));
}
function isPunct(ch) {
  if (ch === undefined) return false;
  const code = ch.charCodeAt(0);
  if (code < 128) return ASCII_PUNCT.has(ch);
  return PUNCT_RE.test(ch);
}
// Left- and right-flanking delimiter runs, CommonMark 0.31.2 appendix.
// A missing neighbour (start or end of the string) is neither whitespace
// nor punctuation.
function flanking(before, after) {
  // the start/end of the text count as whitespace for flanking
  const beforeSpace = before === undefined || isSpace(before);
  const afterSpace = after === undefined || isSpace(after);
  const beforePunct = before !== undefined && isPunct(before);
  const afterPunct = after !== undefined && isPunct(after);
  const left = !afterSpace && (!afterPunct || beforeSpace || beforePunct);
  const right = !beforeSpace && (!beforePunct || afterSpace || afterPunct);
  return [left, right];
}

// ---------- URLs ----------
const NON_WORD_COLON_RE = /[^\w:]/g;
// Decode every entity reference (named or numeric) in a string, for the
// dangerous-protocol check only. Unknown named entities vanish, as in
// marked's unescape.
const ANY_ENTITY_RE = /&(#(?:\d+)|(?:#[Xx][0-9A-Fa-f]+)|(?:\w+));?/g;
function unescapeEntities(s) {
  return s.replace(ANY_ENTITY_RE, (m, body) => {
    const lower = body.toLowerCase();
    if (lower === 'colon') return ':';
    if (body.charCodeAt(0) === 35) {
      let cp;
      if (body.charCodeAt(1) === 120 || body.charCodeAt(1) === 88) cp = parseInt(body.slice(2), 16);
      else cp = parseInt(body.slice(1), 10);
      if (cp === 0 || cp > 0x10FFFF || (cp >= 0xD800 && cp <= 0xDFFF)) cp = 0xFFFD;
      if (Number.isNaN(cp)) return '';
      return String.fromCodePoint(cp);
    }
    const named = ENTITIES[body];
    return named === undefined ? '' : named;
  });
}
// A link destination is unusable when it names a dangerous protocol.
// The check decodes entities and percent escapes, strips everything that
// is not a word character or a colon, and looks at the start.
function cleanUrl(href) {
  if (href) {
    let decoded;
    try {
      decoded = decodeURIComponent(unescapeEntities(href));
    } catch (e) {
      // an invalid % sequence is not a hidden dangerous protocol; check
      // the raw (entity-decoded) href instead of rejecting the URL
      decoded = unescapeEntities(href);
    }
    const prot = decoded.replace(NON_WORD_COLON_RE, '').toLowerCase();
    if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0 || prot.indexOf('data:') === 0) {
      return null;
    }
  }
  return href;
}
// Render a destination as an attribute value: clean it, percent-encode
// it, then escape it for the attribute. Percent-encoding keeps an
// existing valid %XX escape as-is (encodeURI would re-encode the %).
function isHexDigit(ch) {
  return (ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F');
}
function encodeHref(s) {
  let out = '';
  let buf = '';
  const n = s.length;
  let i = 0;
  const flush = () => { if (buf) { out += encodeURI(buf); buf = ''; } };
  while (i < n) {
    const ch = s[i];
    if (ch === '%') {
      // % is never re-encoded, whether or not it starts a valid escape
      flush();
      out += '%';
      i++;
    } else {
      buf += ch;
      i++;
    }
  }
  flush();
  return out;
}
function renderHref(href) {
  const cleaned = cleanUrl(href);
  if (cleaned === null) return null;
  let encoded;
  try {
    encoded = encodeHref(cleaned);
  } catch (e) {
    encoded = cleaned;
  }
  return escapeHtml(encoded, false);
}

// ---------- inline HTML ----------
// Match an HTML tag, comment, processing instruction, declaration or CDATA
// section starting at position i of s. Returns the index just past the
// match, or -1.
const TAG_NAME_RE = /^[A-Za-z][A-Za-z0-9-]*/;
const ATTR_NAME_RE = /^[A-Za-z_:][A-Za-z0-9_.:-]*/;
function matchHtmlTag(s, i) {
  if (s[i] !== '<') return -1;
  const n = s.length;
  let j = i + 1;
  // comment: <!--> and <!---> are complete empty comments; otherwise
  // the comment runs to the first -->
  if (s.startsWith('<!--', i)) {
    if (s.startsWith('<!-->', i)) return i + 5;
    if (s.startsWith('<!--->', i)) return i + 6;
    const end = s.indexOf('-->', i + 4);
    if (end === -1) return -1;
    return end + 3;
  }
  // processing instruction
  if (s.startsWith('<?', i)) {
    const end = s.indexOf('?>', i + 2);
    return end === -1 ? -1 : end + 2;
  }
  // declaration
  if (s.startsWith('<!', i)) {
    const c = s[i + 2];
    if (c >= 'A' && c <= 'Z') {
      const end = s.indexOf('>', i + 2);
      return end === -1 ? -1 : end + 1;
    }
    if (s.startsWith('<![CDATA[', i)) {
      const end = s.indexOf(']]>', i + 9);
      return end === -1 ? -1 : end + 3;
    }
    return -1;
  }
  // closing tag
  if (s[j] === '/') {
    j++;
    const m = TAG_NAME_RE.exec(s.slice(j, j + 32));
    if (!m) return -1;
    j += m[0].length;
    while (j < n && (s[j] === ' ' || s[j] === '\t' || s[j] === '\n' || s[j] === '\r' || s[j] === '\f')) j++;
    if (s[j] !== '>') return -1;
    return j + 1;
  }
  // open tag
  const m = TAG_NAME_RE.exec(s.slice(j, j + 32));
  if (!m) return -1;
  j += m[0].length;
  while (true) {
    while (j < n && (s[j] === ' ' || s[j] === '\t' || s[j] === '\n' || s[j] === '\r' || s[j] === '\f')) j++;
    if (j >= n) return -1;
    if (s[j] === '>') return j + 1;
    if (s[j] === '/' && s[j + 1] === '>') return j + 2;
    // an attribute must be preceded by whitespace; the char before the
    // attribute name is whitespace when one was skipped (here, or after
    // the previous attribute name before its = check)
    if (!isSpace(s[j - 1])) return -1;
    const am = ATTR_NAME_RE.exec(s.slice(j, j + 64));
    if (!am) return -1;
    j += am[0].length;
    while (j < n && (s[j] === ' ' || s[j] === '\t' || s[j] === '\n' || s[j] === '\r' || s[j] === '\f')) j++;
    if (s[j] === '=') {
      j++;
      while (j < n && (s[j] === ' ' || s[j] === '\t' || s[j] === '\n' || s[j] === '\r' || s[j] === '\f')) j++;
      if (j >= n) return -1;
      const q = s[j];
      if (q === '"' || q === "'") {
        j++;
        while (j < n && s[j] !== q) j++;
        if (j >= n) return -1;
        j++;
      } else {
        // unquoted value: no space, ", ', =, <, >, `
        let k = j;
        while (k < n) {
          const ch = s[k];
          if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '"' || ch === "'" || ch === '=' || ch === '<' || ch === '>' || ch === '`') break;
          k++;
        }
        if (k === j) return -1;
        j = k;
      }
    }
  }
}

// ---------- inline parsing ----------
// Nodes: text {t,s} code {t,s} html {t,s} br soft
// link {t,href,title,c} image {t,src,title,alt} em/strong/del {t,c}
// Delimiters are recorded while scanning and resolved afterwards.
const EMAIL_LOCAL = /[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]/;
const DOMAIN_LABEL = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?/;
function isEmailLocalChar(ch) {
  return ch !== undefined && EMAIL_LOCAL.test(ch);
}
// Match a domain starting at s[i]: labels joined by dots, at least one
// dot required when dotRequired. Returns the end index or -1.
function matchDomain(s, i, dotRequired) {
  const n = s.length;
  let j = i;
  let dots = 0;
  while (true) {
    const m = DOMAIN_LABEL.exec(s.slice(j, j + 64));
    if (!m) return -1;
    j += m[0].length;
    if (s[j] === '.' && j + 1 < n && s[j + 1] !== '.' && /[A-Za-z0-9]/.test(s[j + 1])) {
      dots++;
      j++;
      continue;
    }
    break;
  }
  if (dotRequired && dots === 0) return -1;
  return j;
}
// Match a bare email address starting at s[i]. Returns end index or -1.
// The character after the address must not be able to continue it.
function matchBareEmail(s, i) {
  const n = s.length;
  let j = i;
  while (j < n && isEmailLocalChar(s[j])) j++;
  if (j === i || s[j] !== '@') return -1;
  j++;
  const dEnd = matchDomain(s, j, true);
  if (dEnd === -1) return -1;
  const after = s[dEnd];
  // the domain must end at a boundary: a following - or _ (or another
  // domain char) means this is not an email, but a trailing . is
  // punctuation and a / starts a path (for scheme:email/path); a run
  // of __ after the domain is a closing emphasis delimiter, not a
  // domain character
  if (after !== undefined && after !== '.' && after !== '/' && (/[A-Za-z0-9]/.test(after) || after === '-' || (after === '_' && s[dEnd + 1] !== '_'))) return -1;
  return dEnd;
}
// Match a www. autolink starting at s[i]. Returns {end, url} or null.
function matchWww(s, i) {
  if (!s.startsWith('www.', i)) return null;
  const dEnd = matchDomain(s, i + 4, true);
  if (dEnd === -1) return null;
  let end = dEnd;
  // optional path/tail: / or \ followed by non-space, non-< characters
  // (a trailing backslash is part of the URL, not a hard break)
  if (s[end] === '/' || s[end] === '\\') {
    let k = end;
    while (k < s.length && s[k] !== ' ' && s[k] !== '\t' && s[k] !== '\n' && s[k] !== '\r' && s[k] !== '<') k++;
    end = k;
  }
  end = trimAutolink(s, i, end);
  if (end <= i + 4) return null;
  return { end, url: s.slice(i, end) };
}
// Match a scheme autolink starting at s[i] (scheme://... or scheme:email).
// Returns {end, url} or null.
function matchScheme(s, i) {
  const m = /^[A-Za-z][A-Za-z0-9+.-]{1,31}:/.exec(s.slice(i, i + 34));
  if (!m) return null;
  let j = i + m[0].length;
  const n = s.length;
  if (s.startsWith('//', j)) {
    // full URL: any non-space, non-< characters; a ( after ] that
    // starts another URL ends this autolink (a link destination)
    let k = j;
    while (k < n && s[k] !== ' ' && s[k] !== '\t' && s[k] !== '\n' && s[k] !== '\r' && s[k] !== '<') {
      if (s[k] === '(' && s[k - 1] === ']' && /^[A-Za-z][A-Za-z0-9+.-]{1,31}:/.test(s.slice(k + 1, k + 35))) break;
      k++;
    }
    const end = trimAutolink(s, i, k);
    if (end <= j) return null;
    return { end, url: s.slice(i, end) };
  }
  // scheme:email, optionally followed by one path segment
  const eEnd = matchBareEmail(s, j);
  if (eEnd === -1) return null;
  let end = eEnd;
  if (s[end] === '/' && end + 1 < n) {
    let k = end + 1;
    while (k < n && s[k] !== ' ' && s[k] !== '\t' && s[k] !== '\n' && s[k] !== '\r' && s[k] !== '<' && s[k] !== '/') k++;
    if (k > end + 1) end = k;
  }
  end = trimAutolink(s, i, end);
  return { end, url: s.slice(i, end) };
}
// Trim trailing punctuation, unbalanced closing parens and a trailing
// entity reference off an autolink candidate s[i..end).
function trimAutolink(s, i, end) {
  const TRAILING = new Set(['?', '!', '.', ',', ':', ';', '*', '_', '~']);
  // a trailing entity reference (&word; &#12; &#x1f;) is excluded whole;
  // it must be checked before the ; is trimmed away as punctuation
  let changed = true;
  while (changed && end > i) {
    changed = false;
    const tail = s.slice(i, end);
    const em = /&(?:#\d+|#[Xx][0-9A-Fa-f]+|\w+);$/.exec(tail);
    if (em) { end -= em[0].length; changed = true; continue; }
    const ch = s[end - 1];
    if (TRAILING.has(ch)) { end--; changed = true; continue; }
    if (ch === ')') {
      // a trailing ) is kept when an unmatched ( precedes it in the
      // URL (paren depth, clamped at 0, is > 0 just before it)
      let depth = 0;
      for (let k = i; k < end - 1; k++) {
        if (s[k] === '(') depth++;
        else if (s[k] === ')') { if (depth > 0) depth--; }
      }
      if (depth === 0) { end--; changed = true; continue; }
    }
  }
  return end;
}
// Find the closing bracket for the [ at s[start]. Counts nested brackets,
// skips code spans and backslash escapes. Returns the index of the ] or -1.
function findClosingBracket(s, start) {
  const n = s.length;
  let depth = 0;
  let i = start;
  // once a multi-backtick run fails to close on its line, later backtick
  // runs in this link text are literal (they do not hide the ])
  let failedMulti = false;
  while (i < n) {
    const ch = s[i];
    if (ch === '\\' && i + 1 < n && isAsciiPunct(s[i + 1])) { i += 2; continue; }
    if (ch === '`') {
      let run = 0;
      while (i + run < n && s[i + run] === '`') run++;
      if (failedMulti) { i += run; continue; }
      // find a matching run on this same line; a closer on a later line
      // does not keep a ] on this line inside the code span
      let k = i + run;
      let found = -1;
      while (k < n && s[k] !== '\n') {
        if (s[k] === '`') {
          let r2 = 0;
          while (k + r2 < n && s[k + r2] === '`') r2++;
          if (r2 === run) { found = k; break; }
          k += r2;
        } else k++;
      }
      // an unmatched run is literal text; skip it and keep looking
      if (found === -1) {
        if (run >= 2) failedMulti = true;
        i += run; continue;
      }
      i = found + run;
      continue;
    }
    // a ] inside an inline HTML tag or an angle autolink does not close
    // the link text
    if (ch === '<') {
      const tagEnd = matchHtmlTag(s, i);
      if (tagEnd !== -1) { i = tagEnd; continue; }
      const am = /^<([A-Za-z][A-Za-z0-9+.-]{1,31}:[^<>\x00-\x20]*)>/.exec(s.slice(i)) ||
        /^<([A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*)>/.exec(s.slice(i));
      if (am) { i += am[0].length; continue; }
    }
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}
// Normalize a link label: collapse whitespace runs to one space, trim,
// lowercase.
function normalizeLabel(label) {
  // Unicode case folding: lowercasing, plus ß -> ss and final sigma
  return label.replace(/\s+/g, ' ').trim().toLowerCase().replace(/ß/g, 'ss').replace(/ς/g, 'σ');
}
// A link label cannot contain an unescaped [.
function labelHasBracket(label) {
  for (let i = 0; i < label.length; i++) {
    if (label[i] === '\\' && i + 1 < label.length && isAsciiPunct(label[i + 1])) { i++; continue; }
    if (label[i] === '[') return true;
  }
  return false;
}
// Unescape backslash escapes: a backslash before ASCII punctuation drops.
function unescapeBackslashes(s) {
  if (s.indexOf('\\') === -1) return s;
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && i + 1 < s.length && isAsciiPunct(s[i + 1])) { out += s[i + 1]; i++; }
    else out += s[i];
  }
  return out;
}

// Parse an inline link destination and optional title starting just after
// the opening paren. Returns {dest, title, end} or null.
function parseInlineLinkTarget(s, i) {
  const n = s.length;
  let j = i;
  while (j < n && (s[j] === ' ' || s[j] === '\t' || s[j] === '\n' || s[j] === '\r')) j++;
  if (j >= n) return null;
  let dest = '';
  if (s[j] === '<') {
    j++;
    const start = j;
    while (j < n && s[j] !== '>' && s[j] !== '\n' && s[j] !== '\r') {
      if (s[j] === '<') return null;
      if (s[j] === '\\' && j + 1 < n && isAsciiPunct(s[j + 1])) j += 2;
      else j++;
    }
    if (j >= n || s[j] !== '>') return null;
    dest = s.slice(start, j);
    j++;
  } else {
    let depth = 0;
    const start = j;
    while (j < n) {
      const ch = s[j];
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127) break;
      if (ch === '\\' && j + 1 < n && isAsciiPunct(s[j + 1])) { j += 2; continue; }
      if (ch === '(') { depth++; j++; continue; }
      if (ch === ')') {
        if (depth === 0) break;
        depth--; j++; continue;
      }
      j++;
    }
    // an empty destination is valid: [link]()
    dest = s.slice(start, j);
  }
  while (j < n && (s[j] === ' ' || s[j] === '\t' || s[j] === '\n' || s[j] === '\r')) j++;
  let title = null;
  if (s[j] === '"' || s[j] === "'" || s[j] === '(') {
    const open = s[j];
    const close = open === '(' ? ')' : open;
    j++;
    const start = j;
    while (j < n) {
      if (s[j] === '\\' && j + 1 < n && isAsciiPunct(s[j + 1])) { j += 2; continue; }
      if (s[j] === close) break;
      j++;
    }
    if (j >= n) return null;
    title = s.slice(start, j);
    j++;
    while (j < n && (s[j] === ' ' || s[j] === '\t' || s[j] === '\n' || s[j] === '\r')) j++;
  }
  if (s[j] !== ')') return null;
  return { dest: unescapeBackslashes(dest), title: title === null ? null : unescapeBackslashes(title), end: j + 1 };
}

// Try to form a link or image starting at s[i] ('[' or '![').
// Returns {node, end} or null.
function tryLink(src, i, isImage, refs) {
  const textStart = i + (isImage ? 2 : 1);
  const closeIdx = findClosingBracket(src, i + (isImage ? 1 : 0));
  if (closeIdx === -1) return null;
  const rawText = src.slice(textStart, closeIdx);
  const after = closeIdx + 1;
  let href = null, title = null, end = -1;
  if (src[after] === '(') {
    const parsed = parseInlineLinkTarget(src, after + 1);
    if (parsed) {
      href = parsed.dest; title = parsed.title; end = parsed.end;
    } else {
      // not a valid inline link: fall back to a shortcut reference link
      if (rawText.length > 999) return null;
      if (labelHasBracket(rawText)) return null;
      const ref = refs.get(normalizeLabel(rawText));
      if (!ref) return null;
      href = ref.dest; title = ref.title; end = closeIdx + 1;
    }
  } else if (src[after] === '[') {
    const labelClose = findClosingBracket(src, after);
    if (labelClose === -1) return null;
    const label = src.slice(after + 1, labelClose);
    let ref;
    if (label === '') {
      if (rawText.length > 999) return null;
      if (labelHasBracket(rawText)) return null;
      ref = refs.get(normalizeLabel(rawText));
    } else {
      if (label.length > 999) return null;
      if (labelHasBracket(label)) return null;
      ref = refs.get(normalizeLabel(label));
    }
    if (!ref) return null;
    href = ref.dest; title = ref.title; end = labelClose + 1;
  } else {
    if (rawText.length > 999) return null;
    if (labelHasBracket(rawText)) return null;
    const ref = refs.get(normalizeLabel(rawText));
    if (!ref) return null;
    href = ref.dest; title = ref.title; end = closeIdx + 1;
  }
  if (isImage) {
    const altChildren = scanInline(rawText, refs, true);
    const alt = renderAlt(altChildren);
    return { node: { t: 'image', src: href, title, alt }, end };
  }
  // link text is parsed without autolinks: a bare URL inside link text
  // stays plain text, so the outer link can form
  const children = scanInline(rawText, refs, true);
  // a link cannot contain another link
  if (containsLink(children)) return null;
  return { node: { t: 'link', href, title, c: children }, end };
}

// Does any node in the tree contain a link?
// a link cannot contain another *explicit* link; autolinks inside link
// text are allowed and render nested
function containsLink(nodes) {
  for (const nd of nodes) {
    if (nd.t === 'link' && !nd.auto) return true;
    if (nd.c && containsLink(nd.c)) return true;
  }
  return false;
}

// First inline pass: tokenize into nodes. Text nodes keep their raw
// source slice and source position; delimiters are split out afterwards.
// noAuto suppresses bare-URL/email autolinks (used for link text).
function scanInline(src, refs, noAuto) {
  const nodes = [];
  const n = src.length;
  let i = 0;
  let textStart = 0;
  const flushText = (end) => {
    if (end > textStart) nodes.push({ t: 'text', s: src.slice(textStart, end), pos: textStart });
  };
  while (i < n) {
    const c = src[i];
    if (c === '\\') {
      if (i + 1 < n && src[i + 1] === '\n') {
        flushText(i);
        nodes.push({ t: 'br' });
        i += 2;
        // a hard break strips the next line's leading whitespace
        while (i < n && (src[i] === ' ' || src[i] === '\t')) i++;
        textStart = i; continue;
      }
      if (i + 1 < n && isAsciiPunct(src[i + 1])) {
        flushText(i);
        nodes.push({ t: 'text', s: src[i + 1], pos: i + 1, lit: true });
        i += 2; textStart = i; continue;
      }
      i++;
      continue;
    }
    if (c === '`') {
      let run = 0;
      while (i + run < n && src[i + run] === '`') run++;
      let k = i + run;
      let found = -1;
      while (k < n) {
        if (src[k] === '`') {
          let r2 = 0;
          while (k + r2 < n && src[k + r2] === '`') r2++;
          if (r2 === run) { found = k; break; }
          k += r2;
        } else k++;
      }
      if (found !== -1) {
        let content = src.slice(i + run, found);
        content = content.replace(/\r\n|\r|\n/g, ' ');
        if (content.length >= 2 && content[0] === ' ' && content[content.length - 1] === ' ' && content.trim() !== '') {
          content = content.slice(1, -1);
        }
        flushText(i);
        nodes.push({ t: 'code', s: content });
        i = found + run; textStart = i; continue;
      }
      // no matching closer: the whole run is literal text; do not retry
      // a shorter run from inside it
      i += run;
      continue;
    }
    if (c === '<') {
      // angle autolink: scheme or email
      const sm = /^<([A-Za-z][A-Za-z0-9+.-]{1,31}:[^<>\x00-\x20]*)>/.exec(src.slice(i));
      if (sm) {
        const text = sm[1];
        if (renderHref(text) !== null) {
          flushText(i);
          nodes.push({ t: 'link', href: text, title: null, auto: true, c: [{ t: 'text', s: text, pos: i + 1 }] });
          i += sm[0].length; textStart = i; continue;
        }
      }
      const em = /^<([A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*)>/.exec(src.slice(i));
      if (em) {
        const text = em[1];
        if (renderHref('mailto:' + text) !== null) {
          flushText(i);
          nodes.push({ t: 'link', href: 'mailto:' + text, title: null, auto: true, c: [{ t: 'text', s: text, pos: i + 1 }] });
          i += em[0].length; textStart = i; continue;
        }
      }
      const tagEnd = matchHtmlTag(src, i);
      if (tagEnd !== -1) {
        flushText(i);
        nodes.push({ t: 'html', s: src.slice(i, tagEnd) });
        i = tagEnd; textStart = i; continue;
      }
      i++;
      continue;
    }
    if (c === '[' || (c === '!' && src[i + 1] === '[')) {
      const isImage = c === '!';
      const hit = tryLink(src, i, isImage, refs);
      if (hit) {
        flushText(i);
        nodes.push(hit.node);
        i = hit.end; textStart = i; continue;
      }
      i++;
      continue;
    }
    if (c === '\n') {
      // hard break when the current text run ends with 2+ spaces/tabs
      let k = i - 1;
      let spaces = 0;
      while (k >= textStart && (src[k] === ' ' || src[k] === '\t')) { spaces++; k--; }
      if (spaces >= 2) {
        flushText(i - spaces);
        nodes.push({ t: 'br' });
      } else {
        flushText(i);
        nodes.push({ t: 'soft' });
      }
      i++;
      // a hard break strips the next line's leading whitespace
      if (spaces >= 2) {
        while (i < n && (src[i] === ' ' || src[i] === '\t')) i++;
      }
      textStart = i; continue;
    }
    if (!noAuto && c === 'w' && src.startsWith('www.', i)) {
      const prev = i > 0 ? src[i - 1] : undefined;
      if (prev === undefined || isSpace(prev) || (isPunct(prev) && prev !== '.' && prev !== '-' && prev !== '_' && prev !== '/' && prev !== ':')) {
        const hit = matchWww(src, i);
        if (hit) {
          flushText(i);
          if (renderHref('http://' + hit.url) !== null) {
            nodes.push({ t: 'link', href: 'http://' + hit.url, title: null, auto: true, c: [{ t: 'text', s: hit.url, pos: i }] });
            i = hit.end; textStart = i; continue;
          }
        }
      }
      i++;
      continue;
    }
    if (!noAuto && ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'))) {
      const prev = i > 0 ? src[i - 1] : undefined;
      if (prev === undefined || isSpace(prev) || (isPunct(prev) && prev !== '.' && prev !== '-' && prev !== '_' && prev !== '/' && prev !== ':')) {
        const hit = matchScheme(src, i);
        if (hit) {
          flushText(i);
          if (renderHref(hit.url) !== null) {
            nodes.push({ t: 'link', href: hit.url, title: null, auto: true, c: [{ t: 'text', s: hit.url, pos: i }] });
            i = hit.end; textStart = i; continue;
          }
        }
      }
      i++;
      continue;
    }
    if (!noAuto && c === '@') {
      // bare email: scan left for the local part
      let L = i - 1;
      while (L >= textStart && isEmailLocalChar(src[L])) L--;
      L++;
      // a leading ** or __ run is an emphasis delimiter, not part of
      // the address (so __because@x__ links the bare address)
      if ((src[L] === '*' || src[L] === '_') && src[L + 1] === src[L]) {
        const ch = src[L];
        while (L < i && src[L] === ch) L++;
      }
      if (L < textStart) { i++; continue; }
      let eEnd = matchBareEmail(src, L);
      if (eEnd === -1) {
        // a single _ after the domain is a closing emphasis delimiter
        // (not an invalidator) when an opening _ precedes the address
        // in this text segment
        let j = L;
        while (j < src.length && isEmailLocalChar(src[j])) j++;
        if (j > L && src[j] === '@') {
          j++;
          const dEnd = matchDomain(src, j, true);
          if (dEnd !== -1 && src[dEnd] === '_' && src[dEnd + 1] !== '_') {
            let hasOpener = false;
            for (let p = textStart; p < L; p++) {
              if (src[p] === '_' && (p === textStart || src[p - 1] === ' ' || src[p - 1] === '\t' || src[p - 1] === '\n') && p + 1 < src.length && src[p + 1] !== ' ' && src[p + 1] !== '\t' && src[p + 1] !== '\n') { hasOpener = true; break; }
            }
            if (hasOpener) eEnd = dEnd;
          }
        }
      }
      if (eEnd !== -1 && eEnd > i) {
        const email = src.slice(L, eEnd);
        flushText(L);
        nodes.push({ t: 'link', href: 'mailto:' + email, title: null, auto: true, c: [{ t: 'text', s: email, pos: L }] });
        i = eEnd; textStart = i; continue;
      }
      i++;
      continue;
    }
    i++;
  }
  flushText(n);
  return finishInline(nodes, src);
}

// Second inline pass: split text nodes at emphasis delimiter runs,
// build the delimiter stack, and resolve emphasis.
function finishInline(nodes, src) {
  const delims = [];
  const out = [];
  for (const node of nodes) {
    if (node.t !== 'text' || node.lit) { out.push(node); continue; }
    const s = node.s;
    const base = node.pos;
    let p = 0;
    let segStart = 0;
    while (p < s.length) {
      const ch = s[p];
      if (ch === '*' || ch === '_' || ch === '~') {
        let run = 1;
        while (p + run < s.length && s[p + run] === ch) run++;
        if (ch === '~' && run > 2) { p += run; continue; }
        if (p > segStart) out.push({ t: 'text', s: s.slice(segStart, p), pos: base + segStart });
        const runPos = base + p;
        const before = runPos > 0 ? src[runPos - 1] : undefined;
        const after = runPos + run < src.length ? src[runPos + run] : undefined;
        const [left, right] = flanking(before, after);
        let canOpen, canClose;
        if (ch === '_') {
          canOpen = left && (!right || isPunct(before));
          canClose = right && (!left || isPunct(after));
        } else {
          canOpen = left; canClose = right;
        }
        const dnode = { t: 'text', s: ch.repeat(run), pos: runPos };
        out.push(dnode);
        delims.push({ ch, num: run, node: dnode, canOpen, canClose, active: true });
        p += run; segStart = p;
      } else p++;
    }
    if (s.length > segStart) out.push({ t: 'text', s: s.slice(segStart), pos: base + segStart });
  }
  processEmphasis(out, delims);
  return out;
}

function processEmphasis(nodes, delims) {
  for (let ci = 0; ci < delims.length; ci++) {
    const closer = delims[ci];
    if (!closer.active || !closer.canClose) continue;
    let oi = ci - 1;
    while (oi >= 0) {
      const opener = delims[oi];
      if (!opener.active || !opener.canOpen || opener.ch !== closer.ch) { oi--; continue; }
      if (closer.ch === '~') {
        // strikethrough: a run pair whose counts sum to a multiple of 3
        // never forms (so ~~~not~~~ stays literal, while ~x~ and ~~x~~ do)
        if ((opener.canClose || closer.canOpen) && (opener.num + closer.num) % 3 === 0) { oi--; continue; }
      } else if ((opener.canClose || closer.canOpen) && (opener.num + closer.num) % 3 === 0 && (opener.num % 3 !== 0 || closer.num % 3 !== 0)) { oi--; continue; }
      // a single closer must not partially consume a double opener when
      // a later double closer can form a strong with it instead
      // (so **a *b* c* d** keeps its strong and the stray * is literal)
      if (closer.ch !== '~' && closer.num === 1 && opener.num === 2) {
        let laterStrong = false;
        for (let k = ci + 1; k < delims.length; k++) {
          const d = delims[k];
          if (d.active && d.canClose && d.ch === closer.ch && d.num >= 2) { laterStrong = true; break; }
        }
        if (laterStrong) { oi--; continue; }
      }
      const use = closer.ch === '~' ? Math.min(2, opener.num, closer.num) : (opener.num >= 2 && closer.num >= 2 ? 2 : 1);
      const oIdx = nodes.indexOf(opener.node);
      const cIdx = nodes.indexOf(closer.node);
      if (oIdx === -1 || cIdx === -1 || cIdx <= oIdx) { oi--; continue; }
      const children = nodes.slice(oIdx + 1, cIdx);
      const type = closer.ch === '~' ? 'del' : (use === 2 ? 'strong' : 'em');
      const emNode = { t: type, c: children };
      opener.num -= use;
      closer.num -= use;
      opener.node.s = opener.ch.repeat(opener.num);
      closer.node.s = closer.ch.repeat(closer.num);
      if (opener.num === 0) opener.active = false;
      if (closer.num === 0) closer.active = false;
      const replacement = [];
      if (opener.num > 0) replacement.push(opener.node);
      replacement.push(emNode);
      if (closer.num > 0) replacement.push(closer.node);
      nodes.splice(oIdx, cIdx - oIdx + 1, ...replacement);
      // a partly-used closer keeps looking; a partly-used opener is
      // re-examined, since one run can form several nested nodes
      if (closer.num === 0) break;
      if (opener.num === 0) oi--;
    }
  }
}

function renderInline(nodes, out) {
  for (const node of nodes) {
    switch (node.t) {
      case 'text':
        out.push(escapeHtml(decodeNumericEntities(node.s), false));
        break;
      case 'code':
        out.push('<code>' + escapeHtml(node.s, true) + '</code>');
        break;
      case 'html':
        out.push(node.s);
        break;
      case 'br':
        out.push('<br>');
        break;
      case 'soft':
        out.push('\n');
        break;
      case 'em':
        out.push('<em>'); renderInline(node.c, out); out.push('</em>');
        break;
      case 'strong':
        out.push('<strong>'); renderInline(node.c, out); out.push('</strong>');
        break;
      case 'del':
        out.push('<del>'); renderInline(node.c, out); out.push('</del>');
        break;
      case 'link': {
        const href = renderHref(node.href);
        if (href === null) { renderInline(node.c, out); break; }
        out.push('<a href="' + href + '"');
        if (node.title !== null && node.title !== undefined) out.push(' title="' + escapeHtml(node.title, false) + '"');
        out.push('>');
        renderInline(node.c, out);
        out.push('</a>');
        break;
      }
      case 'image': {
        const src = renderHref(node.src);
        if (src === null) { out.push(node.alt); break; }
        out.push('<img src="' + src + '" alt="' + node.alt + '"');
        if (node.title !== null && node.title !== undefined) out.push(' title="' + escapeHtml(node.title, false) + '"');
        out.push('>');
        break;
      }
    }
  }
}

function renderAlt(children) {
  const out = [];
  renderInline(altChildren(children), out);
  return out.join('').replace(/<[^>]*>/g, '');
}
// In alt text, an image contributes its own alt text, not an <img> tag.
function altChildren(children) {
  return children.map(nd => {
    if (nd.t === 'image') return { t: 'text', s: nd.alt, pos: 0 };
    if (nd.c) return { ...nd, c: altChildren(nd.c) };
    return nd;
  });
}

// ---------- block parsing ----------
// A line being processed: s is the text (tabs may be replaced by spaces
// when partially consumed), off is the current offset, col the column.
function lineIndent(line) {
  let i = line.off, col = line.col;
  while (i < line.s.length) {
    const ch = line.s[i];
    if (ch === ' ') { i++; col++; }
    else if (ch === '\t') { i++; col += 4 - (col % 4); }
    else break;
  }
  return { indent: col - line.col, off: i, col };
}
function lineAdvance(line, n) {
  while (n > 0 && line.off < line.s.length) {
    const ch = line.s[line.off];
    if (ch === ' ') { line.off++; line.col++; n--; }
    else if (ch === '\t') {
      const adv = 4 - (line.col % 4);
      if (adv <= n) { line.off++; line.col += adv; n -= adv; }
      else {
        line.s = line.s.slice(0, line.off) + ' '.repeat(adv) + line.s.slice(line.off + 1);
        line.off += n; line.col += n; n = 0;
      }
    } else break;
  }
}
function linePeek(line) { return line.off < line.s.length ? line.s[line.off] : ''; }
function lineRest(line) { return line.s.slice(line.off); }
function lineBlank(line) {
  for (let i = line.off; i < line.s.length; i++) {
    const ch = line.s[i];
    if (ch !== ' ' && ch !== '\t') return false;
  }
  return true;
}
function countSpaces(line, from) {
  let n = 0;
  for (let i = from; i < line.s.length; i++) {
    if (line.s[i] === ' ' || line.s[i] === '\t') n++;
    else break;
  }
  return n;
}

// Block quote markers and list item content indents.
function matchQuote(line, countCol = true) {
  const ind = lineIndent(line);
  if (ind.indent > 3) return false;
  if (line.s[ind.off] !== '>') return false;
  line.off = ind.off + 1;
  if (countCol) {
    // the outermost quote marker resets the tab-stop column to its own
    // width (any list indent before it does not count)
    line.col = 1;
    // one optional space or tab after >
    if (line.s[line.off] === ' ') { line.off++; line.col++; }
    else if (line.s[line.off] === '\t') { lineAdvance(line, 1); }
  } else {
    // nested quote marker: consumed but does not advance the tab-stop
    // column (only the outermost quote marker counts)
    line.col = ind.col;
    if (line.s[line.off] === ' ' || line.s[line.off] === '\t') { line.off++; }
  }
  return true;
}
function matchItem(line, item) {
  if (lineBlank(line)) return true;
  const ind = lineIndent(line);
  if (ind.indent >= item.contentIndent) {
    lineAdvance(line, item.contentIndent);
    return true;
  }
  return false;
}

const BLOCK_TAGS = new Set(['address', 'article', 'aside', 'base', 'basefont', 'blockquote', 'body', 'caption', 'center', 'col', 'colgroup', 'dd', 'details', 'dialog', 'dir', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'frame', 'frameset', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hr', 'html', 'iframe', 'legend', 'li', 'link', 'main', 'menu', 'menuitem', 'nav', 'noframes', 'ol', 'optgroup', 'option', 'p', 'param', 'search', 'section', 'summary', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'title', 'tr', 'track', 'ul']);

// Detect an HTML block start at the current position. Returns the block
// type (1-7) or 0. Only the start condition is checked here.
function htmlBlockType(line) {
  const ind = lineIndent(line);
  if (ind.indent > 3) return 0;
  const rest = line.s.slice(ind.off);
  if (!rest.startsWith('<')) return 0;
  const lower = rest.toLowerCase();
  if (/^<(script|pre|style|textarea)(\s|>|\/>|$)/.test(lower)) return 1;
  if (lower.startsWith('<!--')) return 2;
  if (lower.startsWith('<?')) return 3;
  if (/^<![A-Z]/.test(rest)) return 4;
  if (lower.startsWith('<![cdata[')) return 5;
  const m = /^<\/?([A-Za-z][A-Za-z0-9-]*)/.exec(rest);
  if (m) {
    const tag = m[1].toLowerCase();
    const after = rest[m[0].length];
    if (BLOCK_TAGS.has(tag) && (after === undefined || after === ' ' || after === '\t' || after === '\n' || after === '\r' || after === '>' || (after === '/' && rest[m[0].length + 1] === '>'))) return 6;
    // type 7: a complete open or closing tag, followed only by whitespace
    if (tag !== 'pre' && tag !== 'script' && tag !== 'style' && tag !== 'textarea') {
      const tagEnd = matchHtmlTag(rest, 0);
      if (tagEnd !== -1 && rest.slice(tagEnd).trim() === '') return 7;
    }
  }
  return 0;
}
// Whether an HTML block of the given type ends on this line.
function htmlBlockEnds(type, text) {
  if (type === 1) return /<\/(script|pre|style|textarea)>/i.test(text);
  if (type === 2) return text.indexOf('-->') !== -1;
  if (type === 3) return text.indexOf('?>') !== -1;
  if (type === 4) return text.indexOf('>') !== -1;
  if (type === 5) return text.indexOf(']]>') !== -1;
  return false;
}

// Thematic break: 3+ of -, _, * with only spaces between.
function isThematicBreak(text) {
  const t = text.replace(/[ \t]/g, '');
  if (t.length < 3) return false;
  const ch = t[0];
  if (ch !== '-' && ch !== '_' && ch !== '*') return false;
  for (let i = 1; i < t.length; i++) if (t[i] !== ch) return false;
  return true;
}
// Setext underline: =+ or -+ with only spaces around.
function setextLevel(text) {
  const t = text.replace(/^[ \t]+/, '').replace(/[ \t]+$/, '');
  if (t.length === 0) return 0;
  const ch = t[0];
  if (ch !== '=' && ch !== '-') return 0;
  for (let i = 1; i < t.length; i++) if (t[i] !== ch) return 0;
  return ch === '=' ? 1 : 2;
}
// ATX heading: returns {level, content} or null.
function matchAtx(text) {
  let i = 0;
  while (i < text.length && text[i] === '#') i++;
  if (i === 0 || i > 6) return null;
  if (i < text.length && text[i] !== ' ' && text[i] !== '\t') return null;
  let content = text.slice(i);
  // closing sequence of #s (preceded by spaces/tabs, at the end)
  const cm = /[ \t]+#+[ \t]*$/.exec(content);
  if (cm) content = content.slice(0, cm.index);
  content = content.replace(/^[ \t]+/, '').replace(/[ \t]+$/, '');
  return { level: i, content };
}
// Fenced code start: returns {char, len, info} or null.
function matchFence(text) {
  let i = 0;
  const ch = text[0];
  if (ch !== '`' && ch !== '~') return null;
  while (i < text.length && text[i] === ch) i++;
  if (i < 3) return null;
  const info = text.slice(i).trim();
  if (ch === '`' && info.indexOf('`') !== -1) return null;
  return { char: ch, len: i, info };
}
// List marker: returns {marker, type, start, width} or null.
// type is 'bullet' or 'ordered'; marker is the bullet char or '.' / ')'.
function matchListMarker(text) {
  const m = /^([*+-]|(\d{1,9})([.)]))[ \t]/.exec(text) || /^([*+-]|(\d{1,9})([.)]))$/.exec(text);
  if (!m) return null;
  if (m[1] === '*' || m[1] === '+' || m[1] === '-') {
    return { type: 'bullet', marker: m[1], start: 0, width: 1 };
  }
  return { type: 'ordered', marker: m[3], start: parseInt(m[2], 10), width: m[2].length + 1 };
}

// Whether the line, at its current position, starts a block that can
// interrupt a paragraph (used for lazy continuation).
function startsNewBlock(line) {
  const ind = lineIndent(line);
  if (ind.indent > 3) return false;
  const text = line.s.slice(ind.off);
  if (text === '') return false;
  if (matchAtx(text)) return true;
  if (matchFence(text)) return true;
  const ht = htmlBlockType(line);
  if (ht >= 1 && ht <= 6) return true;
  if (isThematicBreak(text)) return true;
  if (text[0] === '>') return true;
  const marker = matchListMarker(text);
  if (marker) {
    // a list interrupts a paragraph when it is a bullet list, or an
    // ordered list starting at 1, and its first item is not empty
    const after = text.slice(marker.width);
    if (after.trim() === '') return false;
    if (marker.type === 'bullet') return true;
    if (marker.start === 1) return true;
  }
  return false;
}

function parseBlocks(src, refs) {
  src = src.replace(/\r\n?/g, '\n');
  const rawLines = src.split('\n');
  // the empty string after a final newline is not a real line
  if (rawLines.length > 0 && rawLines[rawLines.length - 1] === '' && src.endsWith('\n')) rawLines.pop();
  const doc = { t: 'doc', children: [] };
  const stack = [doc];
  let blankLine = false;
  let blankLineEmpty = false;
  const tip = () => stack[stack.length - 1];

  function finalize(block) {
    if (block.t === 'para') {
      // extract leading link reference definitions
      const rest = extractLinkRefs(block.lines, refs);
      block.lines = rest;
      if (block.lines.length === 0) {
        block.dead = true;
      }
      return;
    }
    if (block.t === 'fence') {
      if (!block.closed) {
        while (block.lines.length > 0 && block.lines[block.lines.length - 1].trim() === '') block.lines.pop();
      }
      return;
    }
    if (block.t === 'code') {
      while (block.lines.length > 0 && block.lines[block.lines.length - 1].trim() === '') block.lines.pop();
      return;
    }
    if (block.t === 'list') {
      // loose when a blank line separates two items, or two blocks of
      // one item
      let loose = false;
      for (let i = 0; i < block.children.length; i++) {
        const item = block.children[i];
        if (item.blankBefore && i > 0) loose = true;
        for (let j = 1; j < item.children.length; j++) {
          if (item.children[j].blankBefore) loose = true;
        }
      }
      block.loose = loose;
      return;
    }
    if (block.t === 'para' || block.t === 'heading') return;
  }
  function closeBlocks(fromIdx) {
    // a blank line inside a block quote that then ends is absorbed by
    // the quote: it does not separate the outer blocks
    let closedQuote = false;
    for (let i = stack.length - 1; i >= fromIdx; i--) {
      if (stack[i].t === 'quote') closedQuote = true;
      finalize(stack[i]);
      stack[i].open = false;
    }
    if (closedQuote) blankLine = false;
    stack.length = fromIdx;
  }
  function addBlock(block) {
    // a new block never nests inside a leaf; close any open leaf first
    while (tip().t === 'para' || tip().t === 'heading' || tip().t === 'hr' || tip().t === 'code' || tip().t === 'fence' || tip().t === 'html') {
      closeBlocks(stack.length - 1);
    }
    const parent = tip();
    if (blankLine && parent.children.length > 0) {
      block.blankBefore = true;
      block.blankBeforeEmpty = blankLineEmpty;
    }
    blankLine = false;
    blankLineEmpty = false;
    parent.children.push(block);
    stack.push(block);
    return block;
  }

  // Expand leading tabs in the line content to spaces (tab stops of 4),
  // so code block content never starts with a raw tab after its indent
  // was stripped.
  function expandLeadingTabs(line) {
    let off = line.off, col = line.col;
    let out = '';
    while (off < line.s.length) {
      const ch = line.s[off];
      if (ch === '\t') {
        const spaces = 4 - (col % 4);
        out += ' '.repeat(spaces);
        col += spaces;
        off++;
      } else if (ch === ' ') {
        out += ' ';
        col++;
        off++;
      } else break;
    }
    if (off > line.off) {
      line.s = line.s.slice(0, line.off) + out + line.s.slice(off);
    }
  }

  for (const raw of rawLines) {
    const line = { s: raw, off: 0, col: 0 };
    const blank0 = lineBlank(line);
    // ---- container matching ----
    let lazy = false;
    let quotesMatched = 0;
    while (true) {
      let failIdx = -1;
      for (let i = 1; i < stack.length; i++) {
        const b = stack[i];
        if (b.t === 'quote') {
          // a truly blank line ends a block quote; only a line with the
          // > marker (even an empty one) continues it
          if (matchQuote(line, quotesMatched === 0)) { quotesMatched++; continue; }
          failIdx = i; break;
        }
        if (b.t === 'list') continue;
        if (b.t === 'item') {
          // a fence content line with less indent than the item still
          // belongs to the open fence (it is not advanced); any other
          // short line ends the item. But an empty fence (no content
          // lines yet) does not capture a low-indent line: it closes.
          if (matchItem(line, b)) continue;
          if (tip().t === 'fence' && tip().lines.length > 0) continue;
          failIdx = i; break;
        }
        break;
      }
      if (failIdx === -1) break;
      // a list marker inside an enclosing list is never lazy text: it is
      // either a new item of that list or a new list (different delimiter)
      // once the enclosing list closes; and a line that is blank after
      // its matched containers (e.g. a lone > ending an inner quote) is
      // not a lazy continuation either
      if (!blank0 && !lineBlank(line) && tip().t === 'para' && !startsNewBlock(line) && !lineStartsNewItem(line) && !(hasEnclosingList() && lineStartsListMarker(line))) {
        lazy = true;
        break;
      }
      closeBlocks(failIdx);
      // a list left on top that cannot continue must close too
      let again = false;
      while (tip().t === 'list') {
        const list = tip();
        const ind = lineIndent(line);
        const text = line.s.slice(ind.off);
        const marker = ind.indent <= 3 ? matchListMarker(text) : null;
        // a thematic break beats a new list item
        if (marker && marker.type === list.listType && marker.marker === list.marker && !isThematicBreak(text)) break;
        closeBlocks(stack.length - 1);
        again = true;
      }
      if (again) {
        // re-walk from the top with the line reset to its start, so the
        // containers above the closed list are matched again
        line.off = 0; line.col = 0;
        continue;
      }
      break;
    }
    if (lazy) {
      // a lazy line loses its leading whitespace, unless a container
      // already matched on this line (then the rest is paragraph text,
      // with a leading tab expanded to spaces)
      let content;
      if (line.off === 0) {
        content = lineRest(line).replace(/^[ \t]+/, '');
      } else {
        expandLeadingTabs(line);
        content = lineRest(line);
      }
      // a lazy line that looks like a setext underline stays text, but is
      // indented so it cannot be read as an underline
      const trimmed = content.trim();
      if (trimmed !== '' && /^[=-]+$/.test(trimmed)) content = '    ' + trimmed;
      tip().lines.push(content);
      continue;
    }
    // ---- blank line (after container markers are consumed) ----
    // blank if the raw line was blank, or if nothing is left after the
    // container markers (a lone > ends a paragraph, but > followed by
    // spaces leaves those spaces as content)
    const blank = blank0 || line.off >= line.s.length;
    if (blank) {
      const tb = tip();
      if (tb.t === 'fence' || tb.t === 'code') {
        // a blank line inside a code block keeps its indent beyond the
        // block indent
        const ind = lineIndent(line);
        const strip = tb.t === 'code' ? Math.min(ind.indent, 4) : Math.min(ind.indent, tb.fenceIndent);
        lineAdvance(line, strip);
        tb.lines.push(lineRest(line));
      } else if (tb.t === 'html' && tb.htmlType <= 5) {
        tb.lines.push('');
      } else {
        if (tb.t === 'para') {
          // a line holding only a tab inside a table is an empty row, not
          // a paragraph end; a spaces-only or empty line ends it
          if (line.s.includes('\t') && tryTable(tb)) {
            tb.lines.push('');
          } else {
            closeBlocks(stack.length - 1);
          }
        }
        else if (tb.t === 'html') {
          tb.endsAtBlank = true;
          closeBlocks(stack.length - 1);
        } else if (tb.t === 'item' && tb.children.length === 0) {
          // an empty list item followed by a blank line stays empty;
          // later lines are not part of it
          closeBlocks(stack.length - 1);
        }
        // record whether the first blank line in this run was truly
        // empty (vs whitespace-only); it decides an HTML block's
        // trailing newline
        if (!blankLine) blankLineEmpty = (raw === '');
        blankLine = true;
      }
      continue;
    }
    // ---- setext heading ----
    if (tip().t === 'para') {
      const ind = lineIndent(line);
      if (ind.indent <= 3) {
        const lvl = setextLevel(line.s.slice(ind.off));
        if (lvl > 0) {
          const para = tip();
          // link reference definitions come out before the heading forms
          const rest = extractLinkRefs(para.lines, refs);
          const parent = stack[stack.length - 2];
          if (rest.length > 0) {
            const heading = { t: 'heading', level: lvl, lines: rest };
            parent.children[parent.children.length - 1] = heading;
            stack[stack.length - 1] = heading;
            closeBlocks(stack.length - 1);
            continue;
          }
          // the paragraph was only link reference definitions; drop it
          // and let this line start a new block
          parent.children.pop();
          stack.pop();
        }
      }
    }
    // ---- leaf continuation: fenced code ----
    if (tip().t === 'fence') {
      const ind = lineIndent(line);
      if (ind.indent <= 3 && matchClosingFence(line.s.slice(ind.off), tip())) {
        tip().closed = true;
        closeBlocks(stack.length - 1);
        continue;
      }
      // a tab at the start of the content is expanded only when a
      // container prefix was consumed (col > 0 before stripping the
      // fence indent); otherwise it stays a literal tab
      const colBeforeStrip = line.col;
      const strip = Math.min(ind.indent, tip().fenceIndent);
      lineAdvance(line, strip);
      if (colBeforeStrip > 0) expandLeadingTabs(line);
      tip().lines.push(lineRest(line));
      continue;
    }
    // ---- leaf continuation: indented code ----
    if (tip().t === 'code') {
      const ind = lineIndent(line);
      if (ind.indent >= 4) {
        lineAdvance(line, 4);
        // the tab after the 4-space indent is literal code content
        tip().lines.push(lineRest(line));
        continue;
      }
      closeBlocks(stack.length - 1);
    }
    // ---- leaf continuation: HTML block ----
    if (tip().t === 'html') {
      tip().lines.push(lineRest(line));
      if (htmlBlockEnds(tip().htmlType, lineRest(line))) closeBlocks(stack.length - 1);
      continue;
    }
    // ---- start new blocks ----
    startBlocks(line);
    // ---- add the line to the current leaf ----
    const leaf = tip();
    if (leaf.t === 'para') {
      // a leading tab after a container prefix expands to spaces
      if (line.col > 0) expandLeadingTabs(line);
      leaf.lines.push(lineRest(line));
    } else if (leaf.t === 'fence') {
      // the opening fence line itself is not content
    } else if (leaf.t === 'code') {
      const ind = lineIndent(line);
      const strip = Math.min(ind.indent, 4);
      lineAdvance(line, strip);
      leaf.lines.push(lineRest(line));
    } else if (leaf.t === 'html') {
      leaf.lines.push(lineRest(line));
      if (htmlBlockEnds(leaf.htmlType, lineRest(line))) closeBlocks(stack.length - 1);
    }
  }
  closeBlocks(1);
  // drop paragraphs emptied by link reference extraction
  pruneDead(doc);
  return doc;

  function lineStartsNewItem(line) {
    // does the line, at its current position, start a new item of the
    // nearest enclosing list?
    for (let i = stack.length - 1; i >= 1; i--) {
      if (stack[i].t === 'list') {
        const list = stack[i];
        const ind = lineIndent(line);
        if (ind.indent > 3) return false;
        const marker = matchListMarker(line.s.slice(ind.off));
        return !!(marker && marker.type === list.listType && marker.marker === list.marker);
      }
    }
    return false;
  }

  function lineStartsListMarker(line) {
    const ind = lineIndent(line);
    if (ind.indent > 3) return null;
    return matchListMarker(line.s.slice(ind.off));
  }

  function hasEnclosingList() {
    for (let i = stack.length - 1; i >= 1; i--) {
      if (stack[i].t === 'list') return true;
    }
    return false;
  }

  function startBlocks(line) {
    while (true) {
      const tb = tip();
      // a new item of the list on top
      if (tb.t === 'list') {
        const ind = lineIndent(line);
        if (ind.indent <= 3) {
          const text = line.s.slice(ind.off);
          const marker = matchListMarker(text);
          if (marker && marker.type === tb.listType && marker.marker === tb.marker && !isThematicBreak(text)) {
            line.off = ind.off;
            line.col = ind.col;
            addItem(line, marker, tb, ind.indent);
            continue;
          }
        }
        // the list cannot continue; close it and re-check the line
        closeBlocks(stack.length - 1);
        continue;
      }
      const ind = lineIndent(line);
      if (ind.indent > 3) {
        // only indented code can start here
        if (tb.t !== 'para') {
          const code = { t: 'code', lines: [] };
          addBlock(code);
          return;
        }
        break;
      }
      const text = line.s.slice(ind.off);
      if (text === '') return;
      // block quote
      if (text[0] === '>') {
        line.off = ind.off;
        line.col = ind.col;
        if (matchQuote(line)) {
          if (tb.t === 'para') closeBlocks(stack.length - 1);
          addBlock({ t: 'quote', children: [] });
          continue;
        }
        return;
      }
      // ATX heading
      const atx = matchAtx(text);
      if (atx) {
        if (tb.t === 'para') closeBlocks(stack.length - 1);
        const h = { t: 'heading', level: atx.level, lines: [] };
        addBlock(h);
        line.off = line.s.length;
        h.lines.push(atx.content);
        closeBlocks(stack.length - 1);
        return;
      }
      // fenced code
      const fence = matchFence(text);
      if (fence) {
        if (tb.t === 'para') closeBlocks(stack.length - 1);
        const f = { t: 'fence', info: fence.info, lines: [], fenceChar: fence.char, fenceLen: fence.len, fenceIndent: ind.indent };
        addBlock(f);
        return;
      }
      // HTML block
      const ht = htmlBlockType(line);
      if (ht >= 1 && ht <= 6) {
        if (tb.t === 'para') closeBlocks(stack.length - 1);
        const h = { t: 'html', lines: [], htmlType: ht };
        addBlock(h);
        return;
      }
      if (ht === 7 && tb.t !== 'para') {
        const h = { t: 'html', lines: [], htmlType: 7 };
        addBlock(h);
        return;
      }
      // thematic break
      if (isThematicBreak(text)) {
        if (tb.t === 'para') closeBlocks(stack.length - 1);
        addBlock({ t: 'hr' });
        closeBlocks(stack.length - 1);
        return;
      }
      // list
      const marker = matchListMarker(text);
      if (marker) {
        // an ordered list can interrupt a paragraph only if it starts
        // with 1, except when nested inside a list item, where any
        // start number begins a sublist
        const nested = stack.some(b => b.t === 'list');
        const canInterrupt = tb.t !== 'para' || marker.type === 'bullet' || marker.start === 1 || nested;
        const after = text.slice(marker.width);
        if (canInterrupt && after.trim() !== '') {
          if (tb.t === 'para') closeBlocks(stack.length - 1);
          line.off = ind.off;
          line.col = ind.col;
          const list = { t: 'list', listType: marker.type, marker: marker.marker, start: marker.type === 'ordered' ? marker.start : 0, children: [], loose: false };
          addBlock(list);
          addItem(line, marker, list, ind.indent);
          continue;
        }
        if (canInterrupt && after.trim() === '' && tb.t !== 'para') {
          line.off = ind.off;
          line.col = ind.col;
          const list = { t: 'list', listType: marker.type, marker: marker.marker, start: marker.type === 'ordered' ? marker.start : 0, children: [], loose: false };
          addBlock(list);
          addItem(line, marker, list, ind.indent);
          continue;
        }
      }
      // indented code (only when not in a paragraph)
      if (tb.t !== 'para' && ind.indent >= 4) {
        addBlock({ t: 'code', lines: [] });
        return;
      }
      // paragraph
      if (tb.t === 'para') break;
      addBlock({ t: 'para', lines: [] });
      return;
    }
  }

  function addItem(line, marker, list, indentBefore) {
    line.off += marker.width;
    line.col += marker.width;
    const ind = lineIndent(line);
    let spaces;
    if (lineBlank(line)) spaces = 1;
    else if (ind.indent >= 5) spaces = 1;
    else if (ind.indent >= 1) spaces = ind.indent;
    else spaces = 0;
    // content indent relative to the position after the outer containers,
    // so it stays valid when those containers consume different widths
    // on other lines
    const contentIndent = indentBefore + marker.width + spaces;
    lineAdvance(line, spaces);
    const item = { t: 'item', contentIndent, children: [] };
    addBlock(item);
  }
}

// whether a line (after container prefixes) closes a fenced code block
function matchClosingFence(text, fence) {
  let i = 0;
  while (i < text.length && text[i] === fence.fenceChar) i++;
  if (i < fence.fenceLen) return false;
  return text.slice(i).trim() === '';
}

// ---------- link reference definitions ----------
function skipWsLine(text, j) {
  while (j < text.length && (text[j] === ' ' || text[j] === '\t')) j++;
  if (text[j] === '\n') {
    j++;
    while (j < text.length && (text[j] === ' ' || text[j] === '\t')) j++;
  }
  return j;
}
function parseTitle(text, k) {
  const open = text[k];
  const close = open === '(' ? ')' : open;
  let j = k + 1;
  let out = '';
  while (j < text.length) {
    const ch = text[j];
    if (ch === close) return { title: out, end: j + 1 };
    if (open === '(' && ch === '(') return null;
    if (ch === '\\' && j + 1 < text.length && ASCII_PUNCT.has(text[j + 1])) { out += text[j + 1]; j += 2; continue; }
    out += ch;
    j++;
  }
  return null;
}
function findLabelEnd(text, start) {
  let depth = 1;
  let j = start;
  while (j < text.length) {
    const ch = text[j];
    if (ch === '\\' && j + 1 < text.length && ASCII_PUNCT.has(text[j + 1])) { j += 2; continue; }
    if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) return j; }
    j++;
  }
  return -1;
}
function parseLinkRefDef(text, pos) {
  const n = text.length;
  let j = pos;
  let ind = 0;
  while (j < n && text[j] === ' ' && ind < 3) { j++; ind++; }
  if (text[j] !== '[') return null;
  const labelEnd = findLabelEnd(text, j + 1);
  if (labelEnd === -1) return null;
  const rawLabel = text.slice(j + 1, labelEnd);
  if (rawLabel.length === 0 || rawLabel.length > 999) return null;
  if (/\n[ \t]*\n/.test(rawLabel)) return null;
  if (labelHasBracket(rawLabel)) return null;
  const label = normalizeLabel(rawLabel);
  if (label === '') return null;
  let k = labelEnd + 1;
  if (text[k] !== ':') return null;
  k++;
  k = skipWsLine(text, k);
  let dest;
  if (text[k] === '<') {
    let e = k + 1;
    while (e < n && text[e] !== '>' && text[e] !== '\n') e++;
    if (text[e] !== '>') return null;
    dest = unescapeBackslashes(text.slice(k + 1, e));
    k = e + 1;
  } else {
    let e = k;
    let depth = 0;
    while (e < n) {
      const ch = text[e];
      if (ch === ' ' || ch === '\t' || ch === '\n') break;
      if (ch === '(') depth++;
      else if (ch === ')') { if (depth === 0) break; depth--; }
      else if (ch === '\\' && e + 1 < n && ASCII_PUNCT.has(text[e + 1])) { e += 2; continue; }
      e++;
    }
    if (e === k || depth !== 0) return null;
    dest = unescapeBackslashes(text.slice(k, e));
    k = e;
  }
  let title = null;
  let after = k;
  let k2 = k;
  let skippedWs = false;
  while (k2 < n && (text[k2] === ' ' || text[k2] === '\t')) { k2++; skippedWs = true; }
  if ((text[k2] === '"' || text[k2] === "'" || text[k2] === '(') && skippedWs) {
    // title on the same line: it must parse and the line must end after it
    const t = parseTitle(text, k2);
    if (!t) return null;
    let e2 = t.end;
    while (e2 < n && (text[e2] === ' ' || text[e2] === '\t')) e2++;
    if (e2 < n && text[e2] !== '\n') return null;
    title = t.title;
    after = t.end;
  } else if (text[k2] === '\n') {
    // title on the next line: only used if it parses and its line ends
    let k3 = k2 + 1;
    while (k3 < n && (text[k3] === ' ' || text[k3] === '\t')) k3++;
    if (text[k3] === '"' || text[k3] === "'" || text[k3] === '(') {
      const t = parseTitle(text, k3);
      if (t) {
        let e2 = t.end;
        while (e2 < n && (text[e2] === ' ' || text[e2] === '\t')) e2++;
        if (e2 >= n || text[e2] === '\n') { title = t.title; after = t.end; }
      }
    }
    // without a usable title on the next line, the definition ends here
    if (title === null) after = k2;
  } else if (text[k2] !== undefined && text[k2] !== '\n') {
    return null;
  }
  let e = after;
  while (e < n && (text[e] === ' ' || text[e] === '\t')) e++;
  if (e < n && text[e] !== '\n') return null;
  return { label, dest, title, end: e < n ? e + 1 : e };
}
function extractLinkRefs(lines, refs) {
  const text = lines.join('\n');
  let pos = 0;
  while (true) {
    const def = parseLinkRefDef(text, pos);
    if (!def) break;
    if (!refs.has(def.label)) refs.set(def.label, { dest: def.dest, title: def.title });
    pos = def.end;
  }
  const rest = text.slice(pos);
  if (rest === '') return [];
  return rest.split('\n');
}

// ---------- tables ----------
function splitTableRow(line) {
  const cells = [];
  let cur = '';
  let i = 0;
  let inCode = false;
  let codeTicks = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === '\\' && i + 1 < line.length && ASCII_PUNCT.has(line[i + 1])) {
      // \| is an escaped cell separator: it becomes a literal | in the
      // cell, before inline parsing (so `\|` in a code span is just |)
      if (line[i + 1] === '|') cur += '|';
      else cur += ch + line[i + 1];
      i += 2; continue;
    }
    if (ch === '`') {
      let j = i;
      while (j < line.length && line[j] === '`') j++;
      const ticks = j - i;
      if (inCode && ticks === codeTicks) { inCode = false; codeTicks = 0; }
      else if (!inCode) {
        // only enter a code span when a matching closer run exists
        // later in the line; otherwise the backticks are literal and
        // a | after them still separates cells
        let k = j, found = false;
        while (k < line.length) {
          if (line[k] === '`') {
            let m = k;
            while (m < line.length && line[m] === '`') m++;
            if (m - k === ticks) { found = true; break; }
            k = m;
          } else k++;
        }
        if (found) { inCode = true; codeTicks = ticks; }
      }
      cur += line.slice(i, j);
      i = j;
      continue;
    }
    if (ch === '|' && !inCode) { cells.push(cur); cur = ''; i++; continue; }
    cur += ch;
    i++;
  }
  cells.push(cur);
  const trimmed = line.trim();
  if (trimmed.startsWith('|') && cells.length > 0 && cells[0].trim() === '') cells.shift();
  if (trimmed.endsWith('|') && cells.length > 0 && cells[cells.length - 1].trim() === '') cells.pop();
  return cells.map(c => c.trim());
}
function tryTable(block) {
  const lines = block.lines;
  if (lines.length < 2) return null;
  if (!lines[0].includes('|')) return null;
  const headerCells = splitTableRow(lines[0]);
  if (headerCells.length === 0) return null;
  const delimCells = splitTableRow(lines[1]);
  if (delimCells.length !== headerCells.length) return null;
  const aligns = [];
  for (const c of delimCells) {
    const t = c.trim();
    if (!/^:?-+:?$/.test(t)) return null;
    const left = t.startsWith(':');
    const right = t.endsWith(':');
    aligns.push(left && right ? 'center' : left ? 'left' : right ? 'right' : null);
  }
  const rows = [];
  for (let i = 2; i < lines.length; i++) {
    const cells = splitTableRow(lines[i]);
    while (cells.length < headerCells.length) cells.push('');
    rows.push(cells.slice(0, headerCells.length));
  }
  return { t: 'table', header: headerCells, aligns, rows };
}
function pruneDead(block) {
  if (!block.children) return;
  const out = [];
  for (const child of block.children) {
    if (child.dead) continue;
    if (child.t === 'para') {
      const table = tryTable(child);
      if (table) { out.push(table); continue; }
    }
    pruneDead(child);
    out.push(child);
  }
  block.children = out;
}

// ---------- rendering ----------
function renderInlineStr(text, refs) {
  const out = [];
  renderInline(scanInline(text, refs), out);
  return out.join('');
}
function codeContent(lines) {
  // lines joined by newline; ensure exactly one trailing newline unless
  // the content already ends with one (a trailing blank line), or empty
  if (lines.length === 0) return '';
  const joined = lines.join('\n');
  if (joined === '') return '';
  return joined.endsWith('\n') ? joined : joined + '\n';
}

function renderBlock(block, refs, inTightList, isLast, nextBlank) {
  switch (block.t) {
    case 'para': {
      const text = block.lines.join('\n');
      const inner = (block.task || '') + renderInlineStr(text, refs);
      if (inTightList) return inner;
      return '<p>' + inner + '</p>\n';
    }
    case 'heading': {
      const text = block.lines.join('\n').replace(/^[ \t]+/, '').replace(/[ \t]+$/, '');
      return '<h' + block.level + '>' + renderInlineStr(text, refs) + '</h' + block.level + '>\n';
    }
    case 'code': {
      const content = codeContent(block.lines);
      return '<pre><code>' + escapeHtml(content, true) + '</code></pre>\n';
    }
    case 'fence': {
      const info = block.info ? unescapeBackslashes(block.info.split(/\s+/)[0]) : '';
      const cls = info ? ' class="language-' + escapeHtml(info, false) + '"' : '';
      const content = codeContent(block.lines);
      return '<pre><code' + cls + '>' + escapeHtml(content, true) + '</code></pre>\n';
    }
    case 'html': {
      if (block.htmlType <= 5) {
        const content = block.lines.map(l => l + '\n').join('');
        // nextBlank is the next sibling block (or null): strip the
        // trailing newline when a truly empty blank line follows, or
        // when a table follows with no blank line; otherwise keep it
        if (!nextBlank) return content;
        if (nextBlank.blankBefore) return nextBlank.blankBeforeEmpty ? content.slice(0, -1) : content;
        return nextBlank.t === 'table' ? content.slice(0, -1) : content;
      }
      // types 6-7: the lines joined; a trailing newline only when this
      // is the last block and the source itself ends with a newline
      const content = block.lines.join('\n');
      return isLast ? content + '\n' : content;
    }
    case 'hr': return '<hr>\n';
    case 'quote': {
      let out = '<blockquote>\n';
      for (let i = 0; i < block.children.length; i++) {
        const nb = i + 1 < block.children.length ? block.children[i+1] : null;
        out += renderBlock(block.children[i], refs, false, isLast && i === block.children.length - 1, nb);
      }
      return out + '</blockquote>\n';
    }
    case 'list': {
      const tag = block.listType === 'ordered' ? 'ol' : 'ul';
      const start = block.listType === 'ordered' && block.start !== 1 ? ' start="' + block.start + '"' : '';
      let out = '<' + tag + start + '>\n';
      for (let i = 0; i < block.children.length; i++) {
        const nb = i + 1 < block.children.length ? block.children[i+1] : null;
        out += renderBlock(block.children[i], refs, !block.loose, isLast && i === block.children.length - 1, nb);
      }
      return out + '</' + tag + '>\n';
    }
    case 'item': {
      if (block.children.length === 0) return '<li></li>\n';
      // task list: [ ] / [x] at the start of the first paragraph
      const first = block.children[0];
      if (first.t === 'para' && first.lines.length > 0) {
        const tm = /^\[( |x|X)\](?:[ \t]+|$)/.exec(first.lines[0]);
        if (tm) {
          const checked = tm[1] === 'x' || tm[1] === 'X';
          first.lines[0] = first.lines[0].slice(tm[0].length);
          first.task = checked
            ? '<input checked="" disabled="" type="checkbox"> '
            : '<input disabled="" type="checkbox"> ';
        }
      }
      let out = '<li>';
      for (let i = 0; i < block.children.length; i++) {
        const nb = i + 1 < block.children.length ? block.children[i+1] : null;
        out += renderBlock(block.children[i], refs, inTightList, isLast && i === block.children.length - 1, nb);
      }
      return out + '</li>\n';
    }
    case 'table': {
      let out = '<table>\n<thead>\n<tr>\n';
      for (let i = 0; i < block.header.length; i++) {
        const align = block.aligns[i];
        out += '<th' + (align ? ' align="' + align + '"' : '') + '>' + renderInlineStr(block.header[i], refs) + '</th>\n';
      }
      out += '</tr>\n</thead>\n';
      if (block.rows.length > 0) {
        out += '<tbody>';
        for (const row of block.rows) {
          out += '<tr>\n';
          for (let i = 0; i < block.header.length; i++) {
            const align = block.aligns[i];
            out += '<td' + (align ? ' align="' + align + '"' : '') + '>' + renderInlineStr(row[i], refs) + '</td>\n';
          }
          out += '</tr>\n';
        }
        out += '</tbody></table>\n';
      } else {
        out += '</table>\n';
      }
      return out;
    }
  }
  return '';
}

// ---------- public entry point ----------
export function parse(markdown) {
  const refs = new Map();
  const doc = parseBlocks(markdown, refs);
  // a trailing newline on the last HTML block is only rendered when the
  // source itself ends with a line ending
  const srcEndsNewline = markdown.endsWith('\n') || markdown.endsWith('\r');
  let out = '';
  for (let i = 0; i < doc.children.length; i++) {
    const nb = i + 1 < doc.children.length ? doc.children[i+1] : null;
    out += renderBlock(doc.children[i], refs, false, (i === doc.children.length - 1) && srcEndsNewline, nb);
  }
  return out;
}
