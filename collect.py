#!/usr/bin/env python3
"""Refresh the review desk from public GitHub repositories."""
from argparse import ArgumentParser
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import subprocess
from tempfile import NamedTemporaryFile
from threading import Lock
from urllib.error import HTTPError
from urllib.request import Request, urlopen

REPOSITORIES = tuple("uwplasma/" + repo for repo in (
    "vmex", "DKX", "GKX", "DRBX", "LMhdX", "FAX", "JAX-in-Cell",
    "SPECTRAX", "MHX", "ESSOS", "SOLVAX",
)) + ("ColumbiaStellaratorTheory/firm3d",)
API = "https://api.github.com"
LINK_PREFIXES = ("https://github.com/", "https://app.codecov.io/")
ACTIVE = {"queued", "in_progress", "waiting", "pending", "requested"}
REQUESTS = Counter()
REQUEST_LOCK = Lock()
JOB_BUDGET = 14
CPU_LABELS = {"cpu", "cpu-only", "uwplasma-cpu"}
GPU_LABELS = {"gpu", "gpu-only", "cuda", "rocm", "uwplasma-gpu"}
CHECKS = """statusCheckRollup { state contexts(first: 32) { pageInfo { hasNextPage } nodes {
  ... on CheckRun { name status conclusion detailsUrl startedAt completedAt }
  ... on StatusContext { context state targetUrl }
} } }"""
QUERY = """query($owner:String!, $name:String!, $cursor:String) {
  repository(owner:$owner,name:$name) { nameWithOwner visibility defaultBranchRef { name target { ... on Commit { oid committedDate url statusCheckRollup { state } } } }
    pullRequests(states:OPEN,first:25,after:$cursor,orderBy:{field:UPDATED_AT,direction:DESC}) {
      totalCount pageInfo { endCursor hasNextPage } nodes {
        number title url bodyText createdAt updatedAt isDraft headRefOid headRefName baseRefName
        mergeStateStatus reviewDecision author { login } headRepository { nameWithOwner visibility }
        latestReviews(first:12) { nodes { author { login } state url submittedAt commit { oid } } }
        reviewRequests(first:12) { nodes { requestedReviewer {
          ... on User { login url }
        } } }
        commits(last:1) { nodes { commit { oid """ + CHECKS + """ } } }
} } } }"""
PATTERNS = {
    "before": re.compile(r"\b(before|baseline|previously|used to|prior implementation|regression)\b", re.I),
    "after": re.compile(r"\b(after|now|adds?|introduces?|fixes|prevents|reduces)\b|[0-9]\s*(?:->|→)", re.I),
    "validation": re.compile(r"\b(tests?|pytest|pass(?:ed|es)|validated|benchmark|measured)\b", re.I),
}


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def safe_link(url):
    return url if isinstance(url, str) and url.startswith(LINK_PREFIXES) else None


def cleaned(text, limit=260):
    text = re.sub(r"https?://\S+", "", str(text or ""))
    text = " ".join(text.replace("`", "").strip(" #*->").split())
    return text if len(text) <= limit else text[:limit - 1].rstrip() + "…"


def evidence(body):
    values = {}
    lines = [line for line in str(body or "").splitlines() if not line.lstrip().startswith(("|", "<", "```"))]
    for category, pattern in PATTERNS.items():
        values[category] = next((cleaned(line) for line in lines
                                 if len(line.strip()) >= 28 and pattern.search(line)), None)
    return values


def auth_token():
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if token:
        return token
    try:
        return subprocess.run(["gh", "auth", "token", "--hostname", "github.com"],
                              capture_output=True, text=True, timeout=5, check=True).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return None


def get(path, token=None, query=None):
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "uwplasma-review-desk"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if query:
        headers["Content-Type"] = "application/json"
    body = json.dumps(query).encode() if query else None
    with REQUEST_LOCK:
        REQUESTS["graphql" if query else "rest"] += 1
    try:
        with urlopen(Request(API + path, headers=headers, data=body), timeout=15) as response:
            return json.load(response)
    except HTTPError as error:
        with REQUEST_LOCK:
            REQUESTS[f"http_{error.code}"] += 1
        raise
    except OSError:
        with REQUEST_LOCK:
            REQUESTS["network_errors"] += 1
        raise


