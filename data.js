// data.js — expanded, branching action catalog for deterministic prototype
// No external APIs. This file is loaded by index.html before script.js.

window.GAME_DATA = {

  races: {
    white:   { label: "White",   seedOffset: 10, schoolFundingLevel: "high", hiringBias: 0.00, familySupportChance: 0.70, crimeExposure: "low",  incomeBracket: "middle" },
    black:   { label: "Black",   seedOffset: 20, schoolFundingLevel: "mid",  hiringBias: 0.12, familySupportChance: 0.60, crimeExposure: "mid",  incomeBracket: "lower"  },
    hispanic:{ label: "Hispanic",seedOffset: 30, schoolFundingLevel: "mid",  hiringBias: 0.08, familySupportChance: 0.60, crimeExposure: "mid",  incomeBracket: "lower"  },
    asian:   { label: "Asian",   seedOffset: 40, schoolFundingLevel: "high", hiringBias: 0.02, familySupportChance: 0.75, crimeExposure: "low",  incomeBracket: "middle" },
    low_income:{label: "Low income", seedOffset: 99, schoolFundingLevel: "low", hiringBias: 0.10, familySupportChance: 0.50, crimeExposure: "mid", incomeBracket: "low" }
  },

  // New schema for actions
  // - requires (eligibility)
  // - mods (systemic multipliers that nudge baseChance)
  // - outcomes (weighted branching)
  actions: {
    // EDUCATION PATHS ------------------------------------------------------
    take_SAT_prep: {
      label: "Take low-cost SAT prep",
      tags: ["school", "prep"],
      baseChance: 0.9,
      cost: { wealth: 150 },
      requires: { age_min: 15, age_max: 19 },
      mods: { schoolFundingLevel: +0.05, familySupportChance: +0.05 },
      outcomes: [
        { id: "gain", chance: 0.7, text: "Focused study lifts your test readiness.", effects: { academicPerformance: 3 } },
        { id: "meh",  chance: 0.2, text: "You pick up some tips but struggle to practice consistently.", effects: { academicPerformance: 1 } },
        { id: "fail", chance: 0.1, text: "Family obligations and work leave little time to prep.", effects: { academicPerformance: 0, health: -1 } }
      ]
    },

    join_AP_program: {
      label: "Join AP / Honors course",
      tags: ["school"],
      baseChance: 0.7,
      requires: { age_min: 14, age_max: 18 },
      mods: { schoolFundingLevel: +0.1 },
      outcomes: [
        { id: "succeed", chance: 0.65, text: "You handle the rigor and earn credit.", effects: { academicPerformance: 4 } },
        { id: "struggle", chance: 0.25, text: "The workload is heavy; you pass but with stress.", effects: { academicPerformance: 1, health: -2 } },
        { id: "denied", chance: 0.10, text: "Scheduling and prerequisites block placement.", effects: { } }
      ]
    },

    apply_community_college: {
      label: "Apply to community college",
      tags: ["college"],
      baseChance: 0.9,
      cost: { wealth: 50 },
      requires: { age_min: 17 },
      outcomes: [
        { id: "accepted", chance: 0.85, text: "Accepted with placement testing required.", effects: { durationMonths: 12, academicPerformance: 2 }, flags_set: { education: "cc_enrolled" } },
        { id: "waitlist", chance: 0.1, text: "Program waitlisted; you attend part-time.", effects: { durationMonths: 6, academicPerformance: 1 }, flags_set: { education: "cc_part_time" } },
        { id: "rejected", chance: 0.05, text: "Administrative hurdles delay enrollment.", effects: { } }
      ]
    },

    transfer_to_state: {
      label: "Transfer from CC to state university",
      tags: ["college"],
      baseChance: 0.6,
      cost: { wealth: 100 },
      requires: { age_min: 18, flags_all: ["education:cc_enrolled"] },
      mods: { academicPerformance: +0.05 },
      outcomes: [
        { id: "accepted_scholar", chance: 0.25, text: "Accepted with modest scholarship.", effects: { wealth: -2000, academicPerformance: 3, durationMonths: 12 }, flags_set: { education: "state_university" } },
        { id: "accepted", chance: 0.45, text: "Accepted without aid; you piece together work-study.", effects: { wealth: -4000, durationMonths: 12 }, flags_set: { education: "state_university" } },
        { id: "denied", chance: 0.30, text: "Credits don’t transfer cleanly; application denied.", effects: { } }
      ]
    },

    apply_state_university: {
      label: "Apply to state university",
      tags: ["college"],
      baseChance: 0.65,
      cost: { wealth: 200 },
      requires: { age_min: 17 },
      mods: { hiringBias: -0.05, schoolFundingLevel: +0.05 },
      outcomes: [
        { id: "accept_scholar", chance: 0.25, text: "Accepted with need-based grant.", effects: { durationMonths: 12, wealth: -1000, academicPerformance: 4 }, flags_set: { education: "state_university" } },
        { id: "accept", chance: 0.35, text: "Accepted; tuition will stretch your budget.", effects: { durationMonths: 12, wealth: -3000 }, flags_set: { education: "state_university" } },
        { id: "reject", chance: 0.40, text: "Rejected; you reassess your path.", effects: { } }
      ]
    },

    apply_private_elite: {
      label: "Apply to elite private university",
      tags: ["college"],
      baseChance: 0.28,
      cost: { wealth: 500 },
      requires: { age_min: 17 },
      mods: { familySupportChance: +0.05 },
      outcomes: [
        { id: "accept_full_need", chance: 0.12, text: "Accepted with strong need-based aid.", effects: { durationMonths: 12, wealth: -1500, academicPerformance: 6 }, flags_set: { education: "elite_university" } },
        { id: "accept_no_aid",  chance: 0.18, text: "Accepted but aid is limited; finances will be tight.", effects: { durationMonths: 12, wealth: -12000, academicPerformance: 4 }, flags_set: { education: "elite_university" } },
        { id: "reject", chance: 0.70, text: "Rejected; you consider other options.", effects: {} }
      ]
    },

    enlist_military: {
      label: "Enlist in the military",
      tags: ["career"],
      baseChance: 0.85,
      requires: { age_min: 17 },
      outcomes: [
        { id: "enlist", chance: 0.8, text: "You enlist and receive training; GI benefits open future education paths.", effects: { durationMonths: 12, health: -2, wealth: 1500 }, flags_set: { veteran: true } },
        { id: "medical_disq", chance: 0.2, text: "Medical screening leads to disqualification.", effects: { } }
      ]
    },

    // WORK & FINANCE -------------------------------------------------------
    take_entry_job: {
      label: "Take an entry-level job",
      tags: ["job"],
      baseChance: 0.9,
      outcomes: [
        { id: "steady", chance: 0.75, text: "You find steady work and begin saving.", effects: { durationMonths: 6, wealth: 2200 } },
        { id: "temp",   chance: 0.25, text: "Inconsistent temp shifts; income is sporadic.", effects: { durationMonths: 3, wealth: 500, health: -1 } }
      ]
    },

    join_union_apprentice: {
      label: "Join a union apprenticeship",
      tags: ["job", "trade"],
      baseChance: 0.55,
      requires: { age_min: 18 },
      outcomes: [
        { id: "placed", chance: 0.5, text: "You’re placed with a crew; wages and training ramp up.", effects: { durationMonths: 12, wealth: 4000 }, flags_set: { trade: true } },
        { id: "waitlist", chance: 0.35, text: "Long waitlist delays placement.", effects: { durationMonths: 6 } },
        { id: "not_accepted", chance: 0.15, text: "You’re not selected this cycle.", effects: {} }
      ]
    },

    start_side_hustle: {
      label: "Start a side hustle",
      tags: ["finance"],
      baseChance: 0.7,
      outcomes: [
        { id: "grow", chance: 0.4, text: "Word-of-mouth builds a steady client base.", effects: { wealth: 1200 } },
        { id: "break_even", chance: 0.4, text: "You cover costs but growth is slow.", effects: { wealth: 0 } },
        { id: "loss", chance: 0.2, text: "Costs outpace demand this season.", effects: { wealth: -400 } }
      ]
    },

    save_and_invest: {
      label: "Save and invest a portion of income",
      tags: ["finance"],
      baseChance: 0.8,
      outcomes: [
        { id: "up", chance: 0.7, text: "Savings grow slowly.", effects: { wealth: 1200 } },
        { id: "down", chance: 0.3, text: "A downturn dents your small holdings.", effects: { wealth: -300 } }
      ]
    },

    take_student_loan: {
      label: "Take a student loan",
      tags: ["finance", "college"],
      baseChance: 0.95,
      requires: { flags_any: ["education:state_university", "education:elite_university"] },
      outcomes: [
        { id: "approved", chance: 0.9, text: "Loan approved; tuition and living costs covered this term.", effects: { wealth: 6000 } },
        { id: "small",    chance: 0.1, text: "Partial approval covers only tuition.", effects: { wealth: 3000 } }
      ]
    },

    // HOUSING / HEALTH / JUSTICE -----------------------------------------
    face_housing_shock: {
      label: "Unexpected housing cost",
      tags: ["housing"],
      baseChance: 0.6,
      outcomes: [
        { id: "repair", chance: 0.5, text: "Urgent repair drains savings.", effects: { wealth: -800 } },
        { id: "eviction_scare", chance: 0.3, text: "Late rent notice; you catch up with help.", effects: { wealth: -400 }, flags_set: { eviction_flag: true } },
        { id: "ok", chance: 0.2, text: "You avoid major costs this time.", effects: {} }
      ]
    },

    health_crisis: {
      label: "Health crisis",
      tags: ["health"],
      baseChance: 0.3,
      mods: { medicalTreatmentModifier: -0.05 },
      outcomes: [
        { id: "bill", chance: 0.5, text: "Emergency visit leads to bills and missed work.", effects: { wealth: -1200, health: -6, durationMonths: 1 } },
        { id: "recover", chance: 0.35, text: "You recover with minor costs.", effects: { health: -2 } },
        { id: "minor", chance: 0.15, text: "A scare, but no major impact.", effects: {} }
      ]
    },

    stop_and_frisk: {
      label: "Police stop",
      tags: ["justice"],
      baseChance: 0.25,
      mods: { crimeExposure: +0.1 },
      outcomes: [
        { id: "warning", chance: 0.7, text: "You’re stopped and questioned; released with a warning.", effects: { health: -1 } },
        { id: "citation", chance: 0.25, text: "You receive a citation; it complicates finances.", effects: { wealth: -200 } },
        { id: "arrest", chance: 0.05, text: "Arrested and released; records may affect opportunities.", effects: { health: -3 }, flags_set: { record: true } }
      ]
    },

    // NETWORKS / GUIDANCE --------------------------------------------------
    seek_mentor: {
      label: "Seek a mentor",
      tags: ["network"],
      baseChance: 0.6,
      mods: { familySupportChance: +0.1 },
      outcomes: [
        { id: "found", chance: 0.5, text: "A mentor offers guidance and connections.", effects: { academicPerformance: 2 }, flags_set: { mentor: true } },
        { id: "try_again", chance: 0.35, text: "Conversations help, but no long-term fit yet.", effects: { } },
        { id: "none", chance: 0.15, text: "You struggle to find someone with time and alignment.", effects: { } }
      ]
    },

    // CLEANUP / LIFE MGMT --------------------------------------------------
    manage_debt: {
      label: "Restructure or pay down debt",
      tags: ["finance"],
      baseChance: 0.7,
      requires: { flags_any: ["eviction_flag", "record", "education:state_university", "education:elite_university"] },
      outcomes: [
        { id: "plan", chance: 0.6, text: "You set a realistic plan and cut interest costs.", effects: { wealth: 400 } },
        { id: "setback", chance: 0.4, text: "Bills pile up; progress is slow.", effects: { wealth: -200 } }
      ]
    }
  }
};
