/**
 * abusiveLanguage.js
 * ─────────────────────────────────────────────────────────────
 * Detects abusive / offensive language in chat messages so the
 * sender can be warned before the message is delivered. Mirrored
 * on the backend (backend/src/utils/abusiveLanguage.js) so abusive
 * content can never be delivered from a modified client.
 *
 * Coverage (as broad as practical for Mingo's India-first user base):
 *   • English profanity, slurs, ableist language, threats, self-harm
 *     phrases and the most common internet abbreviations.
 *   • Hinglish / romanised-Hindi abuses (madarchod, behenchod,
 *     chutiya, gaand, bhosdike, lawde, maa ki chut …) with all the
 *     common spelling variants users actually type.
 *   • Devanagari script abuses (मादरचोद, बहनचोद, चूतिया …).
 *   • Evasion patterns: leet-speak (f*ck, sh!t, 4ss), repeated
 *     letters (fuuuuck), and spaced-out words (f u c k).
 *
 * Two severity tiers:
 *   • 'severe' — hard profanity / slurs / threats. The message is
 *     blocked AND every use counts toward the 24h chat restriction.
 *   • 'mild'   — disrespectful name-calling (stupid, pagal, damn…).
 *     The message is still blocked from being delivered, but does
 *     NOT escalate strikes, so a playful slip never triggers a ban.
 */

// ── Leet-speak substitution map ─────────────────────────────
// Every latin stem is compiled into a regex where each letter may be
// a leet lookalike, repeated ("fuuuuck"), or split by up to 3
// arbitrary non-alphanumeric separators ("f u c k", "f*u*c*k").
// Word boundaries (\b) keep stems from matching inside harmless
// words ("gandhi", "scunthorpe", "class", "because"). No lookbehind —
// Hermes-safe, matching the contactSafety.js convention.
const LEET = {
  a: 'a@4', b: 'b8', c: 'c(', d: 'd', e: 'e3', f: 'f', g: 'g9', h: 'h',
  i: 'i1!', j: 'j', k: 'k', l: 'l1', m: 'm', n: 'n', o: 'o0', p: 'p',
  q: 'q', r: 'r', s: 's5$', t: 't7+', u: 'u', v: 'v', w: 'w', x: 'x',
  y: 'y', z: 'z2',
};

