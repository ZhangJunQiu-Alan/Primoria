#!/usr/bin/env python3
"""
使用 Gemini 重新设计 Builder 界面 - STEM 明亮风格
"""

import sys
from pathlib import Path

try:
    import google.generativeai as genai
except ImportError:
    print("请先安装 google-generativeai:")
    print("  pip install google-generativeai")
    sys.exit(1)

# 从 gemini_helper.py 导入 API Key
sys.path.insert(0, str(Path(__file__).parent))
from gemini_helper import API_KEY

# 需要分析的核心 UI 文件
UI_FILES = [
    "../lib/theme/design_tokens.dart",
    "../lib/theme/theme.dart",
    "../lib/widgets/module_panel.dart",
    "../lib/widgets/property_panel.dart",
    "../lib/widgets/builder_canvas.dart",
    "../lib/widgets/block_widgets/block_wrapper.dart",
    "../lib/features/builder/builder_screen.dart",
]

STEM_REDESIGN_PROMPT = """
你是一个专业的 Flutter UI/UX 设计师。请为这个课程编辑器（Builder）重新设计界面，要求：

## 设计风格要求
1. **STEM 科技感**：
   - 使用明亮的科技蓝、电子绿、活力橙作为主色调
   - 添加细微的网格背景或电路板纹理
   - 图标使用几何/科技风格

2. **明亮清新**：
   - 以白色和浅灰为基础背景
   - 高对比度的色彩搭配
   - 避免暗沉的颜色

3. **现代感**：
   - 更大的圆角（16px-24px）
   - 柔和的阴影效果
   - 微妙的渐变色
   - 玻璃态效果（可选）

4. **教育友好**：
   - 清晰的视觉层级
   - 足够的留白
   - 易于阅读的字体大小

## 输出要求
请输出完整的新代码文件：

1. **design_tokens.dart** - 新的设计令牌（STEM 配色方案）
2. **theme.dart** - 新的主题配置

确保：
- 保持与现有代码结构兼容
- 所有颜色值使用具体的十六进制值
- 添加必要的注释说明设计意图

## 现有代码

以下是当前的代码文件，请基于这些进行重新设计：

"""


def load_files():
    """加载所有 UI 相关文件"""
    base_path = Path(__file__).parent
    files_content = []

    for file_path in UI_FILES:
        full_path = base_path / file_path
        if full_path.exists():
            content = full_path.read_text(encoding="utf-8")
            files_content.append(f"### {file_path}\n```dart\n{content}\n```\n")
            print(f"✓ 已加载: {file_path}")
        else:
            print(f"✗ 文件不存在: {file_path}")

    return "\n".join(files_content)


def main():
    if API_KEY == "在这里填入你的API_KEY":
        print("错误: 请先在 gemini_helper.py 中填入你的 Gemini API Key")
        sys.exit(1)

    print("=" * 50)
    print("STEM 风格 UI 重设计工具")
    print("=" * 50)
    print()

    # 加载文件
    print("正在加载 UI 文件...")
    files_content = load_files()
    print()

    # 构建完整 prompt
    full_prompt = STEM_REDESIGN_PROMPT + files_content

    # 调用 Gemini
    print("正在调用 Gemini API（这可能需要一些时间）...")
    genai.configure(api_key=API_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash")

    response = model.generate_content(full_prompt)
    result = response.text

    # 保存结果
    output_file = Path(__file__).parent / "stem_redesign_output.md"
    output_file.write_text(result, encoding="utf-8")

    print()
    print("=" * 50)
    print(f"✓ 设计方案已保存到: {output_file}")
    print("=" * 50)
    print()
    print("Gemini 输出预览:")
    print("-" * 50)
    # 只显示前 2000 字符
    preview = result[:2000] + "..." if len(result) > 2000 else result
    print(preview)
    print()
    print(f"完整输出请查看: {output_file}")


if __name__ == "__main__":
    main()