def normalize_check(item):
    return {"name": cleaned(item.get("name") or item.get("context"), 140),
            "state": item.get("conclusion") or item.get("state") or item.get("status"),
            "url": safe_link(item.get("detailsUrl") or item.get("targetUrl")),
            "started_at": item.get("startedAt"), "completed_at": item.get("completedAt")}


def public_pr(repo, raw, previous):
    commit = ((raw.get("commits") or {}).get("nodes") or [{}])[0].get("commit") or {}
    rollup = (commit.get("statusCheckRollup") or {}) if commit.get("oid") == raw["headRefOid"] else {}
    contexts = rollup.get("contexts") or {}
    head = raw.get("headRepository") or {}
    review_nodes = (raw.get("latestReviews") or {}).get("nodes", [])
    requests = (raw.get("reviewRequests") or {}).get("nodes", [])
    pr = {
        "number": raw["number"], "title": cleaned(raw["title"], 240), "url": safe_link(raw["url"]),
        "created_at": raw["createdAt"], "updated_at": raw["updatedAt"], "draft": raw["isDraft"],
        "head": raw["headRefOid"], "base_branch": raw["baseRefName"],
        "head_branch": raw["headRefName"] if head.get("visibility") == "PUBLIC" else None,
        "same_repo": head.get("visibility") == "PUBLIC" and head.get("nameWithOwner") == repo,
        "author": (raw.get("author") or {}).get("login"),
        "merge": raw.get("mergeStateStatus"), "review_state": raw.get("reviewDecision"),
        "checks": [normalize_check(node) for node in contexts.get("nodes", []) if node],
        "check_state": rollup.get("state"), "checks_partial": contexts.get("pageInfo", {}).get("hasNextPage", False),
        "reviews": [{"login": (review.get("author") or {}).get("login"), "state": review["state"],
                     "url": safe_link(review["url"]), "at": review["submittedAt"],
                     "head": (review.get("commit") or {}).get("oid")}
                    for review in review_nodes if review],
        "requested": [{"login": reviewer["login"], "url": safe_link(reviewer.get("url"))}
                      for item in requests if (reviewer := (item or {}).get("requestedReviewer"))
                      and reviewer.get("login")],
        "evidence": (previous["evidence"] if previous and previous["updated_at"] == raw["updatedAt"]
                     else evidence(raw.get("bodyText"))),
    }
    return pr


def graphql_prs(repo, token, previous):
    owner, name = repo.split("/", 1)
    cursor = None
    prs = []
    previous_prs = {item["number"]: item for item in previous.get("prs", [])}
    for _ in range(5):
        response = get("/graphql", token, {"query": QUERY, "variables": {
            "owner": owner, "name": name, "cursor": cursor,
        }})
        if response.get("errors"):
            raise ValueError("GitHub GraphQL returned partial or unauthorized data")
        record = response["data"]["repository"]
        if not record or record["visibility"] != "PUBLIC":
            return None
        page = record["pullRequests"]
        prs.extend(public_pr(repo, pr, previous_prs.get(pr["number"])) for pr in page["nodes"] if pr)
        cursor = page["pageInfo"]["endCursor"]
        if not page["pageInfo"]["hasNextPage"]:
            break
    branch = record.get("defaultBranchRef") or {}
    tip = branch.get("target") or {}
    tip_status = {"sha": tip.get("oid"), "date": tip.get("committedDate"),
                  "url": safe_link(tip.get("url")),
                  "checks": (tip.get("statusCheckRollup") or {}).get("state")}
    return {"name": repo, "default_branch": branch.get("name"), "tip": tip_status,
            "pr_count": page["totalCount"], "prs": prs, "pr_detail": "head",
            "pr_partial": page["pageInfo"]["hasNextPage"]}


