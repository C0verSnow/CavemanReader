export const BOOKS_KEY = 'caveman-reader:books:v1';
export const statuses = ['想读', '在读', '读完'] as const;
export type ReadingStatus = typeof statuses[number];
export interface BookDraft { title: string; author: string; status: ReadingStatus; notes: string }
export interface Book extends BookDraft { id: string; createdAt: string }
export const emptyDraft: BookDraft = { title: '', author: '', status: '想读', notes: '' };

export function validateDraft(draft: BookDraft): BookDraft {
  const clean = { ...draft, title: draft.title.trim(), author: draft.author.trim(), notes: draft.notes.trim() };
  if (!clean.title) throw new Error('请填写书名。');
  if (clean.title.length > 200 || clean.author.length > 120 || clean.notes.length > 2000) {
    throw new Error('书名最多 200 字，作者最多 120 字，备注最多 2000 字。');
  }
  if (!statuses.includes(clean.status)) throw new Error('请选择有效的阅读状态。');
  return clean;
}

export function loadBooks(storage: Pick<Storage, 'getItem'>): Book[] {
  const raw = storage.getItem(BOOKS_KEY);
  if (raw === null) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('书籍数据格式无效');
  const ids = new Set<string>();
  return parsed.map((book: unknown) => {
    if (!book || typeof book !== 'object') throw new Error('书籍数据格式无效');
    const item = book as Book;
    if (typeof item.id !== 'string' || !item.id || ids.has(item.id) ||
        typeof item.createdAt !== 'string' || !Number.isFinite(Date.parse(item.createdAt)) ||
        typeof item.title !== 'string' || typeof item.author !== 'string' || typeof item.notes !== 'string') {
      throw new Error('书籍数据格式无效');
    }
    ids.add(item.id);
    return { ...validateDraft(item), id: item.id, createdAt: item.createdAt };
  });
}

export function saveBooks(storage: Pick<Storage, 'setItem'>, books: Book[]) {
  storage.setItem(BOOKS_KEY, JSON.stringify(books));
}
