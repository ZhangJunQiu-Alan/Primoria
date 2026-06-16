import json
import os

def build_kg(course_id, name, description, topic_tree, edge_list=[]):
    topics = []
    edges = []
    
    def traverse(node, parent_id=None):
        node_title = node.get("title")
        node_id = f"{course_id}_{node_title.lower().replace(' ', '_').replace('&', 'and').replace('/', '_').replace('-', '_').replace('(', '').replace(')', '')}"
        node_id = "".join(e for e in node_id if e.isalnum() or e == '_')
        
        topics.append({
            "id": node_id,
            "title": node_title,
            "description": node.get("desc", f"{node_title} in {name}"),
            "parent_id": parent_id
        })
        
        for child in node.get("children", []):
            traverse(child, node_id)
            
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

chem_tree = [
    {"title": "Atomic Structure and Amount of Substance", "children": [
        {"title": "Atomic Structure", "children": [
            {"title": "Subatomic Particles"},
            {"title": "Atomic Number and Mass Number"},
            {"title": "Isotopes"},
            {"title": "Relative Atomic Mass"},
            {"title": "Relative Molecular Mass"}
        ]},
        {"title": "Electron Structure", "children": [
            {"title": "Orbitals"},
            {"title": "Aufbau Principle"},
            {"title": "Pauli Exclusion Principle"},
            {"title": "Hunds Rule"},
            {"title": "Writing Electron Configurations"}
        ]},
        {"title": "Amount of Substance", "children": [
            {"title": "The Mole"},
            {"title": "Core Mole Equation"},
            {"title": "Using Chemical Equations"},
            {"title": "Concentration of Solutions"},
            {"title": "Ideal Gas Equation"},
            {"title": "Avogadros Law"}
        ]}
    ]},
    {"title": "Bonding and Structure", "children": [
        {"title": "Types of Bonding", "children": [
            {"title": "Ionic Bonding"},
            {"title": "Covalent Bonding"},
            {"title": "Metallic Bonding"}
        ]},
        {"title": "VSEPR Theory", "children": [
            {"title": "Electron Pair Repulsion"},
            {"title": "Common Shapes and Angles"},
            {"title": "Effect of Lone Pairs"}
        ]},
        {"title": "Intermolecular Forces", "children": [
            {"title": "London Dispersion Forces"},
            {"title": "Permanent Dipole Dipole Forces"},
            {"title": "Hydrogen Bonding"}
        ]},
        {"title": "Structure Types", "children": [
            {"title": "Giant Ionic Lattice"},
            {"title": "Simple Molecular"},
            {"title": "Giant Covalent"},
            {"title": "Metallic Lattice"}
        ]}
    ]},
    {"title": "Energetics", "children": [
        {"title": "Enthalpy Change", "children": [
            {"title": "Exothermic Reactions"},
            {"title": "Endothermic Reactions"}
        ]},
        {"title": "Bond Enthalpy"},
        {"title": "Hesss Law"},
        {"title": "Standard Enthalpy Changes", "children": [
            {"title": "Enthalpy of Formation"},
            {"title": "Enthalpy of Combustion"}
        ]},
        {"title": "Calorimetry"},
        {"title": "Born Haber Cycles"}
    ]},
    {"title": "Kinetics", "children": [
        {"title": "Rate of Reaction"},
        {"title": "Collision Theory"},
        {"title": "Factors Affecting Rate", "children": [
            {"title": "Temperature"},
            {"title": "Concentration and Pressure"},
            {"title": "Surface Area"},
            {"title": "Catalysts"}
        ]},
        {"title": "Maxwell Boltzmann Distribution"},
        {"title": "Activation Energy"},
        {"title": "Rate Equations"},
        {"title": "Orders of Reaction"},
        {"title": "Rate Determining Step"}
    ]},
    {"title": "Chemical Equilibria", "children": [
        {"title": "Dynamic Equilibrium"},
        {"title": "Le Chateliers Principle"},
        {"title": "Effects on Equilibrium", "children": [
            {"title": "Concentration Effect"},
            {"title": "Pressure Effect"},
            {"title": "Temperature Effect"},
            {"title": "Catalyst Effect"}
        ]},
        {"title": "Equilibrium Constant"}
    ]},
    {"title": "Acids Bases and Buffers", "children": [
        {"title": "Bronsted Lowry Theory"},
        {"title": "Strong vs Weak Acids"},
        {"title": "pH Calculations"},
        {"title": "Acid Dissociation Constant"},
        {"title": "Ionic Product of Water"},
        {"title": "Buffers"},
        {"title": "Buffer pH Calculations"}
    ]},
    {"title": "Redox and Electrochemistry", "children": [
        {"title": "Redox Fundamentals"},
        {"title": "Oxidation Numbers"},
        {"title": "Half Equations"},
        {"title": "Redox Titrations"},
        {"title": "Electrode Potentials"},
        {"title": "Standard Cell Potential"},
        {"title": "Fuel Cells"}
    ]},
    {"title": "Periodicity", "children": [
        {"title": "Atomic Radius"},
        {"title": "Ionisation Energy"},
        {"title": "Melting Point"},
        {"title": "Period 3 Oxides"},
        {"title": "Period 3 Chlorides"}
    ]},
    {"title": "Group Chemistry", "children": [
        {"title": "Group 2 Alkaline Earth Metals"},
        {"title": "Group 7 Halogens"}
    ]}
]

kg_data = build_kg("alevel_chemistry", "A-Level Chemistry", "Advanced level chemistry topics.", chem_tree)

with open("/Users/zhangjunqiu/Desktop/primoria/temple/a_level_chemistry.json", "w") as f:
    json.dump(kg_data, f, indent=2, ensure_ascii=False)

print("Successfully generated A-Level Chemistry KG.")
