const feedURL = 'https://raw.githubusercontent.com/uwplasma/review-desk/data/data.json'
const tables = document.querySelector('#tables')
const dateNode = document.querySelector('#date')
const branchNotes = {
  'uwplasma/GKX': {
    sha: '5782b8c3f18e60bb94bcb2f0770a0905d2a2d3a5',
    summary: 'Hosted wide-coverage shard 7 exceeded 30 minutes on both attempts. The self-hosted shard 2 received a shutdown signal.',
    action: 'Validate #504 with a trusted wide-coverage run and investigate shard 2 runner stability separately.',
    links: [
      ['Failed run', 'https://github.com/uwplasma/GKX/actions/runs/44131675843'],
      ['Budget fix #504', 'https://github.com/uwplasma/GKX/pull/504'],
    ],
  },
  'uwplasma/MHX': {
    sha: 'bd6b015ce0a9b51bea3fa2d9fe6ee744be98e54a',
    summary: 'Three tests failed on the same self-hosted Mac. A CLI assertion broke on wrapped output, and two tearing validation assertions also failed.',
    action: 'Run #18’s named tearing diagnostics on the original Mac and a second host with matching dependencies.',
    links: [
      ['Failed job', 'https://github.com/uwplasma/MHX/actions/runs/43327149458/job/131562383712'],
      ['Fixture fix and diagnostics #18', 'https://github.com/uwplasma/MHX/pull/18'],
    ],
  },
}
function element(tag, text) {
  const node = document.createElement(tag)
  if (text !== undefined) node.textContent = text
  return node
}
function duration(s) {
  if (s == null) return '—'
  const seconds = Math.round(s)
  return seconds < 60 ? seconds + ' s' : Math.floor(seconds / 60) + 'm ' + (seconds % 60) + 's'
}
function table(title, headers, rows) {
  tables.append(element('h2', title))
  const wrap = element('div'); wrap.className = 'scroll'
  const t = element('table'); const head = t.createTHead().insertRow()
  for (const key of headers) { const th = element('th', key); th.scope = 'col'; head.append(th) }
  const body = t.createTBody()
  for (const fields of rows) {
    const row = body.insertRow()
    for (const value of fields) row.insertCell().append(value instanceof Node ? value : document.createTextNode(String(value)))
  }
  wrap.append(t); tables.append(wrap)
}
function source(record) {
  const label = record.repo.split('/')[1] + ' · ' + record.name
  if (!record.url.startsWith('https://github.com/')) return label
  const link = element('a', label); link.href = record.url
  return link
}
function branchDiagnoses(repositories) {
  const section = element('div')
  section.className = 'branch-notes'
  for (const repo of repositories) {
    const note = branchNotes[repo.name]
    if (!note || repo.tip?.sha !== note.sha || !['FAILURE', 'ERROR'].includes(repo.tip.checks)) continue
    const card = element('article')
    card.append(element('h3', repo.name.split('/')[1] + ' · ' + note.sha.slice(0, 8)),
      element('p', note.summary), element('p', note.action))
    const links = element('p'); links.className = 'branch-note-links'
    for (const [label, url] of note.links) {
      const anchor = element('a', label)
      anchor.href = url
      links.append(anchor)
    }
    card.append(links)
    section.append(card)
  }
  if (section.children.length) tables.append(section)
}
async function load() {
  const urls = location.hostname === 'uwplasma.github.io' ? [feedURL + '?t=' + Math.floor(Date.now()/300000), './data.json'] : ['./data.json']
  let h, snapshot
  for (const url of urls) {
    try { const r = await fetch(url, {cache:'no-store'}); if (r.ok) { snapshot = await r.json(); h = snapshot.timing } if (h) break } catch {}
  }
  if (!h) { dateNode.textContent = 'The historical sample is unavailable. Open Workflow runs for the live queue.'; return }
  dateNode.textContent = h.attempts + ' workflow attempts · ' + h.all.jobs + ' jobs · sampled ' + new Date(h.captured_at).toLocaleString() + (h.gaps?.length ? ' · ' + h.gaps.length + ' incomplete API reads' : '')
  tables.replaceChildren()
  function summarize(title, first, obj) {
    const rows = Object.entries(obj).sort((a,b)=>b[1].minutes-a[1].minutes).map(([key,s]) =>
      [key.replace('uwplasma/',''), s.jobs, duration(s.wait[0]), duration(s.wait[1]), duration(s.runtime[0]), s.minutes.toLocaleString(), s.cancelled_minutes.toLocaleString()])
    table(title, [first,'Jobs','Median pre-start','p95 pre-start','Median runtime','Runner-min','Cancelled min'], rows)
  }
  const pools = Object.entries(h.pools).filter(([, stats]) => stats.wait[1] != null)
  if (pools.length) {
    tables.append(element('h2', 'Time before jobs start'))
    const maximum = Math.max(1, ...pools.map(([, stats]) => stats.wait[1]))
    for (const [pool, stats] of pools) {
      const row = element('div'); row.className = 'wait-row'
      const track = element('div'); track.className = 'wait-track'
      track.setAttribute('aria-hidden', 'true')
      const span = element('div'); span.className = 'wait-range'
      span.style.width = (100 * stats.wait[1] / maximum) + '%'
      const median = element('i')
      median.style.left = (100 * stats.wait[0] / maximum) + '%'
      track.append(span, median)
      row.append(element('strong', pool), track, element('span', 'Median ' + duration(stats.wait[0]) + ' · p95 ' + duration(stats.wait[1])))
      tables.append(row)
    }
  }
  summarize('Runner pools','Pool', h.pools)
  summarize('Repositories','Repository', h.repos)
  const rows = snapshot.repositories.filter(repo => repo.name.startsWith('uwplasma/')).map(repo => {
    const tip = repo.tip || {}
    const name = element('a', repo.name.split('/')[1])
    name.href = 'https://github.com/' + repo.name
    const revision = element('a', (tip.sha || '').slice(0, 8))
    if (tip.url?.startsWith('https://github.com/')) revision.href = tip.url + '/checks'
    return [name, repo.default_branch || '—', tip.sha ? revision : '—', tip.checks || 'Unavailable', repo.pr_count ?? '—']
  })
  table('Current default branches', ['Repository','Branch','Commit','GitHub checks','Open PRs'], rows)
  tables.lastElementChild.previousElementSibling.id = 'branches'
  branchDiagnoses(snapshot.repositories)
  table('Longest pre-start intervals',['Job','Pool','Pre-start','Runtime'], h.longest.map(j=>[source(j),j.pool,duration(j.wait),duration(j.runtime)]))
}
load()
document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()})
setInterval(()=>{if(!document.hidden)load()},300000)
