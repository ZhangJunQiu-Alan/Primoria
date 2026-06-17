#!/usr/bin/env python3
"""为 5 张英文 A 组图补 concept description（按 id）。computer_architecture 额外补 topic 内 soft 链以降低孤立起点。"""
import json, os
from collections import defaultdict

DESC = {
 # ---- Python ----
 "expr_stmt":"Expressions, statements and binding names.","control":"Conditionals and loops controlling flow.",
 "pure_func":"Pure functions versus side-effecting ones.","env_diag":"Tracking frames with environment diagrams.",
 "func_arg":"Passing functions as arguments.","func_ret":"Returning functions and closures.",
 "lambda":"Anonymous functions via lambda.","currying":"Turning multi-arg functions into chained calls.",
 "decorators":"Wrapping functions to extend behaviour.","recursion":"Functions defined in terms of themselves.",
 "tree_recur":"Recursion that branches into multiple calls.","tree_abs":"Trees via constructors and selectors.",
 "tree_trav":"Visiting all nodes of a tree.","seq":"Sequences and slicing.","list_comp":"Building lists with comprehensions.",
 "data_abs":"Separating data use from representation.","dict":"Key-value mappings with dictionaries.",
 "box_pointer":"Box-and-pointer visualisation of data.","mutability":"Mutable objects and aliasing.",
 "oop":"Classes, objects and methods.","inherit_comp":"Reuse via inheritance and composition.",
 "class_attr":"Class versus instance attributes.","string_rep":"__str__ and __repr__ representations.",
 "linked_lists":"Recursive linked-list structures.","mut_trees":"Trees with mutable nodes.",
 "iterators":"The iterator protocol.","generators":"Lazy sequences with yield.",
 "scheme_syntax":"Prefix-notation Scheme expressions.","scheme_lists":"Pairs and lists in Scheme.",
 "tail_calls":"Tail-call optimisation.","macros":"Code-transforming Scheme macros.",
 "parsing":"Lexing and parsing into syntax trees.","eval":"The eval step of an interpreter.",
 "apply":"The apply step of an interpreter.","exceptions":"Raising and handling exceptions.",
 "regex":"Pattern matching with regular expressions.","bnf":"Context-free grammars in BNF.",
 "sql_queries":"Selecting and filtering rows in SQL.","sql_joins":"Joining tables and aggregating.",
 # ---- discrete_math ----
 "propositional_logic":"Propositions, connectives and truth tables.","direct_proofs":"Proving implications directly.",
 "proof_by_contraposition":"Proving p→q via ¬q→¬p.","proof_by_contradiction":"Deriving a contradiction from the negation.",
 "simple_induction":"Induction over the naturals.","strong_induction":"Induction assuming all smaller cases.",
 "well_ordering_principle":"Every nonempty set of naturals has a least element.","structural_induction":"Induction over recursive structures.",
 "stable_matching_problem":"Pairing two sides with no unstable pair.","gale_shapley_algorithm":"Proposal algorithm for a stable matching.",
 "matching_optimality":"Optimality for the proposing side.","matching_pessimality":"Pessimality for the receiving side.",
 "graph_basics":"Vertices, edges, degree and paths.","eulerian_tours":"Tours using every edge once.",
 "trees":"Connected acyclic graphs.","planar_graphs":"Crossing-free graphs and Euler's formula.","hypercubes":"Recursive hypercube graphs.",
 "euclids_algorithm":"gcd via repeated division.","extended_euclid":"Bézout coefficients and inverses.",
 "chinese_remainder_theorem":"Solving simultaneous congruences.","fermats_little_theorem":"a^(p-1)≡1 mod p for prime p.",
 "symmetric_cryptography":"Shared-key encryption.","rsa_setup_and_encryption":"RSA public-key setup and encryption.",
 "rsa_decryption_proof":"Correctness proof of RSA.","digital_signatures":"Authenticating messages with private keys.",
 "polynomial_roots_and_degree":"Roots and degree over a field.","polynomial_interpolation":"Recovering a polynomial from points.",
 "secret_sharing":"Sharing secrets via polynomials.","error_correcting_codes":"Polynomial error correction.",
 "bijections_and_cardinality":"Comparing set sizes via bijections.","cantors_diagonalization":"Diagonal argument for uncountability.",
 "uncountability_of_reals":"The reals are uncountable.","the_halting_problem":"Undecidability of halting.","undecidability":"Problems with no deciding algorithm.",
 "basic_counting_rules":"Sum and product rules.","combinations_permutations":"Ordered and unordered selections.",
 "combinatorial_proofs":"Counting two ways to prove identities.","stars_and_bars":"Counting integer solutions.","inclusion_exclusion":"Counting unions via inclusion-exclusion.",
 "probability_spaces":"Sample spaces, events and axioms.","conditional_probability":"Probability given an event.",
 "bayes_rule":"Inverting conditional probabilities.","event_independence":"Independence of events.",
 "discrete_random_variables":"Variables over discrete outcomes.","expectation":"Average value of a random variable.",
 "linearity_of_expectation":"E[X+Y]=E[X]+E[Y] regardless of dependence.","variance_and_covariance":"Spread and joint variation.",
 "bernoulli_binomial_distributions":"Single- and repeated-trial distributions.","geometric_distribution":"Trials until first success.",
 "poisson_distribution":"Rare-event counts.","hypergeometric_distribution":"Sampling without replacement.",
 "continuous_random_variables":"Variables over a continuum.","probability_density_function":"Density of continuous probability.",
 "cumulative_distribution_function":"Probability below a value.","uniform_exponential_distributions":"Uniform and memoryless exponential laws.",
 "normal_distribution":"The Gaussian distribution.","markovs_inequality":"Tail bound from the mean.",
 "chebyshevs_inequality":"Tail bound from the variance.","chernoff_bounds":"Exponential tail bounds for sums.",
 "weak_law_of_large_numbers":"Sample mean converges in probability.","central_limit_theorem":"Sums tend to normal.",
 "markov_chains_basics":"Memoryless transition processes.","hitting_times":"Expected time to reach a state.",
 "stationary_distributions":"Long-run state distribution.","page_rank_algorithm":"Ranking via stationary distribution.",
 # ---- intro_cs ----
 "c_functions":"Reusable blocks of instructions.","c_events":"Triggering actions on events.","c_conditions":"Branching with conditionals.",
 "c_loops":"Repetition with loops.","c_abstraction":"Hiding detail behind abstractions.","c_c_syntax":"Basic syntax of C.",
 "c_data_types":"Primitive data types and sizes.","c_operators":"Arithmetic, relational and logical operators.","c_compilation":"Source-to-executable pipeline.",
 "c_debugging":"Finding and fixing bugs.","c_arrays":"Contiguous fixed-size collections.","c_strings":"Null-terminated character arrays.",
 "c_cli_args":"Reading command-line arguments.","c_linear_search":"Sequential search.","c_binary_search":"Logarithmic search on sorted data.",
 "c_sorting":"Sorting algorithms and costs.","c_recursion":"Functions that call themselves.","c_big_o":"Asymptotic running-time notation.",
 "c_pointers":"Variables holding addresses.","c_malloc":"Heap allocation with malloc/free.","c_call_stack":"Stack frames for calls.",
 "c_file_io":"Reading and writing files.","c_linked_lists":"Dynamically linked node lists.","c_hash_tables":"Key lookup via hashing.",
 "c_trees":"Hierarchical node structures.","c_tries":"Prefix trees for keys.","c_queues_stacks":"FIFO and LIFO structures.",
 "c_python_syntax":"Basic syntax of Python.","c_lists_dicts":"Python lists and dictionaries.","c_oop":"Classes and objects in Python.",
 "c_exceptions":"Handling runtime errors.","c_relational_db":"Tables and relationships.","c_sql_queries":"Querying with SQL.",
 "c_joins":"Combining tables with joins.","c_indexes":"Speeding queries with indexes.","c_html":"Structuring pages with HTML.",
 "c_css":"Styling pages with CSS.","c_js":"Client-side scripting.","c_dom":"Manipulating the DOM.","c_http":"The web request-response protocol.",
 "c_flask":"Building web apps with Flask.","c_mvc":"Model-view-controller architecture.","c_sessions":"State via sessions and cookies.",
 "c_apis":"Consuming and exposing APIs.","c_cybersecurity":"Principles of security.","c_encryption":"Protecting data with encryption.",
 "c_authentication":"Verifying identity.","c_vulnerabilities":"Common security vulnerabilities.",
 # ---- computer_architecture ----
 "concept_binary_hex":"Binary and hexadecimal number systems.","concept_integer_rep":"Two's complement integers.",
 "concept_floating_point":"IEEE 754 floating point.","concept_endianness":"Byte ordering and memory layout.",
 "concept_c_basics":"C syntax and control flow.","concept_pointers_arrays":"Pointers and array addressing.",
 "concept_memory_management":"Dynamic allocation with malloc/free.","concept_structs_unions":"Structs, unions and typedefs.",
 "concept_riscv_basics":"Registers and basic RISC-V instructions.","concept_riscv_control":"Branches and control flow.",
 "concept_riscv_functions":"Calling convention and the stack.","concept_riscv_formats":"RISC-V instruction encodings.",
 "concept_call_pipeline":"Compiler, assembler, linker, loader.","concept_boolean_algebra":"Boolean algebra and gates.",
 "concept_combinational_logic":"Combinational logic blocks.","concept_state_elements":"Flip-flops and registers.",
 "concept_sequential_logic":"Clocked sequential logic and timing.","concept_fsm":"Finite state machine design.",
 "concept_single_cycle":"Single-cycle CPU datapath.","concept_cpu_control":"Control signals for the datapath.",
 "concept_pipelining":"Pipelined execution.","concept_pipeline_hazards":"Hazards and forwarding.",
 "concept_branch_prediction":"Predicting branch outcomes.","concept_cache_basics":"Direct-mapped cache basics.",
 "concept_associative_caches":"Set-associative caches.","concept_cache_performance":"AMAT and miss analysis.",
 "concept_virtual_memory":"Virtual memory and page tables.","concept_tlb":"Translation lookaside buffer.",
 "concept_amdahls_law":"Speedup limits from Amdahl's law.","concept_simd":"Data-level parallelism (SIMD).",
 "concept_multithreading":"Thread-level parallelism (OpenMP).","concept_cache_coherence":"Coherence and false sharing.",
 "concept_warehouse_scale":"Warehouse-scale computing.","concept_memory_mapped_io":"Memory-mapped I/O.",
 "concept_polling_interrupts":"Polling versus interrupts.","concept_dma":"Direct memory access.",
 "concept_ecc_parity":"Error-correcting codes and parity.","concept_raid":"RAID and dependability.",
 # ---- computer_systems ----
 "c1_1":"Bits, bytes and hexadecimal.","c1_2":"Unsigned and two's complement integers.","c1_3":"Integer arithmetic and overflow.",
 "c1_4":"IEEE floating-point representation.","c1_5":"Floating-point rounding and operations.",
 "c2_1":"x86-64 data movement.","c2_2":"Arithmetic and logical operations.","c2_3":"Conditionals and loops in assembly.",
 "c2_4":"Procedures and the call stack.","c2_5":"Array and struct memory layout.",
 "c3_1":"The Y86-64 instruction set.","c3_2":"Sequential CPU implementation.","c3_3":"Pipelined execution.",
 "c3_4":"Pipeline hazards and forwarding.","c3_5":"Exceptions in a pipeline.",
 "c4_1":"Limits of compiler optimisation.","c4_2":"Loop unrolling.","c4_3":"Instruction-level parallelism.",
 "c4_4":"Memory aliasing effects.","c4_5":"Profiling for bottlenecks.",
 "c5_1":"Storage technologies and trends.","c5_2":"Temporal and spatial locality.","c5_3":"Cache organisation.",
 "c5_4":"Cache performance metrics.","c5_5":"Writing cache-friendly code.",
 "c6_1":"Static linking of object files.","c6_2":"The ELF object format.","c6_3":"Symbol resolution.","c6_4":"Relocation.","c6_5":"Dynamic linking.",
 "c7_1":"Traps, interrupts and faults.","c7_2":"Processes and context switches.","c7_3":"Process control (fork, execve).",
 "c7_4":"Signals and signal handling.","c7_5":"Non-local jumps.",
 "c8_1":"Address translation.","c8_2":"Multi-level page tables.","c8_3":"The TLB.","c8_4":"Dynamic memory allocation.","c8_5":"Garbage collection basics.",
 "c9_1":"Unix file I/O.","c9_2":"File metadata and stat.","c9_3":"The standard I/O library.","c9_4":"File sharing and descriptors.","c9_5":"I/O redirection.",
 "c10_1":"The client-server model.","c10_2":"The Internet Protocol.","c10_3":"The Transmission Control Protocol.","c10_4":"The sockets interface.","c10_5":"Basics of HTTP.",
 "c11_1":"Creating and joining threads.","c11_2":"Sharing variables between threads.","c11_3":"Synchronisation with semaphores.","c11_4":"Reentrancy and thread safety.","c11_5":"Deadlock conditions.",
}

