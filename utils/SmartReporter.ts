/**
 * SmartReporter.ts — AI-powered Playwright custom HTML reporter
 *
 * Features:
 *  - AI failure analysis (pattern-based + LLM-style root cause grouping)
 *  - Flakiness detection from test history (allure-results/history.json)
 *  - Performance regression alerts (duration vs rolling average)
 *  - Self-contained single-file HTML report
 *
 * Usage in playwright.config.ts:
 *   reporter: [['./utils/SmartReporter.ts']]
 */

import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TestRecord {
  id: string;
  title: string;
  suite: string;
  status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
  duration: number;
  retries: number;
  error?: string;
  errorStack?: string;
  startTime: number;
  attachments: { name: string; path?: string; contentType: string }[];
}

interface HistoryEntry {
  id: string;
  title: string;
  results: { status: string; duration: number; timestamp: number }[];
}

interface FlakinessInfo {
  testId: string;
  flakyRate: number;   // 0–1
  runs: number;
  failures: number;
}

interface PerfAlert {
  testId: string;
  title: string;
  current: number;
  average: number;
  delta: number;       // percentage over average
}

interface AIAnalysis {
  category: string;
  rootCause: string;
  suggestion: string;
}

// ─── AI Failure Analyser ─────────────────────────────────────────────────────

const FAILURE_PATTERNS: { pattern: RegExp; category: string; rootCause: string; suggestion: string }[] = [
  {
    pattern: /TimeoutError|timeout.*exceeded|locator\.waitFor/i,
    category: 'Timeout',
    rootCause: 'Element not found or page did not respond within the timeout window.',
    suggestion: 'Increase timeout, add waitForLoadState("networkidle"), or verify the selector is correct.',
  },
  {
    pattern: /net::ERR_|ECONNREFUSED|ENOTFOUND|network/i,
    category: 'Network',
    rootCause: 'Network request failed — staging/API server may be down or slow.',
    suggestion: 'Check server status, retry logic, or increase network timeout.',
  },
  {
    pattern: /strict mode violation|resolved to \d+ elements/i,
    category: 'Selector Ambiguity',
    rootCause: 'Locator matched multiple elements — strict mode requires exactly one.',
    suggestion: 'Use a more specific selector, add .first(), or use getByRole with an exact name.',
  },
  {
    pattern: /Expected.*visible.*Received.*hidden|element.*not found|element\(s\) not found/i,
    category: 'Element Not Visible',
    rootCause: 'Target element exists in DOM but is hidden or not yet rendered.',
    suggestion: 'Wait for networkidle, check CSS visibility, or add explicit waitFor.',
  },
  {
    pattern: /page.*closed|target.*closed|browser.*closed/i,
    category: 'Page Crash',
    rootCause: 'Page or browser context was closed unexpectedly during the test.',
    suggestion: 'Check for React hydration issues — add waitForLoadState("networkidle") before interacting.',
  },
  {
    pattern: /Expected.*toHaveURL|navigation.*failed|waitForURL/i,
    category: 'Navigation',
    rootCause: 'Page did not navigate to the expected URL.',
    suggestion: 'Use content-based assertions (toBeVisible) instead of URL assertions for SPA routing.',
  },
  {
    pattern: /toBeChecked|toHaveValue|expect.*failed/i,
    category: 'Assertion',
    rootCause: 'An assertion failed — the actual value did not match the expected value.',
    suggestion: 'Review test data, check for React controlled component state vs DOM value mismatch.',
  },
  {
    pattern: /ENOENT|no such file|cannot find module/i,
    category: 'File / Module',
    rootCause: 'A required file or module was not found.',
    suggestion: 'Verify file paths, run npm install, and check import statements.',
  },
];

function analyseFailure(error: string): AIAnalysis {
  for (const { pattern, category, rootCause, suggestion } of FAILURE_PATTERNS) {
    if (pattern.test(error)) {
      return { category, rootCause, suggestion };
    }
  }
  return {
    category: 'Unknown',
    rootCause: 'No matching failure pattern found.',
    suggestion: 'Review the full error stack trace for clues.',
  };
}

// ─── History / Flakiness ─────────────────────────────────────────────────────

