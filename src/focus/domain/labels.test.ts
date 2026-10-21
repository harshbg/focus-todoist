import { describe, expect, it } from 'vitest';
import { mergeLabels } from './labels';

describe('mergeLabels', () => {
  it('appends non-overlapping additions to existing labels', () => {
    expect(mergeLabels(['reading', 'urgent'], ['work'])).toEqual(['reading', 'urgent', 'work']);
  });

  it('skips exact duplicates', () => {
    expect(mergeLabels(['work', 'urgent'], ['work'])).toEqual(['work', 'urgent']);
  });

  it('skips case-insensitive duplicates and keeps original casing', () => {
    expect(mergeLabels(['Work'], ['work'])).toEqual(['Work']);
    expect(mergeLabels(['work'], ['WORK'])).toEqual(['work']);
  });

  it('handles whitespace in duplicates and trims labels', () => {
    expect(mergeLabels([' Work '], ['work'])).toEqual(['Work']);
    expect(mergeLabels(['work'], ['  WORK  '])).toEqual(['work']);
  });

  it('returns existing labels when additions are empty', () => {
    expect(mergeLabels(['deep-dive'], [])).toEqual(['deep-dive']);
  });

  it('returns additions when existing list is empty', () => {
    expect(mergeLabels([], ['work'])).toEqual(['work']);
  });

  it('returns an empty array when both inputs are empty', () => {
    expect(mergeLabels([], [])).toEqual([]);
  });

  it('deduplicates items within additions case-insensitively', () => {
    expect(mergeLabels(['a'], ['b', 'B', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('skips empty and whitespace-only labels', () => {
    expect(mergeLabels(['', '  ', 'valid'], [' ', 'work'])).toEqual(['valid', 'work']);
  });
});
