# PIP-Player

适用于 Microsoft Edge 的画中画视频扩展。点击工具栏图标或按 **Alt+P**，打开或关闭画中画。

## 下载与安装

从 [Releases](https://github.com/lexxsl/PIP-Player/releases/latest) 下载 `PIP-Player.zip`，解压到一个保留使用的文件夹。在 Edge 打开 `edge://extensions`，开启开发人员模式，选择“加载解压缩的扩展”，再选择包含 `manifest.json` 的文件夹。

Edge 扩展商店版本 2.1.1 已提交审核，当前尚未上架。审核通过后补充商店链接。

## 功能

- 选择页面中可用的最大视频，支持符合条件的嵌入式视频。
- 优先使用 Document Picture-in-Picture，不支持时尝试传统视频画中画。
- 在本机保存窗口宽度和高度，供新标签页和其他网站再次打开时复用。
- 在支持的页面上切换视频时保持完整画面和原始比例。

窗口位置由浏览器管理，不保证跨标签页或跨网站恢复到相同坐标。浏览器内部页面、部分网站和受保护媒体可能无法使用。无需外部辅助程序。

## 隐私与权限

扩展不收集或上传用户数据，不包含广告、分析统计或远程可执行代码。仅在当前浏览器配置中保存窗口宽高。详情见 [隐私政策](PRIVACY.md)。

`scripting` 用于在用户调用扩展后注入本地视频控制代码；`storage` 用于保存窗口尺寸；HTTP/HTTPS 网站权限用于查找和控制网页及嵌入框架中的视频。

## 版本 2.1.1

采用新的播放器图标，保留 2.1.0 的尺寸记忆与切换视频画面修复。

## 许可与来源

基于 Picture-in-Picture Everywhere 1.10，原始 JavaScript 版权所有 Google LLC，采用 Apache License 2.0。保留 [LICENSE](LICENSE) 与 [NOTICE](NOTICE)。新版图标由用户提供并授权使用。本项目与 Google 或原始扩展作者不存在隶属或背书关系。

## English

An Edge picture-in-picture extension. Click the toolbar button or press Alt+P to toggle the player. It selects the largest available video, prefers Document PiP, and falls back to traditional video PiP when needed. Window dimensions are stored locally and reused across tabs. Exact window position across tabs or websites is not guaranteed. The extension does not collect or transmit user data.

Download `PIP-Player.zip` from Releases, extract it, and load the folder containing `manifest.json` through Edge's extensions developer mode. The store version is currently under review.