def rest_prs(repo, token):
    meta = get(f"/repos/{repo}", token)
    if meta.get("private") is not False or meta.get("visibility") not in (None, "public"):
        return None
    rows = get(f"/repos/{repo}/pulls?state=open&per_page=100&sort=updated&direction=desc", token)
    prs = []
    for row in rows:
        head = row["head"].get("repo") or {}
        prs.append(public_pr(repo, {
            "number": row["number"], "title": row["title"], "url": row["html_url"],
            "bodyText": row.get("body"), "isDraft": row["draft"], "headRefOid": row["head"]["sha"],
            "headRefName": row["head"]["ref"], "baseRefName": row["base"]["ref"],
            "createdAt": row["created_at"], "updatedAt": row["updated_at"],
            "headRepository": {"visibility": "PUBLIC" if head and head.get("private") is False else None,
                               "nameWithOwner": head.get("full_name")},
            "author": {"login": (row.get("user") or {}).get("login")},
        }, None))
    return {"name": repo, "default_branch": meta["default_branch"], "prs": prs,
            "pr_count": len(prs), "pr_detail": "list", "pr_partial": len(prs) == 100}


def run_data(run):
    row = {key: run.get(key) for key in ("id", "name", "status", "conclusion", "event",
                                        "created_at", "updated_at", "run_attempt", "head_sha")}
    row["url"] = safe_link(run.get("html_url"))
    row["actor"] = (run.get("triggering_actor") or run.get("actor") or {}).get("login")
    # A public base repo can receive a webhook for a deleted fork. Publish no fork branch name.
    head_repo = run.get("head_repository") or {}
    row["head_branch"] = run.get("head_branch") if head_repo.get("private") is False else None
    return row


def job_data(job):
    status = job.get("status")
    labels = {label.casefold() for label in (job.get("labels") or []) if isinstance(label, str)}
    cpu = bool(labels & CPU_LABELS)
    gpu = bool(labels & GPU_LABELS)
    device = ("GPU" if gpu else "CPU") if cpu != gpu else None
    self_hosted = "self-hosted" in labels
    hosted = any(re.match(r"^(ubuntu|macos|windows)-(latest|[0-9.]+(?:-arm|-intel)?)$", label)
                 for label in labels)
    backend = "Self-hosted" if self_hosted else "Standard hosted" if hosted else None
    return {"name": cleaned(job.get("name"), 150), "url": safe_link(job.get("html_url")),
            "backend": backend, "device": device, "status": status, "conclusion": job.get("conclusion"),
            "created_at": job.get("created_at"),
            "started_at": job.get("started_at") if status != "queued" else None,
            "completed_at": job.get("completed_at")}


def collect_runs(repo, token, previous):
    endpoint = f"/repos/{repo}/actions/runs"
    runs = {}
    detail = bool(token)
    recent = get(f"{endpoint}?per_page=12", token)["workflow_runs"]
    index_partial = not detail
    if detail:
        for status in ("queued", "in_progress"):
            status_page = get(f"{endpoint}?status={status}&per_page=15", token)
            if status_page["total_count"] > len(status_page["workflow_runs"]):
                index_partial = True
            for run in status_page["workflow_runs"]:
                runs[run["id"]] = run
    runs.update((run["id"], run) for run in recent)
    ordered = sorted(runs.values(), key=lambda run: run["created_at"], reverse=True)
    active = [run for run in ordered if run["status"] in ACTIVE]
    completed = [run for run in ordered if run["status"] == "completed"]
    recent_completed = [run for run in completed if run.get("event") in ("pull_request", "push", "schedule")]
    sampled = active[:4] + recent_completed[:1]
    previous_runs = {(item["id"], item.get("run_attempt")): item for item in previous.get("runs", [])}
    result = []
    for run in sampled:
        row = run_data(run)
        cache_record = previous_runs.get((row["id"], row["run_attempt"]))
        if cache_record and row["status"] == cache_record["status"] == "completed" and cache_record.get("jobs") is not None:
            row["jobs"] = cache_record["jobs"]
            row["jobs_partial"] = cache_record.get("jobs_partial", False)
        else:
            with REQUEST_LOCK:
                has_budget = REQUESTS["job_details"] < JOB_BUDGET
                REQUESTS["job_details" if has_budget else "job_budget_skipped"] += 1
            if not has_budget:
                row.update(jobs=None, job_detail="budget")
                result.append(row)
                continue
            try:
                payload = get(f"{endpoint}/{row['id']}/jobs?per_page=50", token)
                row["jobs"] = [job_data(job) for job in payload["jobs"]]
                row["jobs_partial"] = payload["total_count"] > len(row["jobs"])
            except (OSError, ValueError, KeyError):
                row.update(jobs=None, job_detail="unavailable")
        result.append(row)
    return {"runs": result, "active_run_count": len(active), "active_partial": index_partial or len(active) > 4}


