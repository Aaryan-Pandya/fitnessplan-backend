const progressLabel = document.getElementById("progressLabel");
const progressFill = document.getElementById("progressFill");
const errorBox = document.getElementById("errorBox");

const steps = {
  age: document.getElementById("step-age"),
  parent: document.getElementById("step-parent"),
  goals: document.getElementById("step-goals"),
  focus: document.getElementById("step-focus"),
  days: document.getElementById("step-days"),
  length: document.getElementById("step-length"),
  experience: document.getElementById("step-experience"),
  equipment: document.getElementById("step-equipment"),
  baselines: document.getElementById("step-baselines"),
  result: document.getElementById("step-result")
};

const stepOrder = [
  "age",
  "parent",
  "goals",
  "focus",
  "days",
  "length",
  "experience",
  "equipment",
  "baselines",
  "result"
];

const state = {
  age: "",
  parentConfirmed: false,
  mainGoals: [],
  focusAreas: [],
  daysPerWeek: "",
  sessionLength: "",
  experienceLevel: "",
  equipment: []
};

const focusMap = {
  Cardio: [
    "Running speed",
    "Swim speed",
    "Cycling speed",
    "Sport conditioning"
  ],
  Strength: [
    "Upper body strength",
    "Lower body strength",
    "Core strength",
    "Full body strength",
    "Power"
  ],
  Endurance: [
    "Stamina",
    "Longer distance",
    "Steady pacing",
    "General stamina"
  ],
  Flexibility: [
    "Better range of motion",
    "Less stiffness",
    "Recovery",
    "Mobility"
  ]
};

/* ----------------------------- UI HELPERS ----------------------------- */

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

function hideError() {
  errorBox.textContent = "";
  errorBox.classList.add("hidden");
}

function showStep(stepName) {
  Object.values(steps).forEach((step) => step.classList.remove("active"));
  steps[stepName].classList.add("active");

  const stepIndex = stepOrder.indexOf(stepName);
  progressLabel.textContent = `Question ${stepIndex + 1}`;
  progressFill.style.width = `${((stepIndex + 1) / stepOrder.length) * 100}%`;

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getCheckedValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(
    (item) => item.value
  );
}

function getSelectedRadio(name) {
  const selected = document.querySelector(`input[name="${name}"]:checked`);
  return selected ? selected.value : "";
}

function filled(id) {
  const el = document.getElementById(id);
  if (!el) return false;
  return el.value !== "" && el.value !== null;
}

function renderFocusBlocks() {
  const wrap = document.getElementById("focusBlocks");
  wrap.innerHTML = "";

  state.mainGoals.forEach((goal) => {
    const group = document.createElement("div");
    group.className = "focus-group";

    const title = document.createElement("h3");
    title.textContent = goal;
    group.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "choice-grid";

    focusMap[goal].forEach((focus) => {
      const label = document.createElement("label");
      label.className = "choice-card";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "focusArea";
      input.value = `${goal}|${focus}`;

      const span = document.createElement("span");
      span.textContent = focus;

      label.appendChild(input);
      label.appendChild(span);
      grid.appendChild(label);
    });

    group.appendChild(grid);
    wrap.appendChild(group);
  });
}

function updateBaselineVisibility() {
  document.getElementById("baseline-cardio").classList.toggle("hidden", !state.mainGoals.includes("Cardio"));
  document.getElementById("baseline-strength").classList.toggle("hidden", !state.mainGoals.includes("Strength"));
  document.getElementById("baseline-endurance").classList.toggle("hidden", !state.mainGoals.includes("Endurance"));
  document.getElementById("baseline-flexibility").classList.toggle("hidden", !state.mainGoals.includes("Flexibility"));
}

/* ----------------------------- PARSERS ----------------------------- */

