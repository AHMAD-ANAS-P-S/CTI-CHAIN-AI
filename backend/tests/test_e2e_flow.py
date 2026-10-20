import urllib.request
import json

base_url = 'http://127.0.0.1:8000/api'

def test_e2e_flow():
    # 1. Health
    h = json.loads(urllib.request.urlopen(f'{base_url}/health').read().decode())
    print(f"[OK] Health: {h['status']}")

    # 2. Builtin reports
    builtin = json.loads(urllib.request.urlopen(f'{base_url}/reports/builtin').read().decode())
    print(f"[OK] Builtin reports found: {len(builtin)}")
    for b in builtin:
        print(f"   - {b['scenario']} ({b['filename']})")

    # 3. Load & analyze scenario 1
    req = urllib.request.Request(f"{base_url}/reports/builtin/cti_report_01_phishing_powershell.txt/load", data=b'', method='POST')
    loaded = json.loads(urllib.request.urlopen(req).read().decode())
    rid = loaded['id']
    print(f"[OK] Loaded report ID: {rid}")

    # 4. Analyze report
    req = urllib.request.Request(f"{base_url}/reports/{rid}/analyze", data=b'', method='POST')
    analyzed = json.loads(urllib.request.urlopen(req).read().decode())
    print(f"[OK] Analyzed: {analyzed['entities_extracted']} entities, {analyzed['relationships_identified']} rels, {analyzed['iocs_found']} IOCs")

    # 5. Attack Graph
    graph = json.loads(urllib.request.urlopen(f"{base_url}/reports/{rid}/attack-graph").read().decode())
    print(f"[OK] Graph: {len(graph['nodes'])} nodes, {len(graph['edges'])} edges, {len(graph['stages'])} stages")

    # 6. PDF Export
    pdf_res = urllib.request.urlopen(f"{base_url}/reports/{rid}/export?format=pdf")
    pdf_bytes = pdf_res.read()
    print(f"[OK] Export PDF: {len(pdf_bytes)} bytes, content-type: {pdf_res.headers.get_content_type()}")
    assert len(pdf_bytes) > 2000
    assert pdf_res.headers.get_content_type() == 'application/pdf'

    # 7. JSON Export
    json_res = urllib.request.urlopen(f"{base_url}/reports/{rid}/export?format=json")
    json_data = json.loads(json_res.read().decode())
    print(f"[OK] Export JSON: {len(json_data['attack_sequence'])} attack sequence steps, {len(json_data['key_iocs'])} key IOCs")

    print("\nALL END-TO-END INTEGRATION TESTS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    run_tests()
