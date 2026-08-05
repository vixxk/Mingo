/**
 * abusiveLanguage.js (backend mirror)
 * ─────────────────────────────────────────────────────────────
 * Server-side enforcement of the chat anti-abuse rule. Mirrors
 * frontend/utils/abusiveLanguage.js so offensive content can never
 * be delivered, even from a modified client.
 *
 * Coverage: English profanity/slurs/threats, Hinglish (romanised-
 * Hindi) abuses with common spelling variants, Devanagari abuses,
 * plus leet-speak (f*ck, sh!t), repeated letters (fuuuuck) and
 * spaced-out evasion (f u c k).
 *
 * Severity tiers:
 *   • 'severe' — hard profanity / slurs / threats. Blocked AND each
 *     use counts toward the 24h chat restriction.
 *   • 'mild'   — disrespectful name-calling. Blocked from delivery
 *     but never escalates strikes.
 */

// ── Leet-speak substitution map ─────────────────────────────
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
function buildLatinPattern(stem) {
  const inner = [...stem]
    .map((ch) => `[${LEET[ch] || ch}]+`)
    .join('[^a-z0-9]{0,3}');
  return new RegExp(`\\b${inner}\\b`, 'i');
}

function buildDevanagariPattern(stem) {
  const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\u0900-\\u097F])${escaped}($|[^\\u0900-\\u097F])`);
}

// Longest stems first so the most specific match wins.
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

function findAbusiveWord(text) {
  const hit = matchAbuse(text);
  return hit ? hit.word : null;
}

function analyzeAbuse(text) {
  const hit = matchAbuse(text);
  return {
    hasAbuse: hit !== null,
    matched: hit ? hit.word : null,
    severity: hit ? hit.severity : null,
  };
}

module.exports = {
  findAbusiveWord,
  containsAbusiveLanguage: (t) => matchAbuse(t) !== null,
  analyzeAbuse,
};
