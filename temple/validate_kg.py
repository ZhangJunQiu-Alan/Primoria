#!/usr/bin/env python3
"""硬门禁校验：对 temple/*.json 的 KG 跑 5 道门禁，输出通过表。"""
import json, glob, os, sys
from collections import defaultdict, deque

SKIP = {"cross_subject_edges.json", "kg_zh_labels.json"}

# concept 可视化亲和标注（可选；缺省 = none = 不强制 visual 块）。
# 取值映射到 course visual 引擎：interactive→html, simulation→physics,
# algorithm→algorithm_visualizer, function→math_explorer, chart→echarts,
# diagram→mermaid, none→无。
VISUAL_ENUM = {"interactive", "simulation", "algorithm", "function", "chart", "diagram", "none"}

def load_graphs():
    graphs = {}
    for path in sorted(glob.glob(os.path.join(os.path.dirname(__file__), "*.json"))):
        name = os.path.basename(path)
        if name in SKIP or name.endswith("_source_map.json"):
            continue
        try:
            d = json.load(open(path, encoding="utf-8"))
        except Exception as e:
            graphs[name] = {"_error": f"JSON 解析失败: {e}"}
            continue
        if "nodes" in d:
            graphs[name] = {"shape": "nodes", "data": d}
        elif "topics" in d:
            graphs[name] = {"shape": "topics", "data": d}
        else:
            graphs[name] = {"_error": "既无 nodes 也无 topics"}
    return graphs

def check(name, g, all_ids_counter):
    res = {"name": name}
    if "_error" in g:
        res["fatal"] = g["_error"]
        return res
    shape, d = g["shape"], g["data"]

    # 统一抽取 nodes 与 prereq 边
    if shape == "topics":
        # 分类树：topics[] + parent_id，无 concept / 无 prereq 边
        nodes = d.get("topics", [])
        concepts = []  # 没有 concept 节点
        edges = d.get("edges", [])
        node_ids = {n["id"] for n in nodes if "id" in n}
        res["g1_schema"] = (False, "topics 树：无 concept 节点 / 无 prereq 边 / 无 default_order")
        res["g6_visual"] = (None, "N/A（分类树）")
        res["visual_tagged"] = 0
        res["concepts"] = 0
        res["topics"] = len(nodes)
        res["edges"] = len(edges)
    else:
        nodes = d.get("nodes", [])
        node_ids = {n["id"] for n in nodes if "id" in n}
        concepts = [n for n in nodes if n.get("kind") == "concept"]
        topics = [n for n in nodes if n.get("kind") == "topic"]
        edges = d.get("edges", [])
        prereq = [e for e in edges if e.get("type") == "prereq"]
        res["concepts"] = len(concepts)
        res["topics"] = len(topics)
        res["edges"] = len(edges)
        # 门禁1 Schema 完整
        missing_order = [c["id"] for c in concepts if "default_order" not in c]
        problems = []
        if not concepts: problems.append("无 concept 节点")
        if not prereq: problems.append("无 prereq 边")
        if missing_order: problems.append(f"{len(missing_order)} 个 concept 缺 default_order")
        res["g1_schema"] = (len(problems) == 0, "; ".join(problems) or "OK")

        # 门禁6 visual 标注（可选字段，缺省=none）：取值合法 + visual≠none 时 hint 必填
        visual_problems = []
        tagged = 0
        for c in concepts:
            if "visual" not in c:
                continue
            v = c.get("visual")
            if v not in VISUAL_ENUM:
                visual_problems.append(f"{c['id']} visual={v!r} 非法")
                continue
            if v != "none":
                tagged += 1
                hint = c.get("visual_hint")
                if not (isinstance(hint, str) and hint.strip()):
                    visual_problems.append(f"{c['id']} visual={v} 缺 visual_hint")
        res["g6_visual"] = (len(visual_problems) == 0, "; ".join(visual_problems[:5]) + (f" …(+{len(visual_problems)-5})" if len(visual_problems) > 5 else "") if visual_problems else "OK")
        res["visual_tagged"] = tagged

    # 门禁2 id 全局唯一（局部重复 + 跨图重复都记）
    local_ids = [n["id"] for n in nodes if "id" in n]
    dup_local = {i for i in local_ids if local_ids.count(i) > 1}
    for i in local_ids:
        all_ids_counter[i].append(name)
    res["g2_id_local"] = (len(dup_local) == 0, f"本图重复 id: {sorted(dup_local)}" if dup_local else "OK")

    # 门禁4 引用完整
    bad_ref = []
    for e in edges:
        if e.get("from") not in node_ids: bad_ref.append(f"边 from={e.get('from')} 不存在")
        if e.get("to") not in node_ids: bad_ref.append(f"边 to={e.get('to')} 不存在")
    if shape == "nodes":
        for c in concepts:
            t = c.get("topic")
            if t is not None and t not in node_ids:
                bad_ref.append(f"concept {c['id']} 的 topic={t} 不存在")
    res["g4_refs"] = (len(bad_ref) == 0, "; ".join(bad_ref[:5]) + (f" …(+{len(bad_ref)-5})" if len(bad_ref) > 5 else "") if bad_ref else "OK")

    # 门禁3 DAG（仅 prereq 边）
    prereq = [e for e in edges if e.get("type") == "prereq"] if shape == "nodes" else []
    adj = defaultdict(list)
    indeg = defaultdict(int)
    valid_nodes = node_ids
    for e in prereq:
        f, t = e.get("from"), e.get("to")
        if f in valid_nodes and t in valid_nodes:
            adj[f].append(t); indeg[t] += 1
    # 拓扑排序检测环
    q = deque([n for n in valid_nodes if indeg[n] == 0])
    seen = 0
    indeg2 = dict(indeg)
    while q:
        u = q.popleft(); seen += 1
        for v in adj[u]:
            indeg2[v] -= 1
            if indeg2[v] == 0: q.append(v)
    has_cycle = seen < len(valid_nodes) and len(prereq) > 0
    res["g3_dag"] = (not has_cycle, "存在环（无法拓扑排序）" if has_cycle else "OK")

    # 门禁5 入口可控（无入边的 concept = 起点）
    if shape == "nodes":
        concept_ids = {c["id"] for c in concepts}
        targets = {e.get("to") for e in prereq}
        roots = [cid for cid in concept_ids if cid not in targets]
        res["g5_roots"] = (True, f"{len(roots)} 个起点 concept")
        res["roots_list"] = roots
    else:
        res["g5_roots"] = (None, "N/A（分类树）")
    return res

