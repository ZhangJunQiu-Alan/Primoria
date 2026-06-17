#!/usr/bin/env python3
"""B 组 5 张 CS 图重写：AI(CS188) / ML(CS229) / DL(11-785) / 网络(CS144) / Web(CS142)。"""
import os
from kg_en_builder import build

AI = {"id":"cs188","subject":"Introduction to Artificial Intelligence (UCB CS188)","topics":[
 {"id":"ai_search","name":"Search","concepts":[
   ("ai_search_problem","Search Problem Formulation","States, actions, goal test and path cost."),
   ("ai_uninformed","Uninformed Search","BFS, DFS and uniform-cost search."),
   ("ai_heuristics","Heuristics and Admissibility","Admissible/consistent heuristics for search."),
   ("ai_informed","Informed Search (A*)","Greedy and A* search using heuristics."),
   ("ai_minimax","Adversarial Search (Minimax)","Optimal play in zero-sum games."),
   ("ai_alphabeta","Alpha-Beta Pruning","Pruning the minimax game tree."),
 ]},
 {"id":"ai_csp","name":"Constraint Satisfaction","concepts":[
   ("ai_csp_def","Constraint Satisfaction Problems","Variables, domains and constraints."),
   ("ai_backtracking","Backtracking Search","Systematic assignment with backtracking."),
   ("ai_arc_consistency","Constraint Propagation","Arc consistency and forward checking."),
   ("ai_local_search","Local Search","Hill climbing and min-conflicts."),
 ]},
 {"id":"ai_mdp","name":"Markov Decision Processes","concepts":[
   ("ai_mdp_def","Markov Decision Processes","States, actions, transitions and rewards."),
   ("ai_bellman","Bellman Equations","Recursive definition of optimal value."),
   ("ai_value_iteration","Value Iteration","Iterating values to optimality."),
   ("ai_policy_iteration","Policy Iteration","Alternating policy evaluation and improvement."),
 ]},
 {"id":"ai_rl","name":"Reinforcement Learning","concepts":[
   ("ai_rl_framework","Reinforcement Learning Framework","Learning from rewards without a model."),
   ("ai_td","Temporal Difference Learning","Bootstrapped value updates."),
   ("ai_qlearning","Q-Learning","Model-free off-policy value learning."),
   ("ai_exploration","Exploration vs Exploitation","Balancing exploration with greedy action."),
   ("ai_approx_q","Approximate Q-Learning","Feature-based value approximation."),
 ]},
 {"id":"ai_probability","name":"Probability and Bayes Nets","concepts":[
   ("ai_prob","Probability Fundamentals","Random variables and joint distributions."),
   ("ai_bayes_rule","Bayes Rule","Updating beliefs from evidence."),
   ("ai_bayes_nets","Bayesian Networks","Compact representation of joint distributions."),
   ("ai_bn_inference","Inference in Bayes Nets","Variable elimination and sampling."),
 ]},
 {"id":"ai_markov_models","name":"Markov Models and HMMs","concepts":[
   ("ai_markov_chain","Markov Models","State sequences with the Markov property."),
   ("ai_hmm","Hidden Markov Models","Hidden states with observations."),
   ("ai_forward","Forward Algorithm","Filtering observation likelihood."),
   ("ai_viterbi","Viterbi Algorithm","Most likely hidden state sequence."),
   ("ai_particle","Particle Filtering","Approximate inference with samples."),
 ]},
 {"id":"ai_ml","name":"Machine Learning","concepts":[
   ("ai_naive_bayes","Naive Bayes","Classification with conditional independence."),
   ("ai_perceptron","Perceptron","Linear classifier with the perceptron rule."),
   ("ai_neural_nets","Neural Networks","Multilayer networks and nonlinearity."),
   ("ai_generalization","Generalization and Overfitting","Train/test error and model capacity."),
 ]},
],"edges":[
 ("ai_search_problem","ai_uninformed","hard"),("ai_uninformed","ai_informed","hard"),
 ("ai_heuristics","ai_informed","hard"),("ai_minimax","ai_alphabeta","hard"),
 ("ai_search_problem","ai_csp_def","soft"),("ai_csp_def","ai_backtracking","hard"),
 ("ai_backtracking","ai_arc_consistency","hard"),
 ("ai_mdp_def","ai_bellman","hard"),("ai_bellman","ai_value_iteration","hard"),
 ("ai_bellman","ai_policy_iteration","hard"),
 ("ai_mdp_def","ai_rl_framework","hard"),("ai_rl_framework","ai_td","hard"),
 ("ai_td","ai_qlearning","hard"),("ai_qlearning","ai_approx_q","hard"),
 ("ai_prob","ai_bayes_rule","hard"),("ai_bayes_rule","ai_bayes_nets","hard"),
 ("ai_bayes_nets","ai_bn_inference","hard"),
 ("ai_prob","ai_markov_chain","hard"),("ai_markov_chain","ai_hmm","hard"),
 ("ai_hmm","ai_forward","hard"),("ai_forward","ai_viterbi","hard"),("ai_hmm","ai_particle","hard"),
 ("ai_bayes_rule","ai_naive_bayes","hard"),("ai_perceptron","ai_neural_nets","hard"),
]}

