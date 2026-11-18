"use strict";

const REMOTE = "https://raw.githubusercontent.com/uwplasma/review-desk/data/data.json";
const LIVE = location.hostname === "uwplasma.github.io";
const INTERVAL = 5 * 60_000;
const PAGE_SIZE = 16;
const activeStates = new Set(["queued", "in_progress", "waiting", "pending", "requested"]);
const failedStates = new Set(["FAILURE", "ERROR", "TIMED_OUT", "ACTION_REQUIRED", "STARTUP_FAILURE", "STALE", "CANCELLED"]);
const pendingStates = new Set(["PENDING", "EXPECTED", "QUEUED", "IN_PROGRESS", "WAITING", "REQUESTED"]);
const tabs = [
  ["focus", "Priority"],
  ["ready", "Candidates"],
  ["review", "Review needed"],
  ["ci", "CI & conflicts"],
  ["stack", "Stacked"],
  ["draft", "Drafts"],
  ["all", "All open"],
];
const state = {
  data: null,
  notes: [],
  all: [],
  filter: "focus",
  limit: PAGE_SIZE,
  expanded: new Set(),
  lastFetch: 0,
  fetching: false,
  hasLive: false,
};

const $ = selector => document.querySelector(selector);
function node(tag, className, content) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (content !== undefined && content !== null) item.textContent = content;
  return item;
}
function link(url, label) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" && ["github.com", "app.codecov.io", "uwplasma.github.io"].includes(parsed.hostname)) {
      const a = node("a", "", label);
      a.href = parsed.href;
      return a;
    }
  } catch {}
  return node("span", "", label);
}
function stamp(value) {
  const date = Date.parse(value);
  if (!Number.isFinite(date) || date < 0) return null;
  return date;
}
function duration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "unknown";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return sec + "s";
  const mins = Math.floor(sec / 60);
  if (mins < 60) return mins + "m " + (sec % 60) + "s";
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + "h " + (mins % 60) + "m";
  return Math.floor(hours / 24) + "d " + (hours % 24) + "h";
}
function elapsed(start, end) {
  const left = stamp(start);
  const right = stamp(end);
  return left !== null && right !== null && right >= left ? duration(right - left) : null;
}
function ago(value, reference) {
  const result = elapsed(value, reference);
  return result ? result + " ago" : "time unavailable";
}
function utc(value) {
  const time = stamp(value);
  return time === null ? "time unavailable"
    : new Date(time).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}
const pretty = value => value ? String(value).toLowerCase().replaceAll("_", " ") : "unknown";
const shortRepo = repo => repo.split("/").at(-1);
const profile = reviewer => reviewer?.login ? "https://github.com/" + encodeURIComponent(reviewer.login) : null;
const statusPill = (label, style) => node("span", "pill tone-" + style, label);

function classify(repo, pr, parents, memo) {
  const checks = pr.checks || [];
  const states = checks.map(check => check.state);
  const failed = failedStates.has(pr.check_state) || pr.merge === "UNSTABLE"
    || states.some(status => failedStates.has(status));
  const pending = pendingStates.has(pr.check_state) || states.some(status => pendingStates.has(status));
  const passed = states.includes("SUCCESS") && !failed && !pending;
  if (pr.draft) return ["draft", memo?.action === "Hold" ? "Hold · draft" : "Draft",
    memo?.decision || "Complete author validation before review.", 90];
  if (pr.merge === "DIRTY") return ["conflict", "Conflicts", "Resolve the base-branch conflicts and rerun checks.", 42];
  if (failed) return ["failure", "CI failed", "Inspect failed checks before review or merge.", 36];
  if (pr.review_state === "CHANGES_REQUESTED") return ["review", "Changes requested", "Address the reviewer’s requested changes.", 24];
  if (parents.length || pr.base_branch !== repo.default_branch) {
    return ["stack", memo?.action === "Hold" ? "Hold · stacked" : "Stacked",
      memo?.decision || "Review this PR in the context of its parent branch.", 65];
  }
  if (memo?.action === "Hold") return ["review", "Hold", memo.decision, 23];
  if (pending) return ["pending", "CI pending", "Wait for checks on this head to finish.", 55];
  if (pr.merge === "BEHIND") return ["conflict", "Behind base", "Update the branch and verify checks on the new head.", 45];
  if (memo?.action === "Review" && passed && ["CLEAN", "BLOCKED"].includes(pr.merge)) {
    return ["ready", "Review", memo.decision, memo.rank];
  }
  if (pr.review_state === "REVIEW_REQUIRED") return ["review", "Review needed", "Request or complete the required review.", 25];
  if (pr.merge === "CLEAN" && passed) {
    const note = memo?.action === "Review" ? memo.decision : "Reconfirm current checks and branch rules in GitHub.";
    return ["ready", "Review candidate", note, memo?.action === "Review" ? memo.rank : 17];
  }
  if (pr.merge === "BLOCKED") return ["review", "GitHub blocked", "Verify branch and review rules with maintainer access.", 32];
  return ["unknown", "Verify on GitHub",
    passed ? "Inspect branch and review rules in GitHub." : "No successful executable check was observed.", 60];
}

