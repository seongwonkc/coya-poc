// script.js — simulation engine.
//
// Design rules this file follows:
//   1. Identity never sets a circumstance. It conditions a roll, and the roll
//      is shown to the player alongside the distribution it came from.
//   2. Every biased outcome reports its counterfactual. If a callback rate was
//      multiplied by 0.67, the player is told what the number would have been.
//      The bias is the content, so hiding it in the math defeats the exercise.
//   3. A life is a sequence of stage decisions (data.js `stages`). Age Up runs
//      the years between them; the life ends at retirement or death.
//   4. Seeded RNG. The only network call is the optional narration endpoint,
//      which writes prose about outcomes the engine has already decided.

(function () {
  'use strict';

  const D = window.GAME_DATA;
  if (!D) throw new Error('GAME_DATA did not load — check that data.js is included before script.js');
  const E = D.economy;

  // ── RNG ──────────────────────────────────────────────────────────────────
  function mulberry32(a) {
    return function () {
      let t = (a += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  let rng = Math.random;
  const roll = () => rng();

  // ── State ────────────────────────────────────────────────────────────────
  let ch = null;
  const SAVE_KEY = 'cyoa.character.v3';

  // ── DOM ──────────────────────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const el = {};
  function cacheDom() {
    [
      'creation', 'game', 'feed', 'nameInput', 'identitySelect', 'startBtn',
      'resetBtn', 'ageUpBtn', 'skipBtn', 'exportBtn', 'actionSheet', 'actionList',
      'sheetTitle', 'closeSheet', 'tabBar', 'statAge', 'statHealth',
      'statWealth', 'statSmarts', 'statAddiction', 'barHealth', 'barSmarts',
      'barAddiction', 'charName', 'charSub', 'conditionsPanel', 'conditionsBody',
      'conditionsBtn', 'closeConditions', 'addictionRow', 'livesCount', 'moreBtn'
    ].forEach((k) => { el[k] = $(k); });
  }

  // ── Feed ─────────────────────────────────────────────────────────────────
  function say(html, kind) {
    const d = document.createElement('div');
    d.className = 'entry ' + (kind || '');
    d.innerHTML = html;
    el.feed.appendChild(d);
    el.feed.scrollTop = el.feed.scrollHeight;
    return d;
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pct = (x) => (x * 100).toFixed(0) + '%';
  const usd = (n) => '$' + Math.round(Math.abs(n)).toLocaleString();
  const signed = (n) => (n >= 0 ? '+' : '−') + usd(n);
  const ageTag = () => `<span class="age-tag">Age ${ch.age}</span>`;

  // ── Weighted sampling over a {key: prob} map ─────────────────────────────
  function sampleDist(dist) {
    const r = roll();
    let cum = 0;
    const keys = Object.keys(dist);
    for (const k of keys) {
      cum += dist[k];
      if (r <= cum) return k;
    }
    return keys[keys.length - 1];
  }

  // ── Character creation ───────────────────────────────────────────────────
  function rollCircumstance(identityKey) {
    const out = {};
    const detail = {};
    for (const track of Object.keys(D.circumstance)) {
      const spec = D.circumstance[track];
      const cond = spec.byIdentity[identityKey] || spec.population;
      const landed = sampleDist(cond);
      out[track] = landed;
      detail[track] = { landed, conditional: cond[landed], population: spec.population[landed] };
    }
    return { values: out, detail };
  }

  function effectsFor(track) {
    return D.circumstanceEffects[track][ch.circumstance[track]];
  }

  function createCharacter(name, identityKey) {
    const seed = (Date.now() & 0xffffffff) ^ (identityKey.length * 7919);
    rng = mulberry32(seed);

    const rolled = rollCircumstance(identityKey);
    const hh = D.circumstanceEffects.household[rolled.values.household];

    ch = {
      id: 'char_' + Date.now(),
      seed,
      name,
      identity: identityKey,
      circumstance: rolled.values,
      circumstanceDetail: rolled.detail,
      age: 0,
      health: 100,
      wealth: hh.startWealth,
      debt: 0,
      academicPerformance: 0,
      addiction: 0,
      job: 'unemployed',
      salary: 0,
      yearsEmployed: 0,
      education: 'hs',
      enrolled: null,          // { program, label, until, tuition, degree }
      service: null,           // { until }
      housing: 'home',         // home | roommates | own | owner
      home: null,              // { value, mortgage, extra }
      flags: {},
      childhoodDone: false,
      pendingStage: null,
      pendingExpand: null,
      stageQueue: [],
      stageLocks: {},
      usedThisYear: {},
      tally: { against: 0, favor: 0 },
      decisions: [],
      ended: null,
      timeline: []
    };
  }

  function equity() {
    return ch.home ? Math.max(0, ch.home.value - ch.home.mortgage) : 0;
  }
  function netWorth() {
    return ch.wealth + equity() - ch.debt;
  }

  // ── The conditions panel: the thesis, made legible ───────────────────────
  function renderConditions() {
    const id = D.identities[ch.identity];
    let h = '';

    h += '<h4>What you chose</h4>';
    h += '<p class="dim">Identity does not set your circumstances in this model. It changes how other people treat you.</p>';
    h += '<table class="cond">';
    h += row('Identity', esc(id.label));
    h += biasRow('Callback rate on applications', id.callbackMultiplier);
    h += biasRow('Rate of involuntary police contact', id.stopMultiplier, true);
    h += biasRow('Cost of carrying a record', id.recordPenalty, true);
    h += biasRow('Likelihood of being treated for pain', id.painDiscount);
    h += '</table>';

    h += '<h4>What the world assigned you</h4>';
    h += '<p class="dim">Each of these was rolled from a distribution conditioned on your identity. You did not choose any of it, and neither did anyone in the simulation.</p>';
    h += '<table class="cond">';
    for (const track of Object.keys(D.circumstance)) {
      const spec = D.circumstance[track];
      const det = ch.circumstanceDetail[track];
      const label = spec.levelLabels[det.landed];
      const lift = det.population > 0 ? det.conditional / det.population : 1;
      const liftTxt = lift >= 1.15
        ? `<span class="worse">${lift.toFixed(1)}× the population rate</span>`
        : lift <= 0.87
          ? `<span class="better">${lift.toFixed(1)}× the population rate</span>`
          : `<span class="dim">about the population rate</span>`;
      h += `<tr><td>${esc(spec.label)}</td><td><strong>${esc(label)}</strong><br>
            <small class="dim">${pct(det.conditional)} of people with your identity land here; ${pct(det.population)} of everyone does.</small><br>
            <small>${liftTxt}</small></td></tr>`;
    }
    h += '</table>';

    h += '<h4>What that adds up to right now</h4>';
    h += '<table class="cond">';
    const fs = effectsFor('familySupport');
    const hc = effectsFor('healthCoverage');
    const nb = effectsFor('neighborhood');
    h += row('Share of a shock or tuition bill your family covers', pct(fs.shockAbsorb));
    h += row('Medical cost multiplier', hc.medicalCostMultiplier.toFixed(1) + '×');
    h += row('Base police contact per year', pct(nb.stopBase * id.stopMultiplier));
    h += row('Cash', usd(ch.wealth));
    if (ch.home) h += row('Home equity', usd(equity()));
    if (ch.debt > 0) h += row('Debt', `<span class="worse">${usd(ch.debt)}</span>`);
    if (ch.flags.record) h += row('Criminal record', '<span class="worse">on file</span>');
    if (ch.tally.against + ch.tally.favor > 0) {
      h += row('Rolls tilted against you', `<span class="worse">${ch.tally.against}</span>`);
      h += row('Rolls tilted in your favour', `<span class="better">${ch.tally.favor}</span>`);
    }
    h += '</table>';

    h += `<p class="credit-foot">
            <strong>${readLives().toLocaleString()}+</strong> lives lived<br>
            Built by <strong>Patrick Kim</strong> &middot; Governor's Academy, Class of 2027
          </p>`;

    el.conditionsBody.innerHTML = h;

    function row(k, v) { return `<tr><td>${esc(k)}</td><td>${v}</td></tr>`; }
    function biasRow(k, m, higherIsWorse) {
      const neutral = Math.abs(m - 1) < 0.02;
      const bad = higherIsWorse ? m > 1.02 : m < 0.98;
      const cls = neutral ? 'dim' : (bad ? 'worse' : 'better');
      return `<tr><td>${esc(k)}</td><td class="${cls}">${m.toFixed(2)}×</td></tr>`;
    }
  }

  // ── Childhood ────────────────────────────────────────────────────────────
  // Narrated, not played year by year, with two decisions in high school.
  const PHASES = [
    { label: 'PreK', start: 0, end: 4 },
    { label: 'Elementary', start: 5, end: 10 },
    { label: 'Middle', start: 11, end: 13 },
    { label: 'High', start: 14, end: 17 }
  ];

  function fillTemplate(str, ctx) {
    return (str || '')
      .replace(/\{\{(\w+)\}\}/g, (m, k) => (ctx[k] !== undefined ? ctx[k] : ''))
      .replace(/\s{2,}/g, ' ')   // optional lines leave gaps when empty
      .replace(/\s+\./g, '.')
      .trim();
  }

  // "a well-resourced" vs "an under-resourced"
  function withArticle(phrase) {
    return (/^[aeiou]/i.test(phrase) ? 'an ' : 'a ') + phrase;
  }

  function phaseContext() {
    const sf = D.circumstance.schoolFunding.levelLabels[ch.circumstance.schoolFunding].toLowerCase();
    const sfx = effectsFor('schoolFunding');
    const hhx = effectsFor('household');
    const hcLabel = D.circumstance.healthCoverage.levelLabels[ch.circumstance.healthCoverage].toLowerCase();
    const hhLabel = D.circumstance.household.levelLabels[ch.circumstance.household].toLowerCase();
    const nb = ch.circumstance.neighborhood;

    return {
      name: esc(ch.name),
      household_desc: hhLabel,
      coverage_desc: hcLabel,
      early_care: ch.circumstance.household === 'upper' || ch.circumstance.household === 'middle'
        ? 'a structured preschool program'
        : (roll() < 0.5 ? 'a relative during the day' : 'whatever could be arranged around work schedules'),
      school_quality: withArticle(sf),
      class_size: sfx.classSize,
      counseling: sfx.counseling,
      enrichment: hhx.enrichment,
      teacher_line: roll() < 0.55
        ? 'One teacher takes an interest and it matters more than anything on the curriculum.'
        : 'No one teacher has the bandwidth to notice much.',
      peer_line: roll() < 0.6
        ? 'The peer group is mostly steady.'
        : 'The peer group churns as families move for rent.',
      policing_line: nb === 'high_stress'
        ? 'There is a school resource officer, and discipline referrals go to him.'
        : 'Discipline stays inside the building.',
      ap_line: sfx.apAccess
        ? 'AP and honors courses exist here, and getting into them depends on a referral.'
        : 'There are no AP courses offered at this school, so there is nothing to be referred to.',
      work_line: ch.circumstance.household === 'low' || ch.circumstance.household === 'lower_middle'
        ? 'Most kids you know work after school, because their families need them to.'
        : 'Hardly anyone you know needs to work during the school year.',
      hardship_line: ''
    };
  }

  function runChildhood() {
    say(`<strong>${esc(ch.name)}</strong> is born.`, 'beat');

    for (const ph of PHASES) {
      ch.age = ph.start;
      const ctx = phaseContext();

      // Phase-level drift from circumstance
      const sfx = effectsFor('schoolFunding');
      const hhx = effectsFor('household');
      const years = ph.end - ph.start + 1;

      ch.academicPerformance += sfx.academicPerYear * (years / 4);
      ch.wealth += hhx.yearlyDrag * (years / 4);

      // Shock, absorbed or not
      const shockP = 0.12 + (ch.circumstance.household === 'low' ? 0.12 : 0);
      if (roll() < shockP) {
        const absorb = effectsFor('familySupport').shockAbsorb;
        const net = -900 * (1 - absorb);
        ch.wealth += net;
        ctx.hardship_line = absorb >= 0.7
          ? 'A financial shock hits the household and is absorbed without anyone under eighteen noticing.'
          : `A financial shock hits the household and it is felt. (${usd(net)} gone from savings; a solid cushion would have absorbed ${pct(0.8)} of it.)`;
        if (absorb < 0.7) ch.academicPerformance -= 1;
      }

      const prose = fillTemplate(D.templates.childhood[ph.label], ctx);
      say(`<span class="age-tag">Age ${ph.start}–${ph.end}</span> ${prose}`, 'beat');
      ch.timeline.push({ phase: ph.label, summary: prose.slice(0, 160) });
      // The household's squeeze is not the child's debt.
      if (ch.wealth < 0) ch.wealth = 0;
    }

    ch.age = 14;
    renderStats();
    queueStages(stagesAtAge(14));
    save();
  }

  // Called when no stage is queued and childhood isn't over: go to the next
  // childhood decision, or turn eighteen.
  function continueChildhood() {
    const next = nextStageAge(ch.age);
    if (next !== null && next < 18) {
      ch.age = next;
      renderStats();
      queueStages(stagesAtAge(next));
      return;
    }

    // Childhood drift is the household's finances, not the child's. A minor
    // does not leave home carrying a negative balance.
    if (ch.wealth < 0) ch.wealth = 0;
    ch.age = 18;
    ch.childhoodDone = true;
    say('You turn eighteen. The transcript gets handed to the next institution as though it were a clean measurement of you, and nobody who reads it will see any of the context.', 'beat major');
    renderStats();
    queueStages(stagesAtAge(18));
  }

  // ── Requirements ─────────────────────────────────────────────────────────
  // One vocabulary for stage-option `show`, stage `showIf` and action `requires`.

  function parseFlag(spec) {
    const idx = spec.indexOf(':');
    if (idx === -1) return [spec, true];
    const k = spec.slice(0, idx);
    const v = spec.slice(idx + 1);
    return [k, v === 'true' ? true : v === 'false' ? false : v];
  }
  const flagIs = (s) => { const [k, v] = parseFlag(s); return (ch.flags[k] ?? null) === v; };
  const eduRank = (k) => D.education[k].rank;

  function qualified() {
    return eduRank(ch.education) >= 2 || !!ch.flags.trade || !!ch.flags.veteran;
  }

  // Returns null if met, or a short reason if not.
  function unmet(r) {
    if (!r) return null;
    if (r.age_min !== undefined && ch.age < r.age_min) return `from age ${r.age_min}`;
    if (r.age_max !== undefined && ch.age > r.age_max) return 'no longer available at your age';
    if (r.wealth_min !== undefined && ch.wealth < r.wealth_min) return `needs ${usd(r.wealth_min)} in cash`;
    if (r.addiction_min !== undefined && ch.addiction < r.addiction_min) return 'not needed right now';
    if (r.apAccess !== undefined && effectsFor('schoolFunding').apAccess !== r.apAccess) return 'your school does not offer this';
    if (r.job_in && !r.job_in.includes(ch.job)) return 'not in your current situation';
    if (r.job_not && r.job_not.includes(ch.job)) return 'you already have this or better';
    if (r.education_in && !r.education_in.includes(ch.education)) return 'you already have this or better';
    if (r.enrolled !== undefined && !!ch.enrolled !== r.enrolled) return r.enrolled ? 'only while enrolled' : 'not while you are enrolled';
    if (r.housing_in && !r.housing_in.includes(ch.housing)) return 'you already have a place';
    if (r.homeowner !== undefined && !!ch.home !== r.homeowner) return 'you already own a home';
    if (r.qualified && !qualified()) return 'needs a degree, a trade, or service first';
    if (r.flags_all) for (const s of r.flags_all) if (!flagIs(s)) return 'does not apply to you';
    if (r.flags_not) for (const s of r.flags_not) if (flagIs(s)) return s.startsWith('record') ? 'a criminal record rules this out' : 'already done';
    if (r.flags_any && !r.flags_any.some(flagIs)) return 'does not apply to you';
    return null;
  }
  const meets = (r) => unmet(r) === null;

  // ── Gates: open, or closed with a reason in the player's own terms ───────
  const STAGE_GATES = {
    always: () => ({ open: true }),

    militaryEligible() {
      if (ch.flags.record) return { open: false, why: 'a criminal record disqualifies you at the recruiter' };
      if (ch.health < 45) return { open: false, why: 'you would not pass the medical screening' };
      return { open: true };
    },

    // Elite admission is the genuinely gated one. The AP clause is the sharper
    // barrier: you cannot be denied a course your school never offered, but
    // the application still reads the absence as you.
    eliteEligible() {
      const ap = ch.academicPerformance;
      if (!effectsFor('schoolFunding').apAccess && ap < 2) {
        return { open: false, why: 'your school offered no AP or honours courses, and the application reads that as you' };
      }
      if (ap < -4) return { open: false, why: `your transcript is not competitive here (${apLabel(ap)})` };
      return { open: true };
    },

    // State universities are broadly accessible. A weak transcript is a
    // headwind on the odds, not a locked door — only the floor is a wall.
    stateEligible() {
      const ap = ch.academicPerformance;
      if (ap < -12) return { open: false, why: `your transcript falls below the admissions floor (${apLabel(ap)})` };
      return { open: true };
    },

    apClasses() {
      if (!effectsFor('schoolFunding').apAccess) return { open: false, why: 'your school offers no AP or honours courses to take' };
      return { open: true };
    },

    activityFees() {
      if (ch.circumstance.household === 'low' && ch.circumstance.familySupport === 'none') {
        return { open: false, why: 'fees, gear and rides your family can’t cover' };
      }
      return { open: true };
    },

    tutorAffordable() {
      const hh = ch.circumstance.household;
      if (hh === 'low' || hh === 'lower_middle') return { open: false, why: 'a private tutor costs more than your household can spend' };
      return { open: true };
    },

    canRent() {
      if (ch.wealth < 2400 && ch.circumstance.familySupport === 'none') {
        return { open: false, why: `first, last and deposit come to $2,400; you have ${usd(ch.wealth)} and nobody who can front it` };
      }
      return { open: true };
    },

    businessCapital() {
      if (ch.wealth < 5000 && ch.circumstance.familySupport !== 'solid') {
        return { open: false, why: `it takes about $5,000 to start; you have ${usd(ch.wealth)} and no family money to borrow` };
      }
      return { open: true };
    },

    downPayment() {
      const gift = ch.circumstance.familySupport === 'solid' ? E.home.familyGift : 0;
      if (ch.wealth + gift < E.home.down) {
        return { open: false, why: gift
          ? `even with ${usd(gift)} from family you are short of the ${usd(E.home.down)} down payment`
          : `you would need ${usd(E.home.down)} down, and you have ${usd(ch.wealth)} with no family money behind you` };
      }
      return { open: true };
    }
  };

  function apLabel(ap) {
    if (ap >= 6) return 'strong transcript';
    if (ap >= 1) return 'solid transcript';
    if (ap >= -6) return 'mixed transcript';
    return 'weak transcript';
  }

  function checkGate(name) {
    if (!name) return { open: true };
    const g = STAGE_GATES[name];
    return g ? g() : { open: true };
  }

  // ── Odds machinery ───────────────────────────────────────────────────────
  // Outcomes are ordered best-first by convention in data.js. A tilt multiplier
  // below 1 shifts mass away from the best outcomes toward the worst.
  function tilt(outcomes, m) {
    const n = outcomes.length;
    if (n < 2 || Math.abs(m - 1) < 0.001) return outcomes.map((o) => o.chance);
    const w = outcomes.map((o, i) => o.chance * Math.pow(m, n - 1 - i));
    const total = w.reduce((a, b) => a + b, 0);
    return w.map((x) => x / total);
  }

  // Returns the multiplier applied to a roll, plus a human explanation.
  function biasFor(spec) {
    const id = D.identities[ch.identity];
    const tags = spec.tags || [];
    const has = (t) => tags.includes(t);
    let m = 1;
    const why = [];

    // Anything someone else screens: a job, an admission, a loan.
    if (has('job') || has('college') || has('lending')) {
      m *= id.callbackMultiplier;
      if (id.callbackMultiplier < 0.99) why.push(`applications screened at ${id.callbackMultiplier.toFixed(2)}×`);
    }
    if (has('health') && id.painDiscount < 0.99) {
      m *= id.painDiscount;
      why.push(`reported symptoms discounted at ${id.painDiscount.toFixed(2)}×`);
    }
    if (ch.flags.record && (has('job') || has('housing') || has('lending'))) {
      const penalty = 1 / id.recordPenalty;
      m *= penalty;
      why.push(`record costs you ${penalty.toFixed(2)}× here (${id.recordPenalty.toFixed(2)}× the penalty applied to a White applicant with the same record)`);
    }
    if (ch.addiction >= 40 && (has('job') || has('college'))) {
      m *= 0.85;
      why.push('substance use is affecting reliability');
    }
    if (ch.flags.mentor && has('job')) {
      m *= 1.1;
      why.push('a mentor’s introductions (1.10×)');
    }

    // Circumstance mods declared on the roll
    const mods = spec.mods || {};
    if (mods.schoolFunding) {
      const lvl = ch.circumstance.schoolFunding;
      const b = lvl === 'well' ? 1.12 : lvl === 'moderate' ? 1.0 : 0.88;
      m *= b;
      if (b !== 1) why.push(`${lvl === 'well' ? 'well' : 'under'}-resourced schooling (${b.toFixed(2)}×)`);
    }
    if (mods.familySupport) {
      const lvl = ch.circumstance.familySupport;
      const b = lvl === 'solid' ? 1.15 : lvl === 'thin' ? 1.0 : 0.88;
      m *= b;
      if (b !== 1) why.push(`family cushion (${b.toFixed(2)}×)`);
    }
    if (mods.coverage) {
      const lvl = ch.circumstance.healthCoverage;
      const b = lvl === 'employer' ? 1.15 : lvl === 'medicaid' ? 0.95 : 0.75;
      m *= b;
      why.push(`${D.circumstance.healthCoverage.levelLabels[lvl].toLowerCase()} (${b.toFixed(2)}×)`);
    }
    if (mods.academicPerformance) {
      const b = 1 + Math.max(-0.2, Math.min(0.25, ch.academicPerformance / 60));
      m *= b;
      if (Math.abs(b - 1) > 0.02) why.push(`your transcript (${b.toFixed(2)}×)`);
    }
    if (mods.hiring && ch.flags.record) m *= 0.8;

    return { m, why };
  }

  function pickOutcome(outcomes, weights) {
    const r = roll();
    let cum = 0;
    for (let i = 0; i < outcomes.length; i++) {
      cum += weights[i];
      if (r <= cum) return i;
    }
    return outcomes.length - 1;
  }

  function oddsBox(m, base, weights, why) {
    if (Math.abs(m - 1) <= 0.02) return '';
    const dir = weights[0] < base[0] ? 'worse' : 'better';
    let h = `<div class="odds ${dir}">Best outcome: <strong>${pct(weights[0])}</strong>` +
            ` &middot; unbiased it would have been <strong>${pct(base[0])}</strong>`;
    if (why.length) h += `<br><small>${esc(why.join('; '))}</small>`;
    return h + '</div>';
  }

  // Rolls one tilted outcome and applies it. Every chosen roll goes through here.
  function runRoll(spec, title) {
    const notes = [];
    if (spec.cost && spec.cost.wealth) { ch.wealth -= spec.cost.wealth; settleCash(); }

    const { m, why } = biasFor(spec);
    const base = spec.outcomes.map((o) => o.chance);
    const weights = tilt(spec.outcomes, m);
    const out = spec.outcomes[pickOutcome(spec.outcomes, weights)];

    if (m < 0.98) ch.tally.against++;
    else if (m > 1.02) ch.tally.favor++;

    applyEffects(out.effects, notes);
    setFlags(out.flags_set);

    let html = `${ageTag()} <strong>${esc(title)}.</strong> ${esc(out.text)}`;
    if (notes.length) html += ` <span class="dim">${notes.join(' ')}</span>`;
    html += oddsBox(m, base, weights, why);
    say(html, out.retry ? 'bad' : 'action');
    return out;
  }

  // ── Applying effects ─────────────────────────────────────────────────────
  function setJob(key) {
    const j = D.jobs[key];
    if (!j) return;
    ch.job = key;
    ch.salary = j.salary;
    ch.yearsEmployed = 0;
    if (key !== 'service') ch.service = null;
  }

  // Anything that would take cash below zero is borrowed, not owned.
  function settleCash() {
    if (ch.wealth < 0) {
      ch.debt += Math.round(-ch.wealth);
      ch.wealth = 0;
    }
  }

  function nextDegree() {
    return eduRank(ch.education) < 2 ? 'associate' : 'state_degree';
  }

  function applyEffects(fx, notes) {
    notes = notes || [];
    if (!fx) return notes;
    const fs = effectsFor('familySupport');

    if (fx.setJob) setJob(fx.setJob);
    if (fx.promote) {
      const promo = E.promotion[ch.job];
      if (promo) setJob(promo.to);
      else ch.salary = Math.round(ch.salary * 1.12);
      notes.push(`Now ${D.jobs[ch.job].title}, ${usd(ch.salary)} a year.`);
    }
    if (fx.enroll) {
      const p = D.programs[fx.enroll.program];
      const years = fx.enroll.years || p.years;
      ch.enrolled = {
        program: fx.enroll.program,
        label: p.label,
        until: ch.age + years,
        tuition: fx.enroll.tuition,
        degree: p.degree || nextDegree()
      };
      notes.push(`Tuition ${usd(fx.enroll.tuition)} a year for ${years} years.`);
    }
    if (fx.enlist) {
      if (ch.job !== 'service') setJob('service');
      ch.service = { until: ch.age + E.serviceYears };
      ch.flags.veteran = true;
    }
    if (fx.housing) ch.housing = fx.housing;
    if (fx.buyHome) {
      const gift = ch.circumstance.familySupport === 'solid' ? E.home.familyGift : 0;
      const own = E.home.down - gift;
      ch.wealth -= own;
      ch.home = { value: E.home.price, mortgage: E.home.price - E.home.down, extra: fx.buyHome.higherRate ? E.home.higherRateCost : 0 };
      ch.housing = 'owner';
      if (gift) notes.push(`Your family put ${usd(gift)} toward the down payment.`);
      if (fx.buyHome.higherRate) notes.push(`The worse rate costs ${usd(E.home.higherRateCost)} a year.`);
    }
    if (typeof fx.health === 'number') ch.health = Math.max(0, Math.min(100, ch.health + fx.health));
    if (typeof fx.wealth === 'number') {
      let w = fx.wealth;
      if (w < 0 && fx.medical) w *= effectsFor('healthCoverage').medicalCostMultiplier;
      if (w < 0 && fx.familyPays && fs.shockAbsorb > 0) {
        const covered = Math.round(-w * fx.familyPays * fs.shockAbsorb);
        w += covered;
        notes.push(`Family covered ${usd(covered)}.`);
      }
      ch.wealth += Math.round(w);
    }
    if (typeof fx.debt === 'number') ch.debt = Math.max(0, ch.debt + fx.debt);
    if (typeof fx.academicPerformance === 'number') ch.academicPerformance += fx.academicPerformance;
    if (typeof fx.addiction === 'number') ch.addiction = Math.max(0, Math.min(100, ch.addiction + fx.addiction));

    settleCash();
    return notes;
  }

  function setFlags(obj) {
    if (!obj) return;
    for (const k of Object.keys(obj)) ch.flags[k] = obj[k];
  }

  // ── Between-stage actions ────────────────────────────────────────────────
  function doAction(actionId) {
    const a = D.actions[actionId];
    if (!a || ch.pendingStage || ch.ended) return;
    closeSheet();
    ch.usedThisYear[actionId] = true;
    const out = runRoll(a, a.label);
    ch.timeline.push({ age: ch.age, action: actionId, outcome: out.id });
    renderStats();
    checkDeath();
    save();
  }

  // ── A year ───────────────────────────────────────────────────────────────
  // Returns { interrupt } — true when something happened the player should
  // react to before skipping further (a layoff, an arrest, leaving school).
  function liveYear() {
    ch.age++;
    ch.usedThisYear = {};
    let interrupt = false;
    const triggers = [];
    say(`<span class="age-tag age-major">Age ${ch.age}</span>`, 'year');

    const nb = effectsFor('neighborhood');
    const fs = effectsFor('familySupport');
    const id = D.identities[ch.identity];

    // Passive health drift: neighbourhood, then age, then recovery. How fast
    // a body recovers depends on whether anyone treats it, which is coverage.
    ch.health += nb.healthPerYear;
    if (ch.age > 55) ch.health -= 0.5;
    if (ch.age > 60) ch.health -= 1;
    if (ch.health < 80) ch.health += E.recovery[ch.circumstance.healthCoverage];

    // ── The year's ledger ──────────────────────────────────────────────────
    let gross = 0;
    if (ch.salary > 0) {
      gross = ch.salary;
      ch.yearsEmployed++;
      ch.salary = Math.round(ch.salary * (1 + D.jobs[ch.job].raise));
    }
    const tax = Math.round(gross * E.taxRate);
    const earned = gross - tax;

    const C = E.costOfLiving;
    let col;
    if (ch.housing === 'owner') col = C.owner + (ch.home ? ch.home.extra : 0);
    else if (ch.housing === 'own') col = C.own;
    else if (ch.housing === 'roommates') col = C.roommates;
    else col = earned === 0 ? C.dependent : C.home;
    if (ch.flags.frugal) col = Math.round(col * 0.85);

    let tuitionOwn = 0;
    let familyPaid = 0;
    if (ch.enrolled && ch.enrolled.tuition > 0) {
      familyPaid = Math.round(ch.enrolled.tuition * fs.shockAbsorb);
      tuitionOwn = ch.enrolled.tuition - familyPaid;
    }

    // Spending rises with income: of what's left after necessities, most is
    // spent. Only a debt-free household gets to that stage; with debt, the
    // surplus goes to the debt first.
    const leftover = earned - col - tuitionOwn;
    if (leftover > 0 && ch.debt === 0) {
      col += Math.round(leftover * E.lifestyleShare * (ch.flags.frugal ? 0.6 : 1));
    }

    const net = earned - col - tuitionOwn;
    let paidDebt = 0;
    if (net >= 0) {
      // Surplus pays down debt before it becomes savings.
      paidDebt = Math.min(ch.debt, net);
      ch.debt -= paidDebt;
      ch.wealth += net - paidDebt;
    } else {
      ch.wealth += net;
    }
    const shortfall = ch.wealth < 0 ? Math.round(-ch.wealth) : 0;
    settleCash();

    let line = gross > 0 ? `<strong>${esc(D.jobs[ch.job].title)}</strong> · earned ${usd(earned)} after tax` : 'No income';
    line += ` · living ${usd(col)}`;
    if (ch.enrolled && ch.enrolled.tuition > 0) {
      line += ` · tuition ${usd(ch.enrolled.tuition)}`;
      if (familyPaid > 0) line += ` <span class="better">(family paid ${usd(familyPaid)})</span>`;
    }
    line += ` → <strong class="${net >= 0 ? 'better' : 'worse'}">${signed(net)}</strong>`;
    if (paidDebt > 0) line += ` · ${usd(paidDebt)} toward debt`;
    if (shortfall > 0) line += ` · <span class="worse">${usd(shortfall)} borrowed</span>`;

    // Debt interest and the return on cash
    if (ch.debt > 0) {
      const interest = Math.round(ch.debt * E.debtInterest);
      ch.debt += interest;
      line += ` · interest <span class="worse">${usd(interest)}</span>`;
    }
    if (ch.wealth > E.cashBuffer) {
      ch.wealth += Math.round((ch.wealth - E.cashBuffer) * E.cashReturn);
    }
    if (ch.home) {
      ch.home.value = Math.round(ch.home.value * (1 + E.home.appreciation));
      ch.home.mortgage = Math.max(0, ch.home.mortgage - E.home.principalPerYear);
    }
    say(line, 'minor');

    // ── The squeeze: a losing year with real debt forces a move down ───────
    if (net < 0 && ch.debt > E.squeezeDebt) {
      if (ch.housing === 'owner' && ch.debt > E.sellDebt && ch.home) {
        const eq = equity();
        const toDebt = Math.min(ch.debt, eq);
        ch.debt -= toDebt;
        ch.wealth += eq - toDebt;
        ch.home = null;
        ch.housing = 'own';
        say(`<strong>You sell the house.</strong> ${usd(eq)} in equity goes to the debt first. You rent again.`, 'bad');
        interrupt = true;
      } else if (ch.housing === 'own') {
        ch.housing = 'roommates';
        say('<strong>You give up the apartment.</strong> The rent was more than the paycheck. You move into a shared place.', 'bad');
        interrupt = true;
      } else if (ch.housing === 'roommates' && ch.circumstance.familySupport !== 'none') {
        ch.housing = 'home';
        say('<strong>You move back in with family.</strong> It’s cheaper, and there’s a room for you. Not everyone has one.', 'bad');
        interrupt = true;
      }
    }

    // ── School ─────────────────────────────────────────────────────────────
    if (ch.enrolled) {
      if (ch.age < ch.enrolled.until) {
        // Leaving without the degree is driven by money, not ability.
        const dr = E.dropout;
        const low = ch.circumstance.household === 'low' ? dr.lowIncome : 0;
        const p = dr.base + dr[ch.circumstance.familySupport] + low;
        if (roll() < p) {
          const label = ch.enrolled.label;
          ch.enrolled = null;
          if (eduRank(ch.education) < 1) ch.education = 'some_college';
          const counter = ch.circumstance.familySupport === 'solid' ? '' :
            `<div class="odds worse">Chance of leaving this year: <strong>${pct(p)}</strong> &middot; with a solid family cushion it would have been <strong>${pct(dr.base + dr.solid)}</strong></div>`;
          say(`<strong>You leave ${esc(label)}.</strong> The car, the rent, a shift you couldn't drop. The debt stays; the degree doesn't come.${counter}`, 'bad');
          interrupt = true;
        }
      } else {
        const deg = ch.enrolled.degree;
        const label = ch.enrolled.label;
        ch.enrolled = null;
        if (eduRank(deg) > eduRank(ch.education)) ch.education = deg;
        ch.academicPerformance += 3;
        say(`<strong>You graduate</strong> from ${esc(label)}: ${esc(D.education[deg].label)}.`, 'action');
        triggers.push(deg === 'associate' ? 'graduated_associate' : 'graduated_bachelor');
      }
    }

    // ── Service ────────────────────────────────────────────────────────────
    if (ch.job === 'service' && ch.service && ch.age >= ch.service.until) {
      triggers.push('enlistment_up');
    }

    // ── Promotion: a hiring decision, so identity bias applies ─────────────
    const promo = E.promotion[ch.job];
    if (promo && ch.yearsEmployed >= 2 && (!promo.needsEducation || promo.needsEducation.includes(ch.education))) {
      const p = promo.chance * id.callbackMultiplier;
      if (roll() < p) {
        const from = D.jobs[ch.job].title;
        setJob(promo.to);
        let msg = `<strong>Promoted.</strong> ${esc(from)} → ${esc(D.jobs[ch.job].title)}, now ${usd(ch.salary)}.`;
        if (id.callbackMultiplier < 0.99) {
          msg += `<div class="odds worse">Promotion chance this year: <strong>${pct(p)}</strong> &middot; unbiased it would have been <strong>${pct(promo.chance)}</strong></div>`;
        }
        say(msg, 'action');
      }
      if (id.callbackMultiplier < 0.99) ch.tally.against++;
    }

    // ── Layoff ─────────────────────────────────────────────────────────────
    if (ch.salary > 0) {
      const risk = D.jobs[ch.job].layoffRisk * (ch.flags.record ? 1.4 : 1) * (ch.addiction >= 50 ? 1.5 : 1);
      if (roll() < risk) {
        say(ch.job === 'owner'
          ? '<strong>Your business closes.</strong> A slow season and a lease you couldn’t renegotiate.'
          : `<strong>Laid off</strong> from ${esc(D.jobs[ch.job].title)}. Look for work in the menu below.`, 'bad');
        setJob('unemployed');
        ch.idleYears = 0;
        triggers.push('out_of_work');
        interrupt = true;
      }
    }

    // Out of work and not in school: ask what to do about it after the first
    // idle year, then every third. (A job lost above has already asked.)
    if (ch.job === 'unemployed' && !ch.enrolled && !triggers.includes('out_of_work')) {
      ch.idleYears = (ch.idleYears || 0) + 1;
      if (ch.idleYears === 1 || ch.idleYears % 3 === 0) triggers.push('out_of_work');
    } else if (ch.job !== 'unemployed') {
      ch.idleYears = 0;
    }

    // ── Addiction drag ─────────────────────────────────────────────────────
    if (ch.addiction >= 20) {
      ch.health += ch.addiction >= 60 ? -6 : ch.addiction >= 40 ? -3 : -1.5;
      ch.wealth -= ch.addiction >= 40 ? 900 : 300;
      say('Substance use costs you health and money this year.', 'minor');
      if (ch.addiction >= 70 && roll() < 0.08) {
        const cost = Math.round(2400 * effectsFor('healthCoverage').medicalCostMultiplier);
        ch.health -= 14;
        ch.wealth -= cost;
        say(`<strong>Overdose.</strong> You survive it. The bill is ${usd(cost)}, scaled by your coverage.`, 'bad');
        interrupt = true;
      }
      settleCash();
    }

    // ── Police contact — the one place identity multiplies a rate directly ─
    const stopP = Math.min(0.6, nb.stopBase * id.stopMultiplier + (ch.flags.record ? 0.05 : 0));
    if (roll() < stopP) {
      const counter = `<div class="odds worse">Annual stop probability for you: <strong>${pct(stopP)}</strong> &middot; at the neighbourhood's base rate it would be <strong>${pct(Math.min(0.6, nb.stopBase))}</strong></div>`;
      const showCounter = id.stopMultiplier > 1.02 || ch.flags.record;
      if (showCounter) ch.tally.against++;
      const r = roll();
      if (r < 0.72) {
        ch.health -= 1;
        say('Stopped and questioned. Released.' + (showCounter ? counter : ''), 'bad');
      } else if (r < 0.94) {
        ch.wealth -= 220;
        settleCash();
        say('Stopped and cited. The fine is $220 and the court date is on a workday.' + (showCounter ? counter : ''), 'bad');
      } else {
        ch.health -= 4;
        setFlags({ record: true, charged: true });
        say('<strong>Arrested.</strong> Charges filed. This will follow you into every application from here.' + (showCounter ? counter : ''), 'bad');
        interrupt = true;
      }
    }

    // ── A random life event ────────────────────────────────────────────────
    if (roll() < 0.5) {
      const evKeys = Object.keys(D.events);
      const totalW = evKeys.reduce((s, k) => s + D.events[k].weight, 0);
      let r = roll() * totalW, chosen = evKeys[0];
      for (const k of evKeys) { r -= D.events[k].weight; if (r <= 0) { chosen = k; break; } }
      const ev = D.events[chosen];
      const out = ev.outcomes[pickOutcome(ev.outcomes, ev.outcomes.map((o) => o.chance))];

      const fx = Object.assign({}, out.effects);
      let absorbedNote = '';
      if (ev.absorbable && fx.wealth < 0) {
        if (fx.medical) { fx.wealth *= effectsFor('healthCoverage').medicalCostMultiplier; fx.medical = false; }
        if (fs.shockAbsorb > 0) {
          const saved = Math.round(fx.wealth * fs.shockAbsorb);
          fx.wealth -= saved;
          absorbedNote = ` <span class="odds better">Your family absorbed ${usd(saved)} of this.</span>`;
        } else {
          absorbedNote = ` <span class="odds worse">You absorb all ${usd(fx.wealth)} of this yourself.</span>`;
        }
      }
      applyEffects(fx);
      setFlags(out.flags_set);
      say(`<strong>${esc(ev.label)}.</strong> ${esc(out.text)}${absorbedNote}`, 'event');
    }

    ch.health = Math.max(0, Math.min(100, ch.health));
    return { interrupt, triggers };
  }

  function ageUp() {
    if (!ch || ch.pendingStage || ch.ended) return { stop: true };
    const { interrupt, triggers } = liveYear();
    renderStats();
    checkDeath();
    if (!ch.ended) {
      // Retirement ends the life; nothing else is asked that year.
      const atAge = stagesAtAge(ch.age);
      const ending = atAge.filter((k) => D.stages[k].end);
      queueStages(ending.length ? ending : triggers.map(stageForTrigger).filter(Boolean).concat(atAge));
    }
    save();
    return { stop: interrupt || !!ch.pendingStage || !!ch.ended };
  }

  // Runs years until the next decision, stopping early if something happens
  // that the player should get to respond to.
  function skipAhead() {
    for (let i = 0; i < 80; i++) {
      if (ageUp().stop) break;
    }
  }

  function checkDeath() {
    if (ch.health <= 0 && !ch.ended) endLife('died');
  }

  // ── The end ──────────────────────────────────────────────────────────────
  function endLife(reason) {
    ch.ended = reason;
    ch.pendingStage = null;
    ch.stageQueue = [];
    const id = D.identities[ch.identity];
    const lvl = (t) => D.circumstance[t].levelLabels[ch.circumstance[t]].toLowerCase();

    say(reason === 'died'
      ? `<strong>${esc(ch.name)} dies at ${ch.age}.</strong>`
      : `<strong>${esc(ch.name)} retires at ${ch.age}.</strong>`, 'beat major');

    const nw = netWorth();
    let h = `<h3>${esc(ch.name)}, ${ch.age}</h3>`;
    h += '<table class="cond">';
    h += `<tr><td>Net worth</td><td class="${nw >= 0 ? 'better' : 'worse'}">${nw < 0 ? '−' : ''}${usd(nw)}</td></tr>`;
    if (ch.home) h += `<tr><td>Home equity</td><td>${usd(equity())}</td></tr>`;
    if (ch.debt > 0) h += `<tr><td>Debt</td><td class="worse">${usd(ch.debt)}</td></tr>`;
    h += `<tr><td>Education</td><td>${esc(D.education[ch.education].label)}</td></tr>`;
    h += `<tr><td>Last job</td><td>${esc(D.jobs[ch.job].title)}</td></tr>`;
    h += `<tr><td>Criminal record</td><td>${ch.flags.record ? '<span class="worse">yes</span>' : 'no'}</td></tr>`;
    h += `<tr><td>Rolls tilted against you</td><td class="${ch.tally.against ? 'worse' : 'dim'}">${ch.tally.against}</td></tr>`;
    h += `<tr><td>Rolls tilted in your favour</td><td class="${ch.tally.favor ? 'better' : 'dim'}">${ch.tally.favor}</td></tr>`;
    h += '</table>';

    h += `<p class="dim">You chose to be ${esc(id.label)}. The world assigned you ${withArticle(esc(lvl('schoolFunding')))} school district, ${withArticle(esc(lvl('household')))} household, ${esc(lvl('familySupport'))}, and ${esc(lvl('healthCoverage'))} coverage. Your applications were screened at ${id.callbackMultiplier.toFixed(2)}× the whole way through.</p>`;

    if (ch.decisions.length) {
      h += '<h4>What you chose</h4><ol class="decisions">';
      for (const d of ch.decisions) {
        h += `<li><span class="age-tag">Age ${d.age}</span> <strong>${esc(d.choice)}</strong> — ${esc(d.outcome)}</li>`;
      }
      h += '</ol>';
    }
    h += '<p class="dim">Play again with a different identity and make the same choices. The choices will be yours both times. The odds won’t.</p>';
    say(h, 'summary');

    renderStats();
    syncLock();
  }

  // ── Rendering ────────────────────────────────────────────────────────────
  // Bars scale on the compositor rather than animating width.
  function setBar(node, value0to100) {
    const v = Math.max(0, Math.min(100, value0to100));
    node.style.transform = 'scaleX(' + (v / 100) + ')';
  }

  function renderStats() {
    if (!ch) return;
    el.statAge.textContent = ch.age;
    el.statHealth.textContent = Math.round(ch.health);
    const nw = netWorth();
    el.statWealth.textContent = (nw < 0 ? '−' : '') + usd(nw);
    el.statWealth.classList.toggle('worse', nw < 0);
    const smarts = Math.max(0, Math.min(100, 50 + ch.academicPerformance * 2));
    el.statSmarts.textContent = Math.round(smarts);
    setBar(el.barHealth, ch.health);
    setBar(el.barSmarts, smarts);

    if (ch.addiction > 0) {
      el.addictionRow.classList.remove('hidden');
      el.statAddiction.textContent = Math.round(ch.addiction);
      setBar(el.barAddiction, ch.addiction);
    } else {
      el.addictionRow.classList.add('hidden');
    }

    el.charName.textContent = ch.name;
    const bits = [D.identities[ch.identity].label];
    if (ch.salary > 0) bits.push(D.jobs[ch.job].title + ' · ' + usd(ch.salary));
    if (ch.enrolled) bits.push('at ' + ch.enrolled.label.toLowerCase());
    else if (ch.education !== 'hs' && ch.age >= 18) bits.push(D.education[ch.education].label);
    if (ch.housing === 'owner') bits.push('homeowner');
    if (ch.flags.record) bits.push('record');
    if (ch.debt > 0) bits.push(usd(ch.debt) + ' debt');
    el.charSub.textContent = bits.join(' · ');
    syncLock();
  }

  // ── Stages ───────────────────────────────────────────────────────────────
  // Rendered inline in the feed, not in a sheet: this is the main thing being
  // asked, so it should sit in the story rather than behind a menu.

  function stagesAtAge(age) {
    return Object.keys(D.stages).filter((k) => D.stages[k].age === age);
  }
  function stageForTrigger(t) {
    return Object.keys(D.stages).find((k) => D.stages[k].trigger === t) || null;
  }
  function nextStageAge(after) {
    let best = null;
    for (const s of Object.values(D.stages)) {
      if (typeof s.age === 'number' && s.age > after && (best === null || s.age < best)) best = s.age;
    }
    return best;
  }

  function visibleOptions(stage) {
    return (stage.options || []).filter((o) => meets(o.show));
  }

  function queueStages(ids) {
    for (const i of ids) if (!ch.stageQueue.includes(i)) ch.stageQueue.push(i);
    if (!ch.pendingStage) openNext();
  }

  function openNext() {
    while (ch.stageQueue.length) {
      const sid = ch.stageQueue.shift();
      const st = D.stages[sid];
      if (!st) continue;
      if (st.end) { endLife(st.end); return; }
      if (st.showIf && !meets(st.showIf)) continue;
      if (!visibleOptions(st).length) continue;
      ch.pendingStage = sid;
      ch.pendingExpand = null;
      ch.stageLocks = {};
      renderStage();
      save();
      return;
    }
    ch.pendingStage = null;
    if (!ch.childhoodDone) { continueChildhood(); return; }
    syncLock();
  }

  function stageDone() {
    const old = el.feed.querySelector('.decision');
    if (old) old.remove();
    ch.pendingStage = null;
    ch.pendingExpand = null;
    ch.stageLocks = {};
    renderStats();
    openNext();
    save();
  }

  function renderStage() {
    const stage = D.stages[ch.pendingStage];
    if (!stage) return;

    const old = el.feed.querySelector('.decision');
    if (old) old.remove();

    const card = document.createElement('div');
    card.className = 'decision';
    const list = document.createElement('div');
    list.className = 'decision-options';
    let anyOpen = false;

    if (ch.pendingExpand === 'collegeTiers') {
      card.innerHTML =
        `<h3>Which college?</h3>
         <p class="decision-sub">Where you can go was largely decided before you applied.</p>`;
      for (const tier of D.collegeTiers) {
        const gate = ch.stageLocks['tier:' + tier.id] || checkGate(tier.gate);
        anyOpen = anyOpen || gate.open;
        list.appendChild(optionButton({
          label: tier.label, blurb: oddsBlurb(tier), icon: 'school', gate,
          onPick: () => pickTier(tier)
        }));
      }
      card.appendChild(list);
      const back = document.createElement('button');
      back.className = 'decision-back';
      back.textContent = '← Back';
      back.onclick = () => { ch.pendingExpand = null; renderStage(); save(); };
      card.appendChild(back);
    } else {
      card.innerHTML =
        `<span class="age-tag">Age ${ch.age}</span>
         <h3>${esc(stage.title)}</h3>
         <p class="decision-sub">${esc(stage.prompt)}</p>`;
      for (const opt of visibleOptions(stage)) {
        const gate = ch.stageLocks[opt.id] || checkGate(opt.gate);
        anyOpen = anyOpen || gate.open;
        list.appendChild(optionButton({
          label: opt.label, blurb: optionBlurb(opt), icon: opt.icon, gate,
          onPick: () => pickOption(stage, opt)
        }));
      }
      card.appendChild(list);
    }

    el.feed.appendChild(card);
    // Show the question from its title; a tall card would otherwise open
    // scrolled past its prompt.
    // (Set scrollTop directly: scrollIntoView would also scroll the phone frame.)
    el.feed.scrollTop = card.offsetHeight > el.feed.clientHeight
      ? card.offsetTop - el.feed.offsetTop - 8
      : el.feed.scrollHeight;
    syncLock();

    // Every door closed (all rejections): the year moves on without a choice.
    if (!anyOpen && ch.pendingExpand !== 'collegeTiers') stageDone();
  }

  function optionButton({ label, blurb, icon, gate, onPick }) {
    const b = document.createElement('button');
    b.className = 'decision-option' + (gate.open ? '' : ' locked');
    b.disabled = !gate.open;
    b.innerHTML =
      `<span class="tab-icon" data-icon="${icon || 'age'}"></span>
       <span class="decision-text">
         <strong>${esc(label)}</strong>
         <small>${gate.open ? blurb || '' : esc('Closed — ' + gate.why)}</small>
       </span>`;
    if (gate.open) b.onclick = onPick;
    return b;
  }

  // Blurb plus the biased best-case odds, when the option is a roll.
  function optionBlurb(opt) {
    let h = esc(opt.blurb || '');
    if (opt.roll) {
      const { m } = biasFor(opt.roll);
      const w = tilt(opt.roll.outcomes, m);
      const base = opt.roll.outcomes[0].chance;
      h += Math.abs(m - 1) > 0.02
        ? `<br><span class="${w[0] < base ? 'worse' : 'better'}">${pct(w[0])} best case</span> <span class="dim">(unbiased ${pct(base)})</span>`
        : `<br><span class="dim">${pct(base)} best case</span>`;
    }
    return h;
  }

  const TIER_SPEC = { tags: ['college'], mods: { academicPerformance: 1, familySupport: 1 } };

  function oddsBlurb(tier) {
    const { m } = biasFor(TIER_SPEC);
    const w = tilt(tier.outcomes, m);
    const admit = (ws) => ws.reduce((s, x, i) => s + (tier.outcomes[i].retry ? 0 : x), 0);
    const cost = tier.cost && tier.cost.wealth ? ` · $${tier.cost.wealth} to apply` : '';
    const base = tier.outcomes.map((o) => o.chance);
    if (Math.abs(m - 1) > 0.02) {
      return `<span class="${w[0] < base[0] ? 'worse' : 'better'}">${pct(admit(w))} admitted, ${pct(w[0])} ${tier.best}</span> <span class="dim">(unbiased ${pct(admit(base))}, ${pct(base[0])})${cost}</span>`;
    }
    return `<span class="dim">${pct(admit(base))} admitted, ${pct(base[0])} ${tier.best}${cost}</span>`;
  }

  function logDecision(choice, outcome) {
    ch.decisions.push({ age: ch.age, choice, outcome });
  }

  function pickOption(stage, opt) {
    if (opt.expands) {
      ch.pendingExpand = opt.expands;
      renderStage();
      save();
      return;
    }
    const old = el.feed.querySelector('.decision');
    if (old) old.remove();

    let text;
    if (opt.roll) {
      const out = runRoll(Object.assign({ cost: opt.cost }, opt.roll), opt.label);
      text = out.text;
      logDecision(opt.label, out.text);
      if (out.retry) {
        ch.stageLocks[opt.id] = { open: false, why: 'tried this year, and it didn’t happen' };
        renderStats();
        renderStage();
        save();
        return;
      }
    } else {
      const r = opt.resolve || {};
      if (opt.cost && opt.cost.wealth) ch.wealth -= opt.cost.wealth;
      const notes = applyEffects(r.effects);
      setFlags(r.flags_set);
      text = r.text || '';
      say(`${ageTag()} <strong>${esc(opt.label)}.</strong> ${esc(text)}${notes.length ? ' <span class="dim">' + notes.join(' ') + '</span>' : ''}`, 'action');
      logDecision(opt.label, text);
    }
    narrate(ch.pendingStage + '.' + opt.id, text);
    stageDone();
  }

  function pickTier(tier) {
    const old = el.feed.querySelector('.decision');
    if (old) old.remove();
    const out = runRoll(Object.assign({ cost: tier.cost, outcomes: tier.outcomes }, TIER_SPEC), tier.label);
    logDecision(tier.label, out.text);
    if (out.retry) {
      ch.stageLocks['tier:' + tier.id] = { open: false, why: 'rejected this year' };
      renderStats();
      renderStage();
      save();
      return;
    }
    narrate('college.' + tier.id, out.text);
    stageDone();
  }

  // Age Up is disabled while a decision is outstanding; after the end it
  // becomes the way to start again.
  function syncLock() {
    if (!ch || !el.ageUpBtn) return;
    const locked = !!ch.pendingStage;
    const ended = !!ch.ended;
    el.ageUpBtn.disabled = locked;
    el.ageUpBtn.classList.toggle('waiting', locked);
    el.tabBar.classList.toggle('disabled', locked || ended);
    el.moreBtn.disabled = ended;
    const lbl = el.ageUpBtn.querySelector('span:last-child');
    // The next known stop: a stage age, a graduation, or an enlistment ending.
    let next = nextStageAge(ch.age);
    for (const until of [ch.enrolled && ch.enrolled.until, ch.job === 'service' && ch.service && ch.service.until]) {
      if (until && until > ch.age && (next === null || until < next)) next = until;
    }
    if (lbl) lbl.textContent = ended ? 'Live another life' : locked ? 'Choose above first' : 'Age up';

    const showSkip = !locked && !ended && ch.childhoodDone && next !== null && next > ch.age + 1;
    el.skipBtn.classList.toggle('hidden', !showSkip);
    if (showSkip) {
      const s = Object.values(D.stages).find((x) => x.age === next);
      el.skipBtn.textContent = s && s.end ? `Skip ahead to ${next} (retirement)` : `Skip ahead to ${next} (next decision)`;
    }
  }

  // ── Action sheet ─────────────────────────────────────────────────────────
  const CATEGORIES = [
    { key: 'work', label: 'Work' },
    { key: 'school', label: 'School' },
    { key: 'money', label: 'Money' },
    { key: 'housing', label: 'Housing' },
    { key: 'health', label: 'Health' },
    { key: 'substance', label: 'Substance' },
    { key: 'justice', label: 'Justice' },
    { key: 'network', label: 'People' }
  ];

  function openSheet(catKey) {
    const cat = CATEGORIES.find((c) => c.key === catKey);
    el.sheetTitle.textContent = cat.label;
    const items = Object.entries(D.actions).filter(([, a]) => a.category === catKey);

    el.actionList.innerHTML = '';
    for (const [id, a] of items) {
      const reason = ch.usedThisYear[id] ? 'done this year — age up to try again' : unmet(a.requires);
      const ok = reason === null;
      const b = document.createElement('button');
      b.className = 'action' + (ok ? '' : ' locked');
      b.disabled = !ok;

      let sub = '';
      if (ok) {
        const { m } = biasFor(a);
        if (Math.abs(m - 1) > 0.02) {
          const w = tilt(a.outcomes, m);
          const cls = w[0] < a.outcomes[0].chance ? 'worse' : 'better';
          sub = `<span class="odds-chip ${cls}">${pct(w[0])} best case &middot; ${pct(a.outcomes[0].chance)} unbiased</span>`;
        } else {
          sub = `<span class="odds-chip">${pct(a.outcomes[0].chance)} best case</span>`;
        }
        if (a.cost && a.cost.wealth) sub += `<span class="cost-chip">-$${a.cost.wealth}</span>`;
      } else {
        sub = `<span class="odds-chip dim">${esc(reason)}</span>`;
      }

      b.innerHTML = `<span class="action-label">${esc(a.label)}</span><span>${sub}</span>`;
      if (ok) b.onclick = () => doAction(id);
      el.actionList.appendChild(b);
    }

    el.actionSheet.classList.add('open');
  }

  function closeSheet() { el.actionSheet.classList.remove('open'); }

  function buildTabs() {
    el.tabBar.innerHTML = '';
    for (const c of CATEGORIES) {
      const b = document.createElement('button');
      b.className = 'tab';
      b.dataset.cat = c.key;
      b.innerHTML = `<span class="tab-icon" data-icon="${c.key}"></span><span class="tab-label">${c.label}</span>`;
      b.onclick = () => openSheet(c.key);
      el.tabBar.appendChild(b);
    }
  }

  // ── AI narration ─────────────────────────────────────────────────────────
  // The engine has already decided what happened before any of this runs. The
  // model only writes the scene describing a settled outcome — it never picks
  // an outcome, never sees a probability, and never changes a stat. If the call
  // fails, is slow, or is disabled, play continues on the written text.

  const AI_ENDPOINT = '/api/narrate';
  // Only attempt narration where the function can exist.
  let aiEnabled = !/^(localhost|127\.0\.0\.1)$/.test(location.hostname) || location.port === '8888';
  let aiFailures = 0;

  // Posts STRUCTURED STATE ONLY — never a caller-supplied prompt. The function
  // builds the prompt server-side from these fields.
  async function narrate(choiceId, resolvedText) {
    if (!aiEnabled) return;

    const slot = document.createElement('div');
    slot.className = 'entry beat ai-pending';
    slot.innerHTML = '<span class="ai-dots"><i></i><i></i><i></i></span>';
    el.feed.insertBefore(slot, el.feed.querySelector('.decision'));

    const body = {
      kind: 'stage_choice',
      choice: choiceId,
      resolved: resolvedText || null,
      name: ch.name,
      age: ch.age,
      identity: D.identities[ch.identity].label,
      circumstance: Object.assign({}, ch.circumstance),
      job: ch.job,
      hasRecord: !!ch.flags.record,
      education: ch.education
    };

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);

    try {
      const res = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!data.text) throw new Error('empty');

      aiFailures = 0;
      slot.classList.remove('ai-pending');
      slot.classList.add('ai-text');
      slot.innerHTML = esc(data.text);
    } catch (e) {
      clearTimeout(timer);
      slot.remove();                       // fail soft, silently
      if (++aiFailures >= 3) aiEnabled = false;
    }
  }

  // ── Lives counter ────────────────────────────────────────────────────────
  // Seeded at 200 and incremented per life started.
  //
  // NOTE: this is per-device, not global — it reads and writes localStorage,
  // so two people each see their own count on top of the same seed. Making it
  // genuinely universal needs somewhere shared to keep the number; the two
  // functions below are the only places that would have to change.
  const LIVES_KEY = 'cyoa.lives';
  const LIVES_SEED = 200;

  function readLives() {
    try {
      const n = parseInt(localStorage.getItem(LIVES_KEY) || '0', 10);
      return LIVES_SEED + (Number.isFinite(n) && n > 0 ? n : 0);
    } catch (e) { return LIVES_SEED; }
  }

  function bumpLives() {
    try {
      const n = parseInt(localStorage.getItem(LIVES_KEY) || '0', 10);
      localStorage.setItem(LIVES_KEY, String((Number.isFinite(n) ? n : 0) + 1));
    } catch (e) { /* storage unavailable; the seed still shows */ }
    renderLives();
  }

  function renderLives() {
    if (el.livesCount) el.livesCount.textContent = readLives().toLocaleString() + '+';
  }

  // ── Persistence ──────────────────────────────────────────────────────────
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ ch, feed: serializeFeed() }));
    } catch (e) { /* storage unavailable; play continues unsaved */ }
  }

  // Transient UI must not be persisted. An in-flight narration spinner saved
  // mid-request would be restored as a spinner that never resolves, and the
  // decision card is rebuilt from ch.pendingStage rather than markup.
  function serializeFeed() {
    const clone = el.feed.cloneNode(true);
    clone.querySelectorAll('.ai-pending, .decision').forEach((n) => n.remove());
    return clone.innerHTML;
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!parsed.ch) return false;
      ch = parsed.ch;
      rng = mulberry32(ch.seed ^ ((ch.timeline.length + ch.age * 131) * 104729));
      el.feed.innerHTML = parsed.feed || '';
      return true;
    } catch (e) { return false; }
  }

  function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* nothing to clear */ }
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  function enterGame() {
    el.creation.classList.add('hidden');
    el.game.classList.remove('hidden');
    buildTabs();
    renderStats();
    renderConditions();
    // A decision saved mid-flight is re-rendered rather than lost
    if (ch && ch.pendingStage) renderStage(); else syncLock();
  }

  function newLife() {
    clearSave();
    ch = null;
    el.feed.innerHTML = '';
    el.game.classList.add('hidden');
    el.creation.classList.remove('hidden');
    el.nameInput.focus();
  }

  let booted = false;
  document.addEventListener('DOMContentLoaded', () => {
    if (booted) return;   // a second DOMContentLoaded must not re-init over live state
    booted = true;
    cacheDom();

    el.identitySelect.innerHTML = '';
    for (const [k, v] of Object.entries(D.identities)) {
      const o = document.createElement('option');
      o.value = k;
      o.textContent = v.label;
      el.identitySelect.appendChild(o);
    }

    renderLives();

    el.startBtn.addEventListener('click', () => {
      const name = (el.nameInput.value || 'Frank').trim().slice(0, 24) || 'Frank';
      createCharacter(name, el.identitySelect.value);
      bumpLives();
      el.feed.innerHTML = '';
      enterGame();
      runChildhood();
    });

    el.resetBtn.addEventListener('click', () => {
      if (confirm('Start over? This erases the current life.')) {
        clearSave();
        location.reload();
      }
    });

    el.ageUpBtn.addEventListener('click', () => {
      if (ch && ch.ended) { newLife(); return; }
      ageUp();
    });
    el.skipBtn.addEventListener('click', skipAhead);

    el.moreBtn.addEventListener('click', () => {
      const open = el.tabBar.classList.toggle('collapsed') === false;
      el.moreBtn.setAttribute('aria-expanded', String(open));
    });
    el.closeSheet.addEventListener('click', closeSheet);
    el.actionSheet.addEventListener('click', (e) => { if (e.target === el.actionSheet) closeSheet(); });

    el.conditionsBtn.addEventListener('click', () => {
      renderConditions();
      el.conditionsPanel.classList.add('open');
    });
    el.closeConditions.addEventListener('click', () => el.conditionsPanel.classList.remove('open'));
    el.conditionsPanel.addEventListener('click', (e) => {
      if (e.target === el.conditionsPanel) el.conditionsPanel.classList.remove('open');
    });

    el.exportBtn.addEventListener('click', () => {
      if (!ch) return;
      const blob = new Blob([JSON.stringify(ch, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ch.name.replace(/\s+/g, '_')}_life.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeSheet(); el.conditionsPanel.classList.remove('open'); }
    });

    if (load()) { enterGame(); } else { el.creation.classList.remove('hidden'); }
  });
})();