// ── SEVERE — hard profanity, slurs, threats ─────────────────
const SEVERE_WORDS = [
  // English core profanity
  'fuck', 'fucking', 'fucked', 'fucker', 'fuckers', 'fucks',
  'fck', 'fuk', 'fcuk', 'fux', 'fuxk', 'phuck', 'phuk', 'fuker', 'fukin', 'fuked',
  'fkn', 'fk', 'fuq',
  'fucktard', 'fucktards', 'fuckwit', 'fuckwad', 'fuckface', 'fuckhead',
  'fuckstick', 'fucknugget', 'fucknut', 'fuckbucket',
  'motherfucker', 'motherfuckers', 'motherfucking', 'mofo',
  'shit', 'shitty', 'shite', 'shithead', 'shitface', 'shitbag', 'shithole',
  'shitshow', 'shitstain', 'shitfaced', 'shitting',
  'bullshit', 'horseshit', 'batshit', 'dipshit', 'dumbshit',
  'bitch', 'bitches', 'bitchy', 'bitchass', 'bitchface', 'bitching', 'sonofabitch', 'btch',
  'ass', 'asshole', 'assholes', 'asshat', 'asswipe', 'asslicker', 'assface',
  'arse', 'arsehole', 'jackass', 'dumbass', 'fatass', 'smartass', 'assclown',
  'dick', 'dicks', 'dickhead', 'dickwad', 'dickweed', 'dickface', 'dickhole', 'dickless',
  'prick', 'pricks',
  'cock', 'cocks', 'cockhead', 'cocksucker', 'cocksuckers', 'cockface', 'cockbite',
  'pussy', 'pussies', 'pssy',
  'cunt', 'cunts', 'cuntface', 'cunthole',
  'slut', 'sluts', 'slutty', 'whore', 'whores', 'whre',
  'bastard', 'bastards', 'bollocks', 'bollock',
  'wanker', 'wankers', 'wank', 'wanking',
  'twat', 'twats', 'knob', 'knobhead', 'knobend', 'bellend', 'bellends',
  'tosser', 'tossers', 'tosspot',
  'piss', 'pissed', 'pissing', 'pissoff',
  'sod', 'sodoff',
  'douche', 'douchebag', 'douchecanoe', 'douchey',
  'numbnuts', 'schmuck', 'scumbag', 'scumbags',
  'moron', 'morons', 'moronic', 'idiot', 'idiots', 'idiotic',
  'imbecile', 'imbecilic', 'cretin',
  'retard', 'retarded', 'retards',
  'mong', 'mongoloid', 'mongols',
  'spaz', 'spastic', 'spacker', 'cripple', 'crippled', 'gimp', 'midget',
  'jackoff', 'jerkoff',
  'cuck', 'cucks', 'pervert', 'perverts', 'perv', 'skank', 'skanks',

  // Threats / self-harm / harassment
  'kys', 'killyourself', 'killurself', 'killyou',
  'endyourself', 'neckyourself', 'godie', 'dropdead',
  'dieinafire', 'burninhell', 'rotinhell', 'gotohell',
  'rape', 'raped', 'rapist', 'rapists',
  'pedo', 'pedophile', 'paedophile', 'pedos', 'incest',
  'stfu', 'gtfo', 'wtf', 'omfg', 'gfy', 'foff', 'screwyou',
  'eatshit', 'eatadick', 'suckmydick', 'suckmyballs', 'suckadick',
  'blowme', 'kissmyass', 'kissmyarse', 'upyours', 'eatmyass',

  // Slurs
  'nigger', 'niggers', 'nigga', 'niggah', 'nigguh', 'niggas', 'niggaz',
  'faggot', 'faggots', 'fag', 'fags', 'fagot',
  'dyke', 'dykes', 'homo', 'homos', 'tranny', 'trannies',
  'spic', 'spics', 'wetback', 'kike', 'kikes', 'gook', 'gooks',
  'coon', 'coons', 'beaner', 'beaners', 'paki', 'pakis',
  'honky', 'honkey', 'towelhead', 'raghead',

  // Hinglish / romanised-Hindi (severe)
  'madarchod', 'madarchood', 'maderchod', 'madharchod', 'madarchodni',
  'madarchd', 'maderchd',
  'behenchod', 'behnchod', 'bhenchod', 'behanchod', 'bahanchod',
  'behenchd', 'bhenchd', 'behanchd',
  'behenchodni', 'bhenchodni', 'behanchodni',
  'bsdk', 'bsd', 'bkl', 'bkc', 'mkc', 'bc', 'mc',
  'chutiya', 'chutia', 'chutya', 'chutiye', 'chutiyapa', 'chutiyapanti',
  'chutyya', 'chootiya', 'chutiyagiri', 'chtiya',
  'gaand', 'gand', 'gaandu', 'gandu', 'gandwa', 'gandiya', 'gnd',
  'gandmara', 'gandmar', 'gaandmara', 'gandmarao', 'gandmaro',
  'bhosda', 'bhosra', 'bhosdi', 'bhosdike', 'bhosdika', 'bhosd', 'bhosdk', 'bhosdke',
  'bhosad', 'bhosari', 'bhosri', 'bhosar', 'bhosdaa',
  'lund', 'lundwa', 'lundiya', 'lundu', 'lnd',
  'lawda', 'lauda', 'lawde', 'laude', 'lavda', 'lavde', 'loda', 'lode', 'lodu', 'lodua', 'lawdi', 'lda',
  'chut', 'choot', 'chutmarani', 'chudail', 'chudel', 'chudne', 'chudai', 'chudayi', 'cht',
  'chodu', 'chuda', 'chudwa', 'betichod', 'maabehen',
  'harami', 'haraami', 'haramzada', 'haramzaade', 'haramzadi',
  'haramkhor', 'haramkhore', 'haramzadgi',
  'kameena', 'kameene', 'kamina', 'kamine', 'kaminey', 'kamini',
  'kutta', 'kuttaa', 'kutte', 'kutti', 'kutiya', 'kuttiya', 'kutto',
  'kutteka', 'kuttiki',
  'raand', 'randi', 'raandi', 'randwa', 'randwe', 'randika',
  'saala', 'saale', 'saali', 'saalo', 'salakutta',
  'suarka', 'suarki', 'suarke',
  'namard', 'namardi', 'namarda', 'jhaant', 'jhant', 'jhaat', 'jhantu',
  'chakka', 'chakke', 'hijra', 'hijda',
  'bhadwa', 'bhadwe', 'bhadwi', 'bhadwaa',
  'khanki', 'chinal', 'chinnal', 'dalla', 'dalle',
  'chamar', 'chamaar', 'bhangi', 'kallu', 'kaalu', 'habshi', 'chinki',
  'langda', 'langdi',
  'maaki', 'maakichut', 'maachod', 'maachuda', 'maachudao',
  'maakabhosda', 'maachudvao', 'maakichudai',
  'behenki', 'behenkichut', 'bahanki', 'behankichut', 'bhenkichut',
  'bhenki', 'bhenka', 'behenkabhosda', 'behankabhosda',
  'terimaa', 'terimaaki', 'teribehen', 'terabaap', 'terebaap',
  'tumharimaa', 'tumharibehen',
];

