/**
 * contactSafety.js
 * ─────────────────────────────────────────────────────────────
 * Regex-based phone number & contact-sharing detection used by
 * the chat screen (for BOTH users and listeners).
 *
 *  - detectPhoneNumbers  → raw matches + cleaned digit strings
 *  - containsPhoneNumber → quick boolean check
 *  - maskPhoneNumbers    → replace digits with • for display
 *  - stripPhoneNumbers   → remove numbers entirely (keeps message)
 *  - analyzeMessage      → one-stop analysis used by UI + backend
 *
 * Heuristics to avoid false positives:
 *  • Bare digit runs must be 10–15 digits (catches real numbers,
 *    ignores things like "1000000 coins").
 *  • Grouped forms (+91, (987) 654-3210, 987-654-3210, 98765 43210,
 *    555-0199, +1-202-555-0100…) may be as short as 7 digits.
 *  • Time strings ("21:34") never match — ":" is not a separator.
 */

// Bare runs of 10–15 consecutive digits — e.g. 9876543210, 1234567890123
const BARE_DIGITS = /\b\d{10,15}\b/g;

// Grouped / international forms — leading +, parentheses, spaces, dashes or dots.
// No lookbehind (Hermes safety); an optional non-digit prefix is captured
// (group 1) so we can trim it and report correct character offsets.
const GROUPED =
  /(?:^|([^\d]))((?:\+\d{1,4}[\s.-]?)?(?:\(\d{1,4}\)[\s.-]?)?\d{2,5}(?:[\s.-]\d{2,5}){1,3})(?!\d)/g;

// Digits deliberately spaced apart to dodge detection — "9 8 7 6 5 4 3 2 1 0".
// Requires 7–15 whitespace-separated digits.
const SPACED_DIGITS = /(?:(^)|(\s))(\d(?:\s\d){6,14})(?=\s|$|[^\d])/g;

// Phrases people typically use right before dropping contact info.
const CONTACT_INTENT =
  /\b(call|text|message|whatsapp|wa\.me|ping|contact|reach|dm|telegram|snap(?:chat)?|insta(?:gram)?|email|mail|add me|number is|my number|ur no|your number)\b/i;

const SEPARATOR = /[\s.()-]/;

/**
 * Collect raw matches with their digit-only form and character offsets.
 */
function collectMatches(text, regex) {
  const matches = [];
  let m;
  regex.lastIndex = 0;
  while ((m = regex.exec(text)) !== null) {
    let raw;
    let offset;
    if (regex === GROUPED) {
      offset = m[1] !== undefined ? m[1].length : 0;
      raw = m[2];
    } else if (regex === SPACED_DIGITS) {
      offset = m[1] !== undefined ? 0 : m[2].length;
      raw = m[3];
    } else {
      offset = 0;
      raw = m[0];
    }
    const start = m.index + offset;
    const digits = raw.replace(/\D/g, '');

    // Bare digit runs need ≥ 10 digits; grouped forms may be 7–15.
    const isBare = /^\d+$/.test(raw);
    const minLen = isBare ? 10 : 7;

    if (digits.length >= minLen && digits.length <= 15) {
      // Only "grouped" tokens that actually contain a separator or a
      // country-code prefix count as short local numbers.
      const hasSeparator = SEPARATOR.test(raw) || /^\+\d/.test(raw) || /^\(\d/.test(raw);
      if (isBare || hasSeparator) {
        matches.push({ raw, digits, start, end: start + raw.length });
      }
    }
    if (m.index === regex.lastIndex) regex.lastIndex += 1;
  }
  return matches;
}

/**
 * Merge overlapping matches so masking/stripping never double-processes.
 */
function mergeMatches(matches) {
  const sorted = [...matches].sort((a, b) => a.start - b.start);
  const merged = [];
  for (const m of sorted) {
    const last = merged[merged.length - 1];
    if (last && m.start <= last.end) {
      last.end = Math.max(last.end, m.end);
    } else {
      merged.push({ ...m });
    }
  }
  return merged;
}

/**
 * Return [{ raw, digits, start, end }] for every phone number in text.
 */
export function detectPhoneNumbers(text) {
  if (!text) return [];
  return mergeMatches([
    ...collectMatches(text, BARE_DIGITS),
    ...collectMatches(text, GROUPED),
    ...collectMatches(text, SPACED_DIGITS),
  ]);
}

export function containsPhoneNumber(text) {
  return detectPhoneNumbers(text).length > 0;
}

/**
 * Replace the digits of any detected number with "•" (keeps format).
 */
export function maskPhoneNumbers(text) {
  if (!text) return text;
  const matches = detectPhoneNumbers(text);
  if (!matches.length) return text;
  let result = '';
  let cursor = 0;
  for (const m of matches) {
    result += text.slice(cursor, m.start);
    result += m.raw.replace(/\d/g, '•');
    cursor = m.end;
  }
  result += text.slice(cursor);
  return result;
}

/**
 * Remove detected numbers from the text entirely.
 */
export function stripPhoneNumbers(text) {
  if (!text) return text;
  const matches = detectPhoneNumbers(text);
  if (!matches.length) return text;
  let result = '';
  let cursor = 0;
  for (const m of matches) {
    result += text.slice(cursor, m.start);
    cursor = m.end;
  }
  result += text.slice(cursor);
  return result.replace(/\s{2,}/g, ' ').replace(/\s+([,.!?])/g, '$1').trim();
}

/**
 * One-stop analysis used by the chat UI and (mirrored on) the backend.
 */
export function analyzeMessage(text) {
  if (!text) {
    return { hasPhone: false, phoneNumbers: [], masked: '', hasContactIntent: false };
  }
  const matches = detectPhoneNumbers(text);
  const hasPhone = matches.length > 0;
  return {
    hasPhone,
    phoneNumbers: [...new Set(matches.map((m) => m.digits))],
    masked: hasPhone ? maskPhoneNumbers(text) : text,
    hasContactIntent: CONTACT_INTENT.test(text),
  };
}
