import urllib.request
import json

base = 'http://127.0.0.1:8000/api'
req = urllib.request.Request(f'{base}/reports/builtin/cti_report_01_phishing_powershell.txt/load', data=b'', method='POST')
rep = json.loads(urllib.request.urlopen(req).read().decode())
rid = rep['id']
urllib.request.urlopen(urllib.request.Request(f'{base}/reports/{rid}/analyze', data=b'', method='POST'))
graph = json.loads(urllib.request.urlopen(f'{base}/reports/{rid}/attack-graph').read().decode())

print(f"Total nodes: {len(graph['nodes'])}")
print(f"Total edges: {len(graph['edges'])}")
print("\n--- Sequence of Attack Chain Connections ---")
for e in graph['edges']:
    src_node = next(n for n in graph['nodes'] if n['id'] == e['source'])
    tgt_node = next(n for n in graph['nodes'] if n['id'] == e['target'])
    lbl = e.get('label') or e['data'].get('relationship_type')
    print(f"  {src_node['data']['entity_type']:15} [{src_node['data']['label']:25}] ==({lbl})==> {tgt_node['data']['entity_type']:15} [{tgt_node['data']['label']}]")
