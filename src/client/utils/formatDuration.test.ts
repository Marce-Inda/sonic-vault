import { describe, it, expect } from 'vitest';
import { formatDuration } from './formatDuration';

describe('formatDuration', () => {
  it('formats zero as 00:00', () => {
    expect(formatDuration(0)).toBe('00:00');
  });

  it('zero-pads seconds under a minute', () => {
    expect(formatDuration(5)).toBe('00:05');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(65)).toBe('01:05');
  });

  it('formats just under one hour as mm:ss', () => {
    expect(formatDuration(3599)).toBe('59:59');
  });

  it('formats exactly one hour as hh:mm:ss', () => {
    expect(formatDuration(3600)).toBe('01:00:00');
  });

  it('formats durations over an hour with zero-padding', () => {
    expect(formatDuration(3661)).toBe('01:01:01');
  });

  it('formats large durations with multiple hours', () => {
    expect(formatDuration(36000)).toBe('10:00:00');
  });

  it('floors fractional seconds', () => {
    expect(formatDuration(65.9)).toBe('01:05');
  });

  it('treats negative input as zero', () => {
    expect(formatDuration(-10)).toBe('00:00');
  });
});
