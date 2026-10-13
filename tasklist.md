# 本文档为4象限的任务清单，全文书写大白话

## 想做：
- 完成 issue #3：发布 Release 时自动生成 Linux deb、Windows exe、Android apk 和 iOS ipa，并上传到对应 Release。
- 用户已确认四个平台都做，手机端需要适配；后续明确 iOS 只生成未签名 IPA，用全能签自行签名。
- 完成 issue #1：做一个桌面应用，可以管理书籍，也可以在应用里打开 DeepSeek。
- 在 feature 分支提交改动，更新使用说明，提交 PR，并通过远端检查后关闭 issue。此任务已完成。

## 做完：
- 已同步 GitHub 仓库，确认原仓库只有 README，没有现成代码或检查流程。
- 已阅读 issue #1，用户确认选择桌面应用。
- 已创建 feature/issue-1-desktop-reader 分支。
- 已实现书籍增删改查、搜索、本机保存和损坏数据保护。
- 已实现原生内置浏览器、导航工具栏、页面切换和会话保留。
- 已补充远端 CI、数据校验与桌面功能测试、使用说明。
- 已提交草稿 PR #2。首次远端检查发现事件注册的类型错误，已修正。
- 已从远端安装结果取得依赖锁定文件，后续使用锁定版本安装。
- issue #3 已新增 Linux deb、Windows exe、Android apk、iOS 未签名 ipa 的自动打包与 Release 上传流程。
- issue #3 已新增 Capacitor 手机端入口、窄屏和安全区域布局，并补充手机书架保存、浏览器原生接口与危险网址拦截测试。
- 已更新依赖锁定文件，安装时只解析依赖并禁用安装脚本，没有执行本地编译。
- 已创建草稿 PR #4：https://github.com/C0verSnow/CavemanReader/pull/4 。
- 第二轮远端检查已通过：类型检查、构建和 5 项自动测试全部通过。
- 最后代码检查补充了开发模式热更新脚本的授权，并增加开发启动测试。
- 最终功能代码 a42dc8e 的远端类型检查、构建和全部 6 项测试通过：https://github.com/C0verSnow/CavemanReader/actions/runs/38339685709 。
- 已查看远端生成的书籍页面截图，显示正常。
- PR #2 已从草稿改为可评审：https://github.com/C0verSnow/CavemanReader/pull/2 。
- issue #1 已按要求关闭，PR 保留待评审，没有合并到 main。

## 没做：
- 按用户约定，不进行本地构建、编译或会触发编译的测试。
- 书籍同步和桌面内置网页下载功能仍未实现。
- 真实 DeepSeek 登录需用户联网操作，自动测试使用固定网页。

## 在做：
- 已读取 issue #3 和现有代码，从最新 main 创建 feature/issue-3-multiplatform-release 分支。
- 等待 PR #4 的远端桌面测试和四平台试打包；iOS 不读取任何签名证书。
- 首轮远端桌面类型检查、构建和测试通过。Android 环境安装失败：第三方 action 默认安装已下架的 tools 包；已改成明确安装 SDK 36 和构建工具，继续远端验证。
- 首轮 Linux deb、Windows exe、iOS 未签名 IPA 已实际生成；已查看远端手机页面截图，窄屏没有横向溢出，并把保存位置文案改成“本机”。
- 仅修改 Markdown 文档时不再重复试打包，Release 发布和手动打包不受影响。
- Android 先生成可安装的调试签名包，说明了不能保证覆盖升级的限制；正式商店签名尚未加入。
