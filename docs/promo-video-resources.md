# Primoria 宣传片：免费声音资源候选

核对日期：2026-10-29（Asia/Singapore）。对应制作手册：
[promo-video-handoff.md](promo-video-handoff.md)。

用户已授权通过浏览器寻找免费的旁白、配乐等缺失资源。此记录整理官方页面和许可，
不表示素材已下载、已试听、旁白已生成或配乐已定稿。付费服务仍不在授权范围内。
制作手册中的动态分镜及分阶段渲染检查点继续适用。

## 1. 英文旁白

### 网页候选：TTSMaker

- 工具：[TTSMaker](https://ttsmaker.com/)。
- [官方音频使用条款](https://ttsmaker.com/copyright_and_commercial_license_terms)。
- 本次页面显示免费额度为每周 20,000 字符，部分声音不限量；页面当前单次输入上限显示
  1,000 字符。额度和声音可用性以实际生成时的页面为准。
- 官方允许生成音频用于个人及商业项目，包括影片、广告、教育材料；无需强制署名。
- 手册旁白约 105 个英文单词，适合按 VO01–VO13 分段生成；不需要为本片购买套餐。
- 网页支持插入停顿。按手册保留句间停顿及片尾品牌名后的停顿。
- 音频需及时下载；页面说明转换音频及历史记录有 30 分钟有效期。
- 尚未验证具体声音的音色、技术词读音和 Primoria 发音，也未执行转换。

### 本地备选：Kokoro

- [作者模型页](https://huggingface.co/hexgrad/Kokoro-82M)。
- [作者提供的演示入口](https://huggingface.co/spaces/hexgrad/Kokoro-TTS)。
- [官方声音目录](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md)。
- 模型权重标为 Apache-2.0，可本地运行，避免依赖网页额度；实际运行需另行安装依赖和下载
  模型，本次未执行。
- 可先比较美式男声 `am_michael` 与英式男声 `bm_george`。这里只列试听候选，尚未作音质判断。
- 使用官方演示或本地推理；第三方托管 API 的费用不属于本方案。

### 声音制作要求

- 同一声音贯穿全片；低沉、平静，保持纪录片式语气。
- 先用 VO03、VO04、VO13 做短试听，检查 Primoria、prerequisite、Transformers 等读音。
- 品牌名读音在正式旁白前确定；字幕保留正常拼写，不跟随发音替代拼写变化。
- 最终按镜头分别输出 VO01–VO13；统一转成 48 kHz WAV，再测时长并排时间。
- macOS `say` 仍只作为动态分镜临时旁白，不视为正式声音已完成。

## 2. 配乐候选

以下适配判断依据作者对曲目的描述，尚未实际试听或测 BPM。

| 候选 | 作者页面描述 | 拟测试的用途 |
| --- | --- | --- |
| [Horizons — Scott Buckley](https://www.scottbuckley.com.au/library/horizons/) | 钢琴、弦乐、推动节奏的琶音合成器；情绪有起伏 | 优先试配整片，检查能否从克制的开场接到第四幕的快切 |
| [Signal to Noise — Scott Buckley](https://www.scottbuckley.com.au/library/signal-to-noise/) | 大提琴、钢琴、温暖合成器与低音弦乐；神秘、略忧郁，带希望感；另有无钢琴旋律混音 | 测试“一滴墨”和英雄图谱段；无钢琴旋律版本可比较对白清晰度 |
| [Borealis — Scott Buckley](https://www.scottbuckley.com.au/library/borealis/) | 缓慢、沉思的氛围音乐，略有向上感 | 测试较安静版本及品牌收尾；第四幕是否有足够推动力需试听 |

三首曲目页面均标为 CC BY 4.0，允许免费用于包含商业用途的项目，但必须署名。
可剪辑适配；实际编辑后标明已作剪辑。来源：
[作者使用说明](https://www.scottbuckley.com.au/library/using-this-music/)、
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。

如选 Horizons，署名可采用以下格式，并在交付说明/PPT 致谢保留：

> “Horizons” by Scott Buckley — CC BY 4.0. https://www.scottbuckley.com.au/library/horizons/
> License: https://creativecommons.org/licenses/by/4.0/. Edited for length and mixed with narration.

发布到 YouTube 时，作者明确要求把署名放入视频描述，不能只放在视频画面中。
单独现场播放的 MP4 应保留随片可见的署名，例如片尾小字；不把仅写 README 当成观众能看到的署名。
最终使用哪首曲目，以带旁白和画面的样片效果确定。

## 3. 音效候选

来源：[Mixkit 音效库](https://mixkit.co/free-sound-effects/)。

| 镜头 | 免费资源页 | 候选条目 |
| --- | --- | --- |
| S01–S02 碎片/纸页、S13 讲义落下 | [Paper](https://mixkit.co/free-sound-effects/paper/) | Page turn single；Paper slide；Paper quick movement |
| S03 输入目标 | [Keyboard](https://mixkit.co/free-sound-effects/keyboard/) | Slow typing on a keyboard；Single key type |
| S09 Run 点击 | [Click](https://mixkit.co/free-sound-effects/click/) | Select click；Typewriter soft click |
| 第四幕甩镜 | [Whoosh](https://mixkit.co/free-sound-effects/whoosh/) | Cinematic whoosh fast transition；Fast whoosh transition |

许可依据：[Mixkit Sound Effects Free License](https://mixkit.co/license/modal/sfxFree/)。
允许教育、影片、演示和商业成品使用；官方 FAQ 说明署名非强制。
许可禁止把原始音效作为独立素材或随源文件再分发，因此后续应把下载的原始音效留在本地，
不提交到公开仓库或随公开源码打包；仓库保留来源/下载清单，成片可正常混入使用。

节点递增音、墨滴提示、答对轻响和 Logo 低频可以自行合成，按镜头长度和音高精确控制。
这部分尚未生成，也不依赖额外素材购买。

## 4. 其余素材与剩余事项

- Logo、配色：使用项目现有品牌资源。
- 纸纹、墨迹、图谱、电影版 UI：按手册用程序制作，不需要购买视频模板。
- 演示讲义、Tutor 示例回答、课程代码与测验：制作时准备相互一致的演示内容，明确与真实
  用户数据区分；不等待用户提供个人讲义。
- 仍需确定答辩/终稿日期、Primoria 的正式读音；现场播放设备可在终稿前确认。
- 音色及配乐通过试听/动态分镜检查点确定。免费资源已找到，最终声音素材仍待制作。
- 之前识别的脚本问题仍需在实现前处理：排课与第一节课内容一致；最后一次答对才触发有
  足够证据的掌握；资料引用旁白限定到资料支撑的回答；原文 PDF 画面按实际功能边界制作。

## 5. 本次状态

- 已核对官方候选页面与许可。
- 未注册账号、购买服务、调用付费 API、生成配音、下载声音或制作视频。
- 内置 Browser 插件缺少 `scripts/browser-client.mjs`，本次无法直接操作网页试听/生成；
  候选与许可通过网页检索工具核对。

## 6. 制作启动后的补充

- 后续在已安装的 Browser 插件缓存中找到有效客户端，浏览器重试成功，可打开 TTSMaker
  和本地 Remotion Studio。上节的浏览器故障描述保留为首次检索时的记录。
- TTSMaker 当前转换界面显示验证码；本轮没有代填验证码、调用转换或生成网页配音。
- `promo/` 已建立独立 Remotion 工程，使用本地 macOS Samantha 生成 VO01–VO13 临时旁白，
  并生成第四幕的低音量节拍参考轨。正式音色、配乐和最终音效仍未确定。
- 第一版为阶段 0 动态分镜，画面明确标注占位；不能当作最终宣传片或真实产品录屏。