function parseTimeToSeconds(value) {
  const text = String(value || "").trim();
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(text);
  if (!match) return NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

function averageBand(bands) {
  if (bands.length === 0) return 1;
  const avg = bands.reduce((sum, item) => sum + item, 0) / bands.length;
  return Math.min(5, Math.max(1, Math.round(avg)));
}

function bandLowerBetter(value, thresholds) {
  if (value >= thresholds[0]) return 1;
  if (value >= thresholds[1]) return 2;
  if (value >= thresholds[2]) return 3;
  if (value >= thresholds[3]) return 4;
  return 5;
}

function bandHigherBetter(value, thresholds) {
  if (value <= thresholds[0]) return 1;
  if (value <= thresholds[1]) return 2;
  if (value <= thresholds[2]) return 3;
  if (value <= thresholds[3]) return 4;
  return 5;
}

/* ----------------------------- BAND RULES ----------------------------- */
/* Hidden internal bands. These are not shown to the user directly. */

function getBaselineBands() {
  const bands = {
    cardio: [],
    strength: [],
    endurance: [],
    flexibility: [],
    summary: []
  };

  // Cardio
  const mileSeconds = parseTimeToSeconds(document.getElementById("cardioMileValue").value);
  const run400Seconds = parseTimeToSeconds(document.getElementById("cardio400Value").value);
  const swim100Seconds = parseTimeToSeconds(document.getElementById("cardioSwim100Value").value);

  if (!Number.isNaN(mileSeconds)) {
    const band = bandLowerBetter(mileSeconds, [570, 480, 405, 330]); // 9:30+, 8:00-9:29, 6:45-7:59, 5:30-6:44, under 5:30
    bands.cardio.push(band);
    bands.summary.push(`Mile time: ${document.getElementById("cardioMileValue").value}`);
  }

  if (!Number.isNaN(run400Seconds)) {
    const band = bandLowerBetter(run400Seconds, [120, 90, 70, 55]); // 2:00+, 1:30-1:59, 1:10-1:29, 0:55-1:09, under 0:55
    bands.cardio.push(band);
    bands.summary.push(`400m time: ${document.getElementById("cardio400Value").value}`);
  }

  if (!Number.isNaN(swim100Seconds)) {
    const band = bandLowerBetter(swim100Seconds, [150, 120, 90, 65]); // 2:30+, 2:00-2:29, 1:30-1:59, 1:05-1:29, under 1:05
    bands.cardio.push(band);
    bands.summary.push(`100m swim time: ${document.getElementById("cardioSwim100Value").value}`);
  }

  // Strength
  if (filled("strengthPushups")) {
    const value = Number(document.getElementById("strengthPushups").value);
    bands.strength.push(bandHigherBetter(value, [5, 12, 25, 40]));
    bands.summary.push(`Push-ups: ${value}`);
  }

  if (filled("strengthPlankValue")) {
    const value = Number(document.getElementById("strengthPlankValue").value);
    bands.strength.push(bandHigherBetter(value, [20, 45, 90, 150]));
    bands.summary.push(`Plank: ${value} sec`);
  }

  if (filled("strengthPullups")) {
    const value = Number(document.getElementById("strengthPullups").value);
    bands.strength.push(bandHigherBetter(value, [0, 3, 7, 12]));
    bands.summary.push(`Pull-ups: ${value}`);
  }

  if (filled("strengthWallSitValue")) {
    const value = Number(document.getElementById("strengthWallSitValue").value);
    bands.strength.push(bandHigherBetter(value, [20, 45, 75, 120]));
    bands.summary.push(`Wall sit: ${value} sec`);
  }

  // Endurance
  if (filled("enduranceLongestValue")) {
    const value = Number(document.getElementById("enduranceLongestValue").value);
    bands.endurance.push(bandHigherBetter(value, [10, 20, 35, 50]));
    bands.summary.push(`Longest continuous cardio session: ${value} min`);
  }

  if (filled("enduranceWeeklyValue")) {
    const value = Number(document.getElementById("enduranceWeeklyValue").value);
    bands.endurance.push(bandHigherBetter(value, [30, 75, 150, 240]));
    bands.summary.push(`Weekly steady cardio total: ${value} min`);
  }

  // Flexibility
  if (filled("flexToeTouch")) {
    const value = document.getElementById("flexToeTouch").value;
    const band = value === "No" ? 1 : value === "Almost" ? 3 : 5;
    bands.flexibility.push(band);
    bands.summary.push(`Toe touch: ${value}`);
  }

  if (filled("flexDeepSquat")) {
    const value = document.getElementById("flexDeepSquat").value;
    const band = value === "No" ? 1 : value === "Somewhat" ? 3 : 5;
    bands.flexibility.push(band);
    bands.summary.push(`Deep squat: ${value}`);
  }

  if (filled("flexStiffness")) {
    const value = document.getElementById("flexStiffness").value;
    const band = value === "High" ? 1 : value === "Moderate" ? 3 : 5;
    bands.flexibility.push(band);
    bands.summary.push(`Stiffness: ${value}`);
  }

  return {
    cardioBand: averageBand(bands.cardio),
    strengthBand: averageBand(bands.strength),
    enduranceBand: averageBand(bands.endurance),
    flexibilityBand: averageBand(bands.flexibility),
    summaryLines: bands.summary
  };
}

/* ----------------------------- VALIDATION ----------------------------- */

function validateBaselines() {
  if (state.mainGoals.includes("Cardio")) {
    const mileSeconds = parseTimeToSeconds(document.getElementById("cardioMileValue").value);
    const run400Seconds = parseTimeToSeconds(document.getElementById("cardio400Value").value);

    if (Number.isNaN(mileSeconds)) return "Cardio requires mile time in mm:ss format.";
    if (Number.isNaN(run400Seconds)) return "Cardio requires 400m time in mm:ss format.";
  }

  if (state.mainGoals.includes("Strength")) {
    if (!filled("strengthPushups")) return "Strength requires push-ups in one set.";
    if (!filled("strengthPlankValue")) return "Strength requires plank hold in seconds.";
  }

  if (state.mainGoals.includes("Endurance")) {
    if (!filled("enduranceLongestValue")) return "Endurance requires longest continuous cardio session in minutes.";
  }

  if (state.mainGoals.includes("Flexibility")) {
    if (!filled("flexToeTouch")) return "Flexibility requires the toe-touch answer.";
  }

  return "";
}

/* ----------------------------- PLAN ENGINE ----------------------------- */

function ageSettings(ageValue) {
  const age = Number(ageValue);
  return {
    younger: age <= 12
  };
}

function getWarmup(goals, younger) {
  const warmup = [
    "2 minutes easy walking or marching",
    "10 bodyweight squats",
    "10 arm circles each direction"
  ];

  if (goals.includes("Cardio")) warmup.push("2 short build-up efforts");
  if (goals.includes("Strength")) warmup.push("20 seconds light plank");
  if (goals.includes("Flexibility")) warmup.push("20 seconds gentle hamstring reach");

  return younger ? warmup.slice(0, 4) : warmup;
}

function getCooldown(goals) {
  const cooldown = [
    "1 to 2 minutes easy walking",
    "20 seconds calf stretch each side",
    "20 seconds hamstring stretch",
    "30 seconds slow breathing"
  ];

  if (goals.includes("Flexibility")) {
    cooldown.push("20 seconds child’s pose");
  }

  return cooldown;
}

function getSafety(ageValue) {
  const notes = [
    "Stop if something feels sharp, painful, or wrong.",
    "Keep form clean and controlled.",
    "Take normal water and rest breaks.",
    "Do not turn the plan into a punishment workout."
  ];

  if (Number(ageValue) <= 12) {
    notes.push("A parent or guardian should stay involved.");
    notes.push("Do not max out or train through pain.");
  }

  return notes;
}

function getWeeklyStructure(goals, days) {
  const output = [];
  for (let i = 1; i <= Number(days); i += 1) {
    const goal = goals[(i - 1) % goals.length];
    output.push(`Day ${i}: ${goal} focus`);
  }
  return output;
}

function getFocusLabelsForGoal(goal) {
  return state.focusAreas
    .filter((item) => item.startsWith(`${goal}|`))
    .map((item) => item.split("|")[1]);
}

function strengthSession(band, focuses, equipment, younger, sessionLength) {
  let sets = band <= 2 ? 3 : band === 3 ? 3 : 4;
  if (sessionLength === 90) sets += 1;
  if (younger && sets > 4) sets = 4;

  const repRange = band === 1 ? "5 to 6 reps" :
                   band === 2 ? "6 to 8 reps" :
                   band === 3 ? "8 to 10 reps" :
                   band === 4 ? "8 to 12 reps" :
                   "10 to 12 reps";

  const plankHold = band === 1 ? "20 seconds" :
                    band === 2 ? "30 seconds" :
                    band === 3 ? "45 seconds" :
                    band === 4 ? "60 seconds" :
                    "75 seconds";

  const rest = band >= 4 ? "60 seconds" : "75 seconds";

  const hasDumbbells = equipment.includes("Dumbbells");
  const hasBands = equipment.includes("Bands");
  const hasPullupBar = equipment.includes("Pull-up bar");
  const hasMachines = equipment.includes("Machines");

  const pushMove = hasDumbbells ? "dumbbell press" : "push-ups or incline push-ups";
  const pullMove = hasPullupBar ? "pull-ups or dead hangs" : hasBands ? "band rows" : hasMachines ? "machine row" : "backpack rows";
  const legMove = hasDumbbells ? "goblet squats" : "bodyweight squats";

  const items = [];

  if (focuses.includes("Upper body strength")) {
    items.push(`${sets} sets of ${pushMove} for ${repRange}. Rest ${rest}.`);
    items.push(`${sets} sets of ${pullMove} for ${repRange}. Rest ${rest}.`);
  }
  if (focuses.includes("Lower body strength")) {
    items.push(`${sets} sets of ${legMove} for ${repRange}. Rest ${rest}.`);
    items.push(`${sets} sets of split squats or step-ups for ${repRange}. Rest ${rest}.`);
  }
  if (focuses.includes("Core strength")) {
    items.push(`${sets} sets of plank for ${plankHold}. Rest 45 seconds.`);
  }
  if (focuses.includes("Full body strength")) {
    items.push(`${sets} sets of squats, push work, and pull work for ${repRange}. Rest ${rest}.`);
  }
  if (focuses.includes("Power")) {
    items.push(`${Math.max(2, sets - 1)} sets of low-volume jumps or fast step-ups for 4 to 6 reps. Rest 75 seconds.`);
  }

  if (items.length === 0) {
    items.push(`${sets} sets of ${legMove} for ${repRange}. Rest ${rest}.`);
    items.push(`${sets} sets of ${pushMove} for ${repRange}. Rest ${rest}.`);
    items.push(`${sets} sets of plank for ${plankHold}. Rest 45 seconds.`);
  }

  return {
    name: "Strength session",
    items
  };
}

function cardioSession(band, focuses, younger, sessionLength) {
  let intervals = band === 1 ? 5 : band === 2 ? 6 : band === 3 ? 8 : band === 4 ? 9 : 10;
  if (sessionLength === 60) intervals += 1;
  if (sessionLength === 90) intervals += 2;

  const fastTime = band === 1 ? "15 seconds" :
                   band === 2 ? "20 seconds" :
                   band === 3 ? "25 seconds" :
                   band === 4 ? "30 seconds" :
                   "35 seconds";

  const rest = band >= 4 ? "50 seconds" : "60 to 75 seconds";

  const items = [];

  if (focuses.includes("Running speed")) {
    items.push(`${intervals} sets of fast running for ${fastTime}. Rest ${rest} with easy walking.`);
  }
  if (focuses.includes("Swim speed")) {
    items.push(`${Math.max(4, intervals - 2)} sets of strong swim efforts for ${fastTime}. Rest ${rest}.`);
  }
  if (focuses.includes("Cycling speed")) {
    items.push(`${intervals} sets of bike surges for ${fastTime}. Rest ${rest}.`);
  }
  if (focuses.includes("Sport conditioning")) {
    items.push(`${intervals} sets of shuttle bursts or court sprints for ${fastTime}. Rest ${rest}.`);
  }

  if (items.length === 0) {
    items.push(`${intervals} sets of short speed efforts for ${fastTime}. Rest ${rest}.`);
  }

  items.push("Finish with 3 to 5 minutes easy recovery movement.");

  if (younger) {
    items.push("Keep the fast efforts smooth, not wild.");
  }

  return {
    name: "Cardio session",
    items
  };
}

function enduranceSession(band, focuses, younger, sessionLength) {
  let blockMinutes = band === 1 ? 6 : band === 2 ? 8 : band === 3 ? 10 : band === 4 ? 12 : 15;
  let blocks = sessionLength === 30 ? 2 : sessionLength === 60 ? 3 : 4;

  if (younger && blocks > 3) blocks = 3;

  const items = [];

  if (focuses.includes("Stamina")) {
    items.push(`${blocks} blocks of steady movement for ${blockMinutes} minutes. Rest 1 minute easy between blocks.`);
  }
  if (focuses.includes("Longer distance")) {
    items.push(`1 long easy session for ${blockMinutes * blocks} total minutes at a relaxed pace.`);
  }
  if (focuses.includes("Steady pacing")) {
    items.push(`${blocks} even blocks of ${blockMinutes} minutes. Try to keep the pace the same in every block.`);
  }
  if (focuses.includes("General stamina")) {
    items.push(`${blocks} blocks of smooth steady movement for ${blockMinutes} minutes. Rest 1 minute easy.`);
  }

  if (items.length === 0) {
    items.push(`${blocks} blocks of steady movement for ${blockMinutes} minutes. Rest 1 minute easy.`);
  }

  if (younger) {
    items.push("Stay relaxed and do not sprint at the end.");
  }

  return {
    name: "Endurance session",
    items
  };
}

function flexibilitySession(band, focuses, younger, sessionLength) {
  let rounds = sessionLength === 30 ? 2 : sessionLength === 60 ? 3 : 4;
  let hold = band === 1 ? "15 seconds" :
             band === 2 ? "20 seconds" :
             band === 3 ? "25 seconds" :
             band === 4 ? "30 seconds" :
             "35 seconds";

  if (younger && rounds > 3) rounds = 3;

  const items = [];

  if (focuses.includes("Better range of motion")) {
    items.push(`${rounds} rounds of hamstring, calf, and hip mobility for ${hold} each. Rest 20 seconds between moves.`);
  }
  if (focuses.includes("Less stiffness")) {
    items.push(`${rounds} rounds of easy full-body mobility for ${hold} each. Rest 20 seconds between moves.`);
  }
  if (focuses.includes("Recovery")) {
    items.push(`${rounds} rounds of light stretching and breathing for ${hold} each. Rest 20 seconds between moves.`);
  }
  if (focuses.includes("Mobility")) {
    items.push(`${rounds} rounds of shoulder, hip, and ankle mobility for ${hold} each. Rest 20 seconds between moves.`);
  }

  if (items.length === 0) {
    items.push(`${rounds} rounds of easy stretching and mobility for ${hold} each.`);
  }

  return {
    name: "Flexibility session",
    items
  };
}

function buildSessions(bands) {
  const age = ageSettings(state.age);
  const sessions = [];

  state.mainGoals.forEach((goal) => {
    const focuses = getFocusLabelsForGoal(goal);

    if (goal === "Cardio") {
      sessions.push(cardioSession(bands.cardioBand, focuses, age.younger, Number(state.sessionLength)));
    }
    if (goal === "Strength") {
      sessions.push(strengthSession(bands.strengthBand, focuses, state.equipment, age.younger, Number(state.sessionLength)));
    }
    if (goal === "Endurance") {
      sessions.push(enduranceSession(bands.enduranceBand, focuses, age.younger, Number(state.sessionLength)));
    }
    if (goal === "Flexibility") {
      sessions.push(flexibilitySession(bands.flexibilityBand, focuses, age.younger, Number(state.sessionLength)));
    }
  });

  return sessions;
}

function buildProgressionRules(bands) {
  const rules = [];

  if (state.mainGoals.includes("Strength")) {
    rules.push("If you complete all strength sets with clean form for 2 sessions in a row, add 1 rep per set or use a slightly harder variation.");
  }

  if (state.mainGoals.includes("Cardio")) {
    rules.push("For cardio, first add 1 interval, then add 5 seconds to the fast effort, then slightly reduce rest if needed.");
  }

  if (state.mainGoals.includes("Endurance")) {
    rules.push("For endurance, add 2 to 5 total minutes before adding a lot more intensity.");
  }

  if (state.mainGoals.includes("Flexibility")) {
    rules.push("For flexibility, add 5 seconds to each hold only after the current hold time feels easy and controlled.");
  }

  rules.push("Change only 1 training variable at a time.");
  return rules;
}

function buildRegressionRules() {
  return [
    "If form breaks, reduce reps by 2 or shorten the hold time.",
    "If the session feels too hard, remove 1 set before changing everything else.",
    "If needed, use an easier exercise version instead of forcing the harder one.",
    "Take longer rest instead of rushing through poor-quality reps."
  ];
}

function buildBaselineSummary(bands) {
  return bands.summaryLines.length ? bands.summaryLines.join("\n") : "No baseline summary available";
}

function renderList(id, items) {
  const target = document.getElementById(id);
  target.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    target.appendChild(li);
  });
}

