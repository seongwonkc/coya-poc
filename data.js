// data.js — content + model parameters for the life simulator.
// Loaded by index.html before script.js. No network calls; everything here is static.
//
// ─────────────────────────────────────────────────────────────────────────────
// A NOTE ON THE NUMBERS IN THIS FILE
//
// The coefficients below are TUNED FOR PLAY, not estimated from data. They are
// shaped by the direction and rough magnitude of published findings, but no
// number here should be quoted as a statistic. Where a parameter is anchored to
// a real study, the study is named in a comment so the choice is auditable.
//
// The model deliberately separates two different things:
//
//   identities[]     — who you are. Drives ONLY the things other people do to
//                      you: callback rates, stop rates, how a record is treated.
//   circumstance     — where you landed. Rolled from a distribution that is
//                      CONDITIONED on identity, never set by it. The game shows
//                      the player both the roll and the distribution it came
//                      from, so the correlation is visible as a correlation.
//
// The distinction matters: a table that reads `black: { schoolFunding: "mid" }`
// asserts that being Black *is* an underfunded school. A distribution asserts
// that segregation and school-finance policy put people in different places at
// different rates. The second claim is the one this sim is trying to make.
//
// KNOWN LIMITATIONS — read before drawing any conclusion from a playthrough:
//
//   1. Every identity here is an aggregate, and aggregates lie. "Asian" is the
//      worst offender: it pools groups whose poverty rates differ by a factor
//      of several, so its row describes almost nobody. Treat a single row as a
//      coarse average, never as a description of a person.
//   2. The categories themselves are a simplification. Multiracial identity,
//      immigration status, disability, gender and region all move these numbers
//      substantially and none of them are modelled.
//   3. The circumstance tracks are treated as independent draws. In reality
//      school funding, neighbourhood and household wealth are strongly
//      correlated, so this model understates how often disadvantages arrive
//      together — it is, if anything, too kind.
//   4. Nothing here is causal. The sim shows how a stacked set of rates
//      produces a spread in outcomes; it does not estimate any real effect.
// ─────────────────────────────────────────────────────────────────────────────

