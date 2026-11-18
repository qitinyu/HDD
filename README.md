# dsh-hdd

DeepSeek Harness 的 Fairy 皮肤与管家面板：**H.D.D. 开机影片、全息核心、玻璃侧边栏、输入胶囊、对话区背景、遮罩浓度、AGENT.md 人格编辑** —— 全部收在一个面板里，入口是 **设置 → HDD**。

仓库：<https://github.com/qitinyu/HDD> ｜ 版本：2.0.0 ｜ 许可：MIT（代码）

## 来源与二次开发声明

本仓库是对 [dsh-fairy-pack](https://github.com/qrq-qq/dsh-fairy-pack)（作者 qrq-qq，MIT）的**二次开发**.
[bilibili介绍视频](https://www.bilibili.com/video/BV1LBsQ6vENT/?share_source=copy_web&vd_source=6033adaa90d5b51ef75d809f5668308a)
也不是官方插件。对四个上游包合并、重写、裁剪后收成一个 `dsh-hdd`：

| 上游包 | 版本 | 作用 | 在本仓库中的去向 |
| --- | --- | --- | --- |
| `dsh-fairy-splash` | 1.0.44 | 皮肤主体：开机影片、全息核心、玻璃侧栏 | **并入**：逻辑内联进 `client.js`，素材改由本插件 `/hdd/v1/*` 提供 |
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

然后按包名装：`plugin_manager action=install_bundle target=dsh-hdd@2.0.0`。

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
| 输入区 | 输入框背景（蓝色亚克力 / 白色亚克力） |
| 全息核心 | 新会话页（屏幕正中）、对话区（顶部小眼睛）、标题栏，三颗分别开关 |
| 人格 | 直接编辑 `AGENT.md`，保存写入 `~/.dsh/AGENT.md`，上一版留成 `.bak-hdd` |

配置存在浏览器 `localStorage`，换浏览器或清缓存会回到默认。

## 背景为什么铺得满

对话区那张图挂在主栏 `[data-slot="main"]` 上，不在对话列表里。主栏是布局格子、高度本来就到窗口底边，所以图一直铺到最下面，滚到底也不会在输入框下方露出一块深底。输入区座位从 2.0.0 起不再画任何背景——宿主原先给它刷的 `linear-gradient(180deg, transparent 0px, bg-base 36px)` 配上 `margin-top:auto`，正是那块深底的来源。

面板里的「背景固定」关掉时，图改挂到对话内容上，随消息一起滚。

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
| `/hdd/v1/probe` | POST | 皮肤诊断落盘，默认关闭（见下） |

限制：图片仅 jpg/jpeg/png/webp/gif/avif/bmp，单张上限 12 MB，代理超时 15 s。

## 改了代码怎么生效（重载）

`link:` 装法下 DSH 直接读仓库目录，不用重装，但两类代码的生效方式不同：

| 改的文件 | 生效方式 |
| --- | --- |
| `client.js`（皮肤、面板、注入的 CSS） | 重载页面 |
| `index.js`（路由、人格注入、探针） | `remove_bundle` → `install_bundle`，宿主模块缓存不会自己更新 |

**Windows 桌面客户端里重载页面**：`Ctrl+R` 无效——生产构建的应用菜单里根本没有 reload 项（`reloadPageMenu` / `restartAppHostMenu` 被 `...development ? [...] : []` 挡掉了），只剩一个隐藏的 `toggleDevTools`。可用的三条路：

1. 标题栏的菜单按钮 → **开发者工具**（这一项在生产构建里是无条件保留的）→ 在开发者工具窗口里按 `F5` / `Ctrl+R`，或在 Console 里执行 `location.reload()`。
2. `F12`：注册成了隐藏加速键，主窗口的 `webPreferences.devTools` 是 `true`，没被禁。焦点在输入框里时按键可能被吞掉，先点一下窗口空白处再按。
3. 退出客户端再打开：窗口的 × 只是隐藏到托盘，真正退出要点托盘图标的「退出」（或同一菜单里的「退出」），然后重新启动。

页面 URL 是 `dsh-app://app/`，由主进程注册的自定义协议，**不能用浏览器打开 `http://127.0.0.1:<port>` 代替**——那个端口是后端服务，直接访问还会 401。

## 诊断（`/hdd/v1/probe`）

宿主的类名带构建哈希，靠肉眼又看不出是哪一层在画底色，改皮肤时只能靠猜。所以留了一条自用的诊断通道：客户端加载 2.5 s 后，把输入区座位（`[data-composer-seat]`）的元素链、计算样式（`background-color` / `background-image` / `box-shadow` / `padding`）、以及几个采样点上 `elementsFromPoint` 的层叠结果 POST 给宿主，宿主落盘成 JSON。

**默认不生效**：只有仓库根目录存在 `.probe/ENABLED` 时宿主才收，否则一律 404，页面里没有任何多余请求结果。要临时打开：

```bash
mkdir -p .probe && echo 1 > .probe/ENABLED   # Windows: New-Item -ItemType Directory .probe
```

报告写到 `.probe/report-<时间戳>.json`，最新的另存一份 `.probe/latest.json`。`.probe/` 已在 `.gitignore` 里，不会入库。排查完删掉 `ENABLED` 即可关回去。

### 翻安装包找类名（`scripts/asar-peek.cjs`）

CSS Module 的类名带构建哈希，会随版本变；**稳定的是宿主自己的 `data-*` 属性**（如 `[data-composer-seat]`、`[data-conversation-scroll]`），优先用属性选择器。非要用类名时，从安装包里翻：

```bash
# 在 app.asar 原始字节里搜关键字，打印前后 400 字节上下文
node scripts/asar-peek.cjs scan "C:/Users/<you>/AppData/Local/Programs/.../resources/app.asar" composerSeat

# 按扩展名把文件解出来（只解 .css 之类，避免摊开两百兆）
node scripts/asar-peek.cjs extract "C:/.../app.asar" .tmp-asar .css
```

`asar` 里的文件是原样存放的，所以 `scan` 不需要解包。Windows 上安装包一般在 `%LOCALAPPDATA%\Programs\<app>\resources\app.asar`。

## 目录结构

```
dsh-hdd/
  index.js              宿主半身：资产路由、图片中转、人格读写与注入
  client.js             浏览器半身：皮肤（内联）+ 输入区 + 面板
  cordis.patch.yml      bundle 行：id=hdd, name=dsh-hdd
  icon.svg              插件图标
  locale/{zh,en}.json   标题与描述
  assets/               素材，随仓库分发（版权见上）
  scripts/check-assets.mjs
  scripts/asar-peek.cjs 诊断工具：翻 app.asar 找类名 / 解 CSS
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