function consolidate(data, notes) {
  return data.repositories.flatMap(repo => {
    const heads = new Map();
    for (const pr of repo.prs || []) {
      if (pr.same_repo && pr.head_branch) {
        const group = heads.get(pr.head_branch) || [];
        group.push(pr);
        heads.set(pr.head_branch, group);
      }
    }
    return (repo.prs || []).map(pr => {
      const parents = pr.base_branch !== repo.default_branch
        ? (heads.get(pr.base_branch) || []).filter(item => item.number !== pr.number) : [];
      const annotation = notes.find(note => note.repo === repo.name && note.number === pr.number
        && note.head === pr.head);
      return {repo, pr, parents, annotation,
        decision: classify(repo, pr, parents, annotation), key: repo.name + "#" + pr.number};
    });
  }).sort((a, b) => Number(!a.repo.name.startsWith("uwplasma/")) - Number(!b.repo.name.startsWith("uwplasma/"))
    || (a.annotation?.rank ?? a.decision[3]) - (b.annotation?.rank ?? b.decision[3]) || (stamp(b.pr.updated_at) || 0) - (stamp(a.pr.updated_at) || 0));
}

function inTab(row, filter, repository) {
  const bucket = row.decision[0];
  if (filter === "all") return true;
  if (filter === "ci") return ["failure", "conflict", "pending"].includes(bucket);
  if (filter === "focus") {
    return (repository || row.repo.name.startsWith("uwplasma/"))
      && (row.annotation || (!row.pr.draft && ["ready", "review", "failure", "conflict", "pending"].includes(bucket)));
  }
  return bucket === filter;
}
function setMetrics() {
  const selected = $("#repository").value;
  const known = state.data.repositories.filter(repo => !repo.unavailable && (
    selected ? selected === repo.name : repo.name.startsWith("uwplasma/")));
  const scoped = state.all.filter(row => known.includes(row.repo));
  const active = known.reduce((total, repo) => total + (repo.active_run_count || 0), 0);
  const lowerBound = state.data.mode === "anonymous" || known.some(repo => repo.active_run_count === null);
  const external = selected ? 0 : state.all.filter(row => !row.repo.name.startsWith("uwplasma/")).length;
  const label = selected ? shortRepo(selected) + " open PRs" : "UW Plasma open PRs";
  const values = [
    [scoped.length, label, external ? external + " external FIRM3D PRs" : null],
    [scoped.filter(row => row.decision[0] === "ready").length, "Review candidates"],
    [scoped.filter(row => ["failure", "conflict"].includes(row.decision[0])).length, "CI failures or conflicts"],
    [lowerBound ? "≥" + active : active, "Active run records"],
  ];
  $("#metrics").replaceChildren(...values.map(([value, caption, note]) => {
    const card = node("div", "metric");
    card.append(node("strong", "", value), node("span", "", caption));
    if (note) card.append(node("small", "metric-note", note));
    return card;
  }));
}
function renderTabs() {
  $("#tabs").replaceChildren(...tabs.map(([key, label]) => {
    const button = node("button", "", label);
    button.type = "button";
    button.setAttribute("aria-pressed", String(state.filter === key));
    button.addEventListener("click", () => {
      state.filter = key;
      state.limit = PAGE_SIZE;
      renderTabs();
      $("#tabs").querySelector("[aria-pressed=true]").focus();
      renderRows();
    });
    return button;
  }));
}
function renderRepositoryPicker() {
  const select = $("#repository");
  const current = select.value;
  select.replaceChildren(node("option", "", "All repositories"));
  select.firstChild.value = "";
  for (const repo of state.data.repositories) {
    const option = node("option", "", shortRepo(repo.name) + (repo.name.startsWith("uwplasma/") ? "" : " · external"));
    option.value = repo.name;
    select.append(option);
  }
  if ([...select.options].some(option => option.value === current)) select.value = current;
}

