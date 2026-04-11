# ⚛ ENTANGLEWEALTH — GITHUB SOLUTION FINDER
## GODMODE REPLIT PROMPT — Paste Entire Document — Zero Shortcuts

---

## MISSION

Build a **professional-grade GitHub intelligence platform** that supercharges how developers
find solutions, discover libraries, debug errors, analyze codebases, and surface the best
open-source tools for any problem. The platform combines the GitHub REST API, GitHub Search
API, and AI analysis via Claude to transform raw GitHub data into clear, ranked, actionable
answers. This is the tool a senior engineer wishes existed when onboarding a new codebase
or debugging a complex issue at 2am.

---

## TECH STACK

- **Single file**: `github-finder.html` — all HTML, CSS, JS
- **No frameworks**: Vanilla JS only
- **APIs**:
  - GitHub REST API v3: `https://api.github.com`
  - GitHub Search API: `https://api.github.com/search/`
  - GitHub GraphQL API: `https://api.github.com/graphql`
  - Claude API: `https://api.anthropic.com/v1/messages` (model: `claude-sonnet-4-20250514`)
  - User provides both a GitHub Personal Access Token (PAT) and Anthropic API key in Settings
  - Both keys stored in localStorage only — never sent anywhere except their respective APIs
- **Syntax highlighting**: Highlight.js from `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js`
- **Charts**: Chart.js from `https://cdn.jsdelivr.net/npm/chart.js`
- **Markdown rendering**: Marked.js from `https://cdn.jsdelivr.net/npm/marked/marked.min.js`
- **Fonts**: Inter + JetBrains Mono from Google Fonts

---

## VISUAL IDENTITY

```css
:root {
  /* GitHub-inspired dark terminal aesthetic */
  --bg:        #0D1117;    /* GitHub dark background */
  --bg2:       #161B22;    /* Panel background */
  --bg3:       #21262D;    /* Card background */
  --bg4:       #30363D;    /* Input / hover */
  --border:    #30363D;    /* Standard border */
  --border2:   #21262D;    /* Subtle border */

  /* Brand */
  --green:     #3FB950;    /* GitHub green — success, open PRs */
  --purple:    #BC8CFF;    /* Merged PRs, AI elements */
  --blue:      #58A6FF;    /* Links, info */
  --orange:    #F78166;    /* Alerts, warnings */
  --red:       #FF7B72;    /* Closed, errors */
  --yellow:    #D29922;    /* Pending, draft */
  --teal:      #39C5CF;    /* Neutral highlights */
  --gold:      #F5C842;    /* EntangleWealth gold */

  /* Text */
  --text:      #E6EDF3;
  --muted:     #8B949E;
  --subtle:    #484F58;

  /* Font */
  --font-ui:   'Inter', sans-serif;
  --font-code: 'JetBrains Mono', monospace;
}
```

**Visual rules:**
- All code: JetBrains Mono, syntax highlighted
- Star counts: gold ★ icon
- Open issues: green dot
- Closed issues: purple dot (merged) or red dot (closed)
- Repository language badges: colored by language
- AI analysis sections: subtle purple left border
- Trending: orange flame icon
- All timestamps: relative (2 hours ago, 3 days ago)
- Language color dots match GitHub's official language color map

---

## LAYOUT

```
┌────────────────────────────────────────────────────────────────┐
│ NAV: ⚛ GitHub Finder  [SEARCH BAR — FULL WIDTH]  [Settings]  │
├────────────────────────────────────────────────────────────────┤
│  TABS:                                                         │
│  Search | Solutions | Repos | Code | Issues | People | AI Lab  │
│  Trending | Bookmarks | History                                │
└────────────────────────────────────────────────────────────────┘
```

---

## MASTER SEARCH BAR

The central interaction. Supports multiple search modes:

```
[🔍 Search GitHub — try "react table virtualization" or "python rate limiter"    ▼]
```

**Smart query parser** — auto-detects what the user wants:
```javascript
function parseSmartQuery(query) {
  // Error message pasted → search for solutions
  if (query.match(/error|exception|TypeError|SyntaxError|cannot read|undefined is not/i))
    return { mode: 'error_solver', query };

  // URL pasted → analyze that repo
  if (query.match(/github\.com\/[\w-]+\/[\w-]+/))
    return { mode: 'repo_analyzer', url: query };

  // "how to X" → find code examples and tutorials
  if (query.match(/^how (to|do|can|should)/i))
    return { mode: 'how_to', query };

  // "best library for X" → ranked library comparison
  if (query.match(/best (library|package|tool|framework|module) for/i))
    return { mode: 'library_finder', query };

  // "npm package name" or "pip package name" → package deep dive
  if (query.match(/^(npm|pip|yarn|cargo|gem|go get)\s+\w+/i))
    return { mode: 'package_finder', query };

  // "username/repo" → direct repo lookup
  if (query.match(/^[\w-]+\/[\w-]+$/))
    return { mode: 'direct_repo', query };

  // Default → multi-mode search
  return { mode: 'universal', query };
}
```

**Search mode chips** (shown below search bar):
```
Mode: [🔍 Universal] [🐛 Error Solver] [📦 Library Finder] [💻 Code Search]
      [👤 Developer] [🏢 Organization] [🔥 Trending] [📖 How-To]
```

**Language filter** (pill buttons):
```
[All] [JavaScript] [TypeScript] [Python] [Rust] [Go] [Java] [C++]
[C#] [PHP] [Ruby] [Swift] [Kotlin] [Dart] [Shell] [HTML/CSS]
```

**Time filter:**
```
[Any time] [Today] [This week] [This month] [This year]
```

---

## TAB 1 — UNIVERSAL SEARCH + AI SOLUTION RANKING

The flagship tab. When user searches, run MULTIPLE GitHub API queries simultaneously
then use Claude to rank and synthesize the results.

### Parallel Search Execution:
```javascript
async function universalSearch(query, options = {}) {
  const searches = await Promise.allSettled([
    searchRepositories(query, options),
    searchCode(query, options),
    searchIssues(query, options),
    searchDiscussions(query, options),
    searchUsers(query, options),
  ]);

  const results = {
    repos:       searches[0].value || [],
    codeResults: searches[1].value || [],
    issues:      searches[2].value || [],
    discussions: searches[3].value || [],
    users:       searches[4].value || [],
  };

  // Run AI ranking if key is available
  if (getAnthropicKey()) {
    results.aiAnalysis = await rankWithAI(query, results);
  }

  return results;
}
```

