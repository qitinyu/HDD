# NOTICE —— 归属与素材权利

## 代码归属

本仓库是对 **[dsh-fairy-pack](https://github.com/qrq-qq/dsh-fairy-pack)**（作者 qrq-qq，MIT）的二次开发。
[bilibili介绍视频](https://www.bilibili.com/video/BV1LBsQ6vENT/?share_source=copy_web&vd_source=6033adaa90d5b51ef75d809f5668308a)

| 上游包 | 版本 | 在本仓库中的角色 |
| --- | --- | --- |
| `dsh-fairy-splash` | 1.0.24 | 皮肤主体。`client.js` 中的皮肤逻辑源自该包，被内联为内部函数并更换资产前缀 |
| `dsh-fairy-composer` | 1.0.1 | 输入区圆角样式，并入 `client.js` |
| `dsh-agent-md` | 0.2.0 | 人格编辑思路来源；注入改为宿主侧 `ctx.systemPrompt.context()` |
| `dsh-fairy-voice` | 1.0.11 | 未采用 |

上游 MIT 许可的版权行保留在 `LICENSE` 中。上游若有更新，本仓库不自动跟进。

## 素材归属（重要）

开机影片、背景图、封面、应用图标等文件位于 `assets/`，随本仓库一并分发。它们是**游戏《绝区零》(Zenless Zone Zero)** 的美术素材，版权归米哈游（miHoYo / HoYoverse）及相关权利人。

- **不在 MIT 许可范围内**：`LICENSE` 只覆盖源码，不覆盖 `assets/` 下的媒体文件。
- **仅限非商业使用**：个人学习、自用、非营利的二次开发。不得用于商业产品、付费分发、再授权、售卖，也不得声称这些素材归本仓库所有。
- 商用请替换为自有或已授权素材，文件名不变即可，代码不依赖素材内容。
- 上游 `dsh-fairy-pack` 的声明与此一致：代码 MIT，美术与音色素材版权归原权利人。

权利人若要求下线，删除 `assets/` 下相应文件即可，插件功能不受影响。

## 商标与隶属

- "DeepSeek Harness" 是 DeepSeek 的产品；"绝区零 / Zenless Zone Zero"、"Fairy"、"H.D.D." 相关名称与美术是米哈游的资产。
- 本插件与上述公司**均无隶属、合作或背书关系**，属社区二次开发，按现状提供、不提供任何担保。