ML = {"id":"cs229","subject":"Machine Learning (Stanford CS229)","topics":[
 {"id":"ml_linear","name":"Linear Regression","concepts":[
   ("ml_linear_reg","Linear Regression Model","Hypothesis as a linear function of features."),
   ("ml_cost_mse","Mean Squared Error Cost","Least-squares cost function J(theta)."),
   ("ml_gradient_descent","Batch Gradient Descent","Full-batch iterative minimisation of the cost."),
   ("ml_sgd","Stochastic & Mini-batch GD","Per-example and mini-batch gradient updates."),
   ("ml_normal_eq","Normal Equations","Closed-form least-squares solution."),
   ("ml_feature_scaling","Feature Scaling & Learning Rate","Normalisation and step-size choice for convergence."),
 ]},
 {"id":"ml_classification","name":"Classification and GLMs","concepts":[
   ("ml_logistic_reg","Logistic Regression","Probabilistic linear binary classifier."),
   ("ml_sigmoid","Sigmoid & Decision Boundary","Logistic function and the linear boundary."),
   ("ml_logistic_mle","Logistic MLE & Gradient","Maximum-likelihood objective and its gradient."),
   ("ml_newton_method","Newton's Method","Second-order optimisation for logistic regression."),
   ("ml_softmax","Softmax Regression","Multiclass generalisation of logistic regression."),
   ("ml_exp_family","Exponential Family","Canonical form unifying common distributions."),
   ("ml_glm","Generalized Linear Models","Building models from the exponential family."),
 ]},
 {"id":"ml_generative","name":"Generative Learning","concepts":[
   ("ml_generative_vs_disc","Generative vs Discriminative","Modelling p(x|y) versus p(y|x)."),
   ("ml_gda","Gaussian Discriminant Analysis","Gaussian class-conditional models."),
   ("ml_naive_bayes","Naive Bayes","Conditional-independence discrete classifier."),
   ("ml_laplace","Laplace Smoothing","Avoiding zero probabilities in estimates."),
 ]},
 {"id":"ml_svm_margin","name":"SVM: Margins and Duality","concepts":[
   ("ml_margins","Functional & Geometric Margins","Confidence and distance interpretations of margin."),
   ("ml_optimal_margin","Optimal Margin Classifier","Primal maximum-margin optimisation."),
   ("ml_lagrange_duality","Lagrange Duality & KKT","Dual formulation and KKT conditions."),
   ("ml_svm_dual","SVM Dual Problem","Dual objective expressed via inner products."),
 ]},
 {"id":"ml_svm_kernel","name":"SVM: Kernels and Optimization","concepts":[
   ("ml_kernels","Kernel Trick","Implicit high-dimensional feature maps."),
   ("ml_mercer","Valid Kernels (Mercer)","Conditions for a function to be a valid kernel."),
   ("ml_soft_margin","Soft Margin & Slack","Regularised SVM tolerating misclassification."),
   ("ml_smo","SMO Algorithm","Coordinate-ascent solver for the SVM dual."),
 ]},
 {"id":"ml_theory","name":"Learning Theory","concepts":[
   ("ml_bias_variance","Bias-Variance Tradeoff","Decomposing generalisation error."),
   ("ml_regularization","Regularization (L1/L2)","Penalising complexity to reduce overfitting."),
   ("ml_cross_val","Cross-Validation","Estimating generalisation by held-out data."),
   ("ml_vc_dimension","VC Dimension & Bounds","Capacity measure and generalisation bounds."),
   ("ml_model_selection","Model & Feature Selection","Choosing hypotheses and feature subsets."),
 ]},
 {"id":"ml_deep","name":"Neural Networks","concepts":[
   ("ml_neural_nets","Neural Networks","Layered nonlinear function approximators."),
   ("ml_backprop","Backpropagation","Gradient computation by the chain rule."),
 ]},
 {"id":"ml_unsupervised","name":"Unsupervised Learning","concepts":[
   ("ml_kmeans","K-Means Clustering","Partitioning by nearest centroid."),
   ("ml_em_algorithm","EM Algorithm","General expectation-maximisation framework."),
   ("ml_gmm_em","Gaussian Mixtures via EM","Soft clustering with Gaussian mixtures."),
   ("ml_pca","Principal Component Analysis","Linear dimensionality reduction."),
   ("ml_ica","Independent Component Analysis","Separating independent source signals."),
 ]},
 {"id":"ml_rl","name":"Reinforcement Learning","concepts":[
   ("ml_mdp","Markov Decision Processes","Sequential decision framework."),
   ("ml_value_policy","Value & Policy Iteration","Dynamic-programming solutions to MDPs."),
   ("ml_q_learning","Q-Learning","Model-free off-policy value learning."),
   ("ml_value_approx","Value Function Approximation","Generalising values with function approximators."),
 ]},
],"edges":[
 ("ml_cost_mse","ml_gradient_descent","hard"),("ml_gradient_descent","ml_sgd","hard"),
 ("ml_linear_reg","ml_normal_eq","hard"),
 ("ml_gradient_descent","ml_logistic_reg","hard"),("ml_logistic_reg","ml_logistic_mle","hard"),
 ("ml_logistic_reg","ml_softmax","hard"),("ml_exp_family","ml_glm","hard"),("ml_logistic_reg","ml_glm","soft"),
 ("ml_logistic_reg","ml_generative_vs_disc","soft"),("ml_naive_bayes","ml_laplace","hard"),
 ("ml_margins","ml_optimal_margin","hard"),("ml_optimal_margin","ml_lagrange_duality","hard"),
 ("ml_lagrange_duality","ml_svm_dual","hard"),
 ("ml_svm_dual","ml_kernels","hard"),("ml_svm_dual","ml_smo","hard"),
 ("ml_linear_reg","ml_bias_variance","hard"),("ml_bias_variance","ml_regularization","hard"),
 ("ml_bias_variance","ml_cross_val","hard"),
 ("ml_logistic_reg","ml_neural_nets","hard"),("ml_neural_nets","ml_backprop","hard"),
 ("ml_gradient_descent","ml_backprop","hard"),
 ("ml_em_algorithm","ml_gmm_em","hard"),
 ("ml_mdp","ml_value_policy","hard"),
]}

