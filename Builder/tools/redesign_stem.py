#!/usr/bin/env python3
"""
Use Gemini to redesign the Builder UI - STEM bright style
"""

import sys
from pathlib import Path

try:
    import google.generativeai as genai
except ImportError:
    print("Please install google-generativeai first:")
    print("  pip install google-generativeai")
    sys.exit(1)

# Import API key from gemini_helper.py
sys.path.insert(0, str(Path(__file__).parent))
from gemini_helper import API_KEY

# Core UI files to analyze
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
You are a professional Flutter UI/UX designer. Please redesign the UI for this course editor (Builder). Requirements:

## Style requirements
1. **STEM tech feel**:
   - Use bright tech blue, electric green, and vibrant orange as primary colors
   - Add subtle grid background or circuit-board texture
   - Use geometric/tech style icons

2. **Bright and fresh**:
   - Use white and light gray as base backgrounds
   - High-contrast color combinations
   - Avoid dull/dark colors

3. **Modern**:
   - Larger corner radius (16px-24px)
   - Soft shadows
   - Subtle gradients
   - Glassmorphism effect (optional)

4. **Education-friendly**:
   - Clear visual hierarchy
   - Ample whitespace
   - Readable font sizes

## Output requirements
Output complete new code files:

1. **design_tokens.dart** - new design tokens (STEM color palette)
2. **theme.dart** - new theme configuration

Ensure:
- Keep compatibility with the existing code structure
- All color values use explicit hex values
- Add necessary comments to explain design intent

## Existing code

Here are the current code files. Please redesign based on these:

"""


def load_files():
    """Load all UI related files."""
    base_path = Path(__file__).parent
    files_content = []

    for file_path in UI_FILES:
        full_path = base_path / file_path
        if full_path.exists():
            content = full_path.read_text(encoding="utf-8")
            files_content.append(f"### {file_path}\n```dart\n{content}\n```\n")
            print(f"✓ Loaded: {file_path}")
        else:
            print(f"✗ File not found: {file_path}")

    return "\n".join(files_content)


def main():
    if API_KEY == "PUT_YOUR_API_KEY_HERE":
        print("Error: Please set your Gemini API key in gemini_helper.py")
        sys.exit(1)

    print("=" * 50)
    print("STEM-style UI redesign tool")
    print("=" * 50)
    print()

    # Load files
    print("Loading UI files...")
    files_content = load_files()
    print()

    # Build full prompt
    full_prompt = STEM_REDESIGN_PROMPT + files_content

    # Call Gemini
    print("Calling Gemini API (this may take some time)...")
    genai.configure(api_key=API_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash")

    response = model.generate_content(full_prompt)
    result = response.text

    # Save result
    output_file = Path(__file__).parent / "stem_redesign_output.md"
    output_file.write_text(result, encoding="utf-8")

    print()
    print("=" * 50)
    print(f"✓ Design output saved to: {output_file}")
    print("=" * 50)
    print()
    print("Gemini output preview:")
    print("-" * 50)
    # Only show first 2000 characters
    preview = result[:2000] + "..." if len(result) > 2000 else result
    print(preview)
    print()
    print(f"Full output is in: {output_file}")


if __name__ == "__main__":
    main()
