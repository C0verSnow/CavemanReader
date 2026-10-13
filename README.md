# Caveman Reader

用 React + TypeScript + Electron 构建的桌面应用。包含两个独立页面：书籍管理和内置浏览器。

## 功能

- 书籍管理：展示、新增、编辑、删除书籍，支持书名、作者、阅读状态、备注和搜索。删除前需要确认。
- 本机保存：新增、编辑和删除立即保存，退出重开后仍然保留。数据读取失败时暂停修改，避免覆盖原数据；保存失败时保留草稿并提示重试。
- 内置浏览器：首次进入时打开 <https://chat.deepseek.com>，支持 HTTPS 地址、后退、前进、刷新和返回首页。
- 独立切换：书籍草稿和搜索条件不会因切换页面丢失；浏览器页面隐藏时保留当前网页和会话。

## 开发与启动

需要 Node.js 24 和 npm，以及支持 Electron 的 macOS、Windows 或 Linux 桌面环境。

```sh
npm ci
npm run dev
```

开发模式在 `127.0.0.1:5173` 提供 React 页面，并启动 Electron。关闭开发命令会同时关闭两个进程。

以下命令供用户手动运行或远端 CI 使用；本仓库约定禁止代理进行本地编译验证。

```sh
npm run build     # 类型检查、React 构建和 Electron TypeScript 编译
npm start         # 打开上一步生成的桌面应用
npm test          # 在已构建代码上执行单元测试和 Electron 功能测试
```

Linux 无桌面环境时使用 `xvfb-run -a npm test`。当前版本从源码启动，尚未生成安装包。

## 自动检查

`.github/workflows/ci.yml` 在 feature 分支推送和 PR 时执行安装依赖、类型检查、构建和测试，并保留测试报告。测试覆盖书籍增删改查、重启持久化、损坏数据保护、页面切换、浏览历史、远程页面隔离、危险网址拦截和网络失败提示。

浏览器功能测试通过 Electron 的协议处理器返回固定 HTTPS 测试网页，不依赖 DeepSeek 的网络状态或账号。测试通过不能证明 DeepSeek 当前在线或登录成功；实际使用需联网，并在内置页面自行登录。当前不支持下载文件和摄像头、麦克风等额外网站权限。

## 数据位置

书籍保存在应用本地页面的 localStorage 中，键名为 `caveman-reader:books:v1`。浏览器使用独立的 `persist:deepseek` 会话保存登录状态。两者均位于 Electron 的用户数据目录（默认目录名称为 `caveman-reader`）：

- macOS：`~/Library/Application Support/caveman-reader`
- Windows：`%APPDATA%/caveman-reader`
- Linux：`~/.config/caveman-reader`

备份时请退出应用并复制整个目录。数据损坏时先备份，再通过应用开发者工具检查上述 localStorage 键；程序不会自动清空损坏的数据。书籍信息目前不支持跨设备同步。

## 代码结构

```text
src/App.tsx                 页面导航，保留两个页面的状态
src/pages/BooksPage.tsx      书籍展示和编辑
src/books.ts                书籍校验与本机存储
src/pages/BrowserPage.tsx    浏览器工具栏和原生网页区域布局
src/shared.ts               主进程与 React 之间的类型约定
electron/main.ts            窗口、WebContentsView、导航和 IPC 校验
electron/preload.cts        向本地 React 暴露有限的浏览器操作
tests/                      数据校验与桌面功能测试
```

内置网页使用 [Electron WebContentsView](https://www.electronjs.org/docs/latest/api/web-contents-view)，不使用 iframe；按 [Electron 安全指南](https://www.electronjs.org/docs/latest/tutorial/security)关闭远程网页的 Node.js 权限，开启沙箱和上下文隔离，校验 IPC 来源，并限制顶层导航为 HTTPS。第三方网页无法访问书籍页面的桥接接口。
