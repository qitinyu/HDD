# 变更记录

版本号遵循语义化：`主.次.修`。皮肤或面板行为改变升次版本，纯文案与打包调整升修订号。

## 2.0.0

- **背景换了承载面**：对话区背景不再挂在对话列表里的 `.V4vHZW_root` 上，改挂到 `[data-slot="main.conversation"] > [data-phase]`（conversation root）。它是唯一真正有盒子、高度从标题栏下沿到窗口底边的元素——`[data-slot="main"]` 与 `[data-slot="main.conversation"]` 这两层包装都是 `display: contents`、盒子 0×0，图挂在它们身上等于没画。左上角与旧锚点一致，构图不变。
- **输入区座位不再画背景**：`[data-composer-seat]` / `[class*="_composerSeat"]` / `[class*="_composerStack"]` 无条件 `background: none`、`box-shadow: none`。宿主的 `linear-gradient(180deg, transparent 0px, bg-base 36px)` 配上撑到柱底的 `margin-top:auto`，正是此前「滚到底出现深色块」的机制；1.0.4 只清 `background-color`，清不掉这条走 `background-image` 的渐变。
- **下线「灰底外框」开关**：座位永久透明，`band` 状态、读档迁移、面板开关、根属性 `data-hdd-band` 与两条灰底规则一并删除。
- **命名空间归位**：`data-fairy-*` / `--fairy-*` 全部改为 `data-hdd-*` / `--hdd-*`，模块 id 与 effect 标签改为 `dsh-hdd` / `hdd:`；新增根属性 `data-hdd-version`。上游包名 `dsh-fairy-splash` 只留在版权说明里。
- 探针（`/hdd/v1/probe`）扩展：额外回传 `canvas` / `body` / `main` / `backdrop`（承载面本身）的计算样式，以及 `foot`（滚动位置、座位底边、窗口最底部左中右多点 `elementsFromPoint` 的层叠结果）。`foot` 会先把滚动条拉到底再量、量完还原。
- 面板说明文案同步：不再提「输入区外框」。
- **开发期自动重载**：新增 `/hdd/v1/stamp`（`client.js` 的 mtime + size 指纹，与探针一样由 `.probe/ENABLED` 把关）。页面半身每四秒问一次，指纹一变就自己 `location.reload()`，省掉「改完样式还得手动进开发者工具按 F5」。npm 安装的包没有 `.probe/`，一律 404，静默停摆。
- **新增插件市场索引**：`scripts/market-index.mjs` 生成 format 1 索引（`market/market-index.json`），随包发布并由新的 `/hdd/v1/market-index.json` 路由对外提供，所以索引永远和插件版本同步、不依赖第三方托管。发布到 npm 后，装上官方实验性市场组合包即可在「发现」页搜到并安装；更新走「已安装」页的版本区块。
- **运行版本要求 `engines.dsh: ">=0.2.2-0"`**：2.0.0 的背景承载面依赖 `[data-slot="main.conversation"] > [data-phase]`，更旧的宿主没有这层结构。下限写成 `-0` 并非笔误——`>=0.2.0` 在 semver 默认语义下会把正在跑的 `0.2.2-rc.3` 判成不满足（预发布版本只在比较元组一致且带预发布标记时才被接受），那会让市场显示「需要更新 DSH」而实际又能装。
- **新增 `scripts/check-index.mjs`**：直接从 `app.asar` 取出市场索引的真校验器（连带里面那份 `semver`）跑一遍 `parseMarketIndex`，不需要 `npm install`。上面那处 `engines.dsh` 陷阱就是它抓出来的——README 只讲行为，写错字段不会自己报错。
- 索引里 `source` 显式钉 `registry = https://registry.npmjs.org`：本机 pnpm 默认走 npmmirror，镜像同步新包有延迟，发布后立刻点安装会撞 404。
- **远程背景图落盘缓存（`/hdd/v1/proxy`）**：中转超时从 15 秒放宽到 45 秒，成功的响应写入 `.cache/`（正文 + 元信息，按 URL 的 sha1 命名，30 天过期），命中时本地直出并带 `immutable`。原因见下一条——图片没画出来，问题不在 CSS，在图上得太慢。
- **修「背景整片纯色」**：真机抓帧显示对话区恒为 `#04060d`（只剩 fallback 底色），而计算样式里 `background-image` 明明带着图。探针在同一时刻给出答案：`new Image()` 载入 1920×1080 成功（命中浏览器缓存），而 `fetch(..., {cache:'no-store'})` 走中转拿到 `502 / 18 字节`。实测那张图床回 1.6 MB 需要 10–27 秒，超过中转 15 秒上限——超时一次，`background-image` 就整页作废。缓存后同一请求从 10,813 ms 降到 84 ms。
- 探针新增 `art` 字段：`url` / `fetchStatus` / `fetchBytes` / `image.decode`，用来区分「CSS 没生效」「图载不进来」「被某层盖住」这三种截然不同的故障。
- 皮肤美术部分（开机影片、三颗全息核心、玻璃侧栏、面板）保持原样；2.0.0 改的是背景模型与命名，不是重写。
- 版本 2.0.0。

## 1.0.5

