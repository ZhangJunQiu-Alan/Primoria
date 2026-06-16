import json
import os

def build_kg(course_id, name, description, topic_tree, edge_list=[]):
    topics = []
    edges = []
    
    def traverse(node, parent_id=None, prefix=""):
        node_title = node.get("title")
        node_id = f"{course_id}_{node_title.lower().replace(' ', '_').replace('&', 'and').replace('/', '_')}"
        # Keep id short
        node_id = "".join(e for e in node_id if e.isalnum() or e == '_')
        
        topics.append({
            "id": node_id,
            "title": node_title,
            "description": node.get("desc", f"{node_title} in {name}"),
            "parent_id": parent_id
        })
        
        for child in node.get("children", []):
            traverse(child, node_id, prefix + "  ")
            
    for t in topic_tree:
        traverse(t)
        
    for edge in edge_list:
        edges.append({
            "source_id": edge["source"],
            "target_id": edge["target"],
            "type": edge.get("type", "related"),
            "description": edge.get("desc", "Connected topic")
        })
        
    return {
        "id": course_id,
        "name": name,
        "description": description,
        "topics": topics,
        "edges": edges
    }

kgs = []

# 1. UCB CS188 Intro to AI
cs188_tree = [
    {"title": "Search", "children": [
        {"title": "Uninformed Search"},
        {"title": "Informed Search"},
        {"title": "Adversarial Search"}
    ]},
    {"title": "Constraint Satisfaction Problems", "children": []},
    {"title": "Markov Decision Processes", "children": []},
    {"title": "Reinforcement Learning", "children": []},
    {"title": "Probability", "children": [
        {"title": "Bayes Nets"}
    ]},
    {"title": "Hidden Markov Models", "children": []},
    {"title": "Machine Learning", "children": [
        {"title": "Naïve Bayes"},
        {"title": "Perceptrons"},
        {"title": "Neural Networks"}
    ]}
]
kgs.append(("artificial_intelligence.json", build_kg("cs188", "Introduction to Artificial Intelligence", "Foundational AI algorithms and concepts.", cs188_tree)))

# 2. Stanford CS229 Machine Learning
cs229_tree = [
    {"title": "Supervised Learning", "children": [
        {"title": "Linear Regression"},
        {"title": "Logistic Regression"},
        {"title": "Generalized Linear Models"},
        {"title": "Support Vector Machines"},
        {"title": "Decision Trees"}
    ]},
    {"title": "Deep Learning", "children": [
        {"title": "Neural Networks"},
        {"title": "Backpropagation"}
    ]},
    {"title": "Unsupervised Learning", "children": [
        {"title": "K-Means Clustering"},
        {"title": "Gaussian Mixture Models"},
        {"title": "Principal Component Analysis"}
    ]},
    {"title": "Reinforcement Learning", "children": [
        {"title": "MDPs"},
        {"title": "Value Iteration"}
    ]}
]
kgs.append(("machine_learning.json", build_kg("cs229", "Machine Learning", "Machine learning algorithms and statistical pattern recognition.", cs229_tree)))

# 3. CMU 11-785 Intro to Deep Learning
dl_tree = [
    {"title": "Multilayer Perceptrons", "children": [
        {"title": "Forward Propagation"},
        {"title": "Backpropagation"}
    ]},
    {"title": "Convolutional Neural Networks", "children": [
        {"title": "Convolution"},
        {"title": "Pooling"},
        {"title": "Architectures"}
    ]},
    {"title": "Recurrent Neural Networks", "children": [
        {"title": "LSTMs"},
        {"title": "GRUs"}
    ]},
    {"title": "Attention Mechanisms", "children": [
        {"title": "Transformers"}
    ]},
    {"title": "Generative Models", "children": [
        {"title": "Autoencoders"},
        {"title": "GANs"}
    ]}
]
kgs.append(("deep_learning.json", build_kg("11_785", "Introduction to Deep Learning", "Fundamentals of deep neural networks.", dl_tree)))

# 4. Stanford CS142 Web Applications
web_tree = [
    {"title": "Internet Basics", "children": [
        {"title": "HTTP Protocol"},
        {"title": "DNS"}
    ]},
    {"title": "Frontend Technologies", "children": [
        {"title": "HTML and CSS"},
        {"title": "JavaScript DOM"},
        {"title": "React.js"}
    ]},
    {"title": "Backend Technologies", "children": [
        {"title": "Node.js"},
        {"title": "REST APIs"}
    ]},
    {"title": "Databases", "children": [
        {"title": "Relational Databases"},
        {"title": "NoSQL"}
    ]},
    {"title": "Web Security", "children": [
        {"title": "XSS"},
        {"title": "CSRF"}
    ]}
]
kgs.append(("web_applications.json", build_kg("cs142", "Web Applications", "Concepts of modern web application development.", web_tree)))

# 5. Stanford CS144 Computer Network
net_tree = [
    {"title": "Network Architecture", "children": [
        {"title": "OSI Model"},
        {"title": "TCP IP Model"}
    ]},
    {"title": "Application Layer", "children": [
        {"title": "HTTP"},
        {"title": "DNS"}
    ]},
    {"title": "Transport Layer", "children": [
        {"title": "TCP"},
        {"title": "UDP"},
        {"title": "Congestion Control"}
    ]},
    {"title": "Network Layer", "children": [
        {"title": "IPv4 and IPv6"},
        {"title": "Routing Algorithms"}
    ]},
    {"title": "Link Layer", "children": [
        {"title": "Ethernet"},
        {"title": "MAC"}
    ]}
]
kgs.append(("computer_network.json", build_kg("cs144", "Computer Network", "Principles and protocols of computer networks.", net_tree)))

