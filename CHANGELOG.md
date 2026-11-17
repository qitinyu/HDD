# 变更记录

版本号遵循语义化：`主.次.修`。皮肤或面板行为改变升次版本，纯文案与打包调整升修订号。

## 1.0.3

- **输入框背景改为二选一**：面板「输入区 → 输入框背景」提供 **蓝色亚克力 / 白色亚克力**，默认蓝色。上一版的白色开关（`acrylic` 布尔值）已合并为 `capsule: 'blue' | 'white'`，旧 localStorage 里的 `acrylic: true` 会自动读成白色，不用重设。
- 蓝色亚克力不再撑满整行：胶囊收成居中卡片（宽度上限 `--hdd-capsule-max`，默认 760px），圆角 22px，投影由 `0 18px 44px rgba(0,0,0,.46)` 收窄到 `0 12px 28px rgba(3,8,22,.34)`，滚到底时压不出深色块。
- 白色亚克力沿用上一版：磨砂白胶囊 + 深色文字、占位符、光标、按钮与图标 + 去掉浅色文字外发光。
- 反色补漏：皮肤直接压在胶囊内的浅色规则（`_input`、`_placeholder`、`_add`、`_2WTFBq_bar` 计数条）在白底后成了白字白底，逐条点名改深色。
- 实现：根节点属性 `data-hdd-band="off"` / `data-hdd-capsule="white|blue"` + 带双属性的 `!important` 覆盖，压过皮肤自身的 `_composerSeat` / `.an3WzG_composerSeat` 灰底与胶囊蓝玻璃，不依赖注入顺序。
- 关掉外框后背景图已覆盖整个对话区（含输入区下方）：皮肤把 `.V4vHZW_root` / `_column` / `_scroll` 设为透明，艺术图挂在 root 上，此前唯一遮挡就是那块灰底板。
- 版本线归零：仓库自 1.0.0 起算，本次为 1.0.3；`package.json`、README 头部与本文件同步。

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