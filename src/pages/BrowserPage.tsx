import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { HOME_URL } from '../shared';
import type { BrowserCommand, BrowserState } from '../shared';

const initialState: BrowserState = { url: HOME_URL, title: 'DeepSeek', loading: false, canGoBack: false, canGoForward: false, error: null };

export function BrowserPage({ active }: { active: boolean }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [state, setState] = useState(initialState);
  const [address, setAddress] = useState(HOME_URL);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    const update = (next: BrowserState) => {
      if (!live) return;
      setState(next);
    };
    const unsubscribe = window.desktop.onBrowserState(update);
    void window.desktop.getBrowserState().then(update).catch(() => { if (live) setError('无法连接内置浏览器。'); });
    return () => { live = false; unsubscribe(); };
  }, []);

  useEffect(() => { setAddress(state.url); }, [state.url]);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const sync = () => {
      const rect = element.getBoundingClientRect();
      void window.desktop.setBrowserLayout({ visible: active, bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } })
        .catch(() => setError('浏览器布局更新失败，请切换页面后重试。'));
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(element);
    window.addEventListener('resize', sync);
    return () => { observer.disconnect(); window.removeEventListener('resize', sync); };
  }, [active]);

  async function command(action: BrowserCommand) {
    setError('');
    try { await window.desktop.command(action); }
    catch { setError('浏览器操作失败，请重试。'); }
  }
  async function navigate(event: FormEvent) {
    event.preventDefault(); setError('');
    try { await window.desktop.navigate(address); }
    catch { setError('无法打开该网址，请使用有效的 HTTPS 网址。'); }
  }

  return <div className="browser-page">
    <div className="browser-heading"><div><p className="eyebrow">A LITTLE SPACE TO EXPLORE</p><h1>内置浏览器</h1></div><p className="muted">从一个问题，走向新的想法。</p></div>
    <div className="browser-toolbar">
      <button aria-label="后退" disabled={!state.canGoBack} onClick={() => void command('back')}>←</button>
      <button aria-label="前进" disabled={!state.canGoForward} onClick={() => void command('forward')}>→</button>
      <button aria-label="刷新" onClick={() => void command('reload')}>↻</button>
      <button onClick={() => void command('home')}>DeepSeek 首页</button>
      <form onSubmit={navigate}><label className="sr-only" htmlFor="address">网址</label><input id="address" value={address} onChange={event => setAddress(event.target.value)} spellCheck={false} /><button type="submit">前往</button></form>
    </div>
    <div className="browser-status"><span role="status">{state.loading ? '正在加载…' : state.title}</span><span role="alert" className="error">{error || state.error}</span></div>
    <div ref={viewport} className="browser-viewport" aria-label="内置网页显示区域" />
  </div>;
}
