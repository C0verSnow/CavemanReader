import { app, BrowserWindow, ipcMain, session, WebContentsView } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { HOME_URL } from '../src/shared.js';
import type { BrowserBounds, BrowserCommand, BrowserState } from '../src/shared.js';

// The remote website never receives our preload or any Node.js capability.
let window: BrowserWindow | null = null;
let browser: WebContentsView | null = null;
let bounds: BrowserBounds = { x: 0, y: 0, width: 0, height: 0 };
let browserVisible = false;
let state: BrowserState = {
  url: HOME_URL, title: 'DeepSeek', loading: false,
  canGoBack: false, canGoForward: false, error: null,
};
const dev = process.argv.includes('--dev');
const rendererURL = dev ? 'http://127.0.0.1:5173/'
  : pathToFileURL(join(import.meta.dirname, '../../dist/index.html')).href;

function authorize(event: IpcMainInvokeEvent) {
  if (!window || event.sender !== window.webContents ||
      event.senderFrame !== window.webContents.mainFrame ||
      event.senderFrame.url !== rendererURL) {
    throw new Error('请求来源无效');
  }
}

function publish() {
  if (browser && !browser.webContents.isDestroyed()) {
    const contents = browser.webContents;
    state = { ...state, url: contents.getURL() || HOME_URL,
      title: contents.getTitle() || 'DeepSeek', loading: contents.isLoading(),
      canGoBack: contents.navigationHistory.canGoBack(),
      canGoForward: contents.navigationHistory.canGoForward() };
  }
  if (window && !window.webContents.isDestroyed()) window.webContents.send('browser:changed', state);
}

function normalizeURL(input: unknown): string {
  if (typeof input !== 'string' || input.length > 4096) throw new Error('请输入有效网址');
  const trimmed = input.trim();
  const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('仅支持不含账号密码的 HTTPS 网址');
  return url.href;
}

function fitBrowser() {
  if (!window || !browser) return;
  const [width, height] = window.getContentSize();
  const x = Math.min(width, Math.max(0, Math.round(bounds.x)));
  const y = Math.min(height, Math.max(0, Math.round(bounds.y)));
  const w = Math.max(0, Math.min(width - x, Math.round(bounds.width)));
  const h = Math.max(0, Math.min(height - y, Math.round(bounds.height)));
  browser.setBounds({ x, y, width: w, height: h });
  browser.setVisible(browserVisible && w > 0 && h > 0);
}

async function loadURL(url: string) {
  if (!browser) return;
  state = { ...state, error: null };
  try { await browser.webContents.loadURL(url); }
  catch (error) {
    // A newer navigation may cancel an older one; that is not a page failure.
    if (!(error instanceof Error && error.message.includes('ERR_ABORTED'))) {
      state = { ...state, error: '网页未能打开，请检查网络后重试。' };
    }
  }
  publish();
}

function ensureBrowser() {
  if (browser || !window) return;
  const remoteSession = session.fromPartition('persist:deepseek');
  remoteSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  remoteSession.setPermissionCheckHandler(() => false);
  remoteSession.on('will-download', (event) => {
    event.preventDefault();
    state = { ...state, error: '暂不支持在内置浏览器中下载文件。' };
    publish();
  });
  browser = new WebContentsView({ webPreferences: {
    partition: 'persist:deepseek', nodeIntegration: false, contextIsolation: true,
    sandbox: true, webSecurity: true, allowRunningInsecureContent: false,
  } });
  window.contentView.addChildView(browser);
  const contents = browser.webContents;
  const guardNavigation = (event: Electron.Event, url: string) => {
    try { normalizeURL(url); } catch { event.preventDefault(); }
  };
  contents.on('will-navigate', guardNavigation);
  contents.on('will-redirect', guardNavigation);
  contents.setWindowOpenHandler(({ url }) => {
    try { void loadURL(normalizeURL(url)); } catch { /* Reject unsupported schemes. */ }
    return { action: 'deny' };
  });
  contents.on('did-start-loading', () => { state = { ...state, error: null }; publish(); });
  contents.on('did-stop-loading', publish);
  contents.on('did-navigate', publish);
  contents.on('did-navigate-in-page', publish);
  contents.on('page-title-updated', publish);
  contents.on('did-fail-load', (_event, code, _description, _url, isMainFrame) => {
    if (isMainFrame && code !== -3) {
      state = { ...state, error: '网页未能打开，请检查网络后重试。' };
      publish();
    }
  });
  contents.on('render-process-gone', () => {
    state = { ...state, loading: false, error: '网页进程已退出，请点击刷新重新打开。' };
    publish();
  });
  fitBrowser();
  void loadURL(HOME_URL);
}

ipcMain.handle('browser:layout', (event, layout: unknown) => {
  authorize(event);
  if (!layout || typeof layout !== 'object' || !('visible' in layout) ||
      typeof layout.visible !== 'boolean' || !('bounds' in layout) ||
      !layout.bounds || typeof layout.bounds !== 'object') throw new Error('页面布局无效');
  const rect = layout.bounds as BrowserBounds;
  if (![rect.x, rect.y, rect.width, rect.height].every(value => typeof value === 'number' && Number.isFinite(value))) {
    throw new Error('页面尺寸无效');
  }
  bounds = rect;
  browserVisible = layout.visible;
  if (browserVisible) ensureBrowser();
  fitBrowser();
});
ipcMain.handle('browser:state', event => { authorize(event); return state; });
ipcMain.handle('browser:navigate', async (event, url: unknown) => {
  authorize(event);
  const safeURL = normalizeURL(url);
  ensureBrowser();
  await loadURL(safeURL);
});
ipcMain.handle('browser:command', (event, command: BrowserCommand) => {
  authorize(event);
  if (!['back', 'forward', 'reload', 'home'].includes(command)) throw new Error('浏览器操作无效');
  ensureBrowser();
  if (!browser) return;
  const contents = browser.webContents;
  switch (command) {
    case 'back': if (contents.navigationHistory.canGoBack()) contents.navigationHistory.goBack(); break;
    case 'forward': if (contents.navigationHistory.canGoForward()) contents.navigationHistory.goForward(); break;
    case 'reload': contents.reload(); break;
    case 'home': void loadURL(HOME_URL); break;
  }
});

function createWindow() {
  state = { url: HOME_URL, title: 'DeepSeek', loading: false, canGoBack: false, canGoForward: false, error: null };
  browserVisible = false;
  window = new BrowserWindow({ width: 1180, height: 800, minWidth: 800, minHeight: 600,
    backgroundColor: '#f5f3ee', title: 'Caveman Reader',
    webPreferences: { preload: join(import.meta.dirname, 'preload.cjs'),
      nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== rendererURL) event.preventDefault();
  });
  window.on('resize', fitBrowser);
  window.on('closed', () => {
    if (browser && !browser.webContents.isDestroyed()) browser.webContents.close();
    browser = null;
    window = null;
  });
  void window.loadURL(rendererURL);
}

// Tests use an isolated profile; users keep their normal data between launches.
if (process.env.CAVEMAN_TEST_PROFILE) app.setPath('userData', process.env.CAVEMAN_TEST_PROFILE);
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (!window) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