function renderSessions(sessions) {
  const wrap = document.getElementById("sessionsWrap");
  wrap.innerHTML = "";

  sessions.forEach((session) => {
    const card = document.createElement("div");
    card.className = "session-card";

    const title = document.createElement("h4");
    title.textContent = session.name;
    card.appendChild(title);

    const ul = document.createElement("ul");
    session.items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      ul.appendChild(li);
    });

    card.appendChild(ul);
    wrap.appendChild(card);
  });
}

function renderPlan() {
  const age = ageSettings(state.age);
  const bands = getBaselineBands();

  const summary = [
    `Age: ${state.age}`,
    `Main goals: ${state.mainGoals.join(", ")}`,
    `Focus areas: ${state.focusAreas.map((item) => item.split("|")[1]).join(", ") || "None selected"}`,
    `Days per week: ${state.daysPerWeek}`,
    `Session length: ${state.sessionLength} minutes`,
    `Experience level: ${state.experienceLevel}`,
    `Equipment: ${state.equipment.join(", ") || "No equipment selected"}`,
    `Baselines:\n${buildBaselineSummary(bands)}`
  ].join("\n");

  document.getElementById("planTitle").textContent =
    state.mainGoals.length === 1 ? `${state.mainGoals[0]} plan` : "Multi-goal plan";

  document.getElementById("planSummary").textContent =
    state.mainGoals.length === 1
      ? `This plan is built around ${state.mainGoals[0].toLowerCase()} with your chosen setup.`
      : "This plan mixes your selected goals into a simple weekly structure.";

  document.getElementById("quickSummary").textContent = summary;

  renderList("weeklyStructure", getWeeklyStructure(state.mainGoals, state.daysPerWeek));
  renderList("warmupList", getWarmup(state.mainGoals, age.younger));
  renderSessions(buildSessions(bands));
  renderList("cooldownList", getCooldown(state.mainGoals));
  renderList("progressionList", buildProgressionRules(bands));
  renderList("regressionList", buildRegressionRules());
  renderList("safetyList", getSafety(state.age));
}