function detailFor(row) {
  const {pr, parents, annotation, repo} = row;
  const panel = node("div", "pr-detail");
  const top = node("div", "detail-top");
  const branches = node("div");
  branches.append(node("code", "", (pr.head_branch || "head branch unavailable") + " → " + pr.base_branch));
  branches.append(node("div", "", "Head " + pr.head.slice(0, 12) + " · updated " + utc(pr.updated_at)));
  top.append(branches, link(pr.url, "Open pull request ↗"));
  panel.append(top);
  if (parents.length) {
    const stackText = node("p", "empty");
    stackText.style.padding = "0 0 12px";
    stackText.append(document.createTextNode("Base branch matches "));
    for (const [index, parent] of parents.entries()) {
      if (index) stackText.append(document.createTextNode(", "));
      stackText.append(link(parent.url, "#" + parent.number));
    }
    panel.append(stackText);
  }
  const detail = node("div", "detail-grid");
  const reviewers = node("div");
  reviewers.append(node("h3", "", "Review decisions"));
  const reviews = node("ul", "record-list");
  if (pr.review_state) reviews.append(node("li", "", "Review status · " + pretty(pr.review_state)));
  if (pr.merge === "BLOCKED") {
    reviews.append(node("li", "", "GitHub reports blocked for the collector. Verify with maintainer access."));
  } else if (pr.merge) {
    reviews.append(node("li", "", "Merge status observed by collector · " + pretty(pr.merge)));
  }
  for (const review of pr.reviews || []) {
    const item = node("li");
    item.append(link(review.url || profile(review), review.login || "Reviewer"),
      document.createTextNode(" · " + pretty(review.state) + " · " + utc(review.at)
        + (review.head && review.head !== pr.head ? " · earlier head " + review.head.slice(0, 8) : "")));
    reviews.append(item);
  }
  for (const request of pr.requested || []) {
    const item = node("li");
    item.append(document.createTextNode("Requested from "), link(request.url, request.login || "reviewer"));
    reviews.append(item);
  }
  if (!reviews.children.length) reviews.append(node("li", "", "No review details returned."));
  reviewers.append(reviews);
  detail.append(reviewers);

  const evidence = node("div");
  evidence.append(node("h3", "", annotation ? "Reviewed change" : "Author-reported change"));
  const fields = node("dl", "evidence");
  const source = annotation || pr.evidence || {};
  for (const [key, title] of [["before", "Before"], ["after", "After"], ["validation", "Validation"]]) {
    const value = source[key] || (key === "validation" ? pr.evidence?.validation : null);
    const field = node("div");
    field.append(node("dt", "", title), node("dd", "", value || "No summary available."));
    fields.append(field);
  }
  evidence.append(fields);
  if (annotation?.evidence_url) {
    const sourceLink = node("p", "muted");
    sourceLink.append(link(annotation.evidence_url, "Review evidence ↗"));
    evidence.append(sourceLink);
  }
  detail.append(evidence);
  panel.append(detail);

  const checks = pr.checks || [];
  const checkPanel = node("details", "nested");
  const summary = node("summary");
  summary.append(node("span", "chevron"), node("span", "", "Head checks · " + checks.length
    + (pr.checks_partial ? "+" : "") + (pr.check_state ? " shown · " + pretty(pr.check_state) : " shown")));
  checkPanel.append(summary);
  if (!checks.length) {
    checkPanel.append(node("p", "muted", repo.pr_detail === "list"
      ? "Head checks require the authenticated collection path." : "GitHub returned no check contexts for this head."));
  } else {
    const checkList = node("ul", "checks");
    for (const check of checks) {
      const item = node("li");
      const checkAge = elapsed(check.started_at, check.completed_at);
      item.append(link(check.url, check.name), node("small", "", pretty(check.state)
        + (checkAge && checkAge !== "0s" ? " · " + checkAge : "")));
      checkList.append(item);
    }
    checkPanel.append(checkList);
  }
  panel.append(checkPanel);
  return panel;
}

