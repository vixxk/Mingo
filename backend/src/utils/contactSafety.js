/**
 * contactSafety.js (backend mirror)
 * ─────────────────────────────────────────────────────────────
 * Server-side enforcement of the chat contact-sharing safety
 * rule. Mirrors frontend/utils/contactSafety.js so a phone number
 * can never be delivered, even from a modified client.
 */

// Bare runs of 10–15 consecutive digits — e.g. 9876543210, 1234567890123
const BARE_DIGITS = /\b\d{10,15}\b/g;

// Grouped / international forms — leading +, parentheses, spaces, dashes or dots.
const GROUPED =
  /(?:^|([^\d]))((?:\+\d{1,4}[\s.-]?)?(?:\(\d{1,4}\)[\s.-]?)?\d{2,5}(?:[\s.-]\d{2,5}){1,3})(?!\d)/g;

// Digits deliberately spaced apart to dodge detection — "9 8 7 6 5 4 3 2 1 0".
const SPACED_DIGITS = /(?:(^)|(\s))(\d(?:\s\d){6,14})(?=\s|$|[^\d])/g;

// Phrases people typically use right before dropping contact info.
const CONTACT_INTENT =
  /\b(call|text|message|whatsapp|wa\.me|ping|contact|reach|dm|telegram|snap(?:chat)?|insta(?:gram)?|email|mail|add me|number is|my number|ur no|your number)\b/i;

const SEPARATOR = /[\s.()-]/;

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

    const isBare = /^\d+$/.test(raw);
    const minLen = isBare ? 10 : 7;

    if (digits.length >= minLen && digits.length <= 15) {
      const hasSeparator = SEPARATOR.test(raw) || /^\+\d/.test(raw) || /^\(\d/.test(raw);
      if (isBare || hasSeparator) {
        matches.push({ raw, digits, start, end: start + raw.length });
      }
    }
    if (m.index === regex.lastIndex) regex.lastIndex += 1;
  }
  return matches;
}

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

function detectPhoneNumbers(text) {
  if (!text) return [];
  return mergeMatches([
    ...collectMatches(text, BARE_DIGITS),
    ...collectMatches(text, GROUPED),
    ...collectMatches(text, SPACED_DIGITS),
  ]);
}

function maskPhoneNumbers(text) {
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
 * One-stop analysis used by the backend socket guard.
 */
function analyzeMessage(text) {
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

module.exports = { detectPhoneNumbers, maskPhoneNumbers, analyzeMessage };
