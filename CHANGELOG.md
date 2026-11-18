# 变更记录

版本号遵循语义化：`主.次.修`。皮肤或面板行为改变升次版本，纯文案与打包调整升修订号。

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
