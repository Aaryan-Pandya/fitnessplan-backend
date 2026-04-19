const ageGroup = document.getElementById("ageGroup");
const parentBlock = document.getElementById("parentBlock");
const parentConfirm = document.getElementById("parentConfirm");
const equipmentOtherCheck = document.getElementById("equipmentOtherCheck");
const equipmentOtherBlock = document.getElementById("equipmentOtherBlock");
const baselineLabel = document.getElementById("baselineLabel");
const baselineHelper = document.getElementById("baselineHelper");
const baselineUnit = document.getElementById("baselineUnit");
const errorBox = document.getElementById("errorBox");
const resultCard = document.getElementById("resultCard");

function getSelectedGoal() {
  const selected = document.querySelector('input[name="mainGoal"]:checked');
  return selected ? selected.value : "";
}

function getCheckedEquipment() {
  return Array.from(document.querySelectorAll('input[name="equipment"]:checked')).map(
    (item) => item.value
  );
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

function hideError() {
  errorBox.textContent = "";
  errorBox.classList.add("hidden");
}

function updateParentBlock() {
  parentBlock.classList.toggle("hidden", ageGroup.value !== "9-12");
}

function updateEquipmentOther() {
  equipmentOtherBlock.classList.toggle("hidden", !equipmentOtherCheck.checked);
}

function updateBaselinePrompt() {
  const goal = getSelectedGoal();

  const prompts = {
    Cardio: {
      label: "Optional baseline number",
      helper: "Example: a recent run, swim, or bike time. Default unit stays on seconds unless you change it."
    },
    Strength: {
      label: "Optional baseline number",
      helper: "Example: push-ups, pull-ups, or plank time. Default unit is seconds, but you can switch it."
    },
    Endurance: {
      label: "Optional baseline number",
      helper: "Example: longest steady session. Default unit is seconds, but minutes may make more sense here."
    },
    Flexibility: {
      label: "Optional baseline number",
      helper: "Example: a stretch hold or distance from your toes. Default unit is seconds."
    },
    Mixed: {
      label: "Optional baseline number",
      helper: "Example: any number that helps describe where you are starting."
    }
  };

  const chosen = prompts[goal] || {
    label: "Optional baseline number",
    helper: "Example: a time, a distance, a rep count, or a hold."
  };

  baselineLabel.textContent = chosen.label;
  baselineHelper.textContent = chosen.helper;
}

ageGroup.addEventListener("change", updateParentBlock);
equipmentOtherCheck.addEventListener("change", updateEquipmentOther);
document.querySelectorAll('input[name="mainGoal"]').forEach((input) => {
  input.addEventListener("change", updateBaselinePrompt);
});

function safeValue(id, fallback = "") {
  const el = document.getElementById(id);
  return el && el.value.trim() !== "" ? el.value.trim() : fallback;
}

function getFormData() {
  return {
    ageGroup: ageGroup.value,
    goal: getSelectedGoal(),
    parentConfirmed: parentConfirm.checked,
    daysPerWeek: Number(safeValue("daysPerWeek", "3")),
    sessionLength: Number(safeValue("sessionLength", "30")),
    experienceLevel: safeValue("experienceLevel", "Beginner"),
    equipment: getCheckedEquipment(),
    equipmentOther: safeValue("equipmentOther"),
    baselineValue: safeValue("baselineValue"),
    baselineUnit: baselineUnit.value,
    baselineDetails: safeValue("baselineDetails"),
    notes: safeValue("notes")
  };
}

function validate(data) {
  if (!data.ageGroup) return "Choose an age group.";
  if (!data.goal) return "Choose a main goal.";
  if (data.ageGroup === "9-12" && !data.parentConfirmed) {
    return "A parent or guardian must confirm for ages 9 to 12.";
  }
  return "";
}

function ageSettings(ageGroupValue) {
  if (ageGroupValue === "9-12") return { simpler: true, safer: true };
  if (ageGroupValue === "13-15") return { simpler: false, safer: true };
  if (ageGroupValue === "16-17") return { simpler: false, safer: false };
  return { simpler: false, safer: false };
}

function lengthSettings(minutes) {
  if (minutes <= 20) return { sets: 2, addExtra: false };
  if (minutes <= 30) return { sets: 3, addExtra: false };
  if (minutes <= 45) return { sets: 3, addExtra: true };
  return { sets: 4, addExtra: true };
}

function tuneLevel(data) {
  let level = data.experienceLevel;

  if (!data.baselineValue) return level;

  const num = Number(data.baselineValue);
  if (Number.isNaN(num)) return level;

  if (data.goal === "Strength" && data.baselineUnit === "reps" && num >= 20 && level === "Beginner") {
    level = "Some experience";
  }

  if (data.goal === "Endurance" && data.baselineUnit === "minutes" && num >= 30 && level === "Beginner") {
    level = "Some experience";
  }

  if (data.goal === "Cardio" && data.baselineUnit === "seconds" && num > 0 && num < 45 && level === "Beginner") {
    level = "Some experience";
  }

  return level;
}

function getWarmup(goal, simpler) {
  const base = {
    Cardio: [
      "2 minutes easy walking or marching",
      "20 arm circles",
      "10 leg swings each side",
      "2 short build-up efforts"
    ],
    Strength: [
      "2 minutes easy walking or marching",
      "10 bodyweight squats",
      "10 wall or incline push-ups",
      "20 seconds plank hold"
    ],
    Endurance: [
      "3 minutes easy walking",
      "10 ankle circles each side",
      "10 bodyweight squats",
      "20 seconds light marching in place"
    ],
    Flexibility: [
      "1 minute easy breathing",
      "10 cat-cow reps",
      "10 shoulder rolls",
      "20 seconds gentle hamstring reach"
    ],
    Mixed: [
      "2 minutes easy walking or marching",
      "10 bodyweight squats",
      "10 arm circles each direction",
      "20 seconds light plank"
    ]
  };

  const warmup = [...base[goal]];
  if (simpler) {
    return warmup.slice(0, 3);
  }
  return warmup;
}

function getCooldown(goal) {
  const base = {
    Cardio: [
      "2 minutes slow walking",
      "20 seconds calf stretch each side",
      "20 seconds quad stretch each side",
      "Slow breathing for 30 seconds"
    ],
    Strength: [
      "20 seconds chest stretch",
      "20 seconds hamstring stretch",
      "20 seconds hip stretch each side",
      "Slow breathing for 30 seconds"
    ],
    Endurance: [
      "2 minutes easy walking",
      "20 seconds calf stretch each side",
      "20 seconds hamstring stretch",
      "Slow breathing for 30 seconds"
    ],
    Flexibility: [
      "30 seconds easy breathing",
      "20 seconds child’s pose",
      "20 seconds hamstring stretch",
      "20 seconds shoulder stretch"
    ],
    Mixed: [
      "1 minute easy walking",
      "20 seconds calf stretch each side",
      "20 seconds chest stretch",
      "Slow breathing for 30 seconds"
    ]
  };

  return base[goal];
}

function getSafety(ageGroupValue) {
  const notes = [
    "Stop if something feels sharp, painful, or wrong.",
    "Keep form clean and controlled.",
    "Do not turn this into a punishment workout.",
    "Drink water and take normal rest breaks."
  ];

  if (ageGroupValue === "9-12") {
    notes.push("A parent or guardian should stay involved for younger users.");
    notes.push("Do not test max lifts or train through pain.");
  }

  return notes;
}

function getWeeklyStructure(goal, days, simpler) {
  const map = {
    Cardio: ["Speed day", "Technique + easy movement", "Short interval day", "Recovery mobility", "Optional light cardio", "Easy recovery"],
    Strength: ["Strength A", "Strength B", "Mobility or easy movement", "Strength C", "Core + movement", "Easy recovery"],
    Endurance: ["Steady day", "Easy movement", "Longer steady day", "Recovery mobility", "Steady day", "Easy recovery"],
    Flexibility: ["Mobility A", "Mobility B", "Easy movement", "Mobility C", "Recovery flow", "Light stretching"],
    Mixed: ["Mixed A", "Mixed B", "Recovery mobility", "Mixed C", "Light cardio + mobility", "Easy recovery"]
  };

  const chosen = map[goal].slice(0, days);
  if (simpler) {
    return chosen.map((item, index) => `Day ${index + 1}: ${item}`);
  }
  return chosen.map((item, index) => `Day ${index + 1}: ${item}`);
}

function strengthExercises(data, sets, simpler, level) {
  const equipment = data.equipment.join(", ") + " " + data.equipmentOther;
  const hasDumbbells = equipment.toLowerCase().includes("dumbbell");
  const hasBands = equipment.toLowerCase().includes("band");
  const hasPullupBar = equipment.toLowerCase().includes("pull-up");
  const hasMachines = equipment.toLowerCase().includes("machine");

  const pushMove = hasDumbbells
    ? "Dumbbell floor press or dumbbell shoulder press"
    : "Incline push-ups or regular push-ups";

  const pullMove = hasPullupBar
    ? "Dead hangs or assisted pull-ups"
    : hasBands
      ? "Band rows"
      : hasMachines
        ? "Machine row"
        : "Backpack rows or towel rows";

  const legMove = hasDumbbells
    ? "Goblet squats"
    : "Bodyweight squats";

  const hipMove = hasBands
    ? "Band hinges"
    : hasDumbbells
      ? "Dumbbell Romanian deadlifts"
      : "Glute bridges";

  const repRange = level === "Advanced" ? "8 to 12 reps" : level === "Some experience" ? "6 to 10 reps" : "5 to 8 reps";

  const sessionA = [
    `${sets} rounds of ${legMove} for ${repRange}`,
    `${sets} rounds of ${pushMove} for ${repRange}`,
    `${sets} rounds of plank holds for ${simpler ? "15 to 25 seconds" : "20 to 35 seconds"}`
  ];

  const sessionB = [
    `${sets} rounds of ${pullMove} for ${repRange}`,
    `${sets} rounds of ${hipMove} for ${repRange}`,
    `${sets} rounds of wall sit for ${simpler ? "15 to 25 seconds" : "20 to 35 seconds"}`
  ];

  const sessionC = [
    `${sets} rounds of split squats or step-ups for ${repRange}`,
    `${sets} rounds of pike push-ups or band presses for ${repRange}`,
    `${sets} rounds of side plank for ${simpler ? "10 to 20 seconds each side" : "15 to 25 seconds each side"}`
  ];

  return [
    { name: "Session A", items: sessionA },
    { name: "Session B", items: sessionB },
    { name: "Session C", items: sessionC }
  ];
}

function cardioExercises(data, sets, simpler, level) {
  const hardTime = level === "Advanced" ? "30 seconds" : level === "Some experience" ? "25 seconds" : "20 seconds";
  const easyTime = simpler ? "50 seconds" : "40 seconds";

  const sessionA = [
    `${sets + 1} rounds of fast effort for ${hardTime}`,
    `Walk or easy move for ${easyTime} between rounds`,
    "Finish with 3 minutes easy movement"
  ];

  const sessionB = [
    `${sets} rounds of short uphill, bike, or swim efforts for ${hardTime}`,
    `Easy recovery for ${easyTime} between rounds`,
    "Finish with easy walking"
  ];

  const sessionC = [
    `${sets} rounds of moderate pace for ${level === "Advanced" ? "60 seconds" : "45 seconds"}`,
    `Easy pace for ${easyTime} between rounds`,
    "Finish with 2 relaxed build-ups"
  ];

  return [
    { name: "Session A", items: sessionA },
    { name: "Session B", items: sessionB },
    { name: "Session C", items: sessionC }
  ];
}

function enduranceExercises(data, sets, simpler, level) {
  const steadyTime = level === "Advanced" ? "18 to 25 minutes" : level === "Some experience" ? "14 to 20 minutes" : simpler ? "8 to 12 minutes" : "10 to 15 minutes";

  const sessionA = [
    `Steady walk, jog, ride, or swim for ${steadyTime}`,
    "Keep the pace smooth and talkable",
    "Finish with 2 minutes very easy movement"
  ];

  const sessionB = [
    `Broken steady work: ${sets} blocks of ${simpler ? "4" : "5"} minutes`,
    "Rest 1 minute easy between blocks",
    "Try to keep each block even"
  ];

  const sessionC = [
    `Long easy session for ${level === "Advanced" ? "25 to 35 minutes" : "15 to 25 minutes"}`,
    "Stay relaxed and steady",
    "No sprinting at the end"
  ];

  return [
    { name: "Session A", items: sessionA },
    { name: "Session B", items: sessionB },
    { name: "Session C", items: sessionC }
  ];
}

function flexibilityExercises(data, sets, simpler) {
  const hold = simpler ? "15 to 20 seconds" : "20 to 30 seconds";

  const sessionA = [
    `${sets} rounds of hamstring stretch for ${hold}`,
    `${sets} rounds of calf stretch for ${hold}`,
    `${sets} rounds of hip opener for ${hold}`
  ];

  const sessionB = [
    `${sets} rounds of chest stretch for ${hold}`,
    `${sets} rounds of shoulder stretch for ${hold}`,
    `${sets} rounds of thoracic rotation for ${hold}`
  ];

  const sessionC = [
    `${sets} rounds of deep squat hold for ${simpler ? "10 to 15 seconds" : "15 to 25 seconds"}`,
    `${sets} rounds of child’s pose for ${hold}`,
    `${sets} rounds of easy spinal twist for ${hold}`
  ];

  return [
    { name: "Session A", items: sessionA },
    { name: "Session B", items: sessionB },
    { name: "Session C", items: sessionC }
  ];
}

function mixedExercises(data, sets, simpler, level) {
  const sessionA = [
    `${sets} rounds of bodyweight squats for ${level === "Advanced" ? "10 to 14 reps" : "8 to 12 reps"}`,
    `${sets} rounds of push-ups or incline push-ups for ${level === "Advanced" ? "8 to 12 reps" : "5 to 10 reps"}`,
    `${sets} rounds of brisk movement for ${simpler ? "30 seconds" : "45 seconds"}`
  ];

  const sessionB = [
    `${sets} rounds of lunges or step-ups for ${level === "Advanced" ? "8 to 12 reps each side" : "6 to 10 reps each side"}`,
    `${sets} rounds of plank for ${simpler ? "15 to 20 seconds" : "20 to 30 seconds"}`,
    `${sets} rounds of easy jumping jacks or marching for ${simpler ? "20 seconds" : "30 seconds"}`
  ];

  const sessionC = [
    `${sets} rounds of glute bridges for ${level === "Advanced" ? "12 to 16 reps" : "10 to 14 reps"}`,
    `${sets} rounds of rows, bands, or pulls for ${level === "Advanced" ? "8 to 12 reps" : "6 to 10 reps"}`,
    `${sets} rounds of mobility flow for ${simpler ? "30 seconds" : "45 seconds"}`
  ];

  return [
    { name: "Session A", items: sessionA },
    { name: "Session B", items: sessionB },
    { name: "Session C", items: sessionC }
  ];
}

function buildPlan(data) {
  const age = ageSettings(data.ageGroup);
  const length = lengthSettings(data.sessionLength);
  const level = tuneLevel(data);

  const summary = [
    `Age group: ${data.ageGroup}`,
    `Goal: ${data.goal}`,
    `Days per week: ${data.daysPerWeek}`,
    `Session length: ${data.sessionLength} minutes`,
    `Experience: ${level}`,
    `Equipment: ${data.equipment.length ? data.equipment.join(", ") : "None"}${data.equipmentOther ? `, ${data.equipmentOther}` : ""}`,
    data.baselineValue ? `Baseline: ${data.baselineValue} ${data.baselineUnit}${data.baselineDetails ? ` (${data.baselineDetails})` : ""}` : `Baseline: starter mode`
  ].join("\n");

  let sessions = [];
  let title = "";
  let intro = "";

  if (data.goal === "Strength") {
    title = "Strength plan";
    intro = "This plan focuses on controlled strength work, simple progress, and clean form.";
    sessions = strengthExercises(data, length.sets, age.simpler, level);
  }

  if (data.goal === "Cardio") {
    title = "Cardio plan";
    intro = "This plan focuses on shorter, faster efforts with recovery between them.";
    sessions = cardioExercises(data, length.sets, age.simpler, level);
  }

  if (data.goal === "Endurance") {
    title = "Endurance plan";
    intro = "This plan focuses on steady effort, smoother pacing, and building stamina over time.";
    sessions = enduranceExercises(data, length.sets, age.simpler, level);
  }

  if (data.goal === "Flexibility") {
    title = "Flexibility plan";
    intro = "This plan focuses on easier mobility, better range of motion, and simple recovery work.";
    sessions = flexibilityExercises(data, length.sets, age.simpler);
  }

  if (data.goal === "Mixed") {
    title = "Mixed plan";
    intro = "This plan mixes strength, movement, and basic conditioning in a simple weekly setup.";
    sessions = mixedExercises(data, length.sets, age.simpler, level);
  }

  if (length.addExtra) {
    sessions.push({
      name: "Optional extra block",
      items: data.goal === "Flexibility"
        ? ["Add 5 to 10 extra minutes of gentle mobility and breathing"]
        : ["Add 5 to 10 extra minutes of easy mobility or walking"]
    });
  }

  return {
    title,
    intro,
    summary,
    weekly: getWeeklyStructure(data.goal, data.daysPerWeek, age.simpler),
    warmup: getWarmup(data.goal, age.simpler),
    sessions,
    cooldown: getCooldown(data.goal),
    safety: getSafety(data.ageGroup)
  };
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

document.getElementById("generatePlanBtn").addEventListener("click", () => {
  hideError();

  const data = getFormData();
  const error = validate(data);

  if (error) {
    showError(error);
    resultCard.classList.add("hidden");
    return;
  }

  const plan = buildPlan(data);

  document.getElementById("planTitle").textContent = plan.title;
  document.getElementById("planSummary").textContent = plan.intro;
  document.getElementById("quickSummary").textContent = plan.summary;

  renderList("weeklyStructure", plan.weekly);
  renderList("warmupList", plan.warmup);
  renderSessions(plan.sessions);
  renderList("cooldownList", plan.cooldown);
  renderList("safetyList", plan.safety);

  resultCard.classList.remove("hidden");
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
});

updateParentBlock();
updateEquipmentOther();
updateBaselinePrompt();