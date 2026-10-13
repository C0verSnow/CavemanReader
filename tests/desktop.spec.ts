import { _electron as electron, expect, test } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BOOKS_KEY } from '../src/books';

let desktop: ElectronApplication;
let page: Page;
let profile: string;

async function launch() {
  desktop = await electron.launch({ args: ['.', '--no-sandbox'], env: { ...process.env, CAVEMAN_TEST_PROFILE: profile } });
  page = await desktop.firstWindow();
  await expect(page.getByRole('heading', { name: '每一本，都有收获。' })).toBeVisible();
}

test.beforeEach(async () => {
  profile = await mkdtemp(join(tmpdir(), 'caveman-reader-'));
  await launch();
  // Keep CI deterministic: exercise native HTTPS navigation without relying on DeepSeek availability.
  await desktop.evaluate(({ session }) => {
    session.fromPartition('persist:deepseek').protocol.handle('https', request => new Response(
      `<html><head><title>${request.url.includes('next') ? '第二页' : 'DeepSeek 测试页'}</title></head><body><h1>测试网页</h1><a href="https://example.org/next">下一页</a></body></html>`,
      { headers: { 'content-type': 'text/html; charset=utf-8' } },
    ));
  });
});
test.afterEach(async () => {
  await desktop?.close();
  await rm(profile, { recursive: true, force: true });
});

test('新增、搜索、编辑、删除以及重启后保存', async ({}, testInfo) => {
  await page.getByRole('textbox', { name: '书名' }).fill('活着');
  await page.getByRole('textbox', { name: '作者', exact: true }).fill('余华');
  await page.getByLabel('阅读状态').selectOption('在读');
  await page.getByRole('textbox', { name: '备注' }).fill('读到第三章');
  await page.getByRole('button', { name: '加入书架' }).click();
  await expect(page.getByRole('heading', { name: '活着', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('library.png'), fullPage: true });
  await desktop.close();
  await launch();
  await expect(page.getByText('读到第三章')).toBeVisible();
  await page.getByRole('searchbox').fill('不存在');
  await expect(page.getByText('没有找到这本书')).toBeVisible();
  await page.getByRole('searchbox').fill('余华');
  await expect(page.getByRole('heading', { name: '活着', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '编辑 活着', exact: true }).click();
  await page.getByRole('textbox', { name: '书名' }).fill('活着（重读）');
  await page.getByLabel('阅读状态').selectOption('读完');
  await page.getByRole('button', { name: '保存修改' }).click();
  await expect(page.getByText('读完', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: '删除 活着（重读）', exact: true }).click();
  await page.getByRole('button', { name: '取消删除' }).click();
  await expect(page.getByRole('heading', { name: '活着（重读）', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '删除 活着（重读）', exact: true }).click();
  await page.getByRole('button', { name: '确定删除', exact: true }).click();
  await expect(page.getByRole('heading', { name: '活着（重读）', exact: true })).toHaveCount(0);
});

test('页面独立：草稿、默认网址、浏览历史和网页会话在切换时保留', async () => {
  await page.getByRole('textbox', { name: '书名' }).fill('尚未保存的草稿');
  await page.getByRole('button', { name: '内置浏览器', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '网址' })).toHaveValue('https://chat.deepseek.com/');
  await expect(page.getByRole('status')).toHaveText('DeepSeek 测试页');
  const remote = desktop.windows().find(window => window !== page)!;
  await expect(remote.getByRole('heading', { name: '测试网页' })).toBeVisible();
  expect(await remote.evaluate(() => ({ node: typeof (window as unknown as { process?: unknown }).process, bridge: typeof window.desktop }))).toEqual({ node: 'undefined', bridge: 'undefined' });
  await remote.evaluate(() => { localStorage.setItem('session-proof', 'retained'); });
  await remote.getByRole('link', { name: '下一页' }).click();
  await expect(page.getByRole('status')).toHaveText('第二页');
  await page.getByRole('button', { name: '后退', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('DeepSeek 测试页');
  await page.getByRole('button', { name: '前进', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('第二页');
  await page.getByRole('button', { name: 'DeepSeek 首页', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('DeepSeek 测试页');
  await page.getByRole('button', { name: '书籍管理', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '书名' })).toHaveValue('尚未保存的草稿');
  const hidden = await desktop.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    return win.contentView.children.filter(child => child !== win.contentView.children[0]).every(child => !child.getVisible());
  });
  expect(hidden).toBe(true);
  await page.getByRole('button', { name: '内置浏览器', exact: true }).click();
  expect(await remote.evaluate(() => localStorage.getItem('session-proof'))).toBe('retained');
  await page.getByRole('textbox', { name: '网址' }).fill('https://example.org/next');
  await page.getByRole('button', { name: '前往', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('第二页');
});

test('拦截危险网址并在加载失败时显示可重试提示', async () => {
  await page.getByRole('button', { name: '内置浏览器', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('DeepSeek 测试页');
  await page.getByRole('textbox', { name: '网址' }).fill('javascript:alert(1)');
  await page.getByRole('button', { name: '前往', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('有效的 HTTPS');
  await desktop.evaluate(({ session }) => {
    const protocol = session.fromPartition('persist:deepseek').protocol;
    protocol.unhandle('https');
    protocol.handle('https', () => Response.error());
  });
  await page.getByRole('button', { name: '刷新', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('请检查网络后重试');
});

test('损坏的书籍数据不会被自动覆盖', async () => {
  await page.evaluate(key => localStorage.setItem(key, '{broken'), BOOKS_KEY);
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('已暂停修改');
  await expect(page.getByRole('button', { name: '加入书架' })).toBeDisabled();
  expect(await page.evaluate(key => localStorage.getItem(key), BOOKS_KEY)).toBe('{broken');
});
