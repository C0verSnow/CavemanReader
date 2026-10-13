import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('手机书架保留数据，浏览器使用原生接口并拦截危险地址', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  // Simulate the Capacitor native boundary, not the external website.
  await page.addInitScript(() => {
    Object.assign(window, {
      androidBridge: {},
      openedURLs: [] as string[],
      Capacitor: {
        PluginHeaders: [{ name: 'InAppBrowser', methods: [{ name: 'openInSystemBrowser', rtype: 'promise' }] }],
        nativePromise: async (_plugin: string, _method: string, options: { url: string }) => {
          (window as unknown as { openedURLs: string[] }).openedURLs.push(options.url);
        },
      },
    });
  });
  await page.goto('http://127.0.0.1:5173');
  await page.getByRole('textbox', { name: '书名' }).fill('手机阅读');
  await page.getByRole('button', { name: '加入书架' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: '手机阅读', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('mobile-library.png'), fullPage: true });
  await page.getByRole('button', { name: '内置浏览器', exact: true }).click();
  await page.getByRole('button', { name: 'DeepSeek 首页' }).click();
  expect(await page.evaluate(() => (window as unknown as { openedURLs: string[] }).openedURLs)).toEqual(['https://chat.deepseek.com/']);
  await page.getByLabel('网址', { exact: true }).fill('javascript:alert(1)');
  await page.getByRole('button', { name: '打开网页', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('有效的 HTTPS');
  expect(await page.evaluate(() => (window as unknown as { openedURLs: string[] }).openedURLs)).toHaveLength(1);
  await page.getByRole('button', { name: '书籍管理', exact: true }).click();
  await expect(page.getByRole('heading', { name: '手机阅读', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
