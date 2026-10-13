import { useState } from 'react';
import type { FormEvent } from 'react';
import { InAppBrowser, DefaultSystemBrowserOptions } from '@capacitor/inappbrowser';
import { HOME_URL } from '../shared';

// System browser views keep remote pages outside the app's privileged WebView.
export function MobileBrowserPage() {
  const [address, setAddress] = useState(HOME_URL);
  const [error, setError] = useState('');
  const [opening, setOpening] = useState(false);

  async function open(input: string) {
    setError('');
    setOpening(true);
    try {
      const trimmed = input.trim();
      const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
      if (input.length > 4096 || url.protocol !== 'https:' || url.username || url.password) throw new Error('网址无效');
      await InAppBrowser.openInSystemBrowser({ url: url.href, options: DefaultSystemBrowserOptions });
    } catch {
      setError('无法打开网页，请检查网络并使用有效的 HTTPS 网址。');
    } finally { setOpening(false); }
  }

  function navigate(event: FormEvent) {
    event.preventDefault();
    void open(address);
  }

  return <div className="mobile-browser">
    <p className="eyebrow">A LITTLE SPACE TO EXPLORE</p><h1>内置浏览器</h1>
    <p className="muted">网页会在应用内的系统浏览器中打开，关闭后回到书籍管理。登录由系统浏览器保存。</p>
    <form onSubmit={navigate}>
      <label htmlFor="mobile-address">网址<input id="mobile-address" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={address} onChange={event => setAddress(event.target.value)} /></label>
      <button className="primary" disabled={opening} type="submit">{opening ? '正在打开…' : '打开网页'}</button>
    </form>
    <button className="cancel" disabled={opening} onClick={() => void open(HOME_URL)}>DeepSeek 首页</button>
    <p role="alert" className="error">{error}</p>
  </div>;
}