function renderRow(row) {
  const {repo, pr, key} = row;
  const [bucket, label, decision] = row.decision;
  const card = node("details", "pr");
  card.open = state.expanded.has(key);
  const header = node("summary");
  const meta = node("div", "pr-meta");
  meta.append(node("strong", "", shortRepo(repo.name) + " #" + pr.number),
    node("span", "", ago(pr.updated_at, state.data.captured_at)));
  const title = node("div", "pr-title", pr.title);
  const successes = (pr.checks || []).filter(check => check.state === "SUCCESS").length;
  const checkLabel = pr.checks?.length ? successes + "/" + pr.checks.length + " passed"
    : repo.pr_detail === "list" ? "Checks unavailable" : "No checks returned";
  title.append(node("small", "", (pr.author ? "@" + pr.author + " · " : "") + checkLabel
    + (pr.checks_partial ? " · sample" : "") + (pr.review_state === "APPROVED" ? " · Approved" : "")));
  const triage = node("div", "triage");
  triage.append(statusPill(label, bucket), node("small", "", decision));
  header.append(meta, title, triage, node("span", "chevron"));
  card.append(header);
  function hydrate() {
    if (!card.querySelector(".pr-detail")) card.append(detailFor(row));
  }
  if (card.open) hydrate();
  card.addEventListener("toggle", () => {
    if (card.open) {
      state.expanded.add(key);
      hydrate();
    } else state.expanded.delete(key);
  });
  return card;
}

function renderRows() {
  if (!state.data) return;
  const filterRepo = $("#repository").value;
  const words = $("#query").value.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const rows = state.all.filter(row => {
    if ((filterRepo && filterRepo !== row.repo.name) || !inTab(row, state.filter, filterRepo)) return false;
    const text = [row.key, row.pr.title, row.pr.author, row.pr.head_branch, row.pr.base_branch,
      row.decision[1], row.decision[2], row.pr.number].join(" ").toLowerCase();
    return words.every(word => text.includes(word));
  });
  const shown = rows.slice(0, state.limit);
  $("#counts").textContent = shown.length < rows.length
    ? shown.length + " of " + rows.length + " PRs" : rows.length + (rows.length === 1 ? " PR" : " PRs");
  $("#prs").replaceChildren(...(shown.length ? shown.map(renderRow)
    : [node("p", "empty", "No pull requests match these filters.")]));
  $("#more").hidden = shown.length >= rows.length;
}