/* ----------------------------- NAVIGATION ----------------------------- */

document.getElementById("ageNext").addEventListener("click", () => {
  hideError();
  state.age = document.getElementById("ageSelect").value;

  if (!state.age) {
    showError("Select your age.");
    return;
  }

  if (Number(state.age) <= 12) {
    showStep("parent");
  } else {
    state.parentConfirmed = false;
    showStep("goals");
  }
});

document.getElementById("parentBack").addEventListener("click", () => {
  hideError();
  showStep("age");
});

document.getElementById("parentNext").addEventListener("click", () => {
  hideError();

  if (!document.getElementById("parentConfirm").checked) {
    showError("A parent or guardian must confirm.");
    return;
  }

  state.parentConfirmed = true;
  showStep("goals");
});

document.getElementById("goalsBack").addEventListener("click", () => {
  hideError();
  if (Number(state.age) <= 12) {
    showStep("parent");
  } else {
    showStep("age");
  }
});

document.getElementById("goalsNext").addEventListener("click", () => {
  hideError();
  state.mainGoals = getCheckedValues("mainGoal");

  if (state.mainGoals.length === 0) {
    showError("Choose at least one main goal.");
    return;
  }

  renderFocusBlocks();
  showStep("focus");
});

document.getElementById("focusBack").addEventListener("click", () => {
  hideError();
  showStep("goals");
});

