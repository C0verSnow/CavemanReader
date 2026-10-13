import { contextBridge, ipcRenderer } from 'electron';
import type { BrowserState, DesktopBridge } from '../src/shared.js';

const bridge: DesktopBridge = {
  setBrowserLayout: (layout) => ipcRenderer.invoke('browser:layout', layout),
  navigate: (url) => ipcRenderer.invoke('browser:navigate', url),
  command: (command) => ipcRenderer.invoke('browser:command', command),
  getBrowserState: () => ipcRenderer.invoke('browser:state'),
  onBrowserState: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, state: BrowserState) => listener(state);
    ipcRenderer.on('browser:changed', handler);
    return () => ipcRenderer.removeListener('browser:changed', handler);
  },
};
contextBridge.exposeInMainWorld('desktop', bridge);