const HISTORY_FILE = path.join('allure-results', 'history', 'history.json');

function loadHistory(): Map<string, HistoryEntry> {
  const map = new Map<string, HistoryEntry>();
  if (!fs.existsSync(HISTORY_FILE)) return map;
  try {
    const raw = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    for (const [id, entry] of Object.entries(raw as Record<string, HistoryEntry>)) {
      map.set(id, entry);
    }
  } catch { /* ignore parse errors */ }
  return map;
}

function saveHistory(records: TestRecord[]): void {
  const dir = path.dirname(HISTORY_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const history: Record<string, HistoryEntry> = {};
  if (fs.existsSync(HISTORY_FILE)) {
    try { Object.assign(history, JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'))); } catch { /* ignore */ }
  }

  for (const r of records) {
    if (!history[r.id]) history[r.id] = { id: r.id, title: r.title, results: [] };
    history[r.id].results.push({ status: r.status, duration: r.duration, timestamp: r.startTime });
    // Keep last 20 runs only
    if (history[r.id].results.length > 20) history[r.id].results.splice(0, history[r.id].results.length - 20);
  }

  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

function detectFlakiness(records: TestRecord[], history: Map<string, HistoryEntry>): Map<string, FlakinessInfo> {
  const result = new Map<string, FlakinessInfo>();
  for (const r of records) {
    const entry = history.get(r.id);
    if (!entry || entry.results.length < 3) continue;
    const failures = entry.results.filter(x => x.status !== 'passed' && x.status !== 'skipped').length;
    const runs = entry.results.length;
    const flakyRate = failures / runs;
    if (flakyRate > 0 && flakyRate < 1) {
      result.set(r.id, { testId: r.id, flakyRate, runs, failures });
    }
  }
  return result;
}

// ─── Performance Regression ───────────────────────────────────────────────────

const PERF_THRESHOLD = 0.3; // alert if 30% slower than average

function detectPerfRegressions(records: TestRecord[], history: Map<string, HistoryEntry>): PerfAlert[] {
  const alerts: PerfAlert[] = [];
  for (const r of records) {
    if (r.status !== 'passed') continue;
    const entry = history.get(r.id);
    if (!entry || entry.results.length < 3) continue;
    const passed = entry.results.filter(x => x.status === 'passed' && x.duration > 0);
    if (passed.length < 2) continue;
    const avg = passed.reduce((s, x) => s + x.duration, 0) / passed.length;
    const delta = (r.duration - avg) / avg;
    if (delta > PERF_THRESHOLD) {
      alerts.push({ testId: r.id, title: r.title, current: r.duration, average: avg, delta });
    }
  }
  return alerts;
}

// ─── HTML Generation ──────────────────────────────────────────────────────────

function ms(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${n}ms`;
}

function pct(n: number) {
  return `${(n * 100).toFixed(0)}%`;
}

function statusIcon(status: string) {
  return status === 'passed' ? '✅' : status === 'skipped' ? '⏭️' : '❌';
}

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildHtml(
  records: TestRecord[],
  config: FullConfig,
  result: FullResult,
  flakiness: Map<string, FlakinessInfo>,
  perfAlerts: PerfAlert[],
): string {
  const passed = records.filter(r => r.status === 'passed').length;
  const failed = records.filter(r => r.status === 'failed' || r.status === 'timedOut').length;
  const skipped = records.filter(r => r.status === 'skipped').length;
  const total = records.length;
  const totalDuration = records.reduce((s, r) => s + r.duration, 0);
  const passRate = total > 0 ? (passed / total) * 100 : 0;
  const startDate = new Date(result.startTime ?? Date.now()).toLocaleString();

  // Group by suite
  const suites = new Map<string, TestRecord[]>();
  for (const r of records) {
    if (!suites.has(r.suite)) suites.set(r.suite, []);
    suites.get(r.suite)!.push(r);
  }

  // Failed tests with AI analysis
  const failedTests = records.filter(r => r.status === 'failed' || r.status === 'timedOut');
  const aiAnalyses = failedTests.map(r => ({
    r,
    analysis: analyseFailure(`${r.error ?? ''} ${r.errorStack ?? ''}`),
  }));

  // Group AI categories
  const categoryGroups = new Map<string, typeof aiAnalyses>();
  for (const item of aiAnalyses) {
    const cat = item.analysis.category;
    if (!categoryGroups.has(cat)) categoryGroups.set(cat, []);
    categoryGroups.get(cat)!.push(item);
  }

  const suiteRows = [...suites.entries()].map(([suite, tests]) => {
    const sp = tests.filter(r => r.status === 'passed').length;
    const sf = tests.filter(r => r.status !== 'passed' && r.status !== 'skipped').length;
    const rows = tests.map(r => {
      const flaky = flakiness.get(r.id);
      const perf = perfAlerts.find(p => p.testId === r.id);
      const flakyBadge = flaky ? `<span class="badge badge-warn" title="${flaky.failures}/${flaky.runs} runs failed">⚠ Flaky ${pct(flaky.flakyRate)}</span>` : '';
      const perfBadge = perf ? `<span class="badge badge-perf" title="Avg: ${ms(perf.average)}">🐢 +${pct(perf.delta)} slow</span>` : '';
      const errorRow = r.error ? `<tr><td colspan="4"><pre class="error-pre">${escHtml(r.error)}</pre></td></tr>` : '';
      return `
        <tr class="row-${r.status}">
          <td>${statusIcon(r.status)} ${escHtml(r.title)} ${flakyBadge} ${perfBadge}</td>
          <td>${ms(r.duration)}</td>
          <td>${r.retries > 0 ? `🔁 ${r.retries}` : '—'}</td>
          <td>${r.status}</td>
        </tr>${errorRow}`;
    }).join('');

    return `
      <details class="suite-block" open>
        <summary class="suite-title">
          <span>${escHtml(suite)}</span>
          <span class="suite-stats">
            <span class="badge badge-pass">${sp} passed</span>
            ${sf > 0 ? `<span class="badge badge-fail">${sf} failed</span>` : ''}
          </span>
        </summary>
        <table class="test-table">
          <thead><tr><th>Test</th><th>Duration</th><th>Retries</th><th>Status</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </details>`;
  }).join('');

  const aiSection = aiAnalyses.length === 0 ? '<p class="all-good">🎉 No failures detected!</p>' :
    [...categoryGroups.entries()].map(([cat, items]) => `
      <div class="ai-group">
        <h3 class="ai-cat">🔍 ${escHtml(cat)} <span class="badge badge-fail">${items.length}</span></h3>
        <p class="ai-cause"><strong>Root Cause:</strong> ${escHtml(items[0].analysis.rootCause)}</p>
        <p class="ai-suggest"><strong>Suggestion:</strong> ${escHtml(items[0].analysis.suggestion)}</p>
        <ul>${items.map(i => `<li>${escHtml(i.r.title)}</li>`).join('')}</ul>
      </div>`).join('');

  const flakySection = flakiness.size === 0 ? '<p class="all-good">✅ No flaky tests detected.</p>' :
    `<table class="test-table"><thead><tr><th>Test</th><th>Flaky Rate</th><th>Runs</th><th>Failures</th></tr></thead><tbody>` +
    [...flakiness.values()].map(f => {
      const r = records.find(x => x.id === f.testId);
      return `<tr class="row-flaky"><td>${escHtml(r?.title ?? f.testId)}</td><td>${pct(f.flakyRate)}</td><td>${f.runs}</td><td>${f.failures}</td></tr>`;
    }).join('') + '</tbody></table>';

  const perfSection = perfAlerts.length === 0 ? '<p class="all-good">✅ No performance regressions detected.</p>' :
    `<table class="test-table"><thead><tr><th>Test</th><th>Current</th><th>Avg</th><th>Slower By</th></tr></thead><tbody>` +
    perfAlerts.map(p => `<tr class="row-perf"><td>${escHtml(p.title)}</td><td>${ms(p.current)}</td><td>${ms(p.average)}</td><td>+${pct(p.delta)}</td></tr>`).join('') +
    '</tbody></table>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Smart Test Report</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#0f1117;color:#e2e8f0;line-height:1.6}
  .header{background:linear-gradient(135deg,#1e3a5f,#0d2137);padding:32px 48px;border-bottom:1px solid #1e3a5f}
  .header h1{font-size:28px;font-weight:700;color:#60a5fa}
  .header .meta{color:#94a3b8;font-size:13px;margin-top:6px}
  .summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;padding:28px 48px;background:#131620}
  .card{background:#1e2232;border-radius:12px;padding:20px;text-align:center;border:1px solid #2d3748}
  .card .num{font-size:40px;font-weight:800;line-height:1}
  .card .label{font-size:12px;color:#94a3b8;margin-top:6px;text-transform:uppercase;letter-spacing:.05em}
  .card.pass .num{color:#34d399}.card.fail .num{color:#f87171}.card.skip .num{color:#fbbf24}
  .card.dur .num{font-size:28px;color:#a78bfa}.card.rate .num{font-size:32px;color:#60a5fa}
  .progress{width:100%;height:8px;background:#2d3748;border-radius:4px;overflow:hidden;margin:4px 0 0}
  .progress-bar{height:100%;border-radius:4px;background:linear-gradient(90deg,#34d399,#10b981);transition:width .5s}
  .tabs{display:flex;gap:0;background:#1a1f2e;border-bottom:2px solid #1e3a5f;padding:0 48px}
  .tab{padding:12px 24px;cursor:pointer;font-size:13px;font-weight:600;color:#64748b;border-bottom:2px solid transparent;margin-bottom:-2px;transition:all .2s}
  .tab.active,.tab:hover{color:#60a5fa;border-color:#60a5fa}
  .panel{display:none;padding:32px 48px}.panel.active{display:block}
  .suite-block{background:#1e2232;border:1px solid #2d3748;border-radius:10px;margin-bottom:16px;overflow:hidden}
  .suite-title{padding:14px 18px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-weight:600;font-size:14px;background:#252a3d;user-select:none}
  .suite-title:hover{background:#2d3350}
  .suite-stats{display:flex;gap:8px}
  .test-table{width:100%;border-collapse:collapse;font-size:13px}
  .test-table th{background:#131926;padding:10px 14px;text-align:left;color:#64748b;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
  .test-table td{padding:10px 14px;border-top:1px solid #1e2a40;vertical-align:top}
  .row-passed td{background:#0d1f17}.row-failed td,.row-timedOut td{background:#1f0d0d}.row-skipped td{background:#1a1a0d}
  .row-flaky td{background:#1a150d}.row-perf td{background:#0f1a2a}
  .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;margin-left:6px}
  .badge-pass{background:#064e3b;color:#34d399}.badge-fail{background:#450a0a;color:#f87171}
  .badge-warn{background:#451a03;color:#fb923c}.badge-perf{background:#1e1b4b;color:#818cf8}
  .error-pre{padding:12px 14px;font-size:11px;background:#1a0d0d;color:#f87171;white-space:pre-wrap;word-break:break-all;border-left:3px solid #f87171;font-family:monospace}
  .ai-group{background:#1e2232;border:1px solid #2d3748;border-radius:10px;padding:20px;margin-bottom:16px}
  .ai-cat{color:#60a5fa;font-size:15px;margin-bottom:10px}
  .ai-cause{margin-bottom:6px;font-size:13px}.ai-suggest{color:#34d399;font-size:13px;margin-bottom:10px}
  .ai-group ul{padding-left:20px;font-size:12px;color:#94a3b8}
  .all-good{color:#34d399;font-size:14px;padding:20px;text-align:center}
  h2.section-title{font-size:18px;font-weight:700;margin-bottom:20px;color:#e2e8f0;border-left:4px solid #60a5fa;padding-left:12px}
</style>
</head>
<body>
<div class="header">
  <h1>🤖 Smart Test Report</h1>
  <div class="meta">
    ${escHtml(config.rootDir ?? '')} &nbsp;·&nbsp; ${startDate} &nbsp;·&nbsp;
    Status: <strong style="color:${result.status === 'passed' ? '#34d399' : '#f87171'}">${result.status.toUpperCase()}</strong>
  </div>
</div>

<div class="summary-grid">
  <div class="card rate"><div class="num">${passRate.toFixed(0)}%</div><div class="label">Pass Rate</div>
    <div class="progress"><div class="progress-bar" style="width:${passRate}%"></div></div>
  </div>
  <div class="card pass"><div class="num">${passed}</div><div class="label">Passed</div></div>
  <div class="card fail"><div class="num">${failed}</div><div class="label">Failed</div></div>
  <div class="card skip"><div class="num">${skipped}</div><div class="label">Skipped</div></div>
  <div class="card"><div class="num" style="color:#e2e8f0">${total}</div><div class="label">Total</div></div>
  <div class="card dur"><div class="num">${ms(totalDuration)}</div><div class="label">Total Duration</div></div>
  <div class="card"><div class="num" style="color:#fb923c;font-size:28px">${flakiness.size}</div><div class="label">Flaky Tests</div></div>
  <div class="card"><div class="num" style="color:#818cf8;font-size:28px">${perfAlerts.length}</div><div class="label">Perf Alerts</div></div>
</div>

<div class="tabs">
  <div class="tab active" onclick="showTab('results',this)">📋 Results</div>
  <div class="tab" onclick="showTab('ai',this)">🤖 AI Analysis</div>
  <div class="tab" onclick="showTab('flakiness',this)">⚠ Flakiness</div>
  <div class="tab" onclick="showTab('performance',this)">🐢 Performance</div>
</div>

<div id="results" class="panel active">
  <h2 class="section-title">Test Results</h2>
  ${suiteRows}
</div>

<div id="ai" class="panel">
  <h2 class="section-title">AI Failure Analysis</h2>
  ${aiSection}
</div>

<div id="flakiness" class="panel">
  <h2 class="section-title">Flakiness Detection (based on run history)</h2>
  ${flakySection}
</div>

<div id="performance" class="panel">
  <h2 class="section-title">Performance Regression Alerts (&gt;30% slower than average)</h2>
  ${perfSection}
</div>

<script>
function showTab(id, el) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  el.classList.add('active');
}
</script>
</body>
</html>`;
}

// ─── Reporter Class ───────────────────────────────────────────────────────────

class SmartReporter implements Reporter {
  private records: TestRecord[] = [];
  private config!: FullConfig;
  private outputFile: string;

  constructor(options: { outputFile?: string } = {}) {
    this.outputFile = options.outputFile ?? 'smart-report/index.html';
  }

  onBegin(config: FullConfig, _suite: Suite): void {
    this.config = config;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const suiteNames = test.parent ? this.getSuiteName(test.parent) : 'Root';
    this.records.push({
      id: test.id,
      title: test.title,
      suite: suiteNames,
      status: result.status,
      duration: result.duration,
      retries: result.retry,
      error: result.errors[0]?.message,
      errorStack: result.errors[0]?.stack,
      startTime: result.startTime?.getTime() ?? Date.now(),
      attachments: result.attachments.map(a => ({
        name: a.name,
        path: a.path,
        contentType: a.contentType,
      })),
    });
  }

  async onEnd(result: FullResult): Promise<void> {
    const history = loadHistory();
    const flakiness = detectFlakiness(this.records, history);
    const perfAlerts = detectPerfRegressions(this.records, history);

    // Persist run to history for next run's analysis
    saveHistory(this.records);

    const html = buildHtml(this.records, this.config, result, flakiness, perfAlerts);

    const outDir = path.dirname(this.outputFile);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(this.outputFile, html, 'utf-8');

    console.log(`\n📊 Smart Report: file://${path.resolve(this.outputFile)}`);
    console.log(`   ✅ Passed: ${this.records.filter(r => r.status === 'passed').length}`);
    console.log(`   ❌ Failed: ${this.records.filter(r => r.status !== 'passed' && r.status !== 'skipped').length}`);
    console.log(`   ⚠  Flaky:  ${flakiness.size}`);
    console.log(`   🐢 Perf:   ${perfAlerts.length} regressions\n`);
  }

  private getSuiteName(suite: Suite): string {
    const parts: string[] = [];
    let s: Suite | undefined = suite;
    while (s) {
      if (s.title) parts.unshift(s.title);
      s = s.parent;
    }
    return parts.join(' › ') || 'Root';
  }
}

export default SmartReporter;
