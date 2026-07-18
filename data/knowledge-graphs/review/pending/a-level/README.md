# A-Level KG 待审核包

这些文件是官方 syllabus 与当前 KG 的候选映射，不是批准结果。

- a_level_mathematics: 38 小节，153 项要求，53 项候选覆盖，91 项部分覆盖，0 项歧义，0 项未解析，9 项已核实 Concept 缺口，0 项需技能映射
- a_level_biology: 44 小节，259 项要求，14 项候选覆盖，178 项部分覆盖，0 项歧义，0 项未解析，34 项已核实 Concept 缺口，33 项需技能映射
- a_level_chemistry: 90 小节，351 项要求，30 项候选覆盖，282 项部分覆盖，0 项歧义，0 项未解析，38 项已核实 Concept 缺口，1 项需技能映射
- a_level_physics: 76 小节，299 项要求，86 项候选覆盖，175 项部分覆盖，0 项歧义，0 项未解析，30 项已核实 Concept 缺口，8 项需技能映射

## 再生成（官方 PDF 不提交仓库）

1. 按 `data/knowledge-graphs/governance/sources.json` 下载四科官方 PDF，并核对 SHA-256。
2. 用 `pdftotext -raw` 分别生成 `cambridge-9700.raw.txt`、`cambridge-9701.raw.txt`、`cambridge-9702.raw.txt`、`cambridge-9709.raw.txt`。
3. 运行 `pnpm --filter @primoria/web build:kg-review-packs -- <文本目录>`。
4. 生成物只含页码、定位、关键词、文本指纹和候选映射；不得提交 Cambridge PDF 或正文。
