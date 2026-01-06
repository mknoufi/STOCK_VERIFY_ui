import json

with open('backend/bandit_report.json') as f:
    data = json.load(f)

for result in data['results']:
    if result['issue_severity'] in ['HIGH', 'MEDIUM']:
        print(f"{result['issue_severity']} - {result['test_id']}: {result['issue_text']}")
        print(f"  File: {result['filename']}:{result['line_number']}")
        print(f"  Code: {result['code'].strip()}")
        print("-" * 40)
