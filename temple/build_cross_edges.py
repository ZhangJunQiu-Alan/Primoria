#!/usr/bin/env python3
"""跨学科先修边。每张图文件保持自洽(只含本图边);跨图先修边集中存到 cross_subject_edges.json。
校验:端点全局存在、from/to 必须分属不同图、合并所有图的 prereq 边 + 跨图边后仍是 DAG。"""
import json, os, glob
from collections import defaultdict, deque

# (from_concept, to_concept, strength) —— 方向为「先修 -> 依赖」,from 在更基础的学科
CROSS = [
 # ---- 数学/概率 -> 机器学习 (cs229) ----
 ("c_mit1806_matrix_ops","ml_linear_reg","hard"),
 ("c_mit1806_projections","ml_linear_reg","soft"),
 ("c_1802_gradient","ml_gradient_descent","hard"),
 ("c_mit1806_eigen","ml_pca","hard"),
 ("probability_spaces","ml_logistic_reg","soft"),
 ("normal_distribution","ml_gda","hard"),
 ("conditional_probability","ml_naive_bayes","hard"),
 ("c_1801_chain_rule","ml_backprop","hard"),
 # ---- 数学/概率 -> 深度学习 (11-785) ----
 ("c_1801_chain_rule","dl_backprop","hard"),
 ("c_mit1806_matrix_ops","dl_mlp","hard"),
 ("c_1802_gradient","dl_optimization","hard"),
 ("probability_spaces","dl_vae","soft"),
 # ---- 概率 -> 人工智能 (cs188) ----
 ("probability_spaces","ai_prob","hard"),
 ("bayes_rule","ai_bayes_rule","hard"),
 ("markov_chains_basics","ai_markov_chain","hard"),
 ("conditional_probability","ai_naive_bayes","soft"),
 # ---- 概率 -> 信息论 ----
 ("probability_spaces","c_infotheory_entropy","hard"),
 ("expectation","c_infotheory_entropy","soft"),
 ("conditional_probability","c_infotheory_joint_entropy","hard"),
 ("normal_distribution","c_infotheory_differential_entropy","soft"),
 # ---- 线代/微积分 -> 数值分析 ----
 ("c_mit1806_elimination","c_mit18330_lu","hard"),
 ("c_1801_deriv_def","c_mit18330_newton","hard"),
 ("c_1801_definite_integral","c_mit18330_newton_cotes","hard"),
 ("c_1801_taylor_series","c_mit18330_error_analysis","soft"),
 ("c_mit1806_least_squares","c_mit18330_least_squares","hard"),
 # ---- 离散数学 -> 数据结构与算法 ----
 ("simple_induction","c_ucb61b_recursion_analysis","soft"),
 ("basic_counting_rules","c_ucb61b_loop_analysis","soft"),
 ("graph_basics","c_ucb61b_graph_api","soft"),
 # ---- A-Level 数学 -> A-Level 物理 ----
 ("mat_vector_basics","phy_scalars_vectors","hard"),
 ("mat_trig_ratios","phy_scalars_vectors","soft"),
 ("mat_exp_func","phy_half_life","soft"),
 ("mat_exp_func","phy_capacitor_discharge","soft"),
 # ---- A-Level 数学 -> A-Level 化学 ----
 ("mat_log_laws","che_ph_ka","hard"),
 ("mat_exp_func","che_rate_equation","soft"),
 # ==== CS 学科群骨干（消除孤岛） ====
 # intro_cs (CS50) -> Python (CS61A)
 ("c_python_syntax","seq","soft"),
 ("c_lists_dicts","dict","soft"),
 # Python (CS61A) -> 数据结构与算法 (CS61B)
 ("oop","c_ucb61b_classes_objects","hard"),
 ("recursion","c_ucb61b_recursion_analysis","soft"),
 ("data_abs","c_ucb61b_java_basics","soft"),
 # intro_cs 数据结构 -> DSA
 ("c_trees","c_ucb61b_trees_intro","soft"),
 ("c_hash_tables","c_ucb61b_hash_code","soft"),
 # DSA -> 软件构造 (MIT 6.031)
 ("c_ucb61b_classes_objects","c_mit6031_adt_basics","soft"),
 ("c_ucb61b_bst_operations","c_mit6031_recursive_data","soft"),
 # 计算机组成 (CS61C) -> 计算机系统 (CSAPP)
 ("concept_integer_rep","c1_2","soft"),
 ("concept_floating_point","c1_4","soft"),
 # 计算机网络 (CS144) -> 系统的网络编程
 ("net_ip_addressing","c10_2","soft"),
 ("net_tcp","c10_3","soft"),
 # 编程/网络 -> Web 应用 (CS142)
 ("c_js","web_javascript","soft"),
 ("c_html","web_html","soft"),
 ("c_relational_db","web_relational","soft"),
 ("net_http","web_http","soft"),
 # ==== CS -> 智能学科群（骨干 + 接入 AI/ML） ====
 ("c_ucb61b_bfs","ai_uninformed","hard"),
 ("c_ucb61b_graph_api","ai_search_problem","soft"),
 ("c_ucb61b_big_theta","ml_gradient_descent","soft"),
]