FILES = ["Python","discrete_math_and_probability","introduction_to_computer_science",
         "computer_architecture","computer_systems"]

def patch(path, add_chain=False):
    d = json.load(open(path, encoding="utf-8"))
    missing = []
    for n in d["nodes"]:
        if n.get("kind") == "concept":
            if n["id"] in DESC:
                n["description"] = DESC[n["id"]]
            elif not n.get("description"):
                missing.append(n["id"])
    if add_chain:
        existing = {(e["from"], e["to"]) for e in d["edges"]}
        by = defaultdict(list)
        for n in d["nodes"]:
            if n.get("kind") == "concept":
                by[n["topic"]].append((n.get("default_order", 0), n["id"]))
        for tid, lst in by.items():
            lst.sort()
            ids = [i for _, i in lst]
            for a, b in zip(ids, ids[1:]):
                if (a, b) not in existing and (b, a) not in existing:
                    d["edges"].append({"from": a, "to": b, "type": "prereq", "strength": "soft"})
    json.dump(d, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    return missing

if __name__ == "__main__":
    base = os.path.dirname(__file__)
    allmiss = {}
    for f in FILES:
        m = patch(os.path.join(base, f + ".json"), add_chain=(f == "computer_architecture"))
        if m: allmiss[f] = m
        print(f"patched {f}" + (f"  MISSING desc: {m}" if m else ""))
    if not allmiss:
        print("all concepts have descriptions")
