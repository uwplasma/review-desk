"""Add a bounded public CI history sample to the review feed."""
import argparse
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import json
from math import ceil
from pathlib import Path
from statistics import median
from time import sleep
from urllib.error import HTTPError

from collect import auth_token, get

def timestamp(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))

def metrics(rows):
    def quantiles(column):
        values = sorted(row[column] for row in rows)
        return [median(values), values[ceil(0.95 * len(values)) - 1]] if values else [None, None]

    return {"jobs": len(rows), "wait": quantiles("wait"), "runtime": quantiles("runtime"),
            "minutes": round(sum(row["runtime"] for row in rows) / 60, 1),
            "cancelled_minutes": round(sum(row["runtime"] for row in rows if row["cancelled"]) / 60, 1)}

def sample(repos, now, token):
    since = (now - timedelta(days=14)).date().isoformat()
    def fetch(path):
        for attempt in range(3):
            try:
                return get(path, token)
            except HTTPError as error:
                if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                    raise
                sleep(2 ** attempt)
    def read_repo(repo):
        rows, urls, gaps = [], [], []
        for event in ("push", "pull_request"):
            endpoint = f"/repos/{repo}/actions/runs"
            try:
                runs = fetch(f"{endpoint}?event={event}&status=completed&created=%3E%3D{since}&per_page=3")
            except OSError:
                gaps.append(f"{repo} {event}")
                continue
            for run in runs["workflow_runs"]:
                attempt = run["run_attempt"]
                urls.append(run["html_url"])
                start = timestamp(run["run_started_at"])
                page = 1
                while True:
                    try:
                        result = fetch(f"{endpoint}/{run['id']}/attempts/{attempt}/jobs?per_page=100&page={page}")
                    except OSError:
                        gaps.append(run["html_url"])
                        break
                    for job in result["jobs"]:
                        if job["conclusion"] == "skipped" or not job.get("runner_id") or not all(job.get(k) for k in ("created_at","started_at","completed_at")):
                            continue
                        created, begun, ended = (timestamp(job[k]) for k in ("created_at","started_at","completed_at"))
                        if begun < start or ended <= begun or begun < created:
                            continue
                        labels = [label.lower() for label in job["labels"]]
                        pool = ("Self-hosted" if "self-hosted" in labels else "GitHub-hosted" if
                                job.get("runner_group_name") == "GitHub Actions" or (job.get("runner_name") or "").startswith("GitHub Actions ") else "Other")
                        rows.append({"repo": repo, "name": job["name"], "url": job["html_url"], "pool": pool,
                                     "event": event, "wait": (begun-created).total_seconds(),
                                     "runtime": (ended-begun).total_seconds(), "cancelled": job["conclusion"]=="cancelled"})
                    if len(result["jobs"]) < 100 or page * 100 >= result["total_count"]:
                        break
                    page += 1
        return rows, urls, gaps
    with ThreadPoolExecutor(max_workers=3) as workers:
        parts = list(workers.map(read_repo, repos))
    jobs = [row for rows, _, _ in parts for row in rows]
    def grouped(key):
        groups = defaultdict(list)
        for row in jobs:
            groups[row[key]].append(row)
        return {label: metrics(rows) for label, rows in sorted(groups.items())}
    return {"captured_at": now.isoformat(timespec="seconds"), "attempts": sum(len(urls) for _,urls,_ in parts),
            "gaps": [gap for _,_,gaps in parts for gap in gaps], "all": metrics(jobs), "repos": grouped("repo"), "pools": grouped("pool"),
            "events": grouped("event"), "longest": sorted(jobs, key=lambda row: -row["wait"])[:10]}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("feed", type=Path)
    parser.add_argument("--previous", type=Path)
    args = parser.parse_args()
    feed = json.loads(args.feed.read_text())
    history = None
    if args.previous and args.previous.is_file():
        history = json.loads(args.previous.read_text()).get("timing")
    now = datetime.now(timezone.utc)
    if not history or now - timestamp(history["captured_at"]) >= timedelta(hours=12):
        repos = [row["name"] for row in feed["repositories"] if row["name"].startswith("uwplasma/") and "prs" in row]
        try:
            candidate = sample(repos, now, auth_token())
            if candidate["all"]["jobs"] and (not history or len(candidate["gaps"]) < 5):
                history = candidate
        except (OSError, KeyError, ValueError) as error:
            print("Historical sample unavailable:", type(error).__name__)
    feed["timing"] = history
    args.feed.write_text(json.dumps(feed, ensure_ascii=False, separators=(",", ":"))+"\n")