def main():
    base = os.path.dirname(__file__)
    id_to_graph = {}
    intra_edges = []
    for path in glob.glob(os.path.join(base, "*.json")):
        name = os.path.basename(path)
        if name == "cross_subject_edges.json":
            continue
        d = json.load(open(path, encoding="utf-8"))
        if "nodes" not in d:
            continue
        gid = d.get("subject", name)
        for n in d["nodes"]:
            id_to_graph[n["id"]] = name
        for e in d.get("edges", []):
            if e.get("type") == "prereq":
                intra_edges.append((e["from"], e["to"]))

    # 校验端点 + 跨图
    out_edges = []
    for fr, to, strength in CROSS:
        if fr not in id_to_graph:
            raise SystemExit(f"cross: from id 不存在 {fr}")
        if to not in id_to_graph:
            raise SystemExit(f"cross: to id 不存在 {to}")
        if id_to_graph[fr] == id_to_graph[to]:
            raise SystemExit(f"cross: {fr}->{to} 同属一图 {id_to_graph[fr]}，非跨学科边")
        out_edges.append({"from": fr, "to": to, "type": "prereq", "strength": strength,
                          "from_graph": id_to_graph[fr], "to_graph": id_to_graph[to]})

    # 合并全图 DAG 校验
    adj = defaultdict(list); indeg = defaultdict(int); nodes = set(id_to_graph)
    for a, b in intra_edges + [(e["from"], e["to"]) for e in out_edges]:
        adj[a].append(b); indeg[b] += 1
    q = deque([n for n in nodes if indeg[n] == 0]); seen = 0; ind = dict(indeg)
    while q:
        u = q.popleft(); seen += 1
        for v in adj[u]:
            ind[v] -= 1
            if ind[v] == 0: q.append(v)
    if seen < len(nodes):
        raise SystemExit("合并全图后存在环（跨图边引入了循环）")

    doc = {"description": "Cross-subject prerequisite edges. Endpoints are globally-unique concept ids "
                          "living in different subject graphs. Direction: prerequisite -> dependent.",
           "edges": out_edges}
    json.dump(doc, open(os.path.join(base, "cross_subject_edges.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    # 汇总
    pairs = defaultdict(int)
    for e in out_edges:
        pairs[(e["from_graph"].replace(".json",""), e["to_graph"].replace(".json",""))] += 1
    print(f"跨学科边 {len(out_edges)} 条，合并全图 DAG ✅")
    for (a, b), c in sorted(pairs.items()):
        print(f"  {a} -> {b}: {c}")

if __name__ == "__main__":
    main()
