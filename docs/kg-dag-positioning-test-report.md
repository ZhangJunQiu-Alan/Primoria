# KG/DAG Positioning Test Report

Date: 2026-06-17

Scope: 20 subject knowledge graphs. This report tests the KG positioning and DAG planning layer only. It does not trigger `/api/learning/course` or call the course-generation LLM, so the results isolate graph recall, topic/concept classification, and `nextTopic` selection.

Method:

- Cross-graph run: `positionLearningGoal({ query })`, matching the real blank-`graphId` user flow.
- Oracle single-graph run: `positionLearningGoal({ query, graphId })`, checking whether the target graph itself can locate the right topic/concept and build the linear DAG plan.
- Pass criterion: cross-graph result is `specific`, matches the intended `graphId`, expected topic, and expected concept. Oracle result is used to separate cross-subject routing failures from internal DAG failures.

## Summary

| Metric | Result |
|---|---:|
| Total cases | 20 |
| Cross-graph pass | 18 |
| Cross-graph routing issues | 2 |
| Single-graph DAG pass | 20 |
| Internal DAG failures | 0 |

Core conclusion: the per-graph DAG artifacts and `nextTopic` planning are healthy for this sample set. The two failures are cross-graph subject-routing problems, not failures inside the target graph.

## Test Matrix

| # | Intended graph | Input | Cross-graph result | Fixed-graph DAG result | Verdict |
|---:|---|---|---|---|---|
| 1 | `Python` | `我想学 SICP 里的 Lambda Expressions` | `Python` -> Higher-Order Functions / `lambda` / next: Recursion and Trees | Higher-Order Functions / `lambda` / next: Recursion and Trees | PASS |
| 2 | `a_level_biology` | `我想学 Enzyme Inhibition` | `a_level_biology` -> Enzymes / `bio_enzyme_inhibition` / next: Energy and Respiration | Enzymes / `bio_enzyme_inhibition` / next: Energy and Respiration | PASS |
| 3 | `a_level_chemistry` | `我想学 Le Chatelier's Principle` | `a_level_chemistry` -> Chemical Equilibria / `che_le_chatelier` / next: Acids, Bases and Buffers | Chemical Equilibria / `che_le_chatelier` / next: Acids, Bases and Buffers | PASS |
| 4 | `a_level_mathematics` | `我想学 Implicit Differentiation` | `mit_calculus` -> Differentiation / `c_1801_implicit_diff` / next: Applications of Differentiation | Differentiation (Advanced) / `mat_implicit` / next: Integration | CROSS_GRAPH_ROUTING_ISSUE |
| 5 | `a_level_physics` | `我想学 Newton's Laws of Motion` | `a_level_physics` -> Dynamics / `phy_newton_laws` / next: Forces, Density and Pressure | Dynamics / `phy_newton_laws` / next: Forces, Density and Pressure | PASS |
| 6 | `artificial_intelligence` | `我想学 Heuristics and Admissibility` | `artificial_intelligence` -> Search / `ai_heuristics` / next: Constraint Satisfaction | Search / `ai_heuristics` / next: Constraint Satisfaction | PASS |
| 7 | `computer_architecture` | `我想学 RISC-V Function Calling Convention` | `computer_architecture` -> RISC-V Assembly / `concept_riscv_functions` / next: null | RISC-V Assembly / `concept_riscv_functions` / next: null | PASS |
| 8 | `computer_network` | `我想学 TCP congestion control in Transport Layer` | `computer_network` -> Transport Layer / `net_congestion` / next: Application Layer | Transport Layer / `net_congestion` / next: Application Layer | PASS |
| 9 | `computer_systems` | `我想学 Virtual Memory Page Tables` | `computer_systems` -> Virtual Memory / `c8_2` / next: null | Virtual Memory / `c8_2` / next: null | PASS |
| 10 | `data_structures_and_algorithms` | `我想学 Left-Leaning Red-Black Trees` | `data_structures_and_algorithms` -> Balanced Search Trees / `c_ucb61b_llrb` / next: null | Balanced Search Trees / `c_ucb61b_llrb` / next: null | PASS |
| 11 | `deep_learning` | `我想学 Self-Attention` | `deep_learning` -> Attention and Transformers / `dl_self_attention` / next: null | Attention and Transformers / `dl_self_attention` / next: null | PASS |
| 12 | `discrete_math_and_probability` | `我想学 RSA Decryption Proof` | `discrete_math_and_probability` -> Cryptography / `rsa_decryption_proof` / next: null | Cryptography / `rsa_decryption_proof` / next: null | PASS |
| 13 | `information_theory` | `我想学 Shannon Entropy` | `information_theory` -> Entropy and Information Measures / `c_infotheory_entropy` / next: Source Coding | Entropy and Information Measures / `c_infotheory_entropy` / next: Source Coding | PASS |
| 14 | `introduction_to_computer_science` | `我想学 SQL Joins` | `introduction_to_computer_science` -> Week 7: SQL / `c_joins` / next: null | Week 7: SQL / `c_joins` / next: null | PASS |
| 15 | `linear_algebra` | `我想学 Diagonalization` | `linear_algebra` -> Eigenvalues and Eigenvectors / `c_mit1806_diagonalization` / next: SVD and Linear Transformations | Eigenvalues and Eigenvectors / `c_mit1806_diagonalization` / next: SVD and Linear Transformations | PASS |
| 16 | `machine_learning` | `我想学 Sigmoid and Decision Boundary` | `machine_learning` -> Classification and GLMs / `ml_sigmoid` / next: Neural Networks | Classification and GLMs / `ml_sigmoid` / next: Neural Networks | PASS |
| 17 | `mit_calculus` | `我想学 Integration by Parts` | `mit_calculus` -> Techniques of Integration / `c_1801_parts` / next: Infinite Series | Techniques of Integration / `c_1801_parts` / next: Infinite Series | PASS |
| 18 | `numerical_analysis` | `我想学 Newton's Method` | `numerical_analysis` -> Root Finding / `c_mit18330_newton` / next: null | Root Finding / `c_mit18330_newton` / next: null | PASS |
| 19 | `software_construction` | `我想学 Representation Independence` | `machine_learning` broad menu: Learning Theory, Unsupervised Learning, Reinforcement Learning | Abstract Data Types / `c_mit6031_rep_independence` / next: Object-Oriented Programming | CROSS_GRAPH_ROUTING_ISSUE |
| 20 | `web_applications` | `我想学 SQL Injection` | `web_applications` -> Web Security / `web_sql_injection` / next: null | Web Security / `web_sql_injection` / next: null | PASS |