### GitHub Search API Calls:
```javascript
// Repositories
async function searchRepositories(query, { language, sort='stars', order='desc', perPage=10 } = {}) {
  const q = [
    query,
    language ? `language:${language}` : '',
  ].filter(Boolean).join(' ');

  return githubGet(`/search/repositories?q=${encodeURIComponent(q)}&sort=${sort}&order=${order}&per_page=${perPage}`);
}

// Code search
async function searchCode(query, { language, filename, extension } = {}) {
  const q = [
    query,
    language ? `language:${language}` : '',
    filename  ? `filename:${filename}` : '',
    extension ? `extension:${extension}` : '',
  ].filter(Boolean).join(' ');

  return githubGet(`/search/code?q=${encodeURIComponent(q)}&per_page=10`);
}

// Issues and PRs
async function searchIssues(query, { state='open', type='issue' } = {}) {
  const q = `${query} type:${type} state:${state}`;
  return githubGet(`/search/issues?q=${encodeURIComponent(q)}&sort=reactions&order=desc&per_page=10`);
}

// Commits
async function searchCommits(query) {
  return githubGet(`/search/commits?q=${encodeURIComponent(query)}&sort=committer-date&per_page=10`);
}

// GitHub Discussions (GraphQL)
async function searchDiscussions(query, repoOwner, repoName) {
  const gql = `
    query {
      repository(owner: "${repoOwner}", name: "${repoName}") {
        discussions(first: 10, filterBy: { answered: true }) {
          nodes {
            title url body createdAt upvoteCount
            answer { body author { login } }
            comments { totalCount }
          }
        }
      }
    }`;
  return githubGraphQL(gql);
}
```

### AI Solution Ranker:
```javascript
async function rankWithAI(query, searchResults) {
  const prompt = `You are a senior software engineer helping another developer find the best solution.

DEVELOPER'S QUESTION / PROBLEM:
"${query}"

SEARCH RESULTS FROM GITHUB:

TOP REPOSITORIES:
${searchResults.repos.slice(0, 5).map(r => `
- ${r.full_name} ★${r.stargazers_count}
  ${r.description}
  Language: ${r.language} | Forks: ${r.forks_count}
  Last updated: ${r.updated_at}
  Topics: ${r.topics?.join(', ')}
`).join('')}

TOP CODE EXAMPLES:
${searchResults.codeResults.slice(0, 5).map(c => `
- ${c.repository.full_name}: ${c.path}
  URL: ${c.html_url}
`).join('')}

TOP ISSUES/DISCUSSIONS:
${searchResults.issues.slice(0, 5).map(i => `
- [${i.state.toUpperCase()}] ${i.title}
  ${i.comments} comments | ${i.reactions?.['+1'] || 0} upvotes
  ${i.html_url}
`).join('')}

Provide a JSON response only:
{
  "best_solution": {
    "type": "library|code_pattern|architecture|workaround",
    "headline": "one sentence direct answer",
    "explanation": "2-3 paragraphs explaining the best approach",
    "recommended_repo": "owner/name or null",
    "recommended_repo_reason": "why this one specifically",
    "code_example": "short code snippet showing the approach (or null)",
    "language": "javascript|python|etc",
    "caveats": ["any important gotchas"],
    "alternatives": [
      { "name": "Alternative A", "when_to_use": "...", "tradeoff": "..." }
    ]
  },
  "ranked_repos": [
    {
      "repo": "owner/name",
      "rank": 1,
      "score": 95,
      "why": "specific reason this is highly ranked for this query",
      "best_for": "specific use case"
    }
  ],
  "related_searches": ["5 related queries the developer might also want to search"],
  "confidence": 0-100
}`;

  const response = await callClaudeAPI(prompt);
  return JSON.parse(response);
}
```

### AI Solution Card (shown above all other results):
```
┌────────────────────────────────────────────────────────────────────┐
│  🤖 AI SOLUTION ANALYSIS                              Confidence: 94%│
│  ──────────────────────────────────────────────────────────────────│
│                                                                    │
│  BEST APPROACH FOR "react table with 100k rows"                   │
│  ──────────────────────────────────────────────────────────────────│
│  Use TanStack Table (formerly React Table) with windowing via     │
│  TanStack Virtual. This combination handles millions of rows      │
│  with minimal DOM nodes.                                          │
│                                                                    │
│  For most use cases, TanStack Virtual renders only visible rows,  │
│  giving 60fps scrolling even with 100,000+ records. Pair with    │
│  server-side pagination for datasets over 1M rows.               │
│                                                                    │
│  ⭐ RECOMMENDED:  TanStack/table  ★24,800  TypeScript             │
│  "Because it handles virtualization natively with zero deps"      │
│                                                                    │
│  QUICK START:                                                      │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ npm install @tanstack/react-table @tanstack/react-virtual    │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ⚠ CAVEATS: Virtualization adds complexity — avoid for < 1k rows  │
│                                                                    │
│  ALTERNATIVES:                                                     │
│  AG Grid → when you need built-in Excel-like features             │
│  React Virtualized → older but more battle-tested                 │
│                                                                    │
│  RELATED SEARCHES:                                                 │
│  [react table sorting] [tanstack virtual docs] [AG Grid react]    │
└────────────────────────────────────────────────────────────────────┘
```

### Repository Result Card:
```
┌───────────────────────────────────────────────────────────────────┐
│  📦  tanstack / table                              ★ 24,800       │
│  TypeScript  ·  MIT License  ·  Updated 2 days ago               │
│                                                                   │
│  Headless UI for building powerful tables & datagrids for TS/JS  │
│  React, Solid, Vue, Svelte and TS/JS                             │
│                                                                   │
│  [react] [table] [datagrid] [typescript] [virtualization]        │
│                                                                   │
│  ◉ 847 open issues  ·  12,400 forks  ·  239 contributors        │
│                                                                   │
│  [Open Repo] [Analyze] [Bookmark] [Find Issues] [See Code]       │
└───────────────────────────────────────────────────────────────────┘
```

---

## TAB 2 — ERROR SOLVER

Paste any error message and get targeted solutions from GitHub issues, Stack Overflow
discussions, and commit history.

