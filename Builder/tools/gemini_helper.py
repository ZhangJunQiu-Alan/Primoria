#!/usr/bin/env python3
"""
Gemini API helper tool - for analyzing and improving Flutter code
"""

import argparse
import sys
from pathlib import Path

try:
    import google.generativeai as genai
except ImportError:
    print("Please install google-generativeai first:")
    print("  pip install google-generativeai")
    sys.exit(1)


API_KEY = "PUT_YOUR_API_KEY_HERE"

# Preset prompt templates
PROMPTS = {
    "optimize": "Please optimize the following Flutter/Dart code for performance and readability. Keep functionality unchanged and output the full optimized code:",
    "refactor": "Please refactor the following code to improve structure and design patterns. Explain your refactoring approach:",
    "explain": "Please explain the functionality and logic of the following code in detail, in English:",
    "bug": "Please check the following code for potential bugs or issues and provide fixes:",
    "review": "Please review the following code and give suggestions on performance, readability, and best practices:",
    "test": "Please generate unit tests for the following code (use the Flutter test framework):",
}


def load_file(file_path: str) -> str:
    """Read file content."""
    path = Path(file_path)
    if not path.exists():
        print(f"Error: File not found - {file_path}")
        sys.exit(1)
    return path.read_text(encoding="utf-8")


def query_gemini(code: str, mode: str, custom_prompt: str = None) -> str:
    """Call Gemini API."""
    if API_KEY == "PUT_YOUR_API_KEY_HERE":
        print("Error: Please set your Gemini API key in this script")
        print(f"File location: {__file__}")
        print("Find API_KEY = \"PUT_YOUR_API_KEY_HERE\" and replace it")
        sys.exit(1)

    genai.configure(api_key=API_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash")  # can switch to gemini-1.5-pro

    if custom_prompt:
        prompt = custom_prompt
    else:
        prompt = PROMPTS.get(mode, PROMPTS["optimize"])

    full_prompt = f"{prompt}\n\n```dart\n{code}\n```"

    print(f"Calling Gemini API (mode: {mode})...")
    response = model.generate_content(full_prompt)
    return response.text


def main():
    parser = argparse.ArgumentParser(
        description="Use Gemini API to analyze and improve Flutter code",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python gemini_helper.py lib/widgets/my_widget.dart              # default optimize
  python gemini_helper.py lib/main.dart -m explain                # explain code
  python gemini_helper.py lib/services/api.dart -m bug            # find bugs
  python gemini_helper.py lib/models/user.dart -m review          # code review
  python gemini_helper.py lib/utils.dart -p "Add error handling"  # custom prompt
  python gemini_helper.py lib/widget.dart -o output.md            # output to file

Available modes (-m):
  optimize  - Optimize performance and readability (default)
  refactor  - Refactor code structure
  explain   - Explain code functionality
  bug       - Find potential bugs
  review    - Code review
  test      - Generate test cases
        """
    )

    parser.add_argument("file", help="Path to the code file")
    parser.add_argument(
        "-m", "--mode",
        choices=list(PROMPTS.keys()),
        default="optimize",
        help="Analysis mode"
    )
    parser.add_argument(
        "-p", "--prompt",
        help="Custom prompt (overrides mode preset)"
    )
    parser.add_argument(
        "-o", "--output",
        help="Write output to a file (default: print to stdout)"
    )

    args = parser.parse_args()

    # Read code
    code = load_file(args.file)
    print(f"Read file: {args.file} ({len(code)} chars)")

    # Call Gemini
    result = query_gemini(code, args.mode, args.prompt)

    # Output result
    if args.output:
        Path(args.output).write_text(result, encoding="utf-8")
        print(f"Result saved to: {args.output}")
    else:
        print("\n" + "=" * 50)
        print("Gemini response:")
        print("=" * 50 + "\n")
        print(result)


if __name__ == "__main__":
    main()
