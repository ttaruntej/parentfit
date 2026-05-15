import { describe, expect, test } from 'vitest';
import { isPlayable, parseMediaUrl } from '../lib/url';

describe('parseMediaUrl', () => {
  test('parses YouTube watch URLs', () => {
    expect(parseMediaUrl('https://www.youtube.com/watch?v=abc123&list=x')).toMatchObject({
      kind: 'youtube',
      id: 'abc123',
      embed: 'https://www.youtube.com/embed/abc123?autoplay=1',
    });
  });

  test('parses media files with query strings', () => {
    expect(parseMediaUrl('https://cdn.example.com/clip.mp4?v=2')).toMatchObject({
      kind: 'mp4',
      src: 'https://cdn.example.com/clip.mp4?v=2',
    });
  });

  test('does not trust host names embedded in query strings', () => {
    expect(parseMediaUrl('https://attacker.example/?facebook.com=1')).toBeNull();
  });

  test('rejects non-http protocols', () => {
    expect(parseMediaUrl('javascript:alert(1)?v=evil')).toBeNull();
    expect(isPlayable('javascript:alert(1)?v=evil')).toBe(false);
  });
});
