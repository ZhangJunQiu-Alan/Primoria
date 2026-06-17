#!/usr/bin/env python3
"""B 组 9 张图：分类树 -> 规范 schema(nodes/edges)。
映射：一级 chapter -> topic；二级 subtopic -> concept(复用 id/desc)。
childless/单子节点 topic 由 GEN 补 concept。
边：intra-topic 顺序 soft；inter-topic 依赖(INTER) 由 prereq.topic 末 concept -> target.topic 首 concept。
本轮只保证硬门禁(结构/DAG/default_order)；已有 subtopic 的 description 沿用原占位串。"""
import json, os, re

SCHEMA = {
    "description": "只有归属与先修两类关系。归属树通过每个 concept 的 topic 字段表示;edges 只存先修(prereq)边。",
    "node_fields": {
        "id": "全局唯一 id", "kind": "topic | concept", "name": "概念名",
        "topic": "所属 topic 节点 id;topic 节点本身为 null",
        "description": "一句话定义,用于喂 prompt", "default_order": "同一 topic 内的默认教学顺序"},
    "edge_types": {"prereq": "先修边,from 必须先于 to;strength=hard|soft"},
    "concept_node_definition": "concept node = 一个能独立出 quiz 题检验的最小概念",
}

def cid(course, name):
    s = f"{course}_{name.lower().replace(' ', '_').replace('&','and').replace('/','_')}"
    return "".join(c for c in s if c.isalnum() or c == "_")

# 为 childless / 过疏 topic 生成 concept：topic_title -> [(name, desc), ...]
GEN = {
  "alevel_math": {
    "Coordinate Geometry": [("Straight Line Equations","直线的斜截式与一般式方程"),("Circle Equations","圆的标准方程与一般方程"),("Parallel and Perpendicular Lines","平行与垂直直线的斜率关系"),("Line and Circle Intersections","直线与圆的交点求解")],
    "Trigonometry": [("Trig Ratios and Graphs","正弦余弦正切的定义、图像与周期"),("Trig Identities","基本三角恒等式与变换"),("Solving Trig Equations","在给定区间内解三角方程"),("Sine and Cosine Rules","任意三角形的正弦与余弦定理"),("Radians and Arc Length","弧度制及弧长扇形面积")],
    "Exponentials and Logarithms": [("Exponential Functions","指数函数的图像与性质"),("Logarithm Laws","对数的运算法则与换底"),("Solving Exponential Equations","用对数求解指数方程"),("Exponential Models","指数增长与衰减建模")],
    "Sequences and Series": [("Arithmetic Sequences","等差数列的通项与求和"),("Geometric Sequences","等比数列的通项与求和"),("Sigma Notation","求和符号 Σ 的表示与运算"),("Sum to Infinity","收敛等比级数的无穷和"),("Recurrence Relations","由递推关系定义数列")],
    "Binomial Expansion": [("Binomial Coefficients","二项式系数与组合数"),("Binomial Theorem","正整数次幂的二项式展开"),("Binomial Approximations","用二项展开做近似估计")],
    "Vectors": [("Vector Notation","向量的分量与单位向量表示"),("Magnitude and Direction","向量的模与方向角"),("Vector Addition","向量加减与数乘"),("Position Vectors","位置向量与点的表示"),("Scalar Product","向量点积及夹角")],
  },
  "cs188": {
    "Constraint Satisfaction Problems": [("Constraint Graphs","变量、域与约束构成的图表示"),("Backtracking Search","回溯搜索求解 CSP"),("Constraint Propagation","约束传播缩小变量域"),("Arc Consistency","弧相容 AC-3 算法")],
    "Markov Decision Processes": [("States and Actions","MDP 的状态与动作空间"),("Transition and Reward","转移概率与奖励函数"),("Bellman Equations","价值函数的贝尔曼方程"),("Value Iteration","值迭代求最优价值"),("Policy Iteration","策略迭代求最优策略")],
    "Reinforcement Learning": [("Exploration vs Exploitation","探索与利用的权衡"),("Temporal Difference Learning","时序差分价值更新"),("Q-Learning","无模型的 Q 值学习"),("Function Approximation","用特征逼近大状态空间价值")],
    "Hidden Markov Models": [("Markov Chains","状态转移的马尔可夫性"),("Emission and Transition","HMM 的发射与转移概率"),("Forward Algorithm","前向算法计算观测概率"),("Viterbi Algorithm","维特比解码最可能状态序列")],
    "Probability": [("Random Variables","随机变量与概率分布"),("Conditional Probability","条件概率与联合概率"),("Bayes Rule","贝叶斯定理")],  # 追加到已有 Bayes Nets
  },
  "11_785": {
    "Attention Mechanisms": [("Attention Scores","查询-键相似度打分"),("Self-Attention","序列内部的自注意力"),("Multi-Head Attention","多头注意力并行子空间")],  # 追加到已有 Transformers
  },
}

