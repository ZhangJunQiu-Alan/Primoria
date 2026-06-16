import sys
import json

input_file = sys.argv[1]
output_file = sys.argv[2]

with open(input_file, 'r') as f:
    data = json.load(f)

edges = []
for edge in data.get("edges", []):
    if "source" in edge:
        edge["from"] = edge.pop("source")
    if "target" in edge:
        edge["to"] = edge.pop("target")
        
    if edge.get("type") == "contains":
        parent = edge["from"]
        child = edge["to"]
        for node in data.get("nodes", []):
            if node.get("id") == child:
                node["topic"] = parent
        continue
        
    if "hard" in edge:
        edge["strength"] = "hard" if edge.pop("hard") else "soft"
    elif "condition" in edge:
        edge["strength"] = edge.pop("condition")
    elif "prereqType" in edge:
        edge["strength"] = edge.pop("prereqType")
    elif "weight" in edge:
        edge["strength"] = edge.pop("weight")
        
    if "strength" not in edge:
        edge["strength"] = "hard"
        
    edges.append(edge)
    
data["edges"] = edges

for node in data.get("nodes", []):
    if "parent" in node:
        node["topic"] = node.pop("parent")
    elif "parentTopic" in node:
        node["topic"] = node.pop("parentTopic")
        
    if "label" in node:
        node["name"] = node.pop("label")
        
    if "type" in node:
        node["kind"] = node.pop("type")
        
    if node.get("kind") == "topic" and "topic" not in node:
        node["topic"] = None

with open(output_file, 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
