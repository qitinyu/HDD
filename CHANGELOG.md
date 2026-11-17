# 变更记录

版本号遵循语义化：`主.次.修`。皮肤或面板行为改变升次版本，纯文案与打包调整升修订号。

## 1.0.1

- 独立成仓库：`package.json` 去掉 `private`，补齐 `license` / `author` / `scripts` / `exports`。
- 新增 `README.md`（二开声明、安装、素材、路由、限制）、`LICENSE`、`NOTICE.md`、本文件、`.gitignore`、`scripts/check-assets.mjs`。
- 素材随仓库分发：`assets/` 入库，克隆即用；属于《绝区零》美术素材，仅限非商业使用，见 `NOTICE.md`。
- 修正上一版 README 里对 `build.cjs` 的描述：该生成脚本是一次性草稿，未随仓库保留，`client.js` 为生成物、直接手改。
- 版本由 2.0.0 升至 2.1.0（内容与打包方式变化，皮肤与面板行为未变）。

## 1.0.0

- 四包合一：`dsh-fairy-splash` + `dsh-fairy-composer` + `dsh-agent-md` 并入 `dsh-hdd`，`dsh-fairy-voice` 未采用。
- 资产统一走 `/hdd/v1/*`；新增本地文件与网络 URL 两种背景来源、遮罩浓度、背景固定。
- 新增面板「设置 → HDD」：背景 / 三颗全息核心开关 / 人格编辑。
- 人格注入改由宿主 `ctx.systemPrompt.context()` 现读 `~/.dsh/AGENT.md`，保存后下一回合生效。
- 背景绘制改到固定层，修正背景随内容滚动与遮罩过淡的问题。