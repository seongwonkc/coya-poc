// tools/simulate.js — plays many lives through the real game, headless.
//
//   node tools/simulate.js                  # 200 lives per identity, "best" strategy
//   node tools/simulate.js 100 random       # 100 lives per identity, random choices
//
// It loads index.html, data.js and script.js into jsdom and clicks the same
// buttons a player would, so what it measures is what the game does. It fails
// (exit 1) on a runtime error, a stage with no open option, a life that never
// ends, or "NaN"/"undefined" appearing in the feed.

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const LIVES = parseInt(process.argv[2] || '200', 10);
const STRATEGY = process.argv[3] || 'best';

// "best": always reach for the most ambitious open option. Same choices for
// every identity, so differences in outcome come from the odds, not the play.
const BEST = [
  'elite', 'state university', 'community college', 'go to college',
  'hardest', 'tutor', 'prep course',
  'apply for professional', 'transfer', 'technician',
  'own place', 'push for a promotion', 'better-paying', 'buy a home',
  'check-up', 'take your health', 'look for work', 'salaried',
  'say no', 'post bail'
];

function makeGame() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
    .replace(/<script src="[^"]+"><\/script>/g, '');
  const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.confirm = () => true;
  w.fetch = () => Promise.reject(new Error('offline'));
  const errors = [];
  w.addEventListener('error', (e) => errors.push(e.message));
  w.eval(fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8'));
  w.eval(fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8'));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  return { w, errors };
}

function playLife(game, identity, strategy) {
  const { w } = game;
  const doc = w.document;
  const $ = (id) => doc.getElementById(id);
  w.localStorage.clear();
  $('game').classList.add('hidden');
  $('creation').classList.remove('hidden');
  $('identitySelect').value = identity;
  $('nameInput').value = 'Sim';
  $('startBtn').click();

  const problems = [];
  let steps = 0;
  for (; steps < 800; steps++) {
    const card = doc.querySelector('.decision');
    if (card) {
      const opts = [...card.querySelectorAll('.decision-option:not(:disabled)')];
      if (!opts.length) { problems.push('stage with no open option: ' + card.textContent.trim().slice(0, 50)); break; }
      let pick = null;
      if (strategy === 'best') {
        for (const p of BEST) { pick = opts.find((o) => o.textContent.toLowerCase().includes(p)); if (pick) break; }
      }
      if (!pick) pick = opts[Math.floor(Math.random() * opts.length)];
      pick.click();
      continue;
    }
    if ($('ageUpBtn').textContent.includes('another life')) break;
    if ($('ageUpBtn').disabled) { problems.push('stuck: Age Up disabled with no decision open'); break; }
    if (!$('skipBtn').classList.contains('hidden')) $('skipBtn').click(); else $('ageUpBtn').click();
  }
  if (steps >= 800) problems.push('life never ended');

  const feedText = $('feed').textContent;
  if (/NaN|undefined|\[object/.test(feedText)) problems.push('bad value in feed');

  const ch = JSON.parse(w.localStorage.getItem('cyoa.character.v3')).ch;
  const equity = ch.home ? ch.home.value - ch.home.mortgage : 0;
  return {
    age: ch.age,
    netWorth: ch.wealth + equity - ch.debt,
    education: ch.education,
    record: !!ch.flags.record,
    home: !!ch.home,
    against: ch.tally.against,
    problems
  };
}

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const money = (n) => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');

const game = makeGame();
const ids = Object.keys(game.w.GAME_DATA.identities);
const rows = [];
let failures = 0;

for (const id of ids) {
  const lives = [];
  for (let i = 0; i < LIVES; i++) lives.push(playLife(game, id, STRATEGY));
  const probs = lives.flatMap((l) => l.problems);
  failures += probs.length;
  if (probs.length) console.error(id, [...new Set(probs)].slice(0, 5));
  const pctOf = (f) => Math.round(100 * lives.filter(f).length / lives.length) + '%';
  rows.push({
    identity: game.w.GAME_DATA.identities[id].label,
    'median net worth at end': money(median(lives.map((l) => l.netWorth))),
    'bachelor\'s': pctOf((l) => /_degree$/.test(l.education)),
    'owns a home': pctOf((l) => l.home),
    'criminal record': pctOf((l) => l.record),
    'died before 65': pctOf((l) => l.age < 65)
  });
}

console.log(`\n${LIVES} lives per identity, strategy: ${STRATEGY}\n`);
console.table(rows);
if (game.errors.length) { console.error('runtime errors:', [...new Set(game.errors)]); failures += game.errors.length; }
process.exit(failures ? 1 : 0);