// ── MILD — disrespectful name-calling (blocked, no strikes) ──
const MILD_WORDS = [
  'crap', 'crappy', 'damn', 'damnit', 'dammit', 'goddamn', 'goddammit', 'goddam',
  'dumb', 'dumbo', 'dimwit', 'nitwit', 'stupid', 'stupidest', 'stupidity',
  'loser', 'losers', 'worthless', 'useless', 'pathetic', 'ugly',
  'fatso', 'fatty', 'coward', 'pissy', 'bugger', 'pillock',
  'whitetrash', 'nazi', 'nazis', 'tits', 'titties',
  'shutup', 'getlost', 'incel', 'thot', 'hoe', 'hoes', 'bimbo',
  // Hinglish mild
  'chupkar', 'jhootha', 'jhutha', 'gawar', 'gawaar', 'khoti',
  'pagal', 'pagli', 'bewakoof', 'bewakuf', 'bakwas', 'tatti', 'taati',
  'gadha', 'gadhe', 'gadhi', 'ullu', 'ulluka', 'ulluke', 'ullukapatha', 'ullukepathe',
  'nikamma', 'nikame', 'nikammi', 'nalayak', 'namakharam', 'chor', 'budbak', 'dhakkan',
];

// ── Devanagari script ───────────────────────────────────────
const SEVERE_DEVANAGARI = [
  'मादरचोद', 'मदरचोद', 'मादरचोदनी',
  'बहनचोद', 'बहनचोदनी',
  'चूत', 'चूतिया', 'चुतिया',
  'गांड', 'गाँड', 'गांडू', 'गाँडू', 'गांडमार', 'गांडमारो',
  'भोसड़ा', 'भोसड़ी', 'भोसड़े', 'भोसड़िके', 'भोसडिके',
  'लंड', 'लौड़ा', 'लौड़े', 'लौड़ी',
  'हरामी', 'हरामजादा', 'हरामजादे', 'हरामखोर', 'हरामज़ादा',
  'कमीना', 'कमीने', 'कमीनी',
  'कुत्ता', 'कुत्ते', 'कुत्तों', 'कुत्ती', 'कुतिया', 'कुत्ते का', 'कुत्ते की',
  'रांड', 'रंडी', 'रंडवा', 'रंडवे',
  'साला', 'साले', 'साली', 'सालो',
  'सुअर का', 'सुअर की',
  'नमर्द', 'झांट',
  'चक्का', 'चक्के', 'हिजड़ा', 'हिजड़े',
  'भड़वा', 'भड़वे', 'भड़वी',
  'चोदू', 'चुदाई', 'खानकी', 'चिनाल',
  'डल्ला', 'डल्ले', 'चमार', 'भंगी', 'कल्लू', 'हब्शी', 'चिंकी',
  'लंगड़ा', 'लंगड़ी',
  'माँ की चूत', 'माँ चुदाओ', 'माँ चोदू', 'माँ का भोसड़ा',
  'बहन की चूत', 'बहन चुदाओ', 'बहन का भोसड़ा',
];