var GAME_DATA = {

  // ===========================================================================
  // IDENTITY — chosen by the player. Bias coefficients only.
  // ===========================================================================
  // callbackMultiplier: applied to hiring/application success.
  //   Anchored to Bertrand & Mullainathan (2004), which found résumés with
  //   white-sounding names received about 50% more callbacks than identical
  //   résumés with Black-sounding names. 0.67 is the reciprocal of that gap.
  // stopMultiplier: relative rate of involuntary police contact.
  // recordPenalty: how much more a criminal record costs you afterward.
  //   Direction anchored to Pager (2003), which found a record depressed
  //   callbacks for all applicants and did so substantially more for Black men.
  // painDiscount: likelihood of being undertreated in a medical setting.

  identities: {
    white: {
      label: "White",
      callbackMultiplier: 1.00,
      stopMultiplier: 1.00,
      recordPenalty: 1.00,
      painDiscount: 1.00
    },
    black: {
      label: "Black",
      callbackMultiplier: 0.67,
      stopMultiplier: 1.75,
      recordPenalty: 1.60,
      painDiscount: 0.80
    },
    hispanic: {
      label: "Hispanic / Latino",
      callbackMultiplier: 0.78,
      stopMultiplier: 1.40,
      recordPenalty: 1.35,
      painDiscount: 0.85
    },
    asian: {
      label: "Asian",
      callbackMultiplier: 0.92,
      stopMultiplier: 0.85,
      recordPenalty: 1.10,
      painDiscount: 0.95
    },
    native: {
      label: "Native American",
      callbackMultiplier: 0.80,
      stopMultiplier: 1.55,
      recordPenalty: 1.40,
      painDiscount: 0.82
    }
  },

  // ===========================================================================
  // CIRCUMSTANCE — rolled by the world, conditioned on identity.
  // ===========================================================================
  // Each track lists its levels, the population-wide distribution, and the
  // distribution conditional on identity. Rows sum to 1. The UI shows the
  // player which cell they landed in AND both distributions, so an unlucky
  // roll reads as an unlucky roll rather than as a property of the player.

  circumstance: {

    schoolFunding: {
      label: "School district",
      levels: ["under", "moderate", "well"],
      levelLabels: {
        under: "Under-resourced",
        moderate: "Moderately resourced",
        well: "Well-resourced"
      },
      // Direction anchored to EdBuild (2019), which reported that predominantly
      // nonwhite districts received substantially less funding than white
      // districts serving comparable numbers of students.
      population: { under: 0.22, moderate: 0.45, well: 0.33 },
      byIdentity: {
        white:    { under: 0.12, moderate: 0.42, well: 0.46 },
        black:    { under: 0.43, moderate: 0.41, well: 0.16 },
        hispanic: { under: 0.40, moderate: 0.43, well: 0.17 },
        asian:    { under: 0.17, moderate: 0.43, well: 0.40 },
        native:   { under: 0.48, moderate: 0.38, well: 0.14 }
      }
    },

    household: {
      label: "Household income",
      levels: ["low", "lower_middle", "middle", "upper"],
      levelLabels: {
        low: "Low income",
        lower_middle: "Lower-middle income",
        middle: "Middle income",
        upper: "Upper income"
      },
      population: { low: 0.20, lower_middle: 0.28, middle: 0.34, upper: 0.18 },
      byIdentity: {
        white:    { low: 0.13, lower_middle: 0.24, middle: 0.39, upper: 0.24 },
        black:    { low: 0.33, lower_middle: 0.33, middle: 0.26, upper: 0.08 },
        hispanic: { low: 0.30, lower_middle: 0.34, middle: 0.28, upper: 0.08 },
        asian:    { low: 0.16, lower_middle: 0.22, middle: 0.35, upper: 0.27 },
        native:   { low: 0.36, lower_middle: 0.32, middle: 0.25, upper: 0.07 }
      }
    },

    neighborhood: {
      label: "Neighborhood",
      levels: ["high_stress", "mixed", "stable"],
      levelLabels: {
        high_stress: "High-stress, heavily policed",
        mixed: "Mixed",
        stable: "Stable, lightly policed"
      },
      population: { high_stress: 0.24, mixed: 0.44, stable: 0.32 },
      byIdentity: {
        white:    { high_stress: 0.13, mixed: 0.42, stable: 0.45 },
        black:    { high_stress: 0.45, mixed: 0.40, stable: 0.15 },
        hispanic: { high_stress: 0.39, mixed: 0.44, stable: 0.17 },
        asian:    { high_stress: 0.18, mixed: 0.45, stable: 0.37 },
        native:   { high_stress: 0.44, mixed: 0.40, stable: 0.16 }
      }
    },

    familySupport: {
      label: "Family financial cushion",
      levels: ["none", "thin", "solid"],
      levelLabels: {
        none: "No cushion",
        thin: "Thin cushion",
        solid: "Solid cushion"
      },
      // Direction anchored to the well-documented racial wealth gap: median
      // white household wealth is several times median Black household wealth,
      // which shows up as the ability to absorb one bad month without cascading.
      population: { none: 0.30, thin: 0.40, solid: 0.30 },
      byIdentity: {
        white:    { none: 0.20, thin: 0.38, solid: 0.42 },
        black:    { none: 0.52, thin: 0.36, solid: 0.12 },
        hispanic: { none: 0.48, thin: 0.38, solid: 0.14 },
        asian:    { none: 0.24, thin: 0.38, solid: 0.38 },
        native:   { none: 0.54, thin: 0.34, solid: 0.12 }
      }
    },

    healthCoverage: {
      label: "Health coverage",
      levels: ["uninsured", "medicaid", "employer"],
      levelLabels: {
        uninsured: "Uninsured",
        medicaid: "Medicaid / public",
        employer: "Employer or private"
      },
      population: { uninsured: 0.11, medicaid: 0.26, employer: 0.63 },
      byIdentity: {
        white:    { uninsured: 0.07, medicaid: 0.20, employer: 0.73 },
        black:    { uninsured: 0.13, medicaid: 0.37, employer: 0.50 },
        hispanic: { uninsured: 0.20, medicaid: 0.35, employer: 0.45 },
        asian:    { uninsured: 0.08, medicaid: 0.20, employer: 0.72 },
        native:   { uninsured: 0.22, medicaid: 0.40, employer: 0.38 }
      }
    }
  },

  // Numeric effects of each circumstance level on the simulation.
  // Kept separate from the distributions above so the rolled cell and its
  // consequence can be displayed independently.
  circumstanceEffects: {
    schoolFunding: {
      under:    { academicPerYear: -2, apAccess: false, classSize: "large (28+)",     counseling: "under-resourced" },
      moderate: { academicPerYear:  0, apAccess: true,  classSize: "medium (22-26)",  counseling: "stretched" },
      well:     { academicPerYear: +2, apAccess: true,  classSize: "small (about 18)", counseling: "well-staffed" }
    },
    household: {
      low:          { startWealth:   150, yearlyDrag: -600, enrichment: "few affordable options" },
      lower_middle: { startWealth:   600, yearlyDrag: -250, enrichment: "occasional programs" },
      middle:       { startWealth:  2000, yearlyDrag:    0, enrichment: "school clubs and some lessons" },
      upper:        { startWealth:  6000, yearlyDrag:  +400, enrichment: "private lessons and travel teams" }
    },
    neighborhood: {
      high_stress: { stopBase: 0.11, healthPerYear: -1.5 },
      mixed:       { stopBase: 0.05, healthPerYear: -0.5 },
      stable:      { stopBase: 0.02, healthPerYear:  0 }
    },
    familySupport: {
      none:  { shockAbsorb: 0.00, bailoutChance: 0.05 },
      thin:  { shockAbsorb: 0.35, bailoutChance: 0.30 },
      solid: { shockAbsorb: 0.80, bailoutChance: 0.75 }
    },
    healthCoverage: {
      uninsured: { medicalCostMultiplier: 2.4, treatmentQuality: -0.20 },
      medicaid:  { medicalCostMultiplier: 0.6, treatmentQuality: -0.08 },
      employer:  { medicalCostMultiplier: 1.0, treatmentQuality:  0.00 }
    }
  },

  // ===========================================================================
  // CHILDHOOD NARRATION
  // ===========================================================================
  // {{placeholders}} are filled by phaseContext() in script.js.

  templates: {
    childhood: {
      "PreK": "{{name}} is four. The household is {{household_desc}}. Care before kindergarten is {{early_care}}, which decides how many words and how much structure land before anyone is measuring. Health coverage is {{coverage_desc}}, so the first ear infection is either a Tuesday appointment or a decision about money.",

      "Elementary": "Elementary is {{school_quality}} building with {{class_size}} classrooms. {{teacher_line}} Outside of school there are {{enrichment}}. {{hardship_line}} None of this shows up on a report card as anything other than {{name}}'s own performance.",

      "Middle": "Middle school sorts. Tracking decisions get made here on the basis of test scores, teacher referrals, and which parents know to ask — and they are hard to undo later. Counseling is {{counseling}}. {{peer_line}} {{policing_line}}",

      "High": "High school is where the sorting becomes a transcript. {{ap_line}} Guidance is {{counseling}}, spread across a caseload that makes individual attention a matter of luck. {{work_line}} {{hardship_line}}"
    }
  },

  // ===========================================================================
  // EDUCATION
  // ===========================================================================
  // What a person holds, ranked. `phrase` is used by the narration function.

  education: {
    hs:           { label: "High school diploma",           phrase: "a high school diploma",                         rank: 0 },
    some_college: { label: "Some college, no degree",       phrase: "some college but no degree",                    rank: 1 },
    associate:    { label: "Associate degree",              phrase: "an associate degree from community college",    rank: 2 },
    state_degree: { label: "Bachelor's, state university",  phrase: "a bachelor's degree from a state university",   rank: 3 },
    elite_degree: { label: "Bachelor's, elite university",  phrase: "a bachelor's degree from an elite university",  rank: 4 }
  },

  // Programs a person can be enrolled in. Tuition is set per year by the
  // admission outcome; a share of it is paid by family (see economy below).
  programs: {
    elite:     { label: "Elite private university",   years: 4, degree: "elite_degree" },
    state:     { label: "State university",           years: 4, degree: "state_degree" },
    community: { label: "Community college",          years: 2, degree: "associate" },
    transfer:  { label: "State university (transfer)", years: 2, degree: "state_degree" },
    night:     { label: "Night classes",              years: 3, degree: null }   // degree = next rung up
  },

  // ===========================================================================
  // EMPLOYMENT
  // ===========================================================================
  // Jobs persist and pay every year. A one-shot payout would make hiring bias
  // a small tax; a recurring salary makes it compound over a career, which is
  // where the real gap is. Figures are annual, pre-tax, rounded, in today's
  // dollars; `raise` is the real (after-inflation) annual raise.

  jobs: {
    unemployed:  { title: "Unemployed",            phrase: "no job",                             salary: 0,     raise: 0.000, layoffRisk: 0.00 },
    gig:         { title: "Gig / contract work",   phrase: "gig and contract work",              salary: 21000, raise: 0.000, layoffRisk: 0.20 },
    entry:       { title: "Entry-level",           phrase: "an entry-level job",                 salary: 27000, raise: 0.005, layoffRisk: 0.10 },
    service:     { title: "Service member",        phrase: "military service",                   salary: 35000, raise: 0.015, layoffRisk: 0.00 },
    apprentice:  { title: "Union apprentice",      phrase: "a union apprenticeship",             salary: 44000, raise: 0.035, layoffRisk: 0.05 },
    technician:  { title: "Technician",            phrase: "a technician's job",                 salary: 45000, raise: 0.012, layoffRisk: 0.05 },
    owner:       { title: "Small-business owner",  phrase: "a small business of their own",      salary: 55000, raise: 0.015, layoffRisk: 0.08 },
    salaried:    { title: "Salaried professional", phrase: "a salaried professional job",        salary: 64000, raise: 0.015, layoffRisk: 0.05 },
    journeyman:  { title: "Journeyman tradesman",  phrase: "work as a journeyman tradesman",     salary: 68000, raise: 0.010, layoffRisk: 0.04 },
    senior:      { title: "Senior professional",   phrase: "a senior professional job",          salary: 98000, raise: 0.010, layoffRisk: 0.04 }
  },

  economy: {
    // Annual cost of living by housing situation.
    costOfLiving: {
      dependent: 3200,   // at home with no income
      home:      7000,   // at home with an income
      roommates: 15000,
      own:       23000,  // renting alone
      owner:     26000   // mortgage, tax, upkeep
    },
    // All money is in constant (today's) dollars: raises below are real
    // raises, and costs do not inflate.
    //
    // Flat effective rate on earnings. Real taxes are progressive; one rate
    // keeps the ledger readable.
    taxRate: 0.20,
    // Once necessities and debt are covered, people spend most of what's left.
    // This is the share of the leftover that goes to spending, not savings.
    lifestyleShare: 0.65,
    debtInterest: 0.06,
    // Cash above a small buffer earns a modest return. This is the mechanism
    // by which having money makes money, so it is kept small and visible.
    cashReturn: 0.04,
    cashBuffer: 3000,

    home: {
      price: 240000,
      down: 20000,
      familyGift: 15000,       // what a solid family cushion can put toward a down payment
      appreciation: 0.015,     // real, i.e. above inflation
      principalPerYear: 7000,
      higherRateCost: 3000     // extra per year on a worse loan
    },

    // Annual chance of leaving college without the degree. Driven by money,
    // not ability: the student with no cushion leaves when the car dies.
    dropout: { base: 0.03, none: 0.06, thin: 0.02, solid: 0.00, lowIncome: 0.02 },

    // Promotion ladder: current job -> next, with the annual chance of moving up.
    // Promotion is a hiring decision, so the callback multiplier applies to it.
    promotion: {
      gig:        { to: "entry",      chance: 0.15 },
      entry:      { to: "salaried",   chance: 0.06, needsEducation: ["state_degree", "elite_degree"] },
      apprentice: { to: "journeyman", chance: 0.22 },
      technician: { to: "salaried",   chance: 0.06 },
      salaried:   { to: "senior",     chance: 0.10 }
    },

    // Health regained per year while below 80, by coverage.
    recovery: { employer: 1.0, medicaid: 0.7, uninsured: 0.3 },

    // A year in the red with more debt than this forces a move down:
    // own place -> roommates -> back home (if family can take you); a
    // homeowner sells.
    squeezeDebt: 15000,
    sellDebt: 40000,

    serviceYears: 4,
    retireAge: 65
  },

  // ===========================================================================
  // LIFE STAGES — the decisions
  // ===========================================================================
  // Play is a sequence of these. At each one the game stops and asks ONE
  // question; ageing is blocked until it is answered. Between them, Age Up
  // runs the years.
  //
  // A stage opens either at an `age` or on a `trigger` raised by the engine
  // (a graduation, an enlistment ending).
  //
  // Option fields:
  //   show     requirements; if unmet the option is not offered at all
  //   gate     a STAGE_GATES function in script.js; if closed, the option is
  //            shown locked WITH the reason. Closed doors are content.
  //   cost     paid up front (a shortfall becomes debt)
  //   expands  opens a sub-list (college tiers)
  //   roll     { tags, mods, outcomes } — tilted by bias, counterfactual shown
  //   resolve  { text, effects, flags_set } — no roll
  // Outcome fields: chance, text, effects, flags_set, retry (stage stays open
  // and this option locks, e.g. a rejection).
  //
  // Stage outcome effects understood by the engine: setJob, enroll, enlist,
  // housing, buyHome, health, wealth, debt, academicPerformance, addiction,
  // medical, familyPays.

  stages: {

    // ─── CHILDHOOD ──────────────────────────────────────────────────────────
    s14: {
      age: 14,
      title: "Freshman year",
      prompt: "High school starts. How you spend the next four years is partly up to you.",
      options: [
        {
          id: "hard_classes", label: "Take the hardest classes offered", icon: "school",
          blurb: "Harder now, and it reads well later.",
          gate: "apClasses",
          roll: {
            tags: ["school"], mods: { schoolFunding: 1 },
            outcomes: [
              { id: "thrive", chance: 0.55, text: "You keep up, and the transcript shows it.", effects: { academicPerformance: 5 } },
              { id: "cope", chance: 0.30, text: "You pass, tired most of the time.", effects: { academicPerformance: 3, health: -2 } },
              { id: "sink", chance: 0.15, text: "Nobody at home can help with the homework and there is no tutor. You drop back a level.", effects: { academicPerformance: 0, health: -3 } }
            ]
          }
        },
        {
          id: "part_time", label: "Get a part-time job", icon: "work",
          blurb: "Money of your own. It comes out of homework time.",
          resolve: { text: "You work twenty hours a week through high school. The money is real, and so is the missed homework.", effects: { wealth: 2500, academicPerformance: -1 } }
        },
        {
          id: "team", label: "Join a team or a club", icon: "network",
          blurb: "Friends, structure, something for the application.",
          gate: "activityFees",
          resolve: { text: "Practice after school, weekend meets, a group of people who expect you to show up.", effects: { health: 4, academicPerformance: 1 } }
        },
        {
          id: "coast", label: "Just get through it", icon: "age",
          blurb: "Show up, pass, go home.",
          resolve: { text: "You do what's asked and not much more. Four years pass.", effects: {} }
        }
      ]
    },

    s16: {
      age: 16,
      title: "Junior year",
      prompt: "The year colleges look at hardest. Everyone is talking about test scores.",
      options: [
        {
          id: "tutor", label: "Get a private tutor", icon: "smarts",
          blurb: "Twice a week, paid for by your parents.",
          gate: "tutorAffordable",
          resolve: { text: "A tutor comes twice a week. Your parents pay for it without mentioning the cost.", effects: { academicPerformance: 5 } }
        },
        {
          id: "prep_course", label: "Take a low-cost prep course", icon: "school",
          blurb: "$150, Saturday mornings.",
          cost: { wealth: 150 },
          roll: {
            tags: ["school"], mods: { schoolFunding: 1, familySupport: 1 },
            outcomes: [
              { id: "gain", chance: 0.65, text: "The Saturdays pay off. Your score moves.", effects: { academicPerformance: 3 } },
              { id: "some", chance: 0.25, text: "You pick up some tips but can't practice consistently.", effects: { academicPerformance: 1 } },
              { id: "none", chance: 0.10, text: "Work and family leave no time for it. You stop going.", effects: { health: -1 } }
            ]
          }
        },
        {
          id: "self_study", label: "Study on your own", icon: "smarts",
          blurb: "Free, if you can find the time and the books.",
          roll: {
            tags: ["school"], mods: { schoolFunding: 1 },
            outcomes: [
              { id: "gain", chance: 0.45, text: "Library books and practice tests at the kitchen table. It works.", effects: { academicPerformance: 2 } },
              { id: "some", chance: 0.35, text: "You get through half the book.", effects: { academicPerformance: 1 } },
              { id: "none", chance: 0.20, text: "There is never a quiet hour in the house.", effects: {} }
            ]
          }
        },
        {
          id: "shifts", label: "Pick up more shifts", icon: "money",
          blurb: "The household could use it.",
          resolve: { text: "You take every shift offered. The money goes into a jar and some of it goes to rent.", effects: { wealth: 2000, academicPerformance: -1 } }
        }
      ]
    },

    // ─── EIGHTEEN ───────────────────────────────────────────────────────────
    s18: {
      age: 18,
      title: "You're eighteen",
      prompt: "School is finished. Everyone is asking what you're doing next, and the answer has to be one of these.",
      options: [
        {
          id: "college", label: "Go to college", icon: "school",
          blurb: "Which kind is not entirely up to you.",
          expands: "collegeTiers"
        },
        {
          id: "work", label: "Get a job", icon: "work",
          blurb: "Income now, ceiling later.",
          roll: {
            tags: ["job"],
            outcomes: [
              { id: "hired", chance: 0.70, text: "You apply everywhere and take the first thing that calls back. It's steady.", effects: { setJob: "entry" } },
              { id: "gig", chance: 0.30, text: "Nobody calls back with a steady job. You piece together gig and contract shifts.", effects: { setJob: "gig" } }
            ]
          }
        },
        {
          id: "trade", label: "Apply for a union apprenticeship", icon: "work",
          blurb: "Paid training in a trade. Spots are limited.",
          roll: {
            tags: ["job", "trade"],
            outcomes: [
              { id: "placed", chance: 0.50, text: "You're placed with a crew. Wages and training start on day one.", effects: { setJob: "apprentice" }, flags_set: { trade: true } },
              { id: "waitlist", chance: 0.35, text: "Waitlisted. The list is long.", retry: true },
              { id: "no", chance: 0.15, text: "You aren't selected this cycle.", retry: true }
            ]
          }
        },
        {
          id: "military", label: "Join the military", icon: "conditions",
          blurb: "A wage, training, and education benefits after.",
          gate: "militaryEligible",
          roll: {
            tags: [],
            outcomes: [
              { id: "enlist", chance: 0.90, text: "You enlist. Basic training, then a posting, then a steady wage for the first time.", effects: { enlist: true, health: -2 } },
              { id: "medical", chance: 0.10, text: "Something in the medical screening disqualifies you.", retry: true }
            ]
          }
        },
        {
          id: "nothing", label: "Do nothing yet", icon: "age",
          blurb: "Stay where you are and see what happens.",
          resolve: { text: "You stay put. The months go by and nothing in particular decides itself." }
        }
      ]
    },

    // ─── TRIGGERED: SCHOOL AND SERVICE ENDING ───────────────────────────────
    bachelor_done: {
      trigger: "graduated_bachelor",
      title: "You graduate",
      prompt: "A degree, a handshake, and a job market that doesn't know you yet.",
      options: [
        {
          id: "apply_pro", label: "Apply for professional jobs", icon: "work",
          blurb: "Salaried roles that ask for a degree.",
          show: { job_not: ["salaried", "senior", "owner"] },
          roll: {
            tags: ["job"], mods: { academicPerformance: 1 },
            outcomes: [
              { id: "hired", chance: 0.55, text: "An offer comes through, with benefits attached.", effects: { setJob: "salaried" } },
              { id: "final_round", chance: 0.25, text: "You reach the final round and don't get it. No reason is given. You take an entry-level job and keep applying.", effects: { setJob: "entry", health: -1 } },
              { id: "silence", chance: 0.20, text: "You send out forty applications and hear back from none. You take what you can get.", effects: { setJob: "entry", health: -2 } }
            ]
          }
        },
        {
          id: "any_job", label: "Take whatever is hiring", icon: "money",
          blurb: "The loans don't wait.",
          show: { job_in: ["unemployed", "gig"] },
          roll: {
            tags: ["job"],
            outcomes: [
              { id: "hired", chance: 0.80, text: "You're hired within the month.", effects: { setJob: "entry" } },
              { id: "gig", chance: 0.20, text: "Contract work only, for now.", effects: { setJob: "gig" } }
            ]
          }
        },
        {
          id: "stay", label: "Keep the job you have", icon: "age",
          blurb: "No need to jump yet.",
          show: { job_not: ["unemployed"] },
          resolve: { text: "You keep what you have and put the diploma in a drawer." }
        }
      ]
    },

    associate_done: {
      trigger: "graduated_associate",
      title: "Two-year degree",
      prompt: "You finished community college. The credits can carry you further, or into work now.",
      options: [
        {
          id: "transfer", label: "Transfer to a state university", icon: "school",
          blurb: "Two more years for a bachelor's.",
          cost: { wealth: 100 },
          roll: {
            tags: ["college"], mods: { academicPerformance: 1 },
            outcomes: [
              { id: "scholar", chance: 0.25, text: "Accepted, with a transfer scholarship.", effects: { enroll: { program: "transfer", tuition: 3000 } } },
              { id: "accepted", chance: 0.45, text: "Accepted. Full tuition.", effects: { enroll: { program: "transfer", tuition: 11000 } } },
              { id: "denied", chance: 0.30, text: "Half your credits don't transfer, and the application is denied.", retry: true }
            ]
          }
        },
        {
          id: "technician", label: "Apply for technician roles", icon: "work",
          blurb: "Jobs that ask for exactly this degree.",
          roll: {
            tags: ["job"], mods: { academicPerformance: 1 },
            outcomes: [
              { id: "hired", chance: 0.60, text: "A lab, a hospital, a plant floor — someone needs what you just learned.", effects: { setJob: "technician" } },
              { id: "entry", chance: 0.40, text: "Nothing in your field calls back. You take an entry-level job.", effects: { setJob: "entry" } }
            ]
          }
        },
        {
          id: "stay", label: "Keep the job you have", icon: "age",
          show: { job_not: ["unemployed"] },
          blurb: "The degree is there if you need it.",
          resolve: { text: "You stay where you are, one credential stronger." }
        }
      ]
    },

    service_done: {
      trigger: "enlistment_up",
      title: "Your enlistment is up",
      prompt: "Four years in. Stay, or take what the service promised and go.",
      options: [
        {
          id: "reenlist", label: "Re-enlist", icon: "conditions",
          blurb: "Another four years, a raise, the same life.",
          resolve: { text: "You sign for four more.", effects: { enlist: true } }
        },
        {
          id: "gi_bill", label: "Use the GI Bill for college", icon: "school",
          blurb: "Tuition covered. You still have to get in.",
          gate: "stateEligible",
          roll: {
            tags: ["college"], mods: { academicPerformance: 1 },
            outcomes: [
              { id: "state", chance: 0.70, text: "A state university takes you. The GI Bill covers tuition.", effects: { setJob: "unemployed", enroll: { program: "state", tuition: 0 } } },
              { id: "community", chance: 0.30, text: "The state school says no. Community college says yes, and the GI Bill covers it.", effects: { setJob: "unemployed", enroll: { program: "community", tuition: 0 } } }
            ]
          }
        },
        {
          id: "civilian", label: "Get a civilian job", icon: "work",
          blurb: "Employers say they want veterans.",
          roll: {
            tags: ["job"],
            outcomes: [
              { id: "salaried", chance: 0.40, text: "A company with a veterans' hiring program makes an offer.", effects: { setJob: "salaried" } },
              { id: "entry", chance: 0.45, text: "The skills don't translate on paper. You start entry-level.", effects: { setJob: "entry" } },
              { id: "gig", chance: 0.15, text: "Months of applications. You drive for an app in the meantime.", effects: { setJob: "gig" } }
            ]
          }
        }
      ]
    },

    out_of_work: {
      trigger: "out_of_work",
      showIf: { job_in: ["unemployed"], enrolled: false },
      title: "Out of work",
      prompt: "No paycheck is coming. What do you do about it?",
      options: [
        {
          id: "look", label: "Look for work", icon: "work",
          blurb: "Anything steady.",
          roll: {
            tags: ["job"],
            outcomes: [
              { id: "steady", chance: 0.65, text: "You're hired. It's steady, and it pays what it pays.", effects: { setJob: "entry" } },
              { id: "gig", chance: 0.35, text: "No steady hire. You piece together gig and contract shifts.", effects: { setJob: "gig" } }
            ]
          }
        },
        {
          id: "pro", label: "Apply for salaried roles", icon: "work",
          blurb: "Your credentials say you should qualify.",
          show: { qualified: true },
          roll: {
            tags: ["job"], mods: { academicPerformance: 1 },
            outcomes: [
              { id: "hired", chance: 0.40, text: "An offer comes through, with benefits attached.", effects: { setJob: "salaried" } },
              { id: "final_round", chance: 0.30, text: "You reach the final round and don't get it. No reason is given.", effects: { health: -2 }, retry: true },
              { id: "silence", chance: 0.30, text: "You apply and hear nothing back at all.", effects: { health: -1 }, retry: true }
            ]
          }
        },
        {
          id: "school", label: "Enroll in community college", icon: "school",
          blurb: "Two years, $1,800 a year.",
          show: { enrolled: false, education_in: ["hs", "some_college"] },
          resolve: { text: "You enroll. Placement testing puts you in two remedial courses.", effects: { enroll: { program: "community", tuition: 1800 } } }
        },
        {
          id: "wait", label: "Not yet", icon: "age",
          blurb: "Something will turn up.",
          resolve: { text: "You wait. Another year goes by." }
        }
      ]
    },

    // ─── ADULTHOOD ──────────────────────────────────────────────────────────
    s25: {
      age: 25,
      title: "A place of your own",
      prompt: "You're twenty-five and still at home. Where do you live now?",
      showIf: { housing_in: ["home"] },
      options: [
        {
          id: "own_place", label: "Rent your own place", icon: "housing",
          blurb: "First month, last month, deposit, background check.",
          gate: "canRent",
          roll: {
            tags: ["housing"], mods: { hiring: 1 },
            outcomes: [
              { id: "leased", chance: 0.60, text: "Approved. The deposit clears out your savings.", effects: { housing: "own", wealth: -2400, familyPays: 0.5 } },
              { id: "cosigner", chance: 0.20, text: "Approved only with a cosigner. Someone signs.", effects: { housing: "own", wealth: -2400, familyPays: 0.5 } },
              { id: "screened", chance: 0.20, text: "Declined after the background check. The application fee is gone.", effects: { wealth: -60 }, retry: true }
            ]
          }
        },
        {
          id: "roommates", label: "Split a place with roommates", icon: "network",
          blurb: "Cheaper. Less yours.",
          resolve: { text: "Three people, one bathroom, a lease with everyone's name on it.", effects: { housing: "roommates", wealth: -800 } }
        },
        {
          id: "stay_home", label: "Stay at home", icon: "age",
          blurb: "The cheapest option, and the clock keeps running.",
          resolve: { text: "You stay. You put money aside, or you tell yourself you will." }
        }
      ]
    },

    s30: {
      age: 30,
      title: "Thirty",
      prompt: "Most careers have a shape by now. Is this one worth pushing on?",
      options: [
        {
          id: "promotion", label: "Push for a promotion", icon: "work",
          blurb: "Ask for the next rung.",
          show: { job_in: ["gig", "entry", "apprentice", "technician", "salaried"] },
          roll: {
            tags: ["job"],
            outcomes: [
              { id: "promoted", chance: 0.35, text: "You get it.", effects: { promote: true } },
              { id: "wait", chance: 0.45, text: "You're told to wait for the next cycle.", effects: {} },
              { id: "passed", chance: 0.20, text: "Someone else gets it. You're told you weren't quite ready.", effects: { health: -2 } }
            ]
          }
        },
        {
          id: "better_job", label: "Apply for a better-paying job", icon: "work",
          blurb: "Salaried roles elsewhere.",
          show: { qualified: true, job_not: ["salaried", "senior", "owner", "journeyman"] },
          roll: {
            tags: ["job"], mods: { academicPerformance: 1 },
            outcomes: [
              { id: "hired", chance: 0.40, text: "An offer comes through, with benefits attached.", effects: { setJob: "salaried" } },
              { id: "final_round", chance: 0.30, text: "You reach the final round and don't get it. No reason is given.", effects: { health: -2 } },
              { id: "silence", chance: 0.30, text: "You apply and hear nothing back at all.", effects: { health: -1 } }
            ]
          }
        },
        {
          id: "night_school", label: "Go back to school at night", icon: "school",
          blurb: "Three years of evenings for the next credential up.",
          show: { enrolled: false, education_in: ["hs", "some_college", "associate"] },
          resolve: { text: "You enroll in night classes. Work all day, class three nights a week.", effects: { enroll: { program: "night", tuition: 4000 } } }
        },
        {
          id: "business", label: "Start your own business", icon: "money",
          blurb: "Needs about $5,000 to start, and the nerve.",
          show: { job_not: ["owner"] },
          gate: "businessCapital",
          roll: {
            tags: ["lending"], mods: { familySupport: 1 },
            outcomes: [
              { id: "works", chance: 0.40, text: "The business finds customers. By the end of the year it pays you.", effects: { wealth: -5000, familyPays: 1, setJob: "owner" } },
              { id: "fails", chance: 0.60, text: "The loan is small and the rent is not. It closes inside a year and the debt stays.", effects: { wealth: -5000, familyPays: 1, debt: 8000, setJob: "unemployed" } }
            ]
          }
        },
        {
          id: "stay", label: "Keep going as you are", icon: "age",
          blurb: "Steady is a choice too.",
          resolve: { text: "You keep your head down and keep going." }
        }
      ]
    },

    s33: {
      age: 33,
      title: "Buy a home?",
      prompt: "Owning is how most families build wealth. Getting in the door takes a down payment and a lender's yes.",
      showIf: { homeowner: false },
      options: [
        {
          id: "buy", label: "Buy a home", icon: "housing",
          blurb: "$20,000 down on a $240,000 house.",
          gate: "downPayment",
          roll: {
            tags: ["lending"],
            outcomes: [
              { id: "approved", chance: 0.60, text: "Approved. You get the keys on a Friday.", effects: { buyHome: { higherRate: false } } },
              { id: "higher_rate", chance: 0.25, text: "Approved, at a rate higher than the one advertised. You take it.", effects: { buyHome: { higherRate: true } } },
              { id: "denied", chance: 0.15, text: "Denied. The letter lists 'credit history' and nothing else.", retry: true }
            ]
          }
        },
        {
          id: "rent", label: "Keep renting", icon: "age",
          blurb: "No down payment, no equity.",
          resolve: { text: "You keep renting. The rent goes up, the way it does." }
        }
      ]
    },

    s40: {
      age: 40,
      title: "Forty",
      prompt: "The body starts sending notices. So does the job market.",
      options: [
        {
          id: "checkup", label: "Get the check-up you keep putting off", icon: "health",
          blurb: "Whether it helps depends on who's listening.",
          roll: {
            tags: ["health"], mods: { coverage: 1 },
            outcomes: [
              { id: "caught", chance: 0.55, text: "They find something early and treat it.", effects: { health: 10, wealth: -600, medical: true } },
              { id: "dismissed", chance: 0.30, text: "You describe the pain. It's logged as moderate and you're sent home.", effects: { health: -2, wealth: -300, medical: true } },
              { id: "missed", chance: 0.15, text: "The appointment is eight minutes long. What they miss comes back later.", effects: { health: -8, wealth: -300, medical: true } }
            ]
          }
        },
        {
          id: "retrain", label: "Retrain for a better field", icon: "school",
          blurb: "$3,000 in courses, then applications.",
          show: { job_not: ["senior", "owner", "journeyman"] },
          cost: { wealth: 3000 },
          roll: {
            tags: ["job"], mods: { academicPerformance: 1 },
            outcomes: [
              { id: "hired", chance: 0.35, text: "The certificate lands you a salaried role.", effects: { setJob: "salaried" } },
              { id: "nothing", chance: 0.65, text: "You finish the courses. The callbacks go to younger applicants.", effects: { health: -1 } }
            ]
          }
        },
        {
          id: "stay", label: "Keep going", icon: "age",
          blurb: "Nothing is broken yet.",
          resolve: { text: "You keep going." }
        }
      ]
    },

    s50: {
      age: 50,
      title: "Fifty",
      prompt: "Your industry is changing faster than you are. Fifteen working years left.",
      options: [
        {
          id: "save_hard", label: "Cut back and save hard", icon: "money",
          blurb: "Spend less every year until retirement.",
          resolve: { text: "You cancel what you can and put the difference away.", flags_set: { frugal: true } }
        },
        {
          id: "checkup", label: "Take your health seriously", icon: "health",
          blurb: "Doctor, diet, the works.",
          roll: {
            tags: ["health"], mods: { coverage: 1 },
            outcomes: [
              { id: "good", chance: 0.60, text: "A doctor who listens, a plan you can follow.", effects: { health: 12, wealth: -800, medical: true } },
              { id: "partial", chance: 0.40, text: "Some of it sticks. The rest costs money you don't have.", effects: { health: 4, wealth: -800, medical: true } }
            ]
          }
        },
        {
          id: "hold_on", label: "Hold on and hope", icon: "age",
          blurb: "Change nothing.",
          resolve: { text: "You change nothing and hope the ground holds." }
        }
      ]
    },

    // Retirement ends the life; the engine renders the summary.
    s65: { age: 65, end: "retired" }
  },

  // College tiers, opened or closed by prior performance and circumstance.
  // A closed tier still shows, with the reason — the closed doors are content.
  // Tuition is per year; family pays its share (see engine) and the rest is
  // cash or debt.
  collegeTiers: [
    {
      id: "elite",
      label: "An elite private university",
      best: "with aid",
      gate: "eliteEligible",
      cost: { wealth: 500 },
      outcomes: [
        { id: "aid", chance: 0.30, text: "Accepted, with need-based aid that covers most of it.", effects: { enroll: { program: "elite", tuition: 4000 } } },
        { id: "no_aid", chance: 0.30, text: "Accepted. The aid letter covers far less than you hoped.", effects: { enroll: { program: "elite", tuition: 20000 } } },
        { id: "reject", chance: 0.40, text: "Rejected. No reason is given, and none is owed.", retry: true }
      ]
    },
    {
      id: "state",
      label: "A state university",
      best: "with a grant",
      gate: "stateEligible",
      cost: { wealth: 200 },
      outcomes: [
        { id: "grant", chance: 0.30, text: "Accepted with a need-based grant.", effects: { enroll: { program: "state", tuition: 3000 } } },
        { id: "accept", chance: 0.40, text: "Accepted. Tuition will stretch everything you have.", effects: { enroll: { program: "state", tuition: 11000 } } },
        { id: "reject", chance: 0.30, text: "Rejected. You reassess.", retry: true }
      ]
    },
    {
      id: "community",
      label: "Community college",
      best: "full-time",
      gate: "always",
      cost: { wealth: 50 },
      outcomes: [
        { id: "accepted", chance: 0.85, text: "Enrolled, after a placement test that puts you in two remedial courses.", effects: { enroll: { program: "community", tuition: 1800 } } },
        { id: "part_time", chance: 0.15, text: "Enrolled part-time, around a work schedule. It will take three years.", effects: { enroll: { program: "community", tuition: 1200, years: 3 } } }
      ]
    }
  ],

  // ===========================================================================
  // BETWEEN-STAGE ACTIONS
  // ===========================================================================
  // The secondary menu. Each can be taken once per year. Stage decisions are
  // the main choices; these are for what happens in between (a layoff, a
  // charge, a health problem).
  //
  // `requires` uses the same keys as a stage option's `show`.

  actions: {

    // ─── SCHOOL ─────────────────────────────────────────────────────────────
    enroll_community_college: {
      label: "Enroll in community college",
      category: "school",
      tags: ["college"],
      cost: { wealth: 50 },
      requires: { age_min: 18, enrolled: false, education_in: ["hs", "some_college"] },
      outcomes: [
        { id: "accepted", chance: 0.85, text: "Enrolled, with placement testing required.", effects: { enroll: { program: "community", tuition: 1800 } } },
        { id: "part_time", chance: 0.15, text: "Enrolled part-time, around your work schedule.", effects: { enroll: { program: "community", tuition: 1200, years: 3 } } }
      ]
    },

    // ─── WORK ───────────────────────────────────────────────────────────────
    look_for_work: {
      label: "Look for work",
      category: "work",
      tags: ["job"],
      requires: { age_min: 18, job_in: ["unemployed", "gig"] },
      outcomes: [
        { id: "steady", chance: 0.65, text: "You're hired. It's steady, and it pays what it pays.", effects: { setJob: "entry" } },
        { id: "temp", chance: 0.35, text: "No steady hire. You piece together gig and contract shifts.", effects: { setJob: "gig", health: -1 } }
      ]
    },

    join_union_apprentice: {
      label: "Apply for a union apprenticeship",
      category: "work",
      tags: ["job", "trade"],
      requires: { age_min: 18, enrolled: false, flags_not: ["trade:true"], job_not: ["apprentice", "journeyman", "salaried", "senior", "owner", "service"] },
      outcomes: [
        { id: "placed", chance: 0.5, text: "You're placed with a crew. Wages and training ramp from day one.", effects: { setJob: "apprentice" }, flags_set: { trade: true } },
        { id: "waitlist", chance: 0.35, text: "A long waitlist. Try again next year.", effects: {} },
        { id: "not_accepted", chance: 0.15, text: "You aren't selected this cycle.", effects: {} }
      ]
    },

    apply_salaried_role: {
      label: "Apply for a salaried role",
      category: "work",
      tags: ["job"],
      requires: { age_min: 20, qualified: true, job_not: ["salaried", "senior", "owner", "service", "journeyman"] },
      mods: { academicPerformance: 1 },
      outcomes: [
        { id: "hired", chance: 0.40, text: "An offer comes through, with benefits attached.", effects: { setJob: "salaried" } },
        { id: "final_round", chance: 0.30, text: "You reach the final round and don't get it. No reason is given.", effects: { health: -2 } },
        { id: "no_callback", chance: 0.30, text: "You submit the application and hear nothing back at all.", effects: { health: -1 } }
      ]
    },

    enlist_military: {
      label: "Enlist in the military",
      category: "work",
      tags: [],
      requires: { age_min: 18, age_max: 39, enrolled: false, flags_not: ["veteran:true", "record:true"], job_not: ["service", "salaried", "senior", "owner"] },
      outcomes: [
        { id: "enlist", chance: 0.8, text: "You enlist. Training, a steady wage, and GI education benefits.", effects: { enlist: true, health: -2 } },
        { id: "medical_disq", chance: 0.2, text: "Medical screening leads to disqualification.", effects: {} }
      ]
    },

    // ─── MONEY ──────────────────────────────────────────────────────────────
    start_side_hustle: {
      label: "Work a side hustle this year",
      category: "money",
      tags: ["finance"],
      requires: { age_min: 16 },
      outcomes: [
        { id: "grow", chance: 0.4, text: "Word of mouth builds a steady client base.", effects: { wealth: 1800, health: -1 } },
        { id: "break_even", chance: 0.4, text: "You cover costs, but growth is slow.", effects: { health: -1 } },
        { id: "loss", chance: 0.2, text: "Costs outpace demand this year.", effects: { wealth: -400 } }
      ]
    },

    // ─── HEALTH ─────────────────────────────────────────────────────────────
    seek_medical_care: {
      label: "See a doctor about it",
      category: "health",
      tags: ["health"],
      mods: { coverage: 1 },
      outcomes: [
        { id: "treated", chance: 0.5, text: "You're examined, believed, and treated.", effects: { health: 8, wealth: -300, medical: true } },
        { id: "dismissed", chance: 0.3, text: "Your pain is logged as moderate and you're sent home with advice.", effects: { health: 1, wealth: -180, medical: true } },
        { id: "cost_deferred", chance: 0.2, text: "You look at the estimate and decide it can wait.", effects: { health: -3 } }
      ]
    },

    // ─── SUBSTANCE ──────────────────────────────────────────────────────────
    experiment_substance: {
      label: "Use to take the edge off",
      category: "substance",
      tags: ["substance"],
      outcomes: [
        { id: "once", chance: 0.55, text: "It helps, briefly. You tell yourself it was a one-time thing.", effects: { addiction: 8, health: -1 } },
        { id: "habit", chance: 0.30, text: "It becomes the thing you do after a bad shift.", effects: { addiction: 18, health: -3 } },
        { id: "bad_time", chance: 0.15, text: "It goes badly and costs you the next two days.", effects: { addiction: 10, health: -6 } }
      ]
    },

    seek_rehab: {
      label: "Seek treatment",
      category: "substance",
      tags: ["substance", "health"],
      requires: { addiction_min: 15 },
      mods: { coverage: 1, familySupport: 1 },
      outcomes: [
        { id: "inpatient", chance: 0.30, text: "You get an inpatient bed. It works, and it costs.", effects: { addiction: -45, health: 10, wealth: -3000, medical: true } },
        { id: "outpatient", chance: 0.40, text: "Outpatient counseling, once a week, around your shifts.", effects: { addiction: -20, health: 4, wealth: -700, medical: true } },
        { id: "waitlist", chance: 0.30, text: "The waitlist is eleven weeks. You're told to call back.", effects: { addiction: 4, health: -2 } }
      ]
    },

    // ─── JUSTICE ────────────────────────────────────────────────────────────
    petty_offense: {
      label: "Take the money that's sitting there",
      category: "justice",
      tags: ["justice", "crime"],
      outcomes: [
        { id: "clean", chance: 0.55, text: "Nothing happens. You are not caught.", effects: { wealth: 600 } },
        { id: "caught_warning", chance: 0.25, text: "You're caught. It's handled informally.", effects: { health: -2 } },
        { id: "charged", chance: 0.20, text: "You're caught, and it's charged.", effects: { health: -4, wealth: -500 }, flags_set: { record: true, charged: true } }
      ]
    },

    diversion_program: {
      label: "Ask about a diversion program",
      category: "justice",
      tags: ["justice"],
      requires: { flags_all: ["charged:true"], flags_not: ["record_cleared:true"] },
      mods: { familySupport: 1 },
      outcomes: [
        { id: "admitted", chance: 0.35, text: "You're admitted. Complete the terms and the charge does not become a conviction.", effects: { wealth: -600 }, flags_set: { record: false, charged: false, record_cleared: true } },
        { id: "conditional", chance: 0.30, text: "Admitted, with fees you'll be paying for a while.", effects: { wealth: -1400 }, flags_set: { record: false, charged: false, record_cleared: true } },
        { id: "denied", chance: 0.35, text: "You don't meet the criteria used in this county.", effects: { health: -2 } }
      ]
    },

    probation_checkin: {
      label: "Make the probation check-in",
      category: "justice",
      tags: ["justice"],
      requires: { flags_all: ["record:true"] },
      outcomes: [
        { id: "fine", chance: 0.6, text: "You make it. It cost you half a shift and the bus fare.", effects: { wealth: -80 } },
        { id: "conflict", chance: 0.25, text: "The appointment conflicts with work. You choose the appointment.", effects: { wealth: -300 } },
        { id: "violation", chance: 0.15, text: "You miss it. A technical violation is filed.", effects: { health: -4, wealth: -400 }, flags_set: { violation: true } }
      ]
    },

    record_expungement: {
      label: "Petition to expunge your record",
      category: "justice",
      tags: ["justice"],
      cost: { wealth: 900 },
      requires: { flags_all: ["record:true"], age_min: 21 },
      mods: { familySupport: 1 },
      outcomes: [
        { id: "granted", chance: 0.30, text: "Granted. It took two years, a lawyer, and $900 you needed.", effects: {}, flags_set: { record: false, record_cleared: true } },
        { id: "partial", chance: 0.25, text: "Partially sealed. Some background checks will still surface it.", effects: {}, flags_set: { record_partial: true } },
        { id: "denied", chance: 0.45, text: "Denied on eligibility grounds. The filing fee is not refunded.", effects: { health: -3 } }
      ]
    },

    // ─── HOUSING & NETWORK ──────────────────────────────────────────────────
    seek_mentor: {
      label: "Seek a mentor",
      category: "network",
      tags: ["network"],
      requires: { age_min: 16, flags_not: ["mentor:true"] },
      mods: { familySupport: 1, schoolFunding: 1 },
      outcomes: [
        { id: "found", chance: 0.5, text: "A mentor offers guidance and, more usefully, introductions.", effects: { academicPerformance: 2 }, flags_set: { mentor: true } },
        { id: "try_again", chance: 0.35, text: "The conversations help, but no lasting fit yet.", effects: {} },
        { id: "none", chance: 0.15, text: "You struggle to find someone with time and alignment.", effects: {} }
      ]
    },

    find_housing: {
      label: "Look for your own place",
      category: "housing",
      tags: ["housing"],
      requires: { age_min: 18, housing_in: ["home"], wealth_min: 800 },
      mods: { hiring: 1 },
      outcomes: [
        { id: "leased", chance: 0.60, text: "Approved. First, last, and deposit clears out your savings.", effects: { housing: "own", wealth: -2400 } },
        { id: "roommates", chance: 0.20, text: "Nothing alone you can afford. You find a room in a shared place.", effects: { housing: "roommates", wealth: -800 } },
        { id: "screened_out", chance: 0.20, text: "The application is declined after the background check.", effects: { wealth: -60, health: -2 } }
      ]
    }
  },

  // ===========================================================================
  // RANDOM LIFE EVENTS — fired on age-up, not chosen.
  // ===========================================================================

  events: {
    housing_shock: {
      label: "Housing cost",
      weight: 1.0,
      absorbable: true,
      outcomes: [
        { id: "repair", chance: 0.5, text: "An urgent repair drains savings.", effects: { wealth: -800 } },
        { id: "eviction_scare", chance: 0.3, text: "A late-rent notice arrives.", effects: { wealth: -400 }, flags_set: { eviction_flag: true } },
        { id: "ok", chance: 0.2, text: "You avoid major costs this time.", effects: {} }
      ]
    },
    health_event: {
      label: "Health",
      weight: 0.8,
      absorbable: true,
      outcomes: [
        { id: "bill", chance: 0.5, text: "An emergency visit leads to bills and missed work.", effects: { wealth: -1200, health: -6, medical: true } },
        { id: "recover", chance: 0.35, text: "You recover with minor costs.", effects: { health: -2, wealth: -150, medical: true } },
        { id: "minor", chance: 0.15, text: "A scare, but no lasting impact.", effects: {} }
      ]
    },
    car_trouble: {
      label: "Transportation",
      weight: 0.9,
      absorbable: true,
      outcomes: [
        { id: "breakdown", chance: 0.45, text: "The car dies. Without it, the job is a two-hour bus ride.", effects: { wealth: -900, health: -2 } },
        { id: "repair", chance: 0.35, text: "A repair you can just barely cover.", effects: { wealth: -350 } },
        { id: "fine", chance: 0.20, text: "It holds together another year.", effects: {} }
      ]
    },
    windfall: {
      label: "Windfall",
      weight: 0.35,
      outcomes: [
        { id: "tax_refund", chance: 0.6, text: "A tax refund lands.", effects: { wealth: 900 } },
        { id: "gift", chance: 0.4, text: "A relative helps out without being asked.", effects: { wealth: 1500 } }
      ]
    }
  }
};

// Browser: a global for script.js. Node: the narration function requires this
// file so its allow-lists come from the same data the game uses.
if (typeof window !== 'undefined') window.GAME_DATA = GAME_DATA;
if (typeof module !== 'undefined' && module.exports) module.exports = GAME_DATA;
