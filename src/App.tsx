import { useState } from 'react';
import { BooksPage } from './pages/BooksPage';
import { BrowserPage } from './pages/BrowserPage';

export function App() {
  const [page, setPage] = useState<'books' | 'browser'>('books');
  return <div className="app-shell">
    <header className="app-header"><div className="brand"><span className="brand-mark" aria-hidden="true">c.</span><div>Caveman Reader<small>读书，也探索。</small></div></div>
      <nav aria-label="主导航"><button aria-current={page === 'books' ? 'page' : undefined} onClick={() => setPage('books')}>书籍管理</button><button aria-current={page === 'browser' ? 'page' : undefined} onClick={() => setPage('browser')}>内置浏览器</button></nav>
      <span className="header-note">慢慢读，自由想。</span>
    </header>
    <main><section hidden={page !== 'books'} aria-label="书籍管理"><BooksPage /></section><section hidden={page !== 'browser'} aria-label="内置浏览器"><BrowserPage active={page === 'browser'} /></section></main>
  </div>;
}