const MILD_DEVANAGARI = [
  'गधा', 'गधे', 'उल्लू', 'उल्लू का पठा', 'उल्लू के पठे',
  'बेवकूफ', 'टट्टी', 'पागल', 'निकम्मा', 'निकम्मे',
  'नालायक', 'सुअर', 'गवार', 'झूठा', 'मूर्ख',
];

// ── Pattern compilation ─────────────────────────────────────
// Latin stems: \b + per-letter leet class (repeatable) + up to 3
// arbitrary separators between letters + \b.
function buildLatinPattern(stem) {
  const inner = [...stem]
    .map((ch) => `[${LEET[ch] || ch}]+`)
    .join('[^a-z0-9]{0,3}');
  return new RegExp(`\\b${inner}\\b`, 'i');
}

// Devanagari stems: match the literal word but never inside a longer
// Devanagari word. Capture-group boundaries (no lookbehind — Hermes).
// No 'g' flag: .match() must return capture groups so the matched word
// can be extracted without its boundary characters.
function buildDevanagariPattern(stem) {
  const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\u0900-\\u097F])${escaped}($|[^\\u0900-\\u097F])`);
}

// Longest stems first so the most specific match wins ("behenki chut"
// before "behenki", "motherfucker" before "fucker").
const PATTERNS = [
  ...[...SEVERE_WORDS].sort((a, b) => b.length - a.length)
    .map((stem) => ({ re: buildLatinPattern(stem), severity: 'severe', devanagari: false })),
  ...[...MILD_WORDS].sort((a, b) => b.length - a.length)
    .map((stem) => ({ re: buildLatinPattern(stem), severity: 'mild', devanagari: false })),
  ...[...SEVERE_DEVANAGARI].sort((a, b) => b.length - a.length)
    .map((stem) => ({ re: buildDevanagariPattern(stem), severity: 'severe', devanagari: true })),
  ...[...MILD_DEVANAGARI].sort((a, b) => b.length - a.length)
    .map((stem) => ({ re: buildDevanagariPattern(stem), severity: 'mild', devanagari: true })),
];

/** Internal match: returns { word, severity } or null. */
function matchAbuse(text) {
  if (!text) return null;
  for (const { re, severity, devanagari } of PATTERNS) {
    const m = text.match(re);
    if (!m) continue;
    if (devanagari) {
      const prefix = m[1] || '';
      const suffix = m[2] || '';
      return { word: m[0].slice(prefix.length, m[0].length - suffix.length), severity };
    }
    return { word: m[0], severity };
  }
  return null;
}

/**
 * Return the first offending word/phrase found, or null when clean.
 * (kept for backwards compatibility)
 */
export function findAbusiveWord(text) {
  const hit = matchAbuse(text);
  return hit ? hit.word : null;
}

export function containsAbusiveLanguage(text) {
  return matchAbuse(text) !== null;
}

/** One-stop analysis used by the chat UI and (mirrored on) the backend. */
export function analyzeAbuse(text) {
  const hit = matchAbuse(text);
  return {
    hasAbuse: hit !== null,
    matched: hit ? hit.word : null,
    severity: hit ? hit.severity : null,
  };
}