# 6. A Level Math
math_tree = [
    {"title": "Algebra and Functions", "children": [
        {"title": "Laws of Indices"},
        {"title": "Surds and Rationalization"},
        {"title": "Quadratic Functions"},
        {"title": "Solving Quadratic Equations"},
        {"title": "Simultaneous Equations"},
        {"title": "Polynomial Functions"},
        {"title": "Inequalities"}
    ]},
    {"title": "Coordinate Geometry", "children": []},
    {"title": "Trigonometry", "children": []},
    {"title": "Exponentials and Logarithms", "children": []},
    {"title": "Differentiation", "children": [
        {"title": "First Principles"},
        {"title": "Power Rule"},
        {"title": "Product Rule"},
        {"title": "Quotient Rule"},
        {"title": "Chain Rule"},
        {"title": "Differentiation of Special Functions"},
        {"title": "Second Derivatives"},
        {"title": "Stationary Points"},
        {"title": "Maxima and Minima"},
        {"title": "Optimization Problems"},
        {"title": "Rates of Change"},
        {"title": "Tangents and Normals"}
    ]},
    {"title": "Integration", "children": [
        {"title": "Indefinite Integration"},
        {"title": "Definite Integration"},
        {"title": "Integration of Common Functions"},
        {"title": "Integration by Substitution"},
        {"title": "Area Under Curves"},
        {"title": "Area Between Curves"}
    ]},
    {"title": "Sequences and Series", "children": []},
    {"title": "Binomial Expansion", "children": []},
    {"title": "Vectors", "children": []}
]
kgs.append(("a_level_mathematics.json", build_kg("alevel_math", "A-Level Mathematics", "Advanced level mathematics topics.", math_tree)))

# 7. A Level Physics
phys_tree = [
    {"title": "Mechanics", "children": [
        {"title": "Scalars vs Vectors"},
        {"title": "Kinematics"},
        {"title": "Forces and Newtons Laws"},
        {"title": "Moments and Equilibrium"},
        {"title": "Work Energy and Power"},
        {"title": "Momentum and Collisions"},
        {"title": "Circular Motion"},
        {"title": "Simple Harmonic Motion"}
    ]},
    {"title": "Materials", "children": [
        {"title": "Stress and Strain"},
        {"title": "Youngs Modulus"}
    ]},
    {"title": "Waves", "children": [
        {"title": "Superposition and Interference"},
        {"title": "Diffraction and Resolution"},
        {"title": "Standing Waves"},
        {"title": "Refraction"}
    ]},
    {"title": "Electricity", "children": [
        {"title": "Ohms Law and IV Characteristics"},
        {"title": "Series and Parallel Circuits"},
        {"title": "Electrical Power and Energy"},
        {"title": "Kirchhoffs Laws"}
    ]},
    {"title": "Thermal Physics", "children": [
        {"title": "Specific Heat Capacity"},
        {"title": "Ideal Gas Law"}
    ]},
    {"title": "Electromagnetism", "children": [
        {"title": "Magnetic Fields"},
        {"title": "Electromagnetic Induction"},
        {"title": "Transformers"}
    ]},
    {"title": "Nuclear Physics", "children": [
        {"title": "Radioactive Decay"},
        {"title": "Nuclear Reactions"}
    ]},
    {"title": "Quantum Physics", "children": [
        {"title": "Photoelectric Effect"},
        {"title": "Wave Particle Duality"},
        {"title": "Energy Levels and Spectra"}
    ]},
    {"title": "Astrophysics", "children": [
        {"title": "Stellar Classification"},
        {"title": "Distance Measurements"},
        {"title": "Big Bang Evidence"}
    ]}
]
kgs.append(("a_level_physics.json", build_kg("alevel_physics", "A-Level Physics", "Advanced level physics topics.", phys_tree)))

# 8. A Level Biology
bio_tree = [
    {"title": "Cell Biology", "children": [
        {"title": "Cell Types"},
        {"title": "Organelles"},
        {"title": "Microscopy"},
        {"title": "Cell Membrane"},
        {"title": "Transport Across Membranes"},
        {"title": "Cell Cycle and Division"}
    ]},
    {"title": "Biological Molecules", "children": [
        {"title": "Carbohydrates"},
        {"title": "Proteins"},
        {"title": "Enzymes"},
        {"title": "Lipids"},
        {"title": "Nucleic Acids"},
        {"title": "Water"}
    ]},
    {"title": "Genetics and Inheritance", "children": [
        {"title": "Central Dogma"},
        {"title": "Inheritance Patterns"},
        {"title": "Linkage and Crossing Over"},
        {"title": "Mutations"},
        {"title": "Gene Regulation"}
    ]},
    {"title": "Human Physiology", "children": [
        {"title": "Circulation"},
        {"title": "Gas Exchange and Respiration"},
        {"title": "Kidneys and Osmoregulation"}
    ]},
    {"title": "Ecology and Ecosystems", "children": [
        {"title": "Energy flow"},
        {"title": "Nutrient cycles"},
        {"title": "Sampling"},
        {"title": "Succession"}
    ]},
    {"title": "Evolution", "children": [
        {"title": "Natural selection"},
        {"title": "Sources of variation"},
        {"title": "Speciation"},
        {"title": "Evidence"}
    ]}
]
kgs.append(("a_level_biology.json", build_kg("alevel_biology", "A-Level Biology", "Advanced level biology topics.", bio_tree)))

# Save all
temple_dir = "/Users/zhangjunqiu/Desktop/primoria/temple"
for filename, kg_data in kgs:
    filepath = os.path.join(temple_dir, filename)
    with open(filepath, "w") as f:
        json.dump(kg_data, f, indent=2, ensure_ascii=False)
        
print("Successfully generated 8 KG files.")