function timing(repo, run, job) {
  const parts = [];
  if (job.backend) parts.push(job.backend);
  const pending = activeStates.has(job.status) && !job.started_at;
  const origin = job.created_at || run.created_at;
  const observed = repo.jobs_observed_at || state.data.captured_at;
  const end = pending ? observed : job.started_at;
  const wait = elapsed(origin, end);
  if (wait) {
    const label = job.created_at ? (pending ? "Job waiting " : "Job wait ")
      : (pending ? "Run age " : "Run → job start ");
    parts.push(label + wait);
  }
  const active = job.status === "in_progress";
  const wall = elapsed(job.started_at, active ? observed : job.completed_at);
  if (wall) parts.push((active ? "Running " : "Job runtime ") + wall);
  return parts.join(" · ");
}
function renderRun(repo, run) {
  const entry = node("details", "run");
  const heading = node("summary");
  const labels = node("div");
  labels.append(node("strong", "", shortRepo(repo.name) + " · " + run.name),
    node("small", "", [run.head_branch, run.event, ago(run.created_at, state.data.captured_at)].filter(Boolean).join(" · ")));
  const conclusion = run.conclusion || run.status;
  const tone = activeStates.has(run.status) ? "pending" : conclusion === "success" ? "ready"
    : conclusion === "failure" ? "failure" : "unknown";
  heading.append(labels, statusPill(pretty(conclusion), tone), node("span", "chevron"));
  entry.append(heading);
  const body = node("div", "run-body");
  const runLink = node("p");
  runLink.append(link(run.url, "Open workflow run ↗"), document.createTextNode(" · " + utc(run.created_at)));
  body.append(runLink);
  if (run.actor) body.append(node("p", "", "Triggered by @" + run.actor));
  if (repo.jobs_unavailable) body.append(node("p", "", "Cached run sample · observed " + utc(repo.jobs_observed_at)));
  if (run.jobs === null) {
    body.append(node("p", "", run.job_detail === "budget"
      ? "Job detail exceeded this refresh’s API budget." : "GitHub job detail was unavailable."));
  } else if (run.jobs && !run.jobs.length) {
    body.append(node("p", "", "No jobs returned for this run."));
  } else {
    const jobs = node("ul", "jobs");
    const ordered = [...(run.jobs || [])].sort((a, b) => Number(activeStates.has(b.status)) - Number(activeStates.has(a.status)));
    for (const job of ordered) {
      const item = node("li");
      const label = node("div");
      label.append(link(job.url, job.name), document.createTextNode(" · " + pretty(job.conclusion || job.status)));
      item.append(label, node("small", "", timing(repo, run, job)));
      jobs.append(item);
    }
    if (run.jobs_partial) jobs.append(node("li", "", "Additional jobs fall outside the sample."));
    body.append(jobs);
  }
  entry.append(body);
  return entry;
}
function renderRuns() {
  if (!state.data) return;
  const repository = $("#repository").value;
  const repos = state.data.repositories.filter(repo => !repository || repo.name === repository);
  $("#run-filter").textContent = repository ? shortRepo(repository) : "All repositories";
  const all = repos.flatMap(repo => (repo.runs || []).map(run => ({repo, run})))
    .sort((a, b) => (stamp(b.run.created_at) || 0) - (stamp(a.run.created_at) || 0));
  const running = all.filter(({run}) => activeStates.has(run.status));
  const completed = all.filter(({run}) => !activeStates.has(run.status));
  const panels = [["Active records", running], ["Recent completed samples", completed]];
  $("#runs").replaceChildren(...panels.map(([heading, rows]) => {
    const panel = node("div", "run-panel");
    panel.append(node("h3", "", heading + " · " + rows.length));
    if (!rows.length) panel.append(node("p", "empty", "No records returned in this sample."));
    else panel.append(...rows.map(({repo, run}) => renderRun(repo, run)));
    return panel;
  }));
}

