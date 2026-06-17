#!/usr/bin/env python3
"""为 A-缺序 的 5 张图补 default_order：
- topic 节点：按其在 nodes[] 中出现的先后，1-based 编号。
- concept 节点：按其在同一 topic 内出现的先后，1-based 编号。
仅当节点尚无 default_order 时写入，幂等。其余字段原样保留。"""
import json, os

TARGETS = [
    "Python.json",
    "computer_architecture.json",
    "computer_systems.json",
    "discrete_math_and_probability.json",
    "introduction_to_computer_science.json",
]

def fix(path):
    d = json.load(open(path, encoding="utf-8"))
    nodes = d["nodes"]
    topic_order = 0
    per_topic_counter = {}
    for n in nodes:
        if n.get("kind") == "topic":
            if "default_order" not in n:
                topic_order += 1
                n["default_order"] = topic_order
            else:
                topic_order = n["default_order"]
        elif n.get("kind") == "concept":
            t = n.get("topic")
            per_topic_counter[t] = per_topic_counter.get(t, 0) + 1
            if "default_order" not in n:
                n["default_order"] = per_topic_counter[t]
    json.dump(d, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

if __name__ == "__main__":
    base = os.path.dirname(__file__)
    for f in TARGETS:
        fix(os.path.join(base, f))
        print(f"fixed: {f}")