document.getElementById("focusNext").addEventListener("click", () => {
  hideError();
  state.focusAreas = getCheckedValues("focusArea");
  showStep("days");
});

document.getElementById("daysBack").addEventListener("click", () => {
  hideError();
  showStep("focus");
});

document.getElementById("daysNext").addEventListener("click", () => {
  hideError();
  state.daysPerWeek = document.getElementById("daysSelect").value;

  if (!state.daysPerWeek) {
    showError("Choose days per week.");
    return;
  }

  showStep("length");
});

document.getElementById("lengthBack").addEventListener("click", () => {
  hideError();
  showStep("days");
});

document.getElementById("lengthNext").addEventListener("click", () => {
  hideError();
  state.sessionLength = getSelectedRadio("sessionLength");

  if (!state.sessionLength) {
    showError("Choose a session length.");
    return;
  }

  showStep("experience");
});

document.getElementById("experienceBack").addEventListener("click", () => {
  hideError();
  showStep("length");
});

document.getElementById("experienceNext").addEventListener("click", () => {
  hideError();
  state.experienceLevel = getSelectedRadio("experienceLevel");

  if (!state.experienceLevel) {
    showError("Choose an experience level.");
    return;
  }

  showStep("equipment");
});

document.getElementById("equipmentBack").addEventListener("click", () => {
  hideError();
  showStep("experience");
});

document.getElementById("equipmentNext").addEventListener("click", () => {
  hideError();
  state.equipment = getCheckedValues("equipment");
  updateBaselineVisibility();
  showStep("baselines");
});

document.getElementById("baselinesBack").addEventListener("click", () => {
  hideError();
  showStep("equipment");
});

document.getElementById("baselinesNext").addEventListener("click", () => {
  hideError();

  const baselineError = validateBaselines();
  if (baselineError) {
    showError(baselineError);
    return;
  }

  renderPlan();
  showStep("result");
});

document.getElementById("startOver").addEventListener("click", () => {
  location.reload();
});

showStep("age");