function renderMethod() {
  const info = state.data.collection || {};
  const limits = state.data.limits || {};
  const rest = info.rest || 0;
  const calls = info.graphql || 0;
  const errors = Object.entries(info).filter(([key]) => key.startsWith("http_") || key === "network_errors")
    .map(([key, count]) => key.replace("http_", "HTTP ").replaceAll("_", " ") + " × " + count);
  const unavailable = state.data.repositories
    .filter(repo => repo.unavailable || repo.jobs_unavailable || repo.pr_detail === "list")
    .map(repo => shortRepo(repo.name) + " · " + (repo.unavailable || repo.jobs_unavailable || "PR list only"));
  const sampleNotes = state.data.repositories.filter(repo => repo.active_partial || repo.pr_partial)
    .map(repo => shortRepo(repo.name));
  const paragraphs = [
    "GitHub supplied " + state.all.length + " open pull requests across "
      + state.data.repositories.filter(repo => !repo.unavailable).length + " verified public repositories. "
      + "FIRM3D is an external comparison and is excluded from the default priority queue. Only exact-head review annotations apply. A review candidate still requires GitHub’s current merge checks and branch rules.",
    "This refresh used " + rest + " REST requests and " + calls + " GraphQL requests. Collection caps include "
      + limits.prs_per_repo + " open PRs per repository, " + limits.check_contexts_per_pr + " checks per PR and "
      + limits.job_detail_requests + " job-detail requests shared across repositories.",
    "Workflow samples use " + limits.recent_runs + " recent runs per repository. Authenticated collection also queries up to "
      + limits.active_runs_per_state + " queued and in-progress runs per state and repository. "
      + "Details cover up to " + limits.active_run_details_per_repo + " active and "
      + limits.completed_run_details_per_repo + " completed runs per repository, with up to "
      + limits.jobs_per_run + " jobs per run.",
    "GitHub job creation timestamps support job-level wait. Run-to-job start also includes dependency and workflow work. "
      + "Runner types are inferred from public labels. Organization-wide capacity and physical host counts are outside this data.",
  ];
  if (errors.length) paragraphs.push("Request errors · " + errors.join(", ") + ".");
  if (info.job_budget_skipped) paragraphs.push(info.job_budget_skipped + " run samples exceeded the job-detail request budget.");
  if (sampleNotes.length) paragraphs.push("Partial sample · " + sampleNotes.join(", ") + ".");
  $("#method").replaceChildren(...[...paragraphs, ...unavailable].map(text => node("p", "", text)));
}
function showCapture(fallback, failed) {
  const timestamp = state.data.captured_at;
  const age = elapsed(timestamp, new Date().toISOString());
  $("#captured").textContent = utc(timestamp) + (age ? " · " + age + " old" : "");
  const run = $("#collection-run");
  const source = link(state.data.collection_run, "Collection run");
  run.hidden = source.tagName !== "A";
  if (!run.hidden) run.href = source.href;
  const notice = $("#notice");
  const stale = stamp(timestamp) !== null && Date.now() - stamp(timestamp) >= 2 * INTERVAL;
  const partial = state.data.repositories.filter(repo => repo.unavailable || repo.jobs_unavailable || repo.pr_detail === "list").length;
  const warnings = [];
  if (failed) warnings.push("The latest fetch failed. Showing the last snapshot loaded in this tab.");
  else if (fallback) warnings.push("The live feed is unavailable. Showing the bundled snapshot.");
  if (stale) warnings.push("This snapshot is at least 10 minutes old.");
  if (partial) warnings.push("Some data could not be refreshed for " + partial + (partial === 1 ? " repository." : " repositories."));
  notice.hidden = warnings.length === 0;
  notice.textContent = warnings.join(" ");
}
async function fetchJson(url) {
  const response = await fetch(url, {cache: "no-store", signal: AbortSignal.timeout(10_000)});
  if (!response.ok) throw new Error("HTTP " + response.status);
  return response.json();
}
async function fetchSnapshot(url) {
  const data = await fetchJson(url);
  if (data.schema !== 1 || !Array.isArray(data.repositories)) throw new Error("Unknown snapshot format");
  return data;
}
async function refresh() {
  if (state.fetching) return;
  state.fetching = true;
  state.lastFetch = Date.now();
  $("#reload").disabled = true;
  try {
    let data;
    let fallback = false;
    try {
      data = await fetchSnapshot(LIVE ? REMOTE + "?t=" + Math.floor(Date.now() / INTERVAL) : "./data.json");
    } catch (error) {
      if (!LIVE || state.hasLive) throw error;
      data = await fetchSnapshot("./data.json");
      fallback = true;
    }
    if (!fallback && LIVE) state.hasLive = true;
    if (!state.data || state.data.captured_at !== data.captured_at) {
      state.data = data;
      state.all = consolidate(data, state.notes);
      renderRepositoryPicker();
      setMetrics();
      renderRows();
      renderRuns();
      renderMethod();
    }
    showCapture(fallback, false);
  } catch {
    if (state.data) showCapture(false, true);
    else {
      $("#captured").textContent = "Snapshot unavailable";
      $("#notice").hidden = false;
      $("#notice").textContent = "The public snapshot could not be loaded. Refresh the view to try again.";
      $("#prs").replaceChildren(node("p", "empty", "No snapshot loaded."));
    }
  } finally {
    state.fetching = false;
    $("#reload").disabled = false;
  }
}

function schedule() {
  setTimeout(() => {
    if (!document.hidden) refresh();
    schedule();
  }, INTERVAL - (Date.now() % INTERVAL) + 100);
}

$("#query").addEventListener("input", () => {
  state.limit = PAGE_SIZE;
  if ($("#query").value.trim() && state.filter === "focus") {
    state.filter = "all";
    renderTabs();
  }
  renderRows();
});
$("#repository").addEventListener("change", () => {
  state.limit = PAGE_SIZE;
  if (state.data) setMetrics();
  renderRows();
  renderRuns();
});
$("#more").addEventListener("click", () => {
  state.limit += PAGE_SIZE;
  renderRows();
  $("#more").focus();
});
$("#reload").addEventListener("click", refresh);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && Date.now() - state.lastFetch >= INTERVAL) refresh();
});
renderTabs();
fetchJson("./reviews.json").then(notes => {
  if (Array.isArray(notes)) state.notes = notes;
}).catch(() => {}).finally(refresh);
schedule();
