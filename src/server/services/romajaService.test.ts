import { describe, expect, it } from 'vitest';
import { hasEastAsianScript, romanizeKorean, romanizeText } from './romajaService.js';

describe('romajaService', () => {
  it('detects East Asian scripts accurately', () => {
    expect(hasEastAsianScript('Hello World')).toBe(false);
    expect(hasEastAsianScript('사랑해')).toBe(true);
    expect(hasEastAsianScript('chemical')).toBe(false);
  });

  it('transliterates Hangul words to Romaja', () => {
    expect(romanizeKorean('사랑')).toBe('sarang');
    expect(romanizeKorean('BTS')).toBe('BTS');
    expect(romanizeText('영원히')).toBe('yeongwonhi');
  });

  it('handles mixed English and Korean text', () => {
    const mixed = '영원히 함께 chemical';
    const romanized = romanizeText(mixed);
    expect(romanized).toContain('yeongwonhi');
    expect(romanized).toContain('chemical');
  });
});