DL = {"id":"11_785","subject":"Introduction to Deep Learning (CMU 11-785)","topics":[
 {"id":"dl_foundations","name":"Neural Network Foundations","concepts":[
   ("dl_perceptron","Perceptron","Single linear threshold unit."),
   ("dl_mlp","Multilayer Perceptron","Stacked fully connected layers."),
   ("dl_activation","Activation Functions","ReLU, sigmoid and tanh nonlinearities."),
   ("dl_forward","Forward Propagation","Computing network outputs layer by layer."),
   ("dl_computational_graph","Computational Graphs","Representing computation for automatic differentiation."),
   ("dl_backprop","Backpropagation","Reverse-mode gradient computation."),
 ]},
 {"id":"dl_optim","name":"Optimization","concepts":[
   ("dl_loss","Loss Functions","Objectives for regression and classification."),
   ("dl_optimization","Stochastic Gradient Descent","Mini-batch SGD parameter updates."),
   ("dl_momentum","Momentum","Accelerating SGD with a velocity term."),
   ("dl_optimizers","Adaptive Optimizers","Adam, RMSProp and adaptive learning rates."),
   ("dl_lr_schedule","Learning Rate Schedules","Decay and warmup of the learning rate."),
 ]},
 {"id":"dl_training","name":"Regularization and Stabilization","concepts":[
   ("dl_vanishing_grad","Vanishing/Exploding Gradients","Gradient scale problems in deep networks."),
   ("dl_weight_init","Weight Initialization","Xavier and He initialisation schemes."),
   ("dl_batchnorm","Batch Normalization","Normalising activations to stabilise training."),
   ("dl_regularization","Regularization","Weight decay and early stopping."),
   ("dl_dropout","Dropout","Stochastic deactivation of units."),
 ]},
 {"id":"dl_cnn","name":"Convolutional Neural Networks","concepts":[
   ("dl_convolution","Convolution","Learnable filters over spatial data."),
   ("dl_padding_stride","Padding and Stride","Controlling the output size of convolutions."),
   ("dl_pooling","Pooling","Downsampling feature maps."),
   ("dl_cnn_arch","CNN Architectures","LeNet, AlexNet and VGG designs."),
   ("dl_resnet","Residual Networks","Skip connections enabling very deep CNNs."),
   ("dl_transfer_learning","Transfer Learning","Reusing pretrained feature extractors."),
 ]},
 {"id":"dl_rnn_seq","name":"Recurrent Neural Networks","concepts":[
   ("dl_rnn","Recurrent Neural Networks","Networks with temporal recurrence."),
   ("dl_bptt","Backpropagation Through Time","Training RNNs over sequences."),
   ("dl_seq_vanishing","Long-Range Dependencies","Vanishing gradients across time steps."),
   ("dl_lstm","LSTM","Gated memory cells for long sequences."),
   ("dl_gru","GRU","Simplified gated recurrent unit."),
 ]},
 {"id":"dl_attn","name":"Attention and Transformers","concepts":[
   ("dl_attention","Attention Mechanism","Weighted combination of values by relevance."),
   ("dl_self_attention","Self-Attention","A sequence attending to itself."),
   ("dl_multihead","Multi-Head Attention","Parallel attention in multiple subspaces."),
   ("dl_positional","Positional Encoding","Injecting token order information."),
   ("dl_transformer","Transformer Architecture","Attention-only encoder-decoder model."),
   ("dl_pretraining","Pretraining & Fine-tuning","Self-supervised pretraining of transformers."),
 ]},
 {"id":"dl_generative","name":"Generative Models","concepts":[
   ("dl_autoencoder","Autoencoders","Learning compressed representations."),
   ("dl_vae","Variational Autoencoders","Probabilistic latent-variable generation."),
   ("dl_gan","Generative Adversarial Networks","Generator-discriminator framework."),
   ("dl_gan_training","GAN Training Dynamics","Instability and mode collapse in GANs."),
   ("dl_diffusion","Diffusion Models","Iterative denoising generative models."),
   ("dl_flow","Normalizing Flows","Invertible transforms for exact density."),
 ]},
],"edges":[
 ("dl_activation","dl_forward","hard"),("dl_computational_graph","dl_backprop","hard"),
 ("dl_forward","dl_backprop","hard"),
 ("dl_backprop","dl_loss","soft"),("dl_loss","dl_optimization","hard"),
 ("dl_optimization","dl_momentum","hard"),("dl_momentum","dl_optimizers","hard"),
 ("dl_backprop","dl_vanishing_grad","hard"),("dl_vanishing_grad","dl_batchnorm","hard"),
 ("dl_optimization","dl_regularization","soft"),
 ("dl_mlp","dl_convolution","hard"),("dl_convolution","dl_padding_stride","hard"),
 ("dl_pooling","dl_cnn_arch","hard"),("dl_cnn_arch","dl_resnet","hard"),
 ("dl_vanishing_grad","dl_resnet","soft"),
 ("dl_mlp","dl_rnn","hard"),("dl_rnn","dl_bptt","hard"),("dl_bptt","dl_seq_vanishing","hard"),
 ("dl_seq_vanishing","dl_lstm","hard"),
 ("dl_rnn","dl_attention","soft"),("dl_attention","dl_self_attention","hard"),
 ("dl_self_attention","dl_multihead","hard"),("dl_multihead","dl_transformer","hard"),
 ("dl_positional","dl_transformer","hard"),("dl_transformer","dl_pretraining","hard"),
 ("dl_mlp","dl_autoencoder","hard"),("dl_autoencoder","dl_vae","hard"),
 ("dl_mlp","dl_gan","hard"),("dl_gan","dl_gan_training","hard"),
 ("dl_vae","dl_diffusion","soft"),
]}