def main():
    graphs = load_graphs()
    all_ids = defaultdict(list)
    results = [check(n, g, all_ids) for n, g in graphs.items()]

    # 跨图 id 冲突
    cross_dup = {i: gs for i, gs in all_ids.items() if len(set(gs)) > 1}

    print("\n===== 硬门禁通过表 =====\n")
    hdr = f"{'图':<38}{'T/C/E':<14}{'G1schema':<9}{'G2id':<7}{'G3dag':<7}{'G4ref':<7}{'G6vis':<7}"
    print(hdr); print("-" * len(hdr))
    def mark(v):
        if v is None: return "—"
        return "✅" if v else "❌"
    for r in results:
        if r.get("fatal"):
            print(f"{r['name']:<38}FATAL: {r['fatal']}"); continue
        tce = f"{r['topics']}/{r['concepts']}/{r['edges']}"
        print(f"{r['name']:<38}{tce:<14}{mark(r['g1_schema'][0]):<8}{mark(r['g2_id_local'][0]):<6}{mark(r['g3_dag'][0]):<6}{mark(r['g4_refs'][0]):<6}{mark(r['g6_visual'][0]):<6}")

    print("\n===== 失败明细 =====")
    for r in results:
        if r.get("fatal"): continue
        fails = []
        for k, label in [("g1_schema","G1 Schema"),("g2_id_local","G2 id唯一"),("g3_dag","G3 DAG"),("g4_refs","G4 引用"),("g6_visual","G6 visual")]:
            ok, msg = r[k]
            if ok is False: fails.append(f"  [{label}] {msg}")
        if fails:
            print(f"\n● {r['name']}")
            for f in fails: print(f)

    print("\n===== 跨图 id 冲突（门禁2 全局） =====")
    if cross_dup:
        for i, gs in sorted(cross_dup.items()):
            print(f"  {i}: {sorted(set(gs))}")
    else:
        print("  无")

    print("\n===== 入口 concept 数（门禁5 参考） =====")
    for r in results:
        if r.get("fatal") or r.get("g5_roots",[None])[0] is None: continue
        print(f"  {r['name']:<38}{r['g5_roots'][1]}")

    print("\n===== visual 标注覆盖（门禁6 参考） =====")
    for r in results:
        if r.get("fatal") or r.get("g6_visual",[None])[0] is None: continue
        n = r.get("visual_tagged", 0)
        total = r.get("concepts", 0)
        print(f"  {r['name']:<38}{n}/{total} concept 已标注 visual≠none")

if __name__ == "__main__":
    main()