### Error Input:
```
┌────────────────────────────────────────────────────────────────────┐
│  PASTE ERROR MESSAGE OR STACK TRACE                                │
│  ──────────────────────────────────────────────────────────────────│
│  TypeError: Cannot read properties of undefined (reading 'map')   │
│    at ProductList (ProductList.jsx:23:18)                         │
│    at renderWithHooks (react-dom.development.js:14985:18)         │
│    at mountIndeterminateComponent (react-dom.development.js:17811)│
│                                                                    │
│  [Language: JavaScript ▼]  [Framework: React ▼]  [🔍 Solve It]   │
└────────────────────────────────────────────────────────────────────┘
```

### Error Analysis Engine:
```javascript
async function solveError(errorText, language, framework) {
  // Step 1: Extract key error signature
  const errorSignature = extractErrorSignature(errorText);

  // Step 2: Search GitHub issues for this exact error
  const issueResults = await Promise.allSettled([
    searchIssues(`"${errorSignature}" ${framework}`, { state: 'closed' }),
    searchIssues(`"${errorSignature}" ${framework}`, { state: 'open' }),
    searchIssues(errorSignature, { state: 'closed' }),
    searchCode(errorSignature, { language }),
  ]);

  // Step 3: Send to AI for synthesis
  const aiSolution = await solveErrorWithAI(errorText, language, framework, issueResults);

  return { errorSignature, issueResults, aiSolution };
}

function extractErrorSignature(errorText) {
  // Extract the core error message without file paths and line numbers
  // "TypeError: Cannot read properties of undefined (reading 'map')" 
  // → "Cannot read properties of undefined reading map"
  return errorText
    .split('\n')[0]                          // First line only
    .replace(/\(.*?\)/g, '')               // Remove parenthetical paths
    .replace(/at .*/g, '')                 // Remove stack frames
    .replace(/['"]/g, '')                  // Remove quotes
    .replace(/\s+/g, ' ')                  // Normalize spaces
    .trim()
    .slice(0, 150);                        // Limit length for API
}
```

### AI Error Solution:
```javascript
async function solveErrorWithAI(errorText, language, framework, githubResults) {
  const prompt = `You are an expert ${language} ${framework} developer debugging an error.

ERROR:
\`\`\`
${errorText}
\`\`\`

RELATED GITHUB ISSUES FOUND:
${githubResults.flatMap(r => r.value?.items || []).slice(0, 8).map(i => `
- [${i.state}] ${i.title} (${i.comments} comments, ${i.reactions?.['+1'] || 0} upvotes)
  ${i.body?.slice(0, 200)}...
`).join('')}

Respond in JSON only:
{
  "root_cause": "exact explanation of WHY this error occurs",
  "fix": {
    "description": "what to do to fix it",
    "code_before": "code that causes the error (if identifiable)",
    "code_after": "corrected code",
    "language": "${language}"
  },
  "common_causes": [
    { "cause": "...", "how_to_check": "...", "how_to_fix": "..." }
  ],
  "prevention": "how to prevent this error in the future",
  "related_issues": [
    { "title": "...", "url": "...", "relevance": "why this issue is relevant" }
  ],
  "documentation_links": ["relevant official docs URLs"],
  "confidence": 0-100
}`;

  return JSON.parse(await callClaudeAPI(prompt));
}
```

### Error Solution Display:
```
🐛 ERROR SOLVER — TypeError: Cannot read properties of undefined
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROOT CAUSE
Your component is trying to call .map() on data that hasn't
loaded yet. The component renders before the async data fetch
completes, so the prop is undefined on first render.

THE FIX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BEFORE (broken):
  const products = props.products;
  return products.map(p => <div>{p.name}</div>);

AFTER (fixed):
  const products = props.products ?? [];
  return products.map(p => <div>{p.name}</div>);
  // OR:
  if (!products) return <LoadingSpinner />;

ALSO CHECK:
  1. Is the parent component passing the right prop name?
  2. Is your API call completing before render?
  3. Did you initialize state as [] not undefined?

RELATED GITHUB ISSUES (47 found):
  ✓ [CLOSED] "Cannot read map of undefined when fetching data" — 234 comments
  ✓ [CLOSED] "TypeError on undefined props in functional component" — 89 comments
  ○ [OPEN]   "Race condition with useEffect and map" — 23 comments
