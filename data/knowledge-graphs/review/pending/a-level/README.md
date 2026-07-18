# A-Level KG 待审核包

这些文件是官方 syllabus 与当前 KG 的候选映射，不是批准结果。

- 数学 9 项已核实 Concept 缺口已经人工批准；记录移至 `data/knowledge-graphs/review/approved/a-level/a_level_mathematics.gap-approval.zh-CN.md`。
- 物理 30 项已核实缺口已经人工批准；记录移至 `data/knowledge-graphs/review/approved/a-level/a_level_physics.gap-approval.zh-CN.md`。
- 化学 38 项已核实缺口已经人工批准；记录移至 `data/knowledge-graphs/review/approved/a-level/a_level_chemistry.gap-approval.zh-CN.md`。
- 生物 34 项 Concept 缺口和 33 项 Skill 映射已经人工批准；记录移至 `data/knowledge-graphs/review/approved/a-level/a_level_biology.gap-approval.zh-CN.md`。

- a_level_mathematics: 38 小节，153 项要求，62 项候选覆盖，91 项部分覆盖，0 项歧义，0 项未解析，0 项已核实 Concept 缺口，0 项需技能映射；其中本轮 9 项由项目所有者人工批准
- a_level_biology: 44 小节，259 项要求，48 项候选覆盖，177 项部分覆盖，1 项歧义，0 项未解析，0 项已核实 Concept 缺口，33 项需技能映射；其中本轮 34 项 Concept 缺口和 33 项 Skill 映射由项目所有者人工批准
- a_level_chemistry: 90 小节，351 项要求，65 项候选覆盖，277 项部分覆盖，1 项歧义，3 项未解析，0 项已核实 Concept 缺口，5 项需技能映射；其中本轮 38 项由项目所有者人工批准
- a_level_physics: 76 小节，299 项要求，115 项候选覆盖，174 项部分覆盖，0 项歧义，0 项未解析，0 项已核实 Concept 缺口，10 项需技能映射；其中本轮 30 项由项目所有者人工批准

## 再生成（官方 PDF 不提交仓库）

1. 按 `data/knowledge-graphs/governance/sources.json` 下载四科官方 PDF，并核对 SHA-256。
2. 用 `pdftotext -raw` 分别生成 `cambridge-9700.raw.txt`、`cambridge-9701.raw.txt`、`cambridge-9702.raw.txt`、`cambridge-9709.raw.txt`。
3. 运行 `pnpm --filter @primoria/web build:kg-review-packs -- <文本目录>`。
4. 生成物只含页码、定位、关键词、文本指纹和候选映射；不得提交 Cambridge PDF 或正文。