## Findings

### 1. Single-Graph DAG Planning Is Working

All 20 oracle runs passed. For each graph, the system could locate the expected topic and concept when the target `graphId` was provided. The `nextTopic` behavior also matched the current DAG artifacts:

- Linear continuation appears where successors exist, e.g. `Entropy and Information Measures -> Source Coding`, `Classification and GLMs -> Neural Networks`, `Techniques of Integration -> Infinite Series`.
- Leaf topics correctly return `nextTopic: null`, e.g. `RISC-V Assembly`, `Virtual Memory`, `Web Security`, `Root Finding`.

This means the current issue is not the topic DAG builder or `nextTopic()` selection for these examples.

### 2. Cross-Graph Routing Is Mostly Good, But Needs Disambiguation

18 of 20 blank-`graphId` tests routed to the intended subject graph. The two failures are explainable:

- `Implicit Differentiation` exists in both `a_level_mathematics` and `mit_calculus`. Cross-graph recall chose `mit_calculus`, which is semantically valid but wrong if the user is inside an A-Level pathway.
- `Representation Independence` should route to `software_construction`, but the cross-graph run chose `machine_learning` as a broad match. The fixed-graph run succeeds, so this is an embedding/subject-prior problem.

### 3. Course Context Quality Looks Usable

For `specific` cases, the planned course context includes:

- `startTopic`
- `targetConceptId`
- ordered concept list inside the topic
- `nextTopic` when the DAG has a successor

That is enough for the current two-lesson course prompt design. The main risk is not missing context inside a selected graph; it is choosing the wrong graph before the course context is built.

## Recommendations

1. Preserve or infer a user curriculum context when possible.
   If the user is already browsing A-Level Maths, pass `graphId: a_level_mathematics`; if they are in MIT Calculus, pass `graphId: mit_calculus`. This avoids duplicate-topic ambiguity.

2. Add subject aliases or query expansion for weaker graphs.
   `software_construction` likely needs stronger alias text around `MIT 6.031`, `software design`, `ADT`, `rep invariant`, and `representation independence`.

3. Add a rerank step when top graphs are close.
   If cross-graph recall produces multiple plausible graphs, rerank by subject/title/context before collapsing to a dominant graph.

4. Track cross-graph failures separately from DAG failures.
   A failed blank-`graphId` test does not necessarily mean the graph's DAG is bad. This report shows the difference clearly: 20/20 single-graph DAG pass, 18/20 cross-graph pass.

5. Keep `nextTopic: null` behavior.
   Several valid tests hit leaf topics. The current behavior correctly avoids inventing a second lesson for terminal DAG nodes.