- 修 1.0.4 没修掉的那块深底：真正来源是**宿主自己**给输入区座位画的 `background: linear-gradient(180deg, color-mix(...bg-base 0%, transparent) 0px, bg-base 36px)`（`ConversationRoot.module.css` 的 `.root[data-phase='active'] .composerSeat`）。座位又被 `margin-top:auto` 撑到柱底，滚到底就露出一整块实色。1.0.4 只清 `background-color`，正好漏掉这条**渐变**（它走 `background-image`）。
- 改法：座位选择器加上宿主的稳定属性 `[data-composer-seat]`（不再只靠构建哈希类名），「外框关」时用 `background: none` 清整个简写；「外框开」时**才**刷灰底——皮肤原先那两条灰底渐变（`.an3WzG_composerSeat` / `[class*="_composerSeat"]`）此前是无条件生效的，现在一并挂到 `[data-hdd-band="on"]` 下。
- 新增 `/hdd/v1/probe` 诊断通道（默认关闭）：客户端把座位的元素链与计算样式落盘成 JSON，用来替代肉眼定位——宿主类名带构建哈希，光看截图分不清是哪一层在画底。
- README 新增「改了代码怎么生效（重载）」：`link:` 装法下改 `client.js` 只需重载页面，改 `index.js` 必须 `remove_bundle` + `install_bundle`；并写明 Windows 桌面客户端的三条重载路径（应用菜单 →「开发者工具」、`F12`、托盘退出重启），以及生产构建里没有 reload 菜单项这一事实。
- 版本 1.0.5。

## 1.0.4

- 修滚到底时输入区周围冒出的纯色深底：横跨整个对话区（截图实测 `x=352..1600`，输入卡上下各一圈），不是投影，而是某层容器刷了自己的背景。
- 修法不猜类名：用 `:has()` 命中「包含输入区座位的所有祖先」清掉 `background-color`，`background-image` 不动，艺术图不受影响；只在「灰底外框」关闭时生效。事后证明只清 `background-color` 不彻底——渐变走的是 `background-image`，真正修复在 1.0.5。
- 实现：根节点属性 `data-hdd-band="off"` / `data-hdd-capsule="white|blue"` + 带双属性的 `!important` 覆盖，压过皮肤自身的 `_composerSeat` / `.an3WzG_composerSeat` 灰底与胶囊蓝玻璃，不依赖注入顺序。
- 版本 1.0.4。

## 1.0.3

- **输入框背景改为二选一**：面板「输入区 → 输入框背景」提供 **蓝色亚克力 / 白色亚克力**，默认蓝色。上一版的白色开关（`acrylic` 布尔值）已合并为 `capsule: 'blue' | 'white'`，旧 localStorage 里的 `acrylic: true` 会自动读成白色，不用重设。
- 蓝色亚克力不再撑满整行：胶囊收成居中卡片（宽度上限 `--hdd-capsule-max`，默认 760px），圆角 22px，投影由 `0 18px 44px rgba(0,0,0,.46)` 收窄到 `0 12px 28px rgba(3,8,22,.34)`。
- 白色亚克力沿用上一版；皮肤压在胶囊内的浅色规则（`_input`、`_placeholder`、`_add`、`_2WTFBq_bar` 计数条）在白底后成了白字白底，逐条点名改深色。
- 版本 1.0.3。

## 1.0.2

- 输入区外框可关：面板「输入区 → 灰底外框」默认关闭，去掉输入卡周围那圈灰底与圆角外框，四周留白保留。
- 关掉外框后背景图覆盖整个对话区（含输入区下方）：皮肤把 `.V4vHZW_root` / `_column` / `_scroll` 设为透明，艺术图挂在 root 上，此前唯一遮挡就是那块灰底板。
- 白色亚克力胶囊 + 深色文字、占位符、光标、按钮与图标 + 去掉浅色文字外发光。
- 版本线归零：仓库自 1.0.0 起算，本次为 1.0.2；`package.json`、README 头部与本文件同步。

## 1.0.1

- 独立成仓库：`package.json` 去掉 `private`，补齐 `license` / `author` / `scripts` / `exports`。
- 新增 `README.md`（二开声明、安装、素材、路由、限制）、`LICENSE`、`NOTICE.md`、本文件、`.gitignore`、`scripts/check-assets.mjs`。
- 素材随仓库分发：`assets/` 入库，克隆即用；属于《绝区零》美术素材，仅限非商业使用，见 `NOTICE.md`。
- 修正上一版 README 里对 `build.cjs` 的描述：该生成脚本是一次性草稿，未随仓库保留，`client.js` 为生成物、直接手改。
- 版本线归零：1.0.1 为仓库首个自建版本号（此前内部称 2.1.0）。

## 1.0.0

- 四包合一：`dsh-fairy-splash` + `dsh-fairy-composer` + `dsh-agent-md` 并入 `dsh-hdd`，`dsh-fairy-voice` 未采用。
- 资产统一走 `/hdd/v1/*`；新增本地文件与网络 URL 两种背景来源、遮罩浓度、背景固定。
- 新增面板「设置 → HDD」：背景 / 三颗全息核心开关 / 人格编辑。
- 人格注入改由宿主 `ctx.systemPrompt.context()` 现读 `~/.dsh/AGENT.md`，保存后下一回合生效。
- 背景绘制改到固定层，修正背景随内容滚动与遮罩过淡的问题。
