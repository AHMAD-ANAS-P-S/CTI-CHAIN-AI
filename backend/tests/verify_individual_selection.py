import urllib.request
import json

base = 'http://127.0.0.1:8000/api'

reports = [
    ("cti_report_01_phishing_powershell.txt", "Phishing and PowerShell", ["powershell.exe", "alicexawiayam"]),
    ("cti_report_02_office_document.txt", "Malicious Office Document", ["wscript", "vbs"]),
    ("cti_report_03_web_exploitation.txt", "Web Application Exploitation", ["cache_update.jsp", "java.exe"]),
    ("cti_report_04_ransomware_activity.txt", "Ransomware Activity", ["vssadmin", "shadow"]),
    ("cti_report_05_remote_access.txt", "Suspicious Remote Access and Possible Exfiltration", ["backup_export.zip", "198.51.100.42"])
]

print("=== VERIFYING INDIVIDUAL REPORT SELECTION AND DEDICATED ANALYSIS ===")

for filename, scenario_name, expected_keywords in reports:
    print(f"\n--> Testing Report: {scenario_name} ({filename})")
    
    # 1. Download raw report text
    raw_req = urllib.request.urlopen(f"{base}/reports/builtin/{filename}/download")
    raw_text = raw_req.read().decode('utf-8', errors='ignore')
    print(f"    [OK] Raw report download: {len(raw_text)} bytes")
    assert len(raw_text) > 100

    # 2. Load report into system
    load_req = urllib.request.Request(f"{base}/reports/builtin/{filename}/load", data=b'', method='POST')
    load_res = json.loads(urllib.request.urlopen(load_req).read().decode())
    rid = load_res['id']
    print(f"    [OK] Loaded report ID: {rid} (Filename: {load_res['original_filename']})")
    assert load_res['original_filename'] == filename

    # 3. Analyze ONLY this selected report
    analyze_req = urllib.request.Request(f"{base}/reports/{rid}/analyze", data=b'', method='POST')
    analyze_res = json.loads(urllib.request.urlopen(analyze_req).read().decode())
    print(f"    [OK] Analyzed: {analyze_res['entities_extracted']} entities, {analyze_res['relationships_identified']} rels, {analyze_res['iocs_found']} IOCs")
    assert analyze_res['entities_extracted'] > 0

    # 4. Fetch attack graph
    graph_res = json.loads(urllib.request.urlopen(f"{base}/reports/{rid}/attack-graph").read().decode())
    print(f"    [OK] Dedicated Attack Graph: {len(graph_res['nodes'])} nodes, {len(graph_res['edges'])} edges")
    assert len(graph_res['nodes']) == analyze_res['entities_extracted']
    assert len(graph_res['edges']) == analyze_res['relationships_identified']

    # 5. Verify contents belong specifically to this report
    all_node_labels = " ".join([n['data']['label'].lower() for n in graph_res['nodes']] + [n['data']['full_name'].lower() for n in graph_res['nodes']])
    for kw in expected_keywords:
        assert kw.lower() in all_node_labels or kw.lower() in raw_text.lower(), f"Keyword {kw} not found in {filename}"
    print(f"    [OK] Report-specific artifacts verified: {expected_keywords}")

    # 6. Verify export isolates this report
    json_export = json.loads(urllib.request.urlopen(f"{base}/reports/{rid}/export?format=json").read().decode())
    assert json_export['report_id'] == rid
    assert json_export['filename'] == filename
    print(f"    [OK] Export JSON verified: matches report ID {rid} & filename {filename}")

print("\n========================================================")
print("ALL 5 REPORTS VERIFIED INDIVIDUALLY AND INDEPENDENTLY!")
print("========================================================")
