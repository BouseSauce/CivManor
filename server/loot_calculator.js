#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

function findLatestBattleReport(dir) {
  const files = fs.readdirSync(dir).filter(f => f.startsWith('battle_report_') && f.endsWith('.json'));
  if (!files.length) return null;
  const withStats = files.map(f => ({ f, stat: fs.statSync(path.join(dir, f)).mtimeMs }));
  withStats.sort((a, b) => b.stat - a.stat);
  return path.join(dir, withStats[0].f);
}

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function saveJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8'); }

// Default defender holdings per resource
const DEFAULT_DEFENDER_HOLDINGS = {
  Timber: 10000,
  Stone: 10000,
  IronIngot: 10000
};

// Main
const dataDir = path.resolve(process.cwd(), 'data');
const reportPath = process.argv[2] || findLatestBattleReport(dataDir);
if (!reportPath) {
  console.error('No battle report found in data/.');
  process.exit(1);
}

const report = loadJson(reportPath);
if (report.winner !== 'Attacker') console.warn('Selected report winner is not Attacker — continuing anyway.');

// Use salvageTotals from report if present
const salvage = report.salvageTotals || {};

// Defender holdings assume 10000 each unless overridden via env or args
const defenderHoldings = { ...DEFAULT_DEFENDER_HOLDINGS };

// Maximum loot percent (game-limited). Default = 0.4 unless overridden.
// Bandit rules below may override this value.
let maxLootPercent = Number(process.env.MAX_LOOT_PERCENT || 0.4);

// Detect bandit status. Two ways:
//  - Explicit env: BANDIT=true
//  - Implicit via attacker/defender scores passed as env ATTACKER_SCORE and DEFENDER_SCORE
const attackerScore = process.env.ATTACKER_SCORE ? Number(process.env.ATTACKER_SCORE) : null;
const defenderScore = process.env.DEFENDER_SCORE ? Number(process.env.DEFENDER_SCORE) : null;
let isBandit = false;
if (String(process.env.BANDIT).toLowerCase() === 'true') isBandit = true;
if (!isBandit && attackerScore != null && defenderScore != null) {
  // consider "significantly lower" if defender score is at most 80% of attacker (attacker >= defender * 1.25)
  if (attackerScore >= defenderScore * 1.25) isBandit = true;
}

// If bandit, determine whether this is an own-base attack (OWN_BASE=true or --own-base arg),
// and apply special loot rules: own-base -> 1.0, raids -> 0.2
const ownBaseFlag = String(process.env.OWN_BASE).toLowerCase() === 'true' || process.argv.includes('--own-base');
if (isBandit) {
  if (ownBaseFlag) maxLootPercent = 1.0; else maxLootPercent = 0.2;
}

const lootTaken = {};
const townAfter = {};
const attackerHaul = {};

Object.keys(defenderHoldings).forEach(r => {
  const available = defenderHoldings[r] || 0;
  const takeFromTown = Math.floor(available * Math.min(1, Math.max(0, maxLootPercent)));
  const salvageAmt = salvage[r] || 0;
  lootTaken[r] = takeFromTown + salvageAmt; // attackers take town loot + battlefield salvage
  townAfter[r] = Math.max(0, available - takeFromTown);
  attackerHaul[r] = lootTaken[r];
});

const out = {
  sourceReport: path.relative(process.cwd(), reportPath),
  defenderHoldings: defenderHoldings,
  salvageFromBattle: salvage,
  maxLootPercent,
  banditContext: { isBandit, attackerScore, defenderScore, ownBaseFlag },
  lootTaken,
  townAfter,
  attackerHaul
};

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const outJson = path.join(dataDir, `loot_report_${ts}.json`);
const outMd = path.join(dataDir, `loot_report_${ts}.md`);
saveJson(outJson, out);

// write simple markdown
const lines = [];
lines.push(`# Loot Report — ${ts}`);
lines.push('');
lines.push(`Source battle report: ${out.sourceReport}`);
lines.push('');
lines.push('## Defender holdings (before raid)');
Object.keys(defenderHoldings).forEach(r => lines.push(`- ${r}: ${defenderHoldings[r]}`));
lines.push('');
lines.push('## Salvage recovered from battlefield');
Object.keys(salvage).forEach(r => lines.push(`- ${r}: ${salvage[r] || 0}`));
lines.push('');
lines.push('## Loot rules');
lines.push(`- Max loot percent applied to town resources: ${maxLootPercent}`);
lines.push('- Attackers take town loot (as above) plus battlefield salvage.');
lines.push('');
lines.push('## Loot taken by attackers');
Object.keys(lootTaken).forEach(r => lines.push(`- ${r}: ${lootTaken[r]}`));
lines.push('');
lines.push('## Town resources after raid');
Object.keys(townAfter).forEach(r => lines.push(`- ${r}: ${townAfter[r]}`));
lines.push('');
lines.push('## Attacker haul totals (per resource)');
Object.keys(attackerHaul).forEach(r => lines.push(`- ${r}: ${attackerHaul[r]}`));
lines.push('');
lines.push('---');
lines.push('Note: Salvage is included in attacker haul. If you want cargo limits (trade carts) or different loot percentages, re-run with env `MAX_LOOT_PERCENT` (0-1).');

fs.writeFileSync(outMd, lines.join('\n'), 'utf8');
console.log('Loot report saved:', outJson);
console.log('Markdown summary saved:', outMd);
