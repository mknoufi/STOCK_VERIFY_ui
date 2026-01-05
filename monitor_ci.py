import json
import time
import sys
import urllib.request
import urllib.error

REPO = "mknoufi/STOCK_VERIFY_ui"
BRANCH = "feature/ongoing-work"

def get_latest_run_status():
    url = f"https://api.github.com/repos/{REPO}/actions/runs?branch={BRANCH}&per_page=1"
    try:
        req = urllib.request.Request(url)
        # Add User-Agent header which is required by GitHub API
        req.add_header('User-Agent', 'Python-Script')

        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            runs = data.get("workflow_runs", [])

            if not runs:
                print("No runs found.")
                return None

            return runs[0]
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} {e.reason}")
        print(e.read().decode())
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

def monitor_run():
    print(f"Monitoring latest CI run for {REPO} on {BRANCH}...")
    last_status = None

    while True:
        run = get_latest_run_status()
        if not run:
            print("Could not fetch run status. Retrying in 10s...")
            time.sleep(10)
            continue

        status = run.get("status")
        conclusion = run.get("conclusion")
        url = run.get("html_url")
        run_id = run.get("id")

        if status != last_status:
            print(f"Run ID: {run_id}")
            print(f"Status: {status}")
            print(f"Conclusion: {conclusion}")
            print(f"URL: {url}")
            last_status = status

        if status == "completed":
            if conclusion == "success":
                print("✅ CI Passed!")
                sys.exit(0)
            else:
                print(f"❌ CI Failed with conclusion: {conclusion}")
                # Fetch jobs to see what failed
                jobs_url = run.get("jobs_url")
                if jobs_url:
                    try:
                        req = urllib.request.Request(jobs_url)
                        req.add_header('User-Agent', 'Python-Script')
                        with urllib.request.urlopen(req) as response:
                            jobs_data = json.loads(response.read().decode())
                            for job in jobs_data.get("jobs", []):
                                if job.get("conclusion") == "failure":
                                    print(f"  - Job Failed: {job.get('name')}")
                                    print(f"    Step: {job.get('steps', [])[-1].get('name') if job.get('steps') else 'Unknown'}")
                                    print(f"    URL: {job.get('html_url')}")
                    except Exception as e:
                        print(f"Error fetching jobs: {e}")
                sys.exit(1)

        time.sleep(10)

if __name__ == "__main__":
    monitor_run()
