import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { emptyDraft, loadBooks, saveBooks, statuses, validateDraft } from '../books';
import type { Book, BookDraft, ReadingStatus } from '../books';

function initialLibrary() {
  try { return { books: loadBooks(window.localStorage), error: null }; }
  catch { return { books: [] as Book[], error: '本机书籍数据无法读取。为保护原数据，已暂停修改。请备份数据后检查存储。' }; }
}

export function BooksPage() {
  const [library, setLibrary] = useState(initialLibrary);
  const [draft, setDraft] = useState<BookDraft>({ ...emptyDraft });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const visibleBooks = library.books.filter(book => `${book.title} ${book.author}`.toLowerCase().includes(query.toLowerCase()));

  function commit(books: Book[], success: string) {
    try {
      saveBooks(window.localStorage, books);
      setLibrary({ books, error: null });
      setMessage(success);
      setError('');
      return true;
    } catch { setError('保存失败，本次修改尚未保存。请检查本机存储空间后重试。'); return false; }
  }

  function resetDraft() { setDraft({ ...emptyDraft }); setEditingId(null); setError(''); }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (library.error) return;
    try {
      const clean = validateDraft(draft);
      const books = editingId
        ? library.books.map(book => book.id === editingId ? { ...book, ...clean } : book)
        : [{ ...clean, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...library.books];
      if (commit(books, editingId ? '书籍已更新。' : '书籍已加入书架。')) resetDraft();
    } catch (cause) { setError(cause instanceof Error ? cause.message : '书籍信息无效。'); }
  }

  function edit(book: Book) {
    setDraft({ title: book.title, author: book.author, status: book.status, notes: book.notes });
    setEditingId(book.id); setError(''); setMessage(''); setPendingDelete(null);
    titleInput.current?.focus();
  }

  function remove(id: string) {
    if (commit(library.books.filter(book => book.id !== id), '书籍已删除。')) {
      if (editingId === id) resetDraft();
      setPendingDelete(null);
    }
  }

  return <div className="books-layout">
    <section className="library" aria-labelledby="library-title">
      <div className="section-heading"><div><p className="eyebrow">YOUR PERSONAL LIBRARY</p><h1 id="library-title">每一本，都有收获。</h1></div><span className="count">{library.books.length} 本书</span></div>
      <p className="muted">整理想读的书，记录正在发生的思考。</p>
      <label className="search">搜索书籍<input type="search" placeholder="按书名或作者搜索…" value={query} onChange={event => setQuery(event.target.value)} /></label>
      {library.error ? <p role="alert" className="error">{library.error}</p> : null}
      <p role="status" className="feedback">{message}</p>
      {visibleBooks.length === 0 ? <div className="empty"><span aria-hidden="true">▤</span><h2>{query ? '没有找到这本书' : '你的书架，从这里开始'}</h2><p>{query ? '换个书名或作者试试。' : '在右侧添加第一本书，慢慢积累你的阅读地图。'}</p></div> :
        <ul className="book-list">{visibleBooks.map(book => <li className="book-card" key={book.id}>
          <div className="book-cover" aria-hidden="true">{book.title.slice(0, 1)}</div>
          <div className="book-details"><span className="badge">{book.status}</span><h2>{book.title}</h2><p className="muted">{book.author || '作者未填写'}</p>{book.notes ? <p className="notes">{book.notes}</p> : null}
            {pendingDelete === book.id ? <div className="delete-confirm"><p>确定删除《{book.title}》吗？</p><button className="danger" onClick={() => remove(book.id)} disabled={!!library.error}>确定删除</button><button onClick={() => setPendingDelete(null)}>取消删除</button></div> :
              <div className="card-actions"><button aria-label={`编辑 ${book.title}`} onClick={() => edit(book)} disabled={!!library.error}>编辑</button><button aria-label={`删除 ${book.title}`} onClick={() => setPendingDelete(book.id)} disabled={!!library.error}>删除</button></div>}
          </div>
        </li>)}</ul>}
    </section>
    <aside className="editor"><p className="eyebrow">MAKE ROOM FOR A GOOD BOOK</p><h2>{editingId ? '编辑书籍' : '添加一本书'}</h2>
      <form onSubmit={submit}>
        <fieldset disabled={!!library.error}>
          <label>书名 <span className="required">*</span><input ref={titleInput} required maxLength={200} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder="你想读哪本书？" /></label>
          <label>作者<input maxLength={120} value={draft.author} onChange={event => setDraft({ ...draft, author: event.target.value })} placeholder="作者的名字" /></label>
          <label>阅读状态<select value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value as ReadingStatus })}>{statuses.map(status => <option key={status}>{status}</option>)}</select></label>
          <label>备注<textarea maxLength={2000} rows={5} value={draft.notes} onChange={event => setDraft({ ...draft, notes: event.target.value })} placeholder="为什么想读，或是读到哪一页…" /></label>
          {error ? <p role="alert" className="error">{error}</p> : null}
          <button className="primary" type="submit">{editingId ? '保存修改' : '加入书架'}</button>
          {editingId ? <button className="cancel" type="button" onClick={resetDraft}>取消编辑</button> : null}
        </fieldset>
      </form><p className="storage-note">书籍信息保存在本机上。</p>
    </aside>
  </div>;
}