# inter-topic 依赖：course -> [(prereq_topic_title, target_topic_title, strength)]
INTER = {
  "alevel_biology": [("Biological Molecules","Cell Biology","hard"),("Biological Molecules","Genetics and Inheritance","hard"),("Cell Biology","Genetics and Inheritance","hard"),("Cell Biology","Human Physiology","hard"),("Genetics and Inheritance","Evolution","hard"),("Cell Biology","Ecology and Ecosystems","soft")],
  "alevel_chemistry": [("Atomic Structure and Amount of Substance","Bonding and Structure","hard"),("Atomic Structure and Amount of Substance","Energetics","hard"),("Bonding and Structure","Energetics","soft"),("Energetics","Kinetics","soft"),("Kinetics","Chemical Equilibria","hard"),("Chemical Equilibria","Acids Bases and Buffers","hard"),("Atomic Structure and Amount of Substance","Redox and Electrochemistry","hard"),("Atomic Structure and Amount of Substance","Periodicity","hard"),("Periodicity","Group Chemistry","hard")],
  "alevel_math": [("Algebra and Functions","Coordinate Geometry","hard"),("Algebra and Functions","Trigonometry","hard"),("Algebra and Functions","Exponentials and Logarithms","hard"),("Algebra and Functions","Differentiation","hard"),("Differentiation","Integration","hard"),("Algebra and Functions","Sequences and Series","soft"),("Algebra and Functions","Binomial Expansion","hard"),("Coordinate Geometry","Vectors","soft")],
  "alevel_physics": [("Mechanics","Materials","hard"),("Mechanics","Waves","soft"),("Mechanics","Electricity","soft"),("Electricity","Electromagnetism","hard"),("Mechanics","Thermal Physics","soft"),("Mechanics","Nuclear Physics","soft"),("Waves","Quantum Physics","hard"),("Nuclear Physics","Astrophysics","soft")],
  "cs188": [("Search","Constraint Satisfaction Problems","soft"),("Search","Markov Decision Processes","soft"),("Markov Decision Processes","Reinforcement Learning","hard"),("Probability","Hidden Markov Models","hard"),("Probability","Machine Learning","hard")],
  "cs144": [("Network Architecture","Application Layer","hard"),("Network Architecture","Transport Layer","hard"),("Transport Layer","Application Layer","hard"),("Network Layer","Transport Layer","hard"),("Link Layer","Network Layer","hard")],
  "11_785": [("Multilayer Perceptrons","Convolutional Neural Networks","hard"),("Multilayer Perceptrons","Recurrent Neural Networks","hard"),("Recurrent Neural Networks","Attention Mechanisms","hard"),("Multilayer Perceptrons","Generative Models","hard")],
  "cs229": [("Supervised Learning","Deep Learning","hard"),("Supervised Learning","Unsupervised Learning","soft"),("Supervised Learning","Reinforcement Learning","soft")],
  "cs142": [("Internet Basics","Frontend Technologies","hard"),("Internet Basics","Backend Technologies","hard"),("Frontend Technologies","Backend Technologies","soft"),("Backend Technologies","Databases","hard"),("Frontend Technologies","Web Security","hard"),("Backend Technologies","Web Security","hard")],
}

def build(path):
    d = json.load(open(path, encoding="utf-8"))
    course = d["id"]; name = d["name"]
    topics_raw = d["topics"]
    by_parent = {}
    for t in topics_raw:
        by_parent.setdefault(t.get("parent_id"), []).append(t)
    roots = by_parent.get(None, [])
    title_to_id = {r["title"]: r["id"] for r in roots}

    nodes, edges = [], []
    topic_concepts = {}  # topic_id -> [concept_id in order]

    for ti, r in enumerate(roots, 1):
        nodes.append({"id": r["id"], "kind": "topic", "name": r["title"], "topic": None, "default_order": ti})
        concepts = []
        # 已有 subtopic -> concept
        for sub in by_parent.get(r["id"], []):
            concepts.append({"id": sub["id"], "name": sub["title"], "desc": sub.get("description", "")})
        # 生成补充 concept
        for gname, gdesc in GEN.get(course, {}).get(r["title"], []):
            concepts.append({"id": cid(course, gname), "name": gname, "desc": gdesc})
        co_ids = []
        for ci, c in enumerate(concepts, 1):
            nodes.append({"id": c["id"], "kind": "concept", "name": c["name"], "topic": r["id"], "description": c["desc"], "default_order": ci})
            co_ids.append(c["id"])
        topic_concepts[r["id"]] = co_ids
        # intra-topic 顺序 soft 边
        for a, b in zip(co_ids, co_ids[1:]):
            edges.append({"from": a, "to": b, "type": "prereq", "strength": "soft"})

    # inter-topic 边：prereq.topic 末 concept -> target.topic 首 concept
    for pt, tt, strength in INTER.get(course, []):
        pid, tid = title_to_id.get(pt), title_to_id.get(tt)
        if not pid or not tid:
            raise SystemExit(f"{course}: 未知 topic title {pt!r} 或 {tt!r}")
        pc, tc = topic_concepts.get(pid), topic_concepts.get(tid)
        if pc and tc:
            edges.append({"from": pc[-1], "to": tc[0], "type": "prereq", "strength": strength})

    out = {"subject": name, "schema": SCHEMA, "nodes": nodes, "edges": edges}
    json.dump(out, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    nc = sum(1 for n in nodes if n["kind"] == "concept")
    nt = sum(1 for n in nodes if n["kind"] == "topic")
    print(f"{os.path.basename(path):38} topics={nt} concepts={nc} edges={len(edges)}")

if __name__ == "__main__":
    base = os.path.dirname(__file__)
    B = ["a_level_biology","a_level_chemistry","a_level_mathematics","a_level_physics",
         "artificial_intelligence","computer_network","deep_learning","machine_learning","web_applications"]
    for f in B:
        build(os.path.join(base, f + ".json"))
