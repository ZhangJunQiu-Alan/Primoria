import json
import sys
import re
import os

def extract_and_format(conv_id, output_filename):
    log_path = f"/Users/zhangjunqiu/.gemini/antigravity/brain/{conv_id}/.system_generated/logs/transcript.jsonl"
    with open(log_path, 'r') as f:
        lines = f.readlines()
    
    # Search backwards for the last model response that contains a json block
    json_content = None
    for line in reversed(lines):
        try:
            step = json.loads(line)
            if step.get('source') == 'MODEL' and step.get('type') == 'PLANNER_RESPONSE':
                content = step.get('content', '')
                match = re.search(r'```json(.*?)```', content, re.DOTALL)
                if match:
                    json_content = match.group(1).strip()
                    break
                elif content.strip().startswith('{') and content.strip().endswith('}'):
                    json_content = content.strip()
                    break
        except json.JSONDecodeError:
            continue
            
    if not json_content:
        print(f"Could not find JSON output for {conv_id}")
        return
        
    with open(output_filename, 'w') as f:
        f.write(json_content)
        
    # Run format_json.py
    os.system(f"python3 format_json.py {output_filename}")
    print(f"Successfully processed {output_filename}")

if __name__ == "__main__":
    tasks = [
        ("bca1abcf-c0c0-4190-b9ab-5d0b913cd01c", "information_theory_knowledge_graph.json"),
        ("95103632-8b2e-49ef-a769-92b6a7284c2e", "mit_18_330_knowledge_graph.json"),
        ("47529a4f-166a-4061-9734-41eb36f76f17", "mit_6_031_knowledge_graph.json")
    ]
    for conv_id, out_file in tasks:
        extract_and_format(conv_id, out_file)
