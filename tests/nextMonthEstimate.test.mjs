import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';

const { outputFiles } = await build({
  entryPoints: [fileURLToPath(new URL('../src/utils/nextMonthEstimate.js', import.meta.url))],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm'
});
const { computeNextMonthEstimatedAmount: estimate } = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`
);
const now = new Date(2026, 8, 30);
const project = (overrides = {}) => ({
  client: 'Broker A',
  project: 'New project',
  date: '2026-09-01',
  projectStatus: 'active',
  status: 'approved',
  payoutOccurrence: 'biweekly',
  totalMonthlyHours: 160,
  hourlyRate: 10,
  ...overrides
});
const transaction = (overrides = {}) => ({
  client: 'Broker A',
  project: 'Existing project',
  date: '2026-08-15',
  amount: 1000,
  brokerageAmount: 100,
  additionalCharges: 100,
  status: 'approved',
  ...overrides
});
const expense = (overrides = {}) => ({
  client: 'Broker A',
  project: 'Existing project',
  date: '2026-08-20',
  amount: 200,
  status: 'approved',
  ...overrides
});

test('does not tax previous month available when there are no new projects', () => {
  const result = estimate({ now, transactions: [transaction()], expenses: [expense()] });
  assert.equal(result.previousMonthInward, 784);
  assert.equal(result.previousMonthExpenses, 200);
  assert.equal(result.previousMonthAvailable, 584);
  assert.equal(result.taxAmount, 0);
  assert.equal(result.estimated, 584);
});

for (const payoutOccurrence of ['weekly', 'biweekly', 'monthly']) {
  test(`${payoutOccurrence}: adds monthly hours × hourly rate minus 30% on new income only`, () => {
    const result = estimate({
      now, transactions: [transaction()], expenses: [expense()],
      projects: [project({ payoutOccurrence, taxType: 'percentage', taxValue: 30 })]
    });
    assert.equal(result.newProjectsGross, 1600);
    assert.equal(result.beforeTax, 2184);
    assert.equal(result.taxAmount, 480);
    assert.equal(result.estimated, 1704);
  });
}

for (const payoutOccurrence of ['weekly', 'biweekly']) {
  test(`${payoutOccurrence}: respects a start in the second half of next month`, () => {
    const result = estimate({now, projects: [project({ payoutOccurrence, date: '2026-10-16' })]});
    assert.equal(result.newProjectsGross, 800);
    assert.equal(result.estimated, 560);
  });
  test(`${payoutOccurrence}: respects an end in the first half of next month`, () => {
    const result = estimate({now, projects: [project({ payoutOccurrence, contractEnding: '2026-10-15' })]});
    assert.equal(result.newProjectsGross, 800);
    assert.equal(result.estimated, 560);
  });
}

test('monthly: excludes the payout if the project ends before its anniversary day', () => {
  assert.equal(estimate({now, projects: [project({payoutOccurrence:'monthly', date:'2026-09-20', contractEnding:'2026-10-14'})]}).estimated, 0);
});

test('excludes old, pending, freelance, ended, and later-starting projects', () => {
  const projects = [
    project({project:'Old', date:'2026-08-31'}),
    project({project:'Pending', status:'pending'}),
    project({project:'Freelance', projectType:'Freelance'}),
    project({project:'Ended', contractEnding:'2026-09-30'}),
    project({project:'Later', date:'2026-11-01'}),
    project({project:'Inactive', projectStatus:'inactive', inactiveAt:'2026-09-20'}),
    project({project:'No start', date:''})
  ];
  assert.equal(estimate({now, projects}).estimated, 0);
});

test('uses the latest approved row for each project identity once', () => {
  const projects = [
    project({updatedAt:'2026-09-01', hourlyRate:5}),
    project({updatedAt:'2026-09-20', hourlyRate:10})
  ];
  assert.equal(estimate({now, projects}).estimated, 1120);
});

test('approval, calendar boundaries, and monthKey expense fallback match the baseline', () => {
  const result = estimate({now,
    transactions:[transaction(), transaction({date:'2026-07-31'}), transaction({date:'2026-09-01'}), transaction({status:'pending'})],
    expenses:[expense({date:'',monthKey:'2026-08'}), expense({status:'pending'}), expense({date:'2026-09-01'})]
  });
  assert.equal(result.estimated, 584);
  assert.equal(result.taxAmount, 0);
});

test('broker filters apply to baseline transactions, expenses, and new projects', () => {
  const result = estimate({now, selectedBroker:' broker a ',
    transactions:[transaction(),transaction({client:'Broker B'})],
    expenses:[expense(),expense({client:'Broker B'})],
    projects:[project(),project({client:'Broker B'})]
  });
  assert.equal(result.estimated, 1704);
});

test('project selection takes precedence and prevents old projects being added again', () => {
  const result = estimate({now, selectedBroker:'Broker B', selectedProject:{client:'Broker A',project:'Existing project'},
    transactions:[transaction(),transaction({project:'Other'})],
    expenses:[expense(),expense({project:'Other'})],
    projects:[project(),project({project:'Existing project', date:'2026-08-01'})]
  });
  assert.equal(result.estimated, 584);
  assert.equal(result.taxAmount, 0);
});

test('negative previous available balances remain negative', () => {
  assert.equal(estimate({now, expenses:[expense()]}).estimated, -200);
});

test('handles the year boundary and empty data', () => {
  const result=estimate({now:new Date(2026,0,15),transactions:[transaction({date:'2025-12-31'})]});
  assert.equal(result.previousMonthKey,'2025-12');
  assert.equal(result.nextMonthKey,'2026-02');
  assert.equal(result.taxAmount,0);
  assert.equal(result.estimated,784);
  assert.equal(estimate({now}).estimated,0);
});

test('rounds the new-income deduction and final estimate to cents', () => {
  const result=estimate({now, projects:[project({totalMonthlyHours:'1',hourlyRate:'100.01'})]});
  assert.equal(result.newProjectsGross,100.01);
  assert.equal(result.taxAmount,30);
  assert.equal(result.estimated,70.01);
});

for (const payoutOccurrence of ['monthly', 'biweekly', 'weekly']) {
  test(`${payoutOccurrence}: deducts fixed brokerage and project costs once before estimate-only tax`, () => {
    const result = estimate({ now, transactions: [transaction()], expenses: [expense()],
      projects: [project({ payoutOccurrence, brokerageType: 'fixed', brokerageValue: 200, projectCost: 100, taxType: 'percentage', taxValue: 30 })]
    });
    assert.equal(result.newProjectsBrokerage, 200);
    assert.equal(result.newProjectsAdditionalCharges, 100);
    assert.equal(result.newProjectsBeforeTax, result.newProjectsGross - 300);
    assert.equal(result.beforeTax, 1884);
    assert.equal(result.taxAmount, 390);
    assert.equal(result.estimated, 1494);
  });
}

test('percentage brokerage uses the import rule once, even for weekly payouts', () => {
  const result = estimate({now, projects: [project({payoutOccurrence:'weekly',brokerageType:'percentage',brokerageValue:10})]});
  assert.equal(result.newProjectsBrokerage, 160);
  assert.equal(result.newProjectsBeforeTax,result.newProjectsGross-160);
});

test('fixed brokerage is prorated by working days like the import', () => {
  const result = estimate({now, projects: [project({date:'2026-10-16',brokerageType:'fixed',brokerageValue:220})]});
  assert.equal(result.newProjectsBrokerage, 110);
});

test('does not subtract new-project charges when no payout is expected', () => {
  const result=estimate({now,projects:[project({payoutOccurrence:'monthly',date:'2026-09-20',contractEnding:'2026-10-14',brokerageType:'fixed',brokerageValue:200,projectCost:100})]});
  assert.equal(result.newProjectsBrokerage,0);
  assert.equal(result.newProjectsAdditionalCharges,0);
});

test('negative new-project income does not create a tax credit', () => {
  const result=estimate({now,projects:[project({payoutOccurrence:'monthly',totalMonthlyHours:1,hourlyRate:100,brokerageType:'fixed',brokerageValue:200})]});
  assert.equal(result.newProjectsBeforeTax,-100);
  assert.equal(result.taxAmount,0);
  assert.equal(result.estimated,-100);
});


test('keeps full previous available with no new projects (no 30% on baseline)', () => {
  const result = estimate({now, transactions: [transaction({totalAmount: 1100})], expenses: [expense({amount:78})]});
  assert.equal(result.previousMonthAvailable,1000);
  assert.equal(result.taxAmount,0);
  assert.equal(result.estimated,1000);
});

test('taxes only new-project income when previous available is a loss', () => {
  const result = estimate({now, expenses:[expense()], projects:[project({payoutOccurrence:'monthly',totalMonthlyHours:100,hourlyRate:10})]});
  assert.equal(result.previousMonthAvailable, -200);
  assert.equal(result.newProjectsBeforeTax, 1000);
  assert.equal(result.beforeTax,800);
  assert.equal(result.taxAmount,300);
  assert.equal(result.estimated,500);
});
