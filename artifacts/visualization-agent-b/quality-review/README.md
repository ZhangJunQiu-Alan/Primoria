# Agent B 场景检查页

启动：从项目根目录执行 `python3 -m http.server 4189 --bind 127.0.0.1 --directory artifacts/visualization-agent-b`，访问 `http://127.0.0.1:4189/quality-review/`。

30 个新组件、每组件4组已解析配置，可切换中英文。此页面直接打包仓库内生产 Widget，交互在本地 React 状态中运行；没有新 Prompt 输入要求。它不是 Agent A 负责的20条真实模型 Prompt 验收页。其中26项已生产注册，009/010/011的4项仍待A集成，不能将检查页能运行当作生产Tutor已经可调用。

2026-10-22 检查：14份B场景/播放/拖拽/文本测试共218项通过，另参考契约3项通过；内置浏览器检查390/768/1440三宽度、两语言、120组配置，共720个布局状态，未发现文档横向溢出、无效数值、SVG文字相互覆盖或文字超出SVG边界；30个控件操作均使读数或图形更新。诗词三首×四模式另有72项布局检查；原19项的选定配置另456项。另行观察了播放/暂停/重置、分子旋转恢复、手机实际拖拽和诗词分类订正。浏览器控制台没有捕获到 warning/error。

布局检查是DOM几何检查，另保存抽样截图；它不证明每种任意配置的视觉效果或所有语义均无误。数值正确性和生命周期边界以各组件测试为依据。参考站点能力仍在逐项核实，未宣称全量覆盖或零BUG。

`evidence/layout-audit.json`、`evidence/interaction-audit.json` 保存实际测量；`verification.json` 保存产物摘要与文件哈希。验证后修改源码需重新导出和复测。

可重建：在项目根目录执行 `node artifacts/visualization-agent-b/build-review.mjs`。它读取正式批次，重新打包生产Widget；修改后需要复测，不能沿用旧哈希当作新证据。
