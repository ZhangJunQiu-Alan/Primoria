#!/usr/bin/env python3
"""统一英文 KG builder。spec -> 规范 schema JSON,并自检引用完整 + DAG。
spec = {
  "id": str, "subject": str,
  "topics": [ {"id","name","chain"(bool, 默认 True),
               "concepts":[(cid,name,desc), ...]}, ... ],
  "edges": [ (from_cid, to_cid, "hard"|"soft"), ... ],  # 跨 topic / 额外概念级先修
}
- topic.default_order 按 topics 顺序；concept.default_order 按 topic 内顺序。
- chain=True 时自动给同 topic 内相邻 concept 加 soft 先修边(课内顺序)。
"""
import json, os
from collections import defaultdict, deque

SCHEMA_EN = {
    "description": "Attribution tree via each concept's `topic` field; `edges` holds only prereq edges.",
    "node_fields": {
        "id": "globally unique id", "kind": "topic | concept", "name": "concept name",
        "topic": "owning topic id; null for topic nodes",
        "description": "one-sentence definition for prompting/RAG",
        "default_order": "default teaching order within the topic"},
    "edge_types": {"prereq": "from must be learned before to; strength=hard|soft"},
    "concept_node_definition": "concept = smallest independently quiz-testable skill",
}

def build(spec, path):
    nodes = []
    topic_concepts = {}
    all_cids = set()
    # 单一 (from,to) 只保留一条边；强度取 max，hard 优先于 soft。
    edge_strength = {}  # (fr,to) -> "hard"|"soft"，保持插入顺序
    def add_edge(fr, to, strength):
        cur = edge_strength.get((fr, to))
        edge_strength[(fr, to)] = "hard" if (cur == "hard" or strength == "hard") else "soft"
    for ti, t in enumerate(spec["topics"], 1):
        nodes.append({"id": t["id"], "kind": "topic", "name": t["name"], "topic": None, "default_order": ti})
        cids = []
        for ci, (cid, cname, cdesc) in enumerate(t["concepts"], 1):
            if cid in all_cids:
                raise SystemExit(f'{spec["id"]}: duplicate concept id {cid}')
            all_cids.add(cid)
            nodes.append({"id": cid, "kind": "concept", "name": cname, "topic": t["id"],
                          "description": cdesc, "default_order": ci})
            cids.append(cid)
        topic_concepts[t["id"]] = cids
        if t.get("chain", True):
            for a, b in zip(cids, cids[1:]):
                add_edge(a, b, "soft")
    node_ids = {n["id"] for n in nodes}
    for fr, to, strength in spec.get("edges", []):
        if fr not in node_ids or to not in node_ids:
            raise SystemExit(f'{spec["id"]}: edge endpoint missing {fr}->{to}')
        add_edge(fr, to, strength)
    edges = [{"from": fr, "to": to, "type": "prereq", "strength": s}
             for (fr, to), s in edge_strength.items()]

    _check_dag(spec["id"], node_ids, edges)
    out = {"subject": spec["subject"], "schema": SCHEMA_EN, "nodes": nodes, "edges": edges}
    json.dump(out, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    nt = sum(1 for n in nodes if n["kind"] == "topic")
    nc = sum(1 for n in nodes if n["kind"] == "concept")
    print(f'{os.path.basename(path):38} topics={nt} concepts={nc} edges={len(edges)} OK')

def _check_dag(name, node_ids, edges):
    adj = defaultdict(list); indeg = defaultdict(int)
    for e in edges:
        adj[e["from"]].append(e["to"]); indeg[e["to"]] += 1
    q = deque([n for n in node_ids if indeg[n] == 0]); seen = 0; ind = dict(indeg)
    while q:
        u = q.popleft(); seen += 1
        for v in adj[u]:
            ind[v] -= 1
            if ind[v] == 0: q.append(v)
    if seen < len(node_ids):
        raise SystemExit(f"{name}: prereq edges contain a cycle (not a DAG)")
