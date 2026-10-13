export const HOME_URL = 'https://chat.deepseek.com';

export interface BrowserState {
  url: string;
  title: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  error: string | null;
}

export interface BrowserBounds { x: number; y: number; width: number; height: number }
export type BrowserCommand = 'back' | 'forward' | 'reload' | 'home';
export interface DesktopBridge {
  setBrowserLayout(layout: { visible: boolean; bounds: BrowserBounds }): Promise<void>;
  navigate(url: string): Promise<void>;
  command(command: BrowserCommand): Promise<void>;
  getBrowserState(): Promise<BrowserState>;
  onBrowserState(listener: (state: BrowserState) => void): () => void;
}
