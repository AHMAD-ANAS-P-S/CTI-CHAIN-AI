import urllib.request
import json

base = 'http://127.0.0.1:8000/api'
reports = [
    ("cti_report_01_phishing_powershell.txt", "Phishing Campaign Delivering Malicious Payload"),
    ("cti_report_02_office_document.txt", "Office Document Leading to Script-Based Execution"),
    ("cti_report_03_web_exploitation.txt", "Suspicious Requests Against Web Application"),
    ("cti_report_04_ransomware_activity.txt", "Endpoint Suspicious File Modification & Ransomware"),
    ("cti_report_05_remote_access.txt", "Unusual Remote Access and Data Transfer")
]

print("=== VERIFYING ATTACK-CHAIN RECONSTRUCTION ACROSS ALL 5 BENCHMARKS ===")
for filename, title in reports:
    req = urllib.request.Request(f'{base}/reports/builtin/{filename}/load', data=b'', method='POST')
    rep = json.loads(urllib.request.urlopen(req).read().decode())
    rid = rep['id']
    urllib.request.urlopen(urllib.request.Request(f'{base}/reports/{rid}/analyze', data=b'', method='POST'))
    graph = json.loads(urllib.request.urlopen(f'{base}/reports/{rid}/attack-graph').read().decode())
    nodes_cnt = len(graph['nodes'])
    edges_cnt = len(graph['edges'])
    components = graph.get('connected_components_count', 1)
    stages = len(graph.get('stages', []))
    print(f"[OK] {filename}")
    print(f"     Title: {title}")
    print(f"     Nodes: {nodes_cnt} | Edges: {edges_cnt} | Stages: {stages} | Components: {components}")
    assert nodes_cnt > 0
    assert edges_cnt > 0
print("\nALL 5 SCENARIOS VERIFIED SUCCESSFULLY!")
