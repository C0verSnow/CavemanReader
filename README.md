# Caveman Reader

用 React + TypeScript 构建的书籍管理应用。桌面端使用 Electron，Android 和 iOS 使用 Capacitor。包含书籍管理和内置浏览器。

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

Linux 无桌面环境时使用 `xvfb-run -a npm test`。

## 安装包与自动发布

`.github/workflows/release.yml` 在 GitHub Release **发布**时构建以下文件，全部构建成功后一起上传到触发流程的 Release。草稿 Release 不触发构建。工作流从 Release 的标签取代码，因此发布的标签必须包含本次新增的工作流和代码；旧标签无法使用新配置。

| 平台 | 文件 | 说明 |
| --- | --- | --- |
| Linux x64 | `.deb` | Debian / Ubuntu 安装包 |
| Windows x64 | `.exe` | NSIS 安装程序，没有 Windows 代码签名 |
| Android 9+ | `CavemanReader-android-debug.apk` | 可安装的调试签名包，供个人试用；不是商店发行包 |
| iOS 15+ | `CavemanReader-ios-unsigned.ipa` | 真机 Release 构建，未签名；下载后用全能签自行签名安装 |

不需要配置 Apple 证书。IPA 内含 `Payload/App.app`，不经过需要证书的 Xcode 导出步骤。未签名 IPA 不能直接安装，签名工具与设备兼容性需实际安装确认。

Android 目前使用构建机的临时调试签名，不同构建之间可能无法直接覆盖安装。卸载会删除本机书籍数据，升级前请先备份；正式发行时需要改用固定的私有签名密钥。

PR 会在 GitHub 远端试打四个平台的安装包，结果保留在 Actions 的 `package-*` artifacts 中 7 天，不上传到 Release。合并后也可以在 Actions → **Build release packages** → **Run workflow** 手动试打包；手动运行同样只保存 artifacts。真正发布时，先修改 `package.json` 中的版本号，再创建对应标签并发布 Release（例如 `v0.2.0`）。失败时修复构建问题后重新运行失败的流程；上传会替换同名文件。

手机端复用书籍的增删改查、搜索和本机保存，布局适应窄屏和安全区域。网页通过 Capacitor 的[应用内系统浏览器](https://capacitorjs.com/docs/apis/inappbrowser)打开，关闭后回到原页面，第三方网页不进入保存书籍的应用 WebView。浏览历史和登录由系统浏览器管理，手机端不提供桌面端的网页常驻区域与前进、刷新工具栏。iOS 系统浏览器是否保留特定网站登录需实机确认。

手机端书籍保存在应用 WebView 的 localStorage；它与桌面端的数据不互通，清理应用数据或卸载会删除书籍。当前不支持跨设备同步。

原生手机工程由锁定版本的 Capacitor 模板在 CI 中生成，`android/` 和 `ios/` 不入库。远端分别使用 JDK 21 / Android SDK 36，以及 macOS 26 / Xcode 26。打包命令供用户手动运行或远端 CI 使用：

```sh
npm run package:desktop -- --linux --x64  # 在 Linux 构建 deb
npm run package:desktop -- --win --x64    # 在 Windows 构建 exe
npm run build:web
npm run mobile:prepare -- android        # 生成和同步 Android 工程
npm run mobile:prepare -- ios            # 在 macOS 生成和同步 iOS 工程
```

Android Gradle 和 iOS 未签名归档、IPA 封装命令详见 `release.yml`。原生工程的版本名称取自 `package.json`，构建编号取自 GitHub Actions 的运行编号。

## 自动检查

`.github/workflows/ci.yml` 在 feature 分支推送和 PR 时执行安装依赖、类型检查、构建和测试，并保留测试报告。测试覆盖开发模式启动、书籍增删改查、重启持久化、损坏数据保护、页面切换、浏览历史、远程页面隔离、危险网址拦截和网络失败提示。

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