NET = {"id":"cs144","subject":"Computer Networking (Stanford CS144)","topics":[
 {"id":"net_arch","name":"Network Architecture","concepts":[
   ("net_layering","Network Layering","Protocol layers and their separation."),
   ("net_osi","OSI Model","Seven-layer reference model."),
   ("net_tcpip","TCP/IP Model","Internet protocol stack."),
   ("net_encapsulation","Encapsulation","Wrapping data in headers across layers."),
 ]},
 {"id":"net_link","name":"Link Layer","concepts":[
   ("net_link_services","Link Layer Services","Framing and error detection."),
   ("net_mac","MAC Addressing","Hardware addressing and multiple access."),
   ("net_ethernet","Ethernet","Dominant wired LAN technology."),
   ("net_switching","Switching","Forwarding frames within a LAN."),
 ]},
 {"id":"net_network","name":"Network Layer","concepts":[
   ("net_ip_addressing","IP Addressing","IP addresses and subnetting."),
   ("net_ipv4_ipv6","IPv4 and IPv6","Internet addressing versions."),
   ("net_forwarding","Forwarding and Routers","Router forwarding of packets."),
   ("net_routing","Routing Algorithms","Link-state and distance-vector routing."),
 ]},
 {"id":"net_transport","name":"Transport Layer","concepts":[
   ("net_transport_services","Transport Layer Services","End-to-end multiplexing and delivery."),
   ("net_udp","UDP","Connectionless unreliable transport."),
   ("net_tcp","TCP","Connection-oriented reliable transport."),
   ("net_rdt","Reliable Data Transfer","ARQ, sequence numbers and acknowledgements."),
   ("net_flow_control","Flow Control","Sliding window to match receiver rate."),
   ("net_congestion","Congestion Control","Adapting rate to network capacity."),
 ]},
 {"id":"net_application","name":"Application Layer","concepts":[
   ("net_http","HTTP","Web request-response protocol."),
   ("net_dns","DNS","Hostname-to-address resolution."),
   ("net_app_protocols","Other Application Protocols","SMTP, FTP and email/file transfer."),
 ]},
],"edges":[
 ("net_layering","net_osi","hard"),("net_layering","net_tcpip","hard"),("net_layering","net_encapsulation","hard"),
 ("net_link_services","net_mac","hard"),("net_mac","net_ethernet","hard"),("net_ethernet","net_switching","hard"),
 ("net_link_services","net_ip_addressing","soft"),("net_ip_addressing","net_ipv4_ipv6","hard"),
 ("net_ip_addressing","net_forwarding","hard"),("net_forwarding","net_routing","hard"),
 ("net_ip_addressing","net_transport_services","hard"),("net_transport_services","net_udp","hard"),
 ("net_transport_services","net_tcp","hard"),("net_tcp","net_rdt","hard"),("net_rdt","net_flow_control","hard"),
 ("net_flow_control","net_congestion","hard"),
 ("net_tcp","net_http","hard"),("net_udp","net_dns","hard"),("net_tcp","net_app_protocols","soft"),
 ("net_tcpip","net_ip_addressing","hard"),
]}

