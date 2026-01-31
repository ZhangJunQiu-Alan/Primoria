#!/usr/bin/env python3
"""
Gemini API 辅助工具 - 用于分析和优化 Flutter 代码
"""

import argparse
import sys
from pathlib import Path

try:
    import google.generativeai as genai
except ImportError:
    print("请先安装 google-generativeai:")
    print("  pip install google-generativeai")
    sys.exit(1)


API_KEY = "在这里填入你的API_KEY"

# 预设的 prompt 模板
PROMPTS = {
    "optimize": "请优化以下 Flutter/Dart 代码，提升性能和可读性。保持功能不变，给出优化后的完整代码：",
    "refactor": "请重构以下代码，改善代码结构和设计模式。解释你的重构思路：",
    "explain": "请详细解释以下代码的功能和逻辑，用中文回答：",
    "bug": "请检查以下代码中可能存在的 bug 或潜在问题，并给出修复建议：",
    "review": "请对以下代码进行 code review，从性能、可读性、最佳实践等方面给出建议：",
    "test": "请为以下代码生成单元测试用例（使用 Flutter test 框架）：",
}


def load_file(file_path: str) -> str:
    """读取文件内容"""
    path = Path(file_path)
    if not path.exists():
        print(f"错误: 文件不存在 - {file_path}")
        sys.exit(1)
    return path.read_text(encoding="utf-8")


def query_gemini(code: str, mode: str, custom_prompt: str = None) -> str:
    """调用 Gemini API"""
    if API_KEY == "在这里填入你的API_KEY":
        print("错误: 请先在脚本中填入你的 Gemini API Key")
        print(f"文件位置: {__file__}")
        print("找到 API_KEY = \"在这里填入你的API_KEY\" 这一行并替换")
        sys.exit(1)

    genai.configure(api_key=API_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash")  # 可改为 gemini-1.5-pro

    if custom_prompt:
        prompt = custom_prompt
    else:
        prompt = PROMPTS.get(mode, PROMPTS["optimize"])

    full_prompt = f"{prompt}\n\n```dart\n{code}\n```"

    print(f"正在调用 Gemini API ({mode} 模式)...")
    response = model.generate_content(full_prompt)
    return response.text


def main():
    parser = argparse.ArgumentParser(
        description="使用 Gemini API 分析和优化 Flutter 代码",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法:
  python gemini_helper.py lib/widgets/my_widget.dart              # 默认优化模式
  python gemini_helper.py lib/main.dart -m explain                # 解释代码
  python gemini_helper.py lib/services/api.dart -m bug            # 查找 bug
  python gemini_helper.py lib/models/user.dart -m review          # 代码审查
  python gemini_helper.py lib/utils.dart -p "添加错误处理"         # 自定义 prompt
  python gemini_helper.py lib/widget.dart -o output.md            # 输出到文件

可用模式 (-m):
  optimize  - 优化代码性能和可读性 (默认)
  refactor  - 重构代码结构
  explain   - 解释代码功能
  bug       - 查找潜在 bug
  review    - 代码审查
  test      - 生成测试用例
        """
    )

    parser.add_argument("file", help="要分析的代码文件路径")
    parser.add_argument(
        "-m", "--mode",
        choices=list(PROMPTS.keys()),
        default="optimize",
        help="分析模式"
    )
    parser.add_argument(
        "-p", "--prompt",
        help="自定义 prompt（会覆盖模式预设）"
    )
    parser.add_argument(
        "-o", "--output",
        help="输出结果到文件（默认打印到终端）"
    )

    args = parser.parse_args()

    # 读取代码
    code = load_file(args.file)
    print(f"已读取文件: {args.file} ({len(code)} 字符)")

    # 调用 Gemini
    result = query_gemini(code, args.mode, args.prompt)

    # 输出结果
    if args.output:
        Path(args.output).write_text(result, encoding="utf-8")
        print(f"结果已保存到: {args.output}")
    else:
        print("\n" + "=" * 50)
        print("Gemini 回复:")
        print("=" * 50 + "\n")
        print(result)


if __name__ == "__main__":
    main()
