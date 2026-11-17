# dsh-hdd

DeepSeek Harness 的 Fairy 皮肤与管家面板：**H.D.D. 开机影片、全息核心、玻璃侧边栏、输入区圆角、对话区背景、遮罩浓度、AGENT.md 人格编辑** —— 全部收在一个面板里，入口是 **设置 → HDD**。

仓库：<https://github.com/qitinyu/HDD> ｜ 版本：1.0.3 ｜ 许可：MIT（代码）

## 来源与二次开发声明

本仓库是对 [dsh-fairy-pack](https://github.com/qrq-qq/dsh-fairy-pack)（作者 qrq-qq，MIT）的**二次开发**.
[bilibili介绍视频](https://www.bilibili.com/video/BV1LBsQ6vENT/?share_source=copy_web&vd_source=6033adaa90d5b51ef75d809f5668308a)
也不是官方插件。对四个上游包合并、重写、裁剪后收成一个 `dsh-hdd`：

| 上游包 | 版本 | 作用 | 在本仓库中的去向 |
| --- | --- | --- | --- |
| `dsh-fairy-splash` | 1.0.34 | 皮肤主体：开机影片、全息核心、玻璃侧栏 | **并入**：逻辑内联进 `client.js`，素材改由本插件 `/hdd/v1/*` 提供 |
| `dsh-fairy-composer` | 1.0.1 | 输入区圆角 | **并入**：静态 CSS 并入 `client.js` |
| `dsh-agent-md` | 0.2.0 | 全局/项目人格文件与编辑界面 | **重写**：宿主侧改为 `ctx.systemPrompt.context()` 现读现注入，编辑界面并入 HDD 面板 |
| `dsh-fairy-voice` | 1.0.11 | GPT-SoVITS 语音播报 | **未采用**：依赖本地 TTS 运行时，本仓库不含 |

具体改动：

1. **四包合一**：一个 bundle、一条 host 插件行、一个设置页，取代原来的四个包和四处入口。
2. **资产自托管**：所有皮肤素材从 `/hdd/v1/*` 出，不再占用上游的 `/fairy-splash/v1/*` 命名空间。
3. **背景可换**：新增本地文件 / 网络 URL 两种背景来源，由宿主代取后同源输出，绕开 CORS 与 CSP。
4. **人格注入搬到宿主**：不再只在编辑时写文件，而是每次装配系统提示时现读 `~/.dsh/AGENT.md`，保存即生效、无需重启。
5. **核心可拆**：新会话页、对话区小眼睛、标题栏三颗全息核心各自独立开关。

`client.js` 里的皮肤部分是**生成物**（由一次性脚本把上游 factory 体原样包成内部函数再拼接）。生成脚本未随仓库保留——它是当时的工作草稿。**改皮肤请直接改 `client.js` 对应函数，不要指望重跑生成**。这条限制写在这里，免得下一个人去找一个不存在的 `build.cjs`。

## 安装

三种方式，按需要选一种。装完都要**刷新页面**（`Ctrl+R`）——皮肤与面板都是客户端代码。

### 1. 本地目录（自用推荐）

设置 → 插件 → **添加插件（Add plugin）** → 选择本仓库所在目录（含 `package.json` 的那一层）。

也可以在会话里让助手装：

```
plugin_manager  action=install_bundle  target=<本仓库绝对路径>
```

看到 `application: applied` 才算生效。本地目录安装是**链接**（`link:`），改完代码刷新页面即可，不用重装。

### 2. npm（要分发时）

```bash
npm publish --access public
```

然后按包名装：`plugin_manager action=install_bundle target=dsh-hdd@1.0.3`。

发布前必须处理两件事，否则是侵权分发：

- **把 `assets/*` 从 `package.json` 的 `files` 里删掉**。素材不是本仓库授权范围内的东西，见下节。
- 包名 `dsh-hdd` 若已被占用，改成带 scope 的名字，例如 `@your-name/dsh-hdd`，同时改 `cordis.patch.yml` 里的 `name` 字段。

### 3. 从 Git 仓库直装（推荐）

```bash
git clone https://github.com/qitinyu/HDD.git
```

克隆下来的目录（含 `package.json` 的那一层）按方式 1 安装即可。

## 素材（`assets/` 随仓库分发）

开机影片、封面、背景、图标都在 `assets/` 里，克隆即用，不需要另外找素材。

**权利状态说清楚：**

- 这些是《绝区零》(Zenless Zone Zero) 的**游戏美术素材**，版权归米哈游-绝区零（miHoYo / HoYoverse /ZZZ）及相关权利人，**不在本仓库的 MIT 许可范围内**。
- 本仓库只在**非商业**前提下分发与使用：个人学习、自用、非营利的二次开发。不得用于商业产品、付费分发、再授权或售卖。
- 需要商用，请自备或替换素材——文件名不变即可，代码不依赖素材内容。

| 文件 | 用途 | 建议尺寸 |
| --- | --- | --- |
| `boot.mp4` | 冷启动开机影片 | 1920×1080，H.264 |
| `poster.jpg` | 影片未播放时的封面 | 1920×1080 |
| `backdrop.png` | 新会话页背景 | 1920×1080 |
| `chat-bg.jpg` | 对话区默认背景 | 1920×1080 |
| `icon-512.png` / `icon-64.png` | 应用图标 | 512 / 64 方图 |
| `app.ico` / `tray.ico` | Windows 窗口与托盘图标 | 多尺寸 ico |

`npm run check:assets` 逐项校验存在且非空（不校验画面内容）。

**权利人若提出异议**：删掉 `assets/` 下对应文件、换成自己的图即可，插件代码不用动，功能照跑。

## 面板：设置 → HDD

| 分组 | 项 |
| --- | --- |
| 背景 | 来源（跟随皮肤 / 本地文件 / 网络 URL / 关闭）、路径或 URL、遮罩浓度 0–100%、背景固定 |
| 全息核心 | 新会话页（屏幕正中）、对话区（顶部小眼睛）、标题栏，三颗分别开关 |
| 人格 | 直接编辑 `AGENT.md`，保存写入 `~/.dsh/AGENT.md`，上一版留成 `.bak-hdd` |

配置存在浏览器 `localStorage`，换浏览器或清缓存会回到默认。

## 人格

`~/.dsh/AGENT.md` 是全局人格文件，本插件只负责读写与注入，**不拥有它**。插件删掉，人格文件还在；文件丢了，人格注入就自然停用（返回空字符串）。

注入顺序 260，包裹格式在 `index.js` 的 `apply()` 里，HTML 注释会被剥掉、不进上下文。

## 路由

| 路由 | 方法 | 用途 |
| --- | --- | --- |
| `/hdd/v1/boot.mp4`、`backdrop.png`、`poster.jpg`、`chat-bg.jpg`、`icon.png`、`icon-64.png`、`app.ico` | GET / HEAD | 皮肤资产 |
| `/hdd/v1/file?p=<绝对路径>` | GET / HEAD | 本地背景图 |
| `/hdd/v1/proxy?u=<http(s) 图片地址>` | GET / HEAD | 网络背景图（宿主代取） |
| `/hdd/v1/persona` | GET / HEAD / POST | 读写 `~/.dsh/AGENT.md` |

限制：图片仅 jpg/jpeg/png/webp/gif/avif/bmp，单张上限 12 MB，代理超时 15 s。

## 目录结构

```
dsh-hdd/
  index.js              宿主半身：资产路由、图片中转、人格读写与注入
  client.js             浏览器半身：皮肤（内联）+ 输入区 + 面板
  cordis.patch.yml      bundle 行：id=hdd, name=dsh-hdd
  icon.svg              插件图标
  locale/{zh,en}.json   标题与描述
  assets/               素材，不入库（见上）
  scripts/check-assets.mjs
```

## 已知限制

- 开机影片只在**冷启动**播一次，刷新不重播；想重看要退出 DSH 再开。
- 背景用 `background-attachment: fixed`；祖先节点带 `transform` / `filter` 时浏览器会降级成 `scroll`，表现为背景跟着内容滚。
- 客户端代码更新后必须刷新页面；面板内的开关是即时的。
- 语音播报不在本插件的范围内（上游 `dsh-fairy-voice` 未并入）。
- 卸载插件不会还原人格文件；需要复原就用 `~/.dsh/AGENT.md.bak-hdd` 覆盖。

## 许可与致谢

- 本仓库代码：**MIT**（见 `LICENSE`）。
- 上游 `dsh-fairy-pack` 代码：MIT，版权归 Fairy Pack；本次二次开发的来源与改动已在上文列明，见 `NOTICE.md`。
- 游戏相关美术与音色素材：版权归原权利人，**不随本仓库分发**，仅个人使用与学习。
- 与 DeepSeek、米哈游均无隶属关系；非官方插件，出问题不要找上游作者。