WEB = {"id":"cs142","subject":"Web Applications (Stanford CS142)","topics":[
 {"id":"web_foundations","name":"Web Foundations","concepts":[
   ("web_http","HTTP Protocol","Request methods, status codes and headers."),
   ("web_url_dns","URLs and DNS","Addressing and resolving web resources."),
   ("web_client_server","Client-Server Model","Browser and server interaction."),
 ]},
 {"id":"web_frontend","name":"Frontend Technologies","concepts":[
   ("web_html","HTML","Document structure and markup."),
   ("web_css","CSS","Styling and layout of pages."),
   ("web_javascript","JavaScript","Client-side scripting language."),
   ("web_dom","DOM Manipulation","Programmatic updates to the document tree."),
   ("web_react","React Components","Component-based UI rendering."),
   ("web_state_props","State and Props","Data flow and state in components."),
 ]},
 {"id":"web_backend","name":"Backend Technologies","concepts":[
   ("web_node","Node.js","Server-side JavaScript runtime."),
   ("web_express","Express and Routing","Server routing and middleware."),
   ("web_rest","REST APIs","Resource-oriented HTTP APIs."),
   ("web_auth","Authentication and Sessions","Login, sessions and tokens."),
 ]},
 {"id":"web_data","name":"Databases","concepts":[
   ("web_relational","Relational Databases","Tables, keys and relationships."),
   ("web_sql","SQL","Querying relational data."),
   ("web_nosql","NoSQL and MongoDB","Document-oriented data stores."),
 ]},
 {"id":"web_security","name":"Web Security","concepts":[
   ("web_xss","Cross-Site Scripting (XSS)","Injecting malicious scripts into pages."),
   ("web_csrf","Cross-Site Request Forgery (CSRF)","Forged authenticated requests."),
   ("web_sql_injection","SQL Injection","Injecting SQL through untrusted input."),
 ]},
],"edges":[
 ("web_http","web_client_server","hard"),("web_url_dns","web_client_server","soft"),
 ("web_html","web_css","hard"),("web_css","web_javascript","soft"),("web_javascript","web_dom","hard"),
 ("web_dom","web_react","hard"),("web_react","web_state_props","hard"),
 ("web_javascript","web_node","hard"),("web_node","web_express","hard"),("web_express","web_rest","hard"),
 ("web_http","web_rest","hard"),("web_rest","web_auth","hard"),
 ("web_relational","web_sql","hard"),("web_sql","web_nosql","soft"),
 ("web_dom","web_xss","hard"),("web_auth","web_csrf","hard"),("web_sql","web_sql_injection","hard"),
 ("web_rest","web_nosql","soft"),
]}

SPECS = {"artificial_intelligence.json":AI,"machine_learning.json":ML,"deep_learning.json":DL,
         "computer_network.json":NET,"web_applications.json":WEB}

if __name__ == "__main__":
    base = os.path.dirname(__file__)
    for fn, sp in SPECS.items():
        build(sp, os.path.join(base, fn))