```

---

## TAB 3 — REPOSITORY ANALYZER

Deep-dive analysis of any GitHub repository.

### Input:
```
[https://github.com/facebook/react                    ] [Analyze]
 — or paste owner/repo format — 
```

### Analysis Engine:
```javascript
async function analyzeRepository(ownerRepo) {
  const [owner, repo] = ownerRepo.split('/');

  const [
    repoData,
    readme,
    languages,
    contributors,
    releases,
    issues,
    pullRequests,
    commits,
    topics,
    community,
    traffic,
    dependents,
  ] = await Promise.allSettled([
    githubGet(`/repos/${owner}/${repo}`),
    githubGet(`/repos/${owner}/${repo}/readme`),
    githubGet(`/repos/${owner}/${repo}/languages`),
    githubGet(`/repos/${owner}/${repo}/contributors?per_page=10`),
    githubGet(`/repos/${owner}/${repo}/releases?per_page=5`),
    githubGet(`/repos/${owner}/${repo}/issues?state=open&per_page=20`),
    githubGet(`/repos/${owner}/${repo}/pulls?state=open&per_page=10`),
    githubGet(`/repos/${owner}/${repo}/commits?per_page=20`),
    githubGet(`/repos/${owner}/${repo}/topics`),
    githubGet(`/repos/${owner}/${repo}/community/profile`),
    githubGet(`/repos/${owner}/${repo}/traffic/views`),
    githubGet(`/repos/${owner}/${repo}/traffic/clones`),
  ]);

  // Decode README from base64
  const readmeContent = readme.value?.content
    ? atob(readme.value.content.replace(/\n/g, ''))
    : 'No README found';

  // Send to AI for full analysis
  const aiAnalysis = await analyzeRepoWithAI(
    repoData.value, readmeContent, languages.value,
    contributors.value, issues.value, commits.value
  );

  return { repoData, readme: readmeContent, languages, contributors,
           releases, issues, pullRequests, commits, aiAnalysis };
}
```

### AI Repository Analysis:
```javascript
async function analyzeRepoWithAI(repo, readme, languages, contributors, issues, commits) {
  const prompt = `You are a senior engineer evaluating a GitHub repository.

REPOSITORY: ${repo.full_name}
Stars: ${repo.stargazers_count} | Forks: ${repo.forks_count}
Created: ${repo.created_at} | Last push: ${repo.pushed_at}
Description: ${repo.description}
License: ${repo.license?.name}

LANGUAGE BREAKDOWN:
${Object.entries(languages || {}).map(([lang, bytes]) => `${lang}: ${bytes}`).join('\n')}

TOP CONTRIBUTORS (${contributors?.length}):
${contributors?.slice(0, 5).map(c => `${c.login}: ${c.contributions} commits`).join('\n')}

RECENT COMMITS:
${commits?.slice(0, 5).map(c => `${c.commit.author.date.slice(0,10)}: ${c.commit.message.slice(0,80)}`).join('\n')}

OPEN ISSUES (${repo.open_issues_count} total, showing ${issues?.length}):
${issues?.slice(0, 5).map(i => `- ${i.title} (${i.comments} comments)`).join('\n')}

README EXCERPT (first 2000 chars):
${readme.slice(0, 2000)}

Provide deep analysis in JSON only:
{
  "health_score": 0-100,
  "health_breakdown": {
    "activity": { "score": 0-100, "notes": "..." },
    "community": { "score": 0-100, "notes": "..." },
    "documentation": { "score": 0-100, "notes": "..." },
    "maintenance": { "score": 0-100, "notes": "..." },
    "adoption": { "score": 0-100, "notes": "..." }
  },
  "summary": "2-3 sentence executive summary",
  "what_it_does": "plain English explanation",
  "architecture_insights": "what the code structure reveals about the project",
  "use_cases": ["specific use case 1", "specific use case 2"],
  "strengths": ["specific strength with evidence"],
  "concerns": ["specific concern with evidence"],
  "bus_factor": "assessment of contributor concentration risk",
  "production_readiness": "PRODUCTION_READY|STABLE|EXPERIMENTAL|ABANDONED",
  "ideal_for": "specific profile of developer who should use this",
  "avoid_if": "specific situations where this is wrong choice",
  "getting_started": "practical first step to using this repo",
  "notable_issues": ["significant open issues worth knowing"],
  "comparison_repos": ["similar repositories to compare"],
  "verdict": "HIGHLY_RECOMMENDED|RECOMMENDED|SITUATIONAL|AVOID"
}`;

  return JSON.parse(await callClaudeAPI(prompt));
}
```

### Repository Dashboard Display:
```
📦 FACEBOOK / REACT                                      ★ 224,000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HEALTH SCORE:  96 / 100   ████████████████████████████████████████

Activity     ██████████  98   Community    █████████░  89
Docs         █████████░  92   Maintenance  ██████████  97
Adoption     ██████████  99

AI SUMMARY ──────────────────────────────────────────────────────
React is the most widely adopted UI library in the world.
Backed by Meta, with 1,600+ contributors and multiple commits
daily, it is arguably the most production-ready open source
JavaScript project in existence.

PRODUCTION READINESS:  ✓ PRODUCTION READY
VERDICT:               ★ HIGHLY RECOMMENDED

USE CASES ───────────────────────────────────────────────────────
• Building complex interactive UIs with predictable state
• Large team projects where component isolation matters
• Projects needing a massive ecosystem of third-party libraries

CONCERNS ────────────────────────────────────────────────────────
△ Bundle size can grow large without code splitting
△ High churn in adjacent ecosystem (state management, routing)
△ Learning curve for junior developers re: hooks and lifecycle

STATS ───────────────────────────────────────────────────────────
  Forks        43,800     License      MIT
  Open Issues  1,247      Contributors 1,640
  Releases     142        Language     JavaScript (94%)
  Created      May 2013   Last Push    Yesterday

TOP CONTRIBUTORS ────────────────────────────────────────────────
  gaearon       8,247 commits   sophiebits    2,100 commits
  sebmarkbage   3,800 commits   acdlite       1,940 commits

RECENT RELEASES ─────────────────────────────────────────────────
  v19.0.0       2 weeks ago    — Major: concurrent features
  v18.3.1       3 months ago   — Patch: bug fixes
  v18.2.0       8 months ago   — Minor: new hooks

[View README] [Browse Code] [Open Issues] [Find Solutions] [Bookmark]
```

---

## TAB 4 — CODE SEARCH + EXAMPLES

Find real-world code examples from production GitHub repositories.

### Search Interface:
```
Find code that does:  [validates email with regex in Python         ]  [Search]

Show me:  ○ Functions  ○ Classes  ○ Files  ○ Test cases  ● All

Language: [Python ▼]   Min stars on repo: [100 ▼]   [Search Code]
```

### Code Result Card:
```javascript
function renderCodeResult(result) {
  return `
  <div class="code-result-card">
    <div class="code-result-header">
      <span class="repo-name">📦 ${result.repository.full_name}</span>
      <span class="file-path">📄 ${result.path}</span>
      <span class="repo-stars">★ ${formatStars(result.repository.stargazers_count)}</span>
    </div>
    <pre><code class="language-${detectLanguage(result.path)}">
      ${result.text_matches?.[0]?.fragment || 'Click to view full file'}
    </code></pre>
    <div class="code-result-actions">
      <button onclick="viewFullFile('${result.url}')">View Full File</button>
      <button onclick="explainCode('${result.sha}')">🤖 Explain This</button>
      <button onclick="copyCode()">Copy</button>
      <button onclick="openInGithub('${result.html_url}')">Open on GitHub</button>
    </div>
  </div>`;
}
```

### AI Code Explainer:
When user clicks "Explain This" on any code snippet:
```javascript
async function explainCode(code, language) {
  const prompt = `Explain this ${language} code clearly for a developer:

\`\`\`${language}
${code}
\`\`\`

Provide:
1. What this code does (1 sentence)
2. How it works (step by step, plain English)
3. Any notable patterns or techniques used
4. Potential improvements or edge cases to handle
5. A usage example

Be concise. Developers hate walls of text.`;

  return callClaudeAPI(prompt);
}
```

### Code Pattern Finder:
User describes what they want to accomplish → AI generates the optimal search queries:
```javascript
async function generateSearchQueries(intent, language) {
  const prompt = `A developer wants to: "${intent}"
Language: ${language}

Generate 5 optimal GitHub code search queries that would find
the best real-world examples. Respond with JSON array only:
["query1", "query2", "query3", "query4", "query5"]

Queries should be specific enough to find relevant code but broad
enough to get results. Use GitHub search syntax: language:${language}
filename extensions, specific function names, patterns, etc.`;

  const queries = JSON.parse(await callClaudeAPI(prompt));
  return Promise.all(queries.map(q => searchCode(q)));
}
```

---

## TAB 5 — ISSUES + DISCUSSIONS FINDER

Find answers from GitHub Issues, Pull Requests, and Discussions — the goldmine that
most developers don't search systematically.

### Smart Issue Search:
```javascript
async function findIssues(query, options = {}) {
  const {
    state = 'all',       // open, closed, all
    type = 'issue',      // issue, pr
    includeComments = true,
    repo = null,         // narrow to specific repo
    minReactions = 0,
  } = options;

  let q = query;
  if (repo)           q += ` repo:${repo}`;
  if (state !== 'all') q += ` state:${state}`;
  if (minReactions > 0) q += ` reactions:>=${minReactions}`;
  q += ` type:${type}`;

  const results = await githubGet(
    `/search/issues?q=${encodeURIComponent(q)}&sort=reactions&order=desc&per_page=20`
  );

  if (includeComments) {
    // Fetch top comments for each issue
    const enriched = await Promise.all(
      results.items.slice(0, 5).map(async issue => ({
        ...issue,
        topComments: await fetchTopComments(issue.number, issue.repository_url),
      }))
    );
    results.items = enriched;
  }

  return results;
}
```

### Issue Result with AI Summary:
```javascript
async function summarizeIssueSolution(issue, comments) {
  const prompt = `Summarize the solution in this GitHub issue thread.

ISSUE TITLE: ${issue.title}
ISSUE BODY: ${issue.body?.slice(0, 500)}

COMMENTS (${comments.length} total):
${comments.slice(0, 10).map(c => `
--- ${c.user.login} (${c.reactions?.['+1'] || 0} 👍):
${c.body?.slice(0, 400)}
`).join('')}

Provide JSON only:
{
  "is_resolved": true/false,
  "solution_summary": "one paragraph plain English explanation of the solution",
  "key_solution": "the actual fix or answer (code if applicable)",
  "code_snippet": "solution code if present, or null",
  "who_solved_it": "username who provided the accepted solution",
  "additional_context": "any important caveats or alternatives mentioned"
}`;

  return JSON.parse(await callClaudeAPI(prompt));
}
```

### Issue Display:
```
🔵 OPEN ISSUE — tanstack/table #847
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"How to maintain scroll position when data refreshes?"
👍 142 reactions · 87 comments · Opened 4 months ago

🤖 AI SUMMARY:
The accepted solution uses the scrollToIndex method from
TanStack Virtual combined with storing the scroll offset
in a ref. On data refresh, you restore the offset using
rowVirtualizer.scrollToIndex(savedIndex, { align: 'start' }).

KEY SOLUTION CODE:
  const savedIndex = useRef(0);
  // Before refresh:
  savedIndex.current = rowVirtualizer.getVirtualItems()[0]?.index;
  // After refresh:
  rowVirtualizer.scrollToIndex(savedIndex.current);

[View Full Thread] [Copy Solution] [Open in GitHub]
```

### Discussions Aggregator:
Search GitHub Discussions (Q&A format) across popular repositories:
```javascript
async function searchDiscussionsAcrossRepos(query, repos) {
  const gqlQueries = repos.map(repo => {
    const [owner, name] = repo.split('/');
    return `
      ${name.replace(/-/g, '_')}: repository(owner: "${owner}", name: "${name}") {
        discussions(first: 5, filterBy: { answered: true }) {
          nodes {
            title url body createdAt upvoteCount
            answer { body author { login } upvoteCount }
          }
        }
      }`;
  });

  const gql = `query { ${gqlQueries.join('\n')} }`;
  return githubGraphQL(gql);
}
```

---

## TAB 6 — DEVELOPER / ORGANIZATION PROFILES

### Developer Profile Analyzer:
```javascript
async function analyzeDeveloper(username) {
  const [user, repos, events, gists, followers] = await Promise.allSettled([
    githubGet(`/users/${username}`),
    githubGet(`/users/${username}/repos?sort=stars&per_page=30`),
    githubGet(`/users/${username}/events/public?per_page=50`),
    githubGet(`/users/${username}/gists?per_page=10`),
    githubGet(`/users/${username}/followers?per_page=5`),
  ]);

  // Calculate contribution activity from events
  const activityByType = groupBy(events.value || [], e => e.type);

  // Language fingerprint from repos
  const languageUsage = (repos.value || []).reduce((acc, repo) => {
    if (repo.language) acc[repo.language] = (acc[repo.language] || 0) + repo.stargazers_count;
    return acc;
  }, {});

  const aiProfile = await profileDeveloperWithAI(user.value, repos.value, activityByType, languageUsage);

  return { user, repos, events, languageUsage, aiProfile };
}
```

### AI Developer Profile:
```javascript
async function profileDeveloperWithAI(user, repos, activity, languages) {
  const topRepos = repos?.slice(0, 10).map(r => `${r.name} ★${r.stargazers_count}: ${r.description}`).join('\n');

  const prompt = `Analyze this GitHub developer profile:

USERNAME: ${user?.login}
BIO: ${user?.bio}
LOCATION: ${user?.location}
COMPANY: ${user?.company}
PUBLIC REPOS: ${user?.public_repos}
FOLLOWERS: ${user?.followers}
JOINED: ${user?.created_at?.slice(0, 4)}

TOP REPOSITORIES:
${topRepos}

LANGUAGE USAGE (by stars):
${Object.entries(languages).sort(([,a],[,b]) => b-a).slice(0, 8).map(([l, s]) => `${l}: ${s} stars`).join('\n')}

RECENT ACTIVITY TYPES:
${Object.entries(activity).map(([type, events]) => `${type}: ${events.length}`).join('\n')}

Respond in JSON only:
{
  "expertise_level": "JUNIOR|MID|SENIOR|PRINCIPAL|LEGENDARY",
  "primary_stack": ["top 3-4 technologies"],
  "specialization": "what this developer primarily builds",
  "activity_pattern": "description of how they contribute (creator, contributor, maintainer, etc)",
  "influence_score": 0-100,
  "notable_contributions": ["specific achievements from their repos"],
  "learning_trajectory": "what their recent activity suggests they are focused on",
  "best_contact_reason": "what you would realistically reach out to them for",
  "summary": "2 sentence professional profile"
}`;

  return JSON.parse(await callClaudeAPI(prompt));
}
```

### Developer Display:
```
👤 GAEARON (DAN ABRAMOV)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Working on React @Meta · Previously @facebook
📍 London, UK  ·  Joined 2011  ·  ★ Influence: 99/100

EXPERTISE:  ◉ LEGENDARY
PRIMARY:    JavaScript, TypeScript, React
SPECIALTY:  JavaScript runtime internals, React architecture

AI SUMMARY:
Creator of Redux and Create React App. Core React team at Meta.
One of the most influential JavaScript developers alive, with
contributions that shaped modern web development globally.

STATS ───────────────────────────────────────────────────
  Public Repos      65       Followers     81,200
  Stars Received    72,000   Following     171
  Public Gists      38       Joined        2011

TOP REPOS ───────────────────────────────────────────────
  overreacted.io     ★ 7,200  Personal blog
  just-javascript    ★ 6,800  JS learning course
  redux              ★ 60,400 State management (co-created)

RECENT ACTIVITY ─────────────────────────────────────────
  Pushes: 24 this month · Issues: 47 opened · Reviews: 31

[Follow on GitHub] [See All Repos] [Find Their Packages] [Bookmark]
```

---

## TAB 7 — AI LAB

A free-form AI workspace for complex GitHub-related tasks.

### Modes:

**Mode 1 — Codebase Q&A:**
User pastes a GitHub URL → AI reads the README, top files, and structure → answers questions about it.

```javascript
async function codebaseQA(repoUrl, question) {
  const [owner, repo] = parseGithubUrl(repoUrl);

  // Fetch key files
  const [readme, packageJson, mainFile, structure] = await Promise.allSettled([
    fetchFileContent(owner, repo, 'README.md'),
    fetchFileContent(owner, repo, 'package.json'),
    findMainFile(owner, repo),
    githubGet(`/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`),
  ]);

  const context = `
REPOSITORY: ${owner}/${repo}
FILE TREE: ${structure.value?.tree?.slice(0,50).map(f => f.path).join('\n')}
README: ${readme.value?.slice(0, 3000)}
PACKAGE.JSON: ${packageJson.value?.slice(0, 1000)}
MAIN FILE: ${mainFile?.slice(0, 2000)}`;

  const prompt = `${context}

DEVELOPER QUESTION: ${question}

Answer specifically and practically. Cite exact file paths or code when relevant.`;

  return callClaudeAPI(prompt);
}
```

**Mode 2 — Library Comparison:**
User names 2-5 libraries → AI compares them across dimensions.

```javascript
async function compareLibraries(libraryNames) {
  // Fetch all repo data in parallel
  const repoData = await Promise.all(
    libraryNames.map(async name => {
      const searchResult = await searchRepositories(name, { sort: 'stars', perPage: 1 });
      const topRepo = searchResult.items[0];
      if (!topRepo) return null;

      const [repo, releases, issues] = await Promise.all([
        githubGet(`/repos/${topRepo.full_name}`),
        githubGet(`/repos/${topRepo.full_name}/releases?per_page=3`),
        githubGet(`/repos/${topRepo.full_name}/issues?state=open&per_page=5`),
      ]);
      return { name, repo: repo, releases: releases, issues: issues };
    })
  );

  // AI comparison
  const prompt = `Compare these ${libraryNames.length} libraries for a developer choosing between them:

${repoData.filter(Boolean).map(d => `
LIBRARY: ${d.name} (${d.repo.full_name})
Stars: ${d.repo.stargazers_count} | Forks: ${d.repo.forks_count}
Open Issues: ${d.repo.open_issues_count}
Last Release: ${d.releases[0]?.published_at?.slice(0,10)}
Description: ${d.repo.description}
License: ${d.repo.license?.name}
Language: ${d.repo.language}
`).join('\n')}

Provide JSON comparison only:
{
  "winner": "name of overall recommended choice",
  "winner_reason": "specific, concrete reason",
  "comparison_table": [
    {
      "dimension": "Bundle Size|Performance|Learning Curve|Community|Documentation|Maintenance|Flexibility",
      "scores": { "LibraryA": "EXCELLENT|GOOD|FAIR|POOR", "LibraryB": "..." },
      "notes": "specific insight about this dimension"
    }
  ],
  "use_case_matrix": [
    { "scenario": "specific use case", "best_choice": "library name", "reason": "..." }
  ],
  "migration_complexity": "how hard it is to switch from one to another",
  "ecosystem_lock_in": "how much each ties you to a specific ecosystem",
  "verdict": "nuanced final recommendation with conditions"
}`;

  return JSON.parse(await callClaudeAPI(prompt));
}
```

**Mode 3 — PR / Commit Analyzer:**
Paste a PR URL → AI summarizes the changes, evaluates code quality, and identifies risks.

```javascript
async function analyzePR(prUrl) {
  const { owner, repo, prNumber } = parsePRUrl(prUrl);

  const [pr, files, reviews, comments] = await Promise.all([
    githubGet(`/repos/${owner}/${repo}/pulls/${prNumber}`),
    githubGet(`/repos/${owner}/${repo}/pulls/${prNumber}/files`),
    githubGet(`/repos/${owner}/${repo}/pulls/${prNumber}/reviews`),
    githubGet(`/repos/${owner}/${repo}/pulls/${prNumber}/comments`),
  ]);

  const filesSummary = files.map(f => ({
    filename:  f.filename,
    status:    f.status,    // added, removed, modified, renamed
    additions: f.additions,
    deletions: f.deletions,
    patch:     f.patch?.slice(0, 500), // First 500 chars of diff
  }));

  const prompt = `Analyze this GitHub Pull Request:

PR TITLE: ${pr.title}
PR BODY: ${pr.body?.slice(0, 800)}
AUTHOR: ${pr.user.login}
STATE: ${pr.state} | Draft: ${pr.draft}
Files changed: ${files.length} | Additions: ${pr.additions} | Deletions: ${pr.deletions}

FILES CHANGED:
${filesSummary.map(f => `${f.status.toUpperCase()} ${f.filename} (+${f.additions}/-${f.deletions})`).join('\n')}

DIFFS (first 500 chars each):
${filesSummary.slice(0, 5).map(f => `\n--- ${f.filename} ---\n${f.patch || 'binary file'}`).join('\n')}

REVIEW SUMMARY: ${reviews.length} reviews — ${reviews.filter(r => r.state === 'APPROVED').length} approved

Provide JSON only:
{
  "summary": "2-3 sentence plain English summary of what this PR does",
  "impact": "BREAKING|MAJOR|MINOR|PATCH|CHORE",
  "risk_level": "HIGH|MEDIUM|LOW",
  "code_quality_assessment": "specific observations about the code changes",
  "potential_issues": ["specific concern 1", "specific concern 2"],
  "testing_gaps": ["what should be tested that may not be"],
  "security_considerations": ["any security-relevant changes to flag"],
  "good_patterns": ["things done well in this PR"],
  "suggested_questions": ["questions a reviewer should ask"]
}`;

  return JSON.parse(await callClaudeAPI(prompt));
}
```

**Mode 4 — Tech Stack Recommender:**
User describes their project → AI recommends the best GitHub-hosted tools.

```javascript
async function recommendTechStack(projectDescription, constraints = {}) {
  const prompt = `A developer needs a tech stack recommendation.

PROJECT: ${projectDescription}
CONSTRAINTS: ${JSON.stringify(constraints)}
(constraints might include: team size, performance requirements,
hosting environment, budget, existing stack, timeline)

Recommend a complete, opinionated tech stack. For each choice,
name a specific GitHub repository they should use.

Respond in JSON only:
{
  "stack_name": "descriptive name for this stack",
  "suitable_for": "specific project type this fits",
  "components": [
    {
      "category": "Frontend|Backend|Database|Auth|Storage|CI-CD|Testing|etc",
      "choice": "specific technology name",
      "github_repo": "owner/repo",
      "github_stars": "approximate",
      "reason": "specific reason for choosing this over alternatives",
      "alternative": "next best option if this doesn't fit"
    }
  ],
  "total_complexity": "LOW|MEDIUM|HIGH",
  "time_to_productive": "how long to get a dev env running",
  "tradeoffs": ["specific tradeoff accepted with this stack"],
  "getting_started_order": ["ordered list of what to set up first"]
}`;

  return JSON.parse(await callClaudeAPI(prompt));
}
```

---

## TAB 8 — TRENDING

Live-updating trending repositories from GitHub.

### Trending Fetcher:
GitHub removed their trending API — use web scraping via CORS proxy:

```javascript
async function fetchTrending(language = '', since = 'daily') {
  // GitHub trending page (scraped via CORS proxy)
  const url = `https://github.com/trending/${language}?since=${since}`;
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;

  const response = await fetch(proxyUrl);
  const data = await response.json();
  const html = data.contents;

  // Parse trending repos from HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const repoArticles = doc.querySelectorAll('article.Box-row');

  return Array.from(repoArticles).map(article => {
    const nameEl  = article.querySelector('h2 a');
    const descEl  = article.querySelector('p');
    const starsEl = article.querySelector('[href$="/stargazers"]');
    const langEl  = article.querySelector('[itemprop="programmingLanguage"]');
    const gainEl  = article.querySelector('.float-sm-right');

    return {
      full_name:    nameEl?.getAttribute('href')?.slice(1),
      description: descEl?.textContent?.trim(),
      stars:        starsEl?.textContent?.trim().replace(/,/g, ''),
      language:     langEl?.textContent?.trim(),
      stars_today:  gainEl?.textContent?.trim(),
    };
  }).filter(r => r.full_name);
}
```

### Trending Display:
```
🔥 TRENDING TODAY           [Language ▼] [Daily | Weekly | Monthly]

#1  ████████████████████████████████████████████████████  +2,847 ★ today
    vercel / ai          ★ 8,240
    TypeScript · MIT · The AI SDK for TypeScript and React
    [Analyze] [Bookmark] [Find Issues]

#2  ████████████████████████████████████████████  +1,924 ★ today
    microsoft / playwright   ★ 61,400
    TypeScript · Apache 2.0 · Browser automation framework
    [Analyze] [Bookmark] [Find Issues]
```

### AI Trending Insight:
Daily AI-generated insight about why certain repos are trending:
```javascript
async function analyzeTrendingThemes(trendingRepos) {
  const prompt = `Today's trending GitHub repos (${new Date().toDateString()}):
${trendingRepos.slice(0, 10).map(r => `- ${r.full_name}: ${r.description} (+${r.stars_today} stars)`).join('\n')}

Identify patterns and explain:
1. What major trend or theme is driving today's trending?
2. What does this tell us about where the tech industry is moving?
3. Which single trending repo is most worth exploring and why?

Keep it to 3 short paragraphs. Be specific and opinionated.`;

  return callClaudeAPI(prompt, { system: 'You are a senior developer with excellent pattern recognition for technology trends. Be direct and opinionated.' });
}
```

---

## TAB 9 — BOOKMARKS + HISTORY

### Bookmarks:
- Star any repo, issue, code snippet, developer, or AI analysis result
- Organize into collections: "Auth Libraries", "Interview Prep", "Client Projects"
- Add personal notes to each bookmark
- Export as JSON or markdown list

### Search History:
- Every search stored with timestamp and result count
- Quick re-run any previous search
- See which searches yielded the most useful AI analyses
- Clear history or individual entries

---

## GITHUB API LAYER

Centralized API handler with rate limit management:

```javascript
const GitHubAPI = {
  BASE: 'https://api.github.com',
  GRAPHQL: 'https://api.github.com/graphql',

  getToken() {
    const stored = localStorage.getItem('github_pat');
    return stored ? deobfuscate(stored) : null;
  },

  getHeaders() {
    const token = this.getToken();
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  },

  async get(endpoint) {
    const response = await fetch(`${this.BASE}${endpoint}`, {
      headers: this.getHeaders(),
    });

    // Track rate limit
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset     = response.headers.get('X-RateLimit-Reset');
    this.updateRateLimitUI(remaining, reset);

    if (response.status === 403) throw new Error('GitHub rate limit exceeded. Add a Personal Access Token in Settings for 5,000 requests/hour.');
    if (response.status === 404) throw new Error(`Not found: ${endpoint}`);
    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);

    return response.json();
  },

  async graphql(query, variables = {}) {
    const token = this.getToken();
    if (!token) throw new Error('GraphQL requires a GitHub Personal Access Token');

    const response = await fetch(this.GRAPHQL, {
      method: 'POST',
      headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    const data = await response.json();
    if (data.errors) throw new Error(data.errors[0].message);
    return data.data;
  },

  updateRateLimitUI(remaining, reset) {
    const el = document.getElementById('rate-limit-display');
    if (el && remaining) {
      const resetTime = new Date(reset * 1000).toLocaleTimeString();
      el.textContent = `GitHub API: ${remaining} requests remaining · resets ${resetTime}`;
      el.style.color = remaining < 100 ? 'var(--orange)' : 'var(--muted)';
    }
  },

  // Pagination helper
  async getAllPages(endpoint, maxPages = 5) {
    const results = [];
    let page = 1;
    while (page <= maxPages) {
      const sep = endpoint.includes('?') ? '&' : '?';
      const data = await this.get(`${endpoint}${sep}page=${page}&per_page=100`);
      const items = Array.isArray(data) ? data : data.items || [];
      results.push(...items);
      if (items.length < 100) break;
      page++;
    }
    return results;
  },
};
```

### Rate Limit Display (always visible in nav):
```
GitHub API: 4,847 / 5,000 requests remaining · resets 3:00 PM
```

Without PAT: 60 requests/hour
With PAT: 5,000 requests/hour
Show clear CTA to add PAT when approaching limit.

---

## SETTINGS PANEL

```
⚙ SETTINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GITHUB PERSONAL ACCESS TOKEN
For 5,000 requests/hour (vs 60 without)
Create at: github.com/settings/tokens → Generate new token
Required scopes: public_repo, read:user, read:org

[••••••••••••••••••••••••••••••••]  [Save]  [Test]

→ How to get a free GitHub PAT (click to expand instructions)

ANTHROPIC API KEY
For AI analysis, error solving, and smart ranking
[••••••••••••••••••••••••••••••••]  [Save]  [Test]

AI SETTINGS
Default AI model:     [claude-sonnet-4-20250514 ▼]
Show AI analysis:     [Always ▼] (Always / On request / Never)
Max tokens per call:  [1000]

DEFAULT SEARCH SETTINGS
Default language:     [Any ▼]
Minimum repo stars:   [100]
Sort results by:      [Stars ▼]

DISPLAY
Theme:                [GitHub Dark ▼]
Code font size:       [14px ▼]
Results per page:     [10 ▼]

DATA
[Export Bookmarks as JSON]
[Export Search History]
[Clear All Data]
```

---

## LANGUAGE COLOR MAP

```javascript
// Official GitHub language colors (subset of most common)
const LANGUAGE_COLORS = {
  JavaScript:  '#F1E05A', TypeScript:  '#3178C6', Python:      '#3572A5',
  Java:        '#B07219', 'C++':       '#F34B7D', 'C#':        '#178600',
  C:           '#555555', Go:          '#00ADD8', Rust:        '#DEA584',
  PHP:         '#4F5D95', Ruby:        '#701516', Swift:       '#FA7343',
  Kotlin:      '#A97BFF', Dart:        '#00B4AB', Scala:       '#DC322F',
  Shell:       '#89E051', HTML:        '#E34C26', CSS:         '#563D7C',
  Vue:         '#41B883', Svelte:      '#FF3E00', Elixir:      '#6E4A7E',
  Haskell:     '#5E5086', Lua:         '#000080', R:           '#198CE7',
  MATLAB:      '#E16737', Jupyter:     '#DA5B0B',
};
```

---

## BUILD ORDER

1. CSS design system (GitHub-dark aesthetic, all CSS variables)
2. Navigation + tab system + settings panel
3. GitHub API layer (GitHubAPI object, rate limit tracking, error handling)
4. Settings panel — PAT + Anthropic key storage
5. Universal search bar + smart query parser
6. Repository search + result cards
7. Code search + syntax highlighting integration
8. Issue search + discussion search
9. Parallel search execution + results aggregator
10. Claude API integration (callClaudeAPI utility function)
11. AI Solution Ranker for universal search
12. AI Solution Card component
13. Error Solver tab — input + error signature extractor
14. Error Solver AI analysis + display
15. Repository Analyzer — all GitHub data fetching
16. Repository Analyzer AI analysis + full dashboard display
17. Code Examples tab — search + display + AI explainer
18. Issues + Discussions tab — smart search + AI summarizer
19. Developer Profile Analyzer — data fetch + AI profile
20. Organization Profile Analyzer
21. AI Lab — Codebase Q&A mode
22. AI Lab — Library Comparison mode
23. AI Lab — PR Analyzer mode
24. AI Lab — Tech Stack Recommender mode
25. Trending tab — scraper + display + AI trend insight
26. Bookmarks system (localStorage, collections, notes, export)
27. Search history tracker
28. Rate limit display + warning states
29. Highlight.js syntax highlighting integration
30. Marked.js README rendering
31. Language color dots + repo card polish
32. Keyboard shortcuts (/ = focus search, b = bookmark, etc.)
33. Mobile responsive pass
34. Full QA: test every mode with real queries

---

## FINAL CHECKLIST — DO NOT SHIP UNTIL ALL ✓

Search:
- [ ] Universal search runs all 5 sub-searches in parallel
- [ ] Smart query parser correctly identifies error messages, URLs, how-to queries
- [ ] Repository cards display all fields correctly
- [ ] Language color dots display correctly
- [ ] AI Solution Card appears above results when Anthropic key is set

Error Solver:
- [ ] Pastes any real error message and finds relevant GitHub issues
- [ ] AI solution explains root cause + fix with code
- [ ] Issue results sorted by most reactions

Repository Analyzer:
- [ ] Fetches all 12 data sources in parallel
- [ ] README renders as markdown
- [ ] Health score calculates from real data
- [ ] AI analysis produces all required fields

Code Search:
- [ ] Syntax highlighting renders correctly for all major languages
- [ ] Code snippets show with file path and repo attribution
- [ ] "Explain This" button calls AI with the code context

Issues Tab:
- [ ] Finds both open and closed issues
- [ ] AI summarizes solution from comment thread
- [ ] Reactions-sorted results surface most useful answers

AI Lab:
- [ ] Codebase Q&A reads README and file tree
- [ ] Library comparison produces table with specific insights
- [ ] PR Analyzer reads diff and identifies risks
- [ ] Tech Stack Recommender names specific GitHub repos

Trending:
- [ ] Trending repos scrape and display correctly
- [ ] Language filter and time filter work
- [ ] Daily AI trend insight generates

General:
- [ ] Rate limit counter displays and updates in nav
- [ ] Clear error state when rate limited (with PAT upgrade CTA)
- [ ] All bookmarks persist in localStorage
- [ ] Settings save and load correctly
- [ ] No console errors during normal use
- [ ] Mobile view at 375px works for all tabs

Output the complete `github-finder.html` file. Every feature must be present and functional.
