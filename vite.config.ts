import { randomBytes } from 'node:crypto';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => {
  // React Refresh injects an inline development preamble. Authorize only that
  // server's generated scripts; the production build keeps script-src 'self'.
  const nonce = command === 'serve' ? randomBytes(24).toString('base64') : undefined;
  return {
    base: './',
    html: { cspNonce: nonce },
    plugins: [react(), {
      name: 'development-csp',
      transformIndexHtml: {
        order: 'pre',
        handler: html => nonce ? html.replace("script-src 'self'", `script-src 'self' 'nonce-${nonce}'`) : html,
      },
    }],
    server: { port: 5173, strictPort: true },
  };
});
