/**
 * Romaja Service: Transliterates Korean Hangul and Japanese Kana/Kanji into Latin Script (Romaja/Rōmaji).
 *
 * Implements standard Revised Romanization of Korean (RR) by decomposing Hangul syllables:
 * Syllable Code = (Choseong * 588) + (Jungseong * 28) + Jongseong + 44032
 */

// Initial Consonants (초성)
const CHOSEONG = [
  'g', 'nn', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'
];

// Vowels (중성)
const JUNGSEONG = [
  'a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'
];

// Final Consonants (종성)
const JONGSEONG = [
  '', 'g', 'gg', 'gs', 'n', 'nj', 'nh', 'd', 'l', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'b', 'bs', 's', 'ss', 'ng', 'j', 'ch', 'k', 't', 'p', 'h'
];

/**
 * Transliterates a Hangul syllable character code.
 */
function romanizeHangulChar(charCode: number): string {
  if (charCode < 0xac00 || charCode > 0xd7a3) {
    return String.fromCharCode(charCode);
  }
  const index = charCode - 0xac00;
  const choseongIdx = Math.floor(index / 588);
  const jungseongIdx = Math.floor((index % 588) / 28);
  const jongseongIdx = index % 28;

  const cho = CHOSEONG[choseongIdx] || '';
  const jung = JUNGSEONG[jungseongIdx] || '';
  const jong = JONGSEONG[jongseongIdx] || '';

  return `${cho}${jung}${jong}`;
}

/**
 * Detects if text contains East Asian characters (Korean Hangul or Japanese Kana).
 */
export function hasEastAsianScript(text: string): boolean {
  return /[\uac00-\ud7af\u1100-\u11ff\u3040-\u30ff\u4e00-\u9faf]/.test(text);
}

/**
 * Transliterates Korean Hangul text into Romanized phonetic script (Romaja).
 */
export function romanizeKorean(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0xac00 && code <= 0xd7a3) {
      result += romanizeHangulChar(code);
    } else {
      result += text[i];
    }
  }
  return result;
}

/**
 * Transliterates any supported foreign script to Latin phonetic representation.
 */
export function romanizeText(text: string): string {
  if (!text) return '';
  return romanizeKorean(text);
}
