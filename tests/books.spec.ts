import { expect, test } from '@playwright/test';
import { BOOKS_KEY, loadBooks, saveBooks, validateDraft } from '../src/books';

test('读取、保存和校验书籍数据', () => {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
  expect(loadBooks(storage)).toEqual([]);
  const draft = validateDraft({ title: '  活着  ', author: ' 余华 ', status: '在读', notes: ' 记录 ' });
  expect(draft).toEqual({ title: '活着', author: '余华', status: '在读', notes: '记录' });
  const books = [{ ...draft, id: 'book-1', createdAt: '2026-10-12T00:00:00Z' }];
  saveBooks(storage, books);
  expect(loadBooks(storage)).toEqual(books);
  expect(() => validateDraft({ ...draft, title: '   ' })).toThrow('请填写书名');
  expect(() => validateDraft({ ...draft, notes: '字'.repeat(2001) })).toThrow('最多');
  data.set(BOOKS_KEY, JSON.stringify([...books, ...books]));
  expect(() => loadBooks(storage)).toThrow();
  data.set(BOOKS_KEY, '{broken');
  expect(() => loadBooks(storage)).toThrow();
});
