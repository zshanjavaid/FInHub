/**
 * Verify September completed count logic against fixtures + algorithm invariants.
 * Run: node --experimental-vm-modules node_modules/vite-node/vite-node.mjs scripts/verifySepCompleted.mjs
 * Or: npx vite-node scripts/verifySepCompleted.mjs
 */
import {
  countCompletedProjectsInMonth,
  countYearProjectTotals,
  buildActiveProjectsYearComparison
} from '../src/utils/projectYearComparison.js';
import { projectMatchesStatusInRange } from '../src/utils/transactionsEligibility.js';

const now = new Date(2026, 8, 18); // Sep 18, 2026

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
  console.log('OK:', msg);
};

// --- A) Arithmetic consistency with screenshot narrative ---
{
  const projects = [
    // 2 completed in April
    { id: 'a1', client: 'A', project: 'P1', date: '2026-01-10', projectStatus: 'inactive', inactiveAt: '2026-04-12' },
    { id: 'a2', client: 'A', project: 'P2', date: '2026-02-01', projectStatus: 'inactive', inactiveAt: '2026-04-28' },
    // 5 completed in September (as chart claims)
    { id: 's1', client: 'B', project: 'P3', date: '2025-11-01', projectStatus: 'inactive', inactiveAt: '2026-09-03' },
    { id: 's2', client: 'B', project: 'P4', date: '2026-03-01', projectStatus: 'inactive', inactiveAt: '2026-09-10' },
    { id: 's3', client: 'C', project: 'P5', date: '2026-05-01', projectStatus: 'inactive', inactiveAt: '2026-09-15' },
    { id: 's4', client: 'C', project: 'P6', date: '2026-06-01', projectStatus: 'inactive', inactiveAt: '2026-09-18' },
    { id: 's5', client: 'D', project: 'P7', date: '2026-01-01', projectStatus: 'inactive', inactiveAt: '2026-09-18' },
    // still active
    { id: 'x1', client: 'E', project: 'P8', date: '2026-01-01', projectStatus: 'active' },
    { id: 'x2', client: 'E', project: 'P9', date: '2026-02-01', projectStatus: 'active' },
    { id: 'x3', client: 'F', project: 'P10', date: '2026-03-01', projectStatus: 'active' },
    { id: 'x4', client: 'F', project: 'P11', date: '2026-04-01', projectStatus: 'active' },
    { id: 'x5', client: 'G', project: 'P12', date: '2026-05-01', projectStatus: 'active' },
    { id: 'x6', client: 'G', project: 'P13', date: '2026-06-01', projectStatus: 'active' },
    { id: 'x7', client: 'H', project: 'P14', date: '2026-07-01', projectStatus: 'active' },
    { id: 'x8', client: 'H', project: 'P15', date: '2026-08-01', projectStatus: 'active' }
  ];

  const apr = countCompletedProjectsInMonth(projects, 2026, 3);
  const sep = countCompletedProjectsInMonth(projects, 2026, 8);
  const year = countYearProjectTotals(projects, 2026, 2026, 8);

  assert(apr === 2, `April completed === 2 (got ${apr})`);
  assert(sep === 5, `September completed === 5 (got ${sep})`);
  assert(year.completedProjects === 7, `Year completed === 7 (got ${year.completedProjects})`);
  assert(apr + sep === year.completedProjects, 'Monthly completed sum matches year total when only Apr+Sep have completions');
}

// --- B) Auto-inactive lag: End Date in April, inactiveAt stamped in September ---
{
  const projects = [
    {
      id: 'bug1',
      client: 'X',
      project: 'Expired',
      date: '2025-01-01',
      projectStatus: 'inactive',
      contractEnding: '2026-04-30',
      inactiveAt: '2026-09-18T10:00:00.000Z'
    }
  ];
  const apr = countCompletedProjectsInMonth(projects, 2026, 3);
  const sep = countCompletedProjectsInMonth(projects, 2026, 8);
  assert(apr === 1, `Prefer End Date → counted in April (got ${apr})`);
  assert(sep === 0, `Not double-counted in September (got ${sep})`);
}

// --- B2) End Date always wins for completed month (even if inactiveAt is earlier) ---
{
  const projects = [
    {
      id: 'early',
      client: 'Y',
      project: 'EarlyEnd',
      date: '2025-01-01',
      projectStatus: 'inactive',
      contractEnding: '2026-08-09',
      inactiveAt: '2026-04-16'
    }
  ];
  const apr = countCompletedProjectsInMonth(projects, 2026, 3);
  const aug = countCompletedProjectsInMonth(projects, 2026, 7);
  assert(apr === 0, `Not counted in inactiveAt month April (got ${apr})`);
  assert(aug === 1, `Counted in End Date month August (got ${aug})`);
}

// --- C) buildActiveProjectsYearComparison shape for Sep ---
{
  const projects = [
    { id: '1', client: 'A', project: 'P', date: '2026-01-01', projectStatus: 'inactive', inactiveAt: '2026-09-05' },
    { id: '2', client: 'B', project: 'Q', date: '2026-01-01', projectStatus: 'inactive', inactiveAt: '2026-09-12' },
    { id: '3', client: 'C', project: 'R', date: '2026-01-01', projectStatus: 'inactive', inactiveAt: '2026-09-18' },
    { id: '4', client: 'D', project: 'S', date: '2026-01-01', projectStatus: 'inactive', inactiveAt: '2026-09-20' },
    { id: '5', client: 'E', project: 'T', date: '2026-01-01', projectStatus: 'inactive', inactiveAt: '2026-09-28' },
    { id: '6', client: 'F', project: 'U', date: '2026-01-01', projectStatus: 'active' }
  ];
  const cmp = buildActiveProjectsYearComparison(projects, now);
  const y2026 = cmp.byYear[2026];
  assert(y2026.completed[8] === 5, `Comparison Sep completed === 5 (got ${y2026.completed[8]})`);
  assert(y2026.completedProjects === 5, `Year completedProjects === 5 (got ${y2026.completedProjects})`);
}

// --- D) Filter: start Jan, end March ---
{
  const p = {
    id: 'jan-mar',
    date: '2026-01-10',
    contractEnding: '2026-03-15',
    projectStatus: 'inactive',
    inactiveAt: '2026-03-15T12:00:00.000Z'
  };
  const jan = ['2026-01-01', '2026-01-31'];
  const feb = ['2026-02-01', '2026-02-28'];
  const mar = ['2026-03-01', '2026-03-31'];

  assert(projectMatchesStatusInRange(p, 'active', ...jan), 'Jan + Active → show');
  assert(projectMatchesStatusInRange(p, 'active', ...feb), 'Feb + Active → show');
  assert(!projectMatchesStatusInRange(p, 'active', ...mar), 'Mar + Active → hide');
  assert(projectMatchesStatusInRange(p, 'inactive', ...mar), 'Mar + Inactive → show');
  assert(projectMatchesStatusInRange(p, 'all', ...mar), 'Mar + All → show');
  assert(!projectMatchesStatusInRange(p, 'inactive', ...jan), 'Jan + Inactive → hide');
  assert(projectMatchesStatusInRange(p, 'all', ...jan), 'Jan + All → show');
}

console.log('\nAll logic checks passed.');
console.log('Filter: Active = still active at month end; Inactive = End Date in month; All = existed in month.');
