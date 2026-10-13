import { _electron as electron, expect, test } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('开发模式可以加载 React 并连接本地浏览器接口', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'caveman-dev-'));
  const desktop = await electron.launch({ args: ['.', '--dev', '--no-sandbox'], env: { ...process.env, CAVEMAN_TEST_PROFILE: profile } });
  try {
    const page = await desktop.firstWindow();
    await expect(page.getByRole('heading', { name: '每一本，都有收获。' })).toBeVisible();
    expect((await page.evaluate(() => window.desktop.getBrowserState())).url).toBe('https://chat.deepseek.com');
    await page.getByRole('textbox', { name: '书名' }).fill('开发模式测试');
    await page.getByRole('button', { name: '加入书架' }).click();
    await expect(page.getByRole('heading', { name: '开发模式测试', exact: true })).toBeVisible();
  } finally {
    await desktop.close();
    await rm(profile, { recursive: true, force: true });
  }
});