def collect_repo(repo, token, previous):
    # Prior samples are reusable only after the repository's public visibility is reverified.
    try:
        try:
            record = graphql_prs(repo, token, previous) if token else rest_prs(repo, None)
        except (OSError, ValueError, KeyError, TypeError):
            if not token:
                raise
            with REQUEST_LOCK:
                REQUESTS["pr_list_fallbacks"] += 1
            record = rest_prs(repo, token)
    except (OSError, ValueError, KeyError, TypeError):
        return {"name": repo, "unavailable": "GitHub repository or pull request data could not be verified."}
    if record is None:
        return None
    record["pr_observed_at"] = utc_now()
    try:
        run_snapshot = collect_runs(repo, token, previous)
        record.update(run_snapshot, jobs_observed_at=utc_now())
    except (OSError, ValueError, KeyError, TypeError):
        record.update(runs=previous.get("runs", []),
                      jobs_observed_at=previous.get("jobs_observed_at"),
                      active_run_count=None, active_partial=True,
                      jobs_unavailable="GitHub workflow data could not be read on this refresh.")
    return record


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile(mode="w", dir=path.parent, encoding="utf-8", delete=False) as stream:
        json.dump(value, stream, ensure_ascii=False, separators=(",", ":"))
        stream.write("\n")
        temporary = Path(stream.name)
    temporary.chmod(0o644)
    temporary.replace(path)


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("dist/data.json"))
    parser.add_argument("--cache", type=Path, default=Path(".cache/dashboard.json"))
    parser.add_argument("--anonymous", action="store_true",
                        help="use bounded anonymous REST reads without PR review/check expansion")
    args = parser.parse_args()
    try:
        previous = {repo["name"]: repo for repo in json.loads(args.cache.read_text())["repositories"]}
    except (OSError, ValueError, KeyError):
        previous = {}
    token = None if args.anonymous else auth_token()
    with ThreadPoolExecutor(max_workers=3) as pool:
        repos = list(pool.map(lambda repo: collect_repo(repo, token, previous.get(repo, {})), REPOSITORIES))
    records = [repo for repo in repos if repo]
    run_id = os.environ.get("GITHUB_RUN_ID", "")
    run_url = (f"https://github.com/uwplasma/review-desk/actions/runs/{run_id}"
               if run_id.isdigit() and os.environ.get("GITHUB_REPOSITORY") == "uwplasma/review-desk" else None)
    result = {"schema": 1, "captured_at": utc_now(), "collection_run": run_url,
              "mode": "authenticated" if token else "anonymous",
              "collection": dict(REQUESTS), "repositories": records,
              "limits": {"recent_runs": 12, "active_runs_per_state": 15,
                         "job_detail_requests": JOB_BUDGET, "active_run_details_per_repo": 4,
                         "completed_run_details_per_repo": 1, "jobs_per_run": 50,
                         "prs_per_repo": 125 if token else 100, "check_contexts_per_pr": 32,
                         "reviews_per_pr": 12}}
    if not any("prs" in repo for repo in records):
        raise SystemExit("No repository visibility and data could be verified. Snapshot preserved.")
    write_json(args.output, result)
    if args.cache != args.output:
        write_json(args.cache, result)
    print(f"Captured {sum('prs' in repo for repo in records)} repositories, "
          f"{sum(len(repo.get('prs', [])) for repo in records)} pull requests.")


if __name__ == "__main__":
    main()
