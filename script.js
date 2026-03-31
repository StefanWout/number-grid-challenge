const GRID_SIZE = 7;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;
const ROUND_SECONDS = 60;
const TOTAL_ROUNDS = 2;
const STORAGE_KEY = "number-grid-best-score";

const SAFE_FONTS = [
  "Arial, sans-serif",
  "\"Courier New\", monospace",
  "\"Times New Roman\", serif",
  "Verdana, sans-serif",
  "Tahoma, sans-serif",
  "Georgia, serif",
  "\"Trebuchet MS\", sans-serif",
];

const ui = {
  grid: document.getElementById("grid"),
  startBtn: document.getElementById("start-btn"),
  restartBtn: document.getElementById("restart-btn"),
  targetValue: document.getElementById("target-value"),
  timerValue: document.getElementById("timer-value"),
  roundValue: document.getElementById("round-value"),
  message: document.getElementById("message"),
  roundScore: document.getElementById("round-score"),
  bestValue: document.getElementById("best-value"),
  timerWrap: document.querySelector(".timer-wrap"),
};

const state = {
  round: 1,
  timeLeft: ROUND_SECONDS,
  expected: 1,
  maxReachedInRound: 0,
  roundResults: [],
  timerId: null,
  started: false,
  allowInput: false,
  bestScore: 0,
};

function initGame() {
  loadBestScore();
  resetWholeGame();
  attachEvents();
}

function attachEvents() {
  ui.startBtn.addEventListener("click", () => {
    if (!state.started) {
      startRound();
    }
  });

  ui.restartBtn.addEventListener("click", () => {
    resetWholeGame();
  });
}

function loadBestScore() {
  const saved = Number(localStorage.getItem(STORAGE_KEY));
  state.bestScore = Number.isFinite(saved) ? saved : 0;
  ui.bestValue.textContent = String(state.bestScore);
}

function saveBestScore(score) {
  if (score > state.bestScore) {
    state.bestScore = score;
    localStorage.setItem(STORAGE_KEY, String(score));
    ui.bestValue.textContent = String(score);
  }
}

function resetWholeGame() {
  stopTimer();
  state.round = 1;
  state.roundResults = [];
  prepareRound(1);
  ui.message.textContent = "Press Start to begin Round 1.";
  ui.roundScore.textContent = "";
}

function prepareRound(roundNumber) {
  state.round = roundNumber;
  state.timeLeft = ROUND_SECONDS;
  state.expected = 1;
  state.maxReachedInRound = 0;
  state.started = false;
  state.allowInput = true;

  ui.timerWrap.classList.remove("warning");
  ui.timerValue.textContent = String(state.timeLeft);
  ui.targetValue.textContent = "1";
  ui.roundValue.textContent = `${roundNumber} / ${TOTAL_ROUNDS}`;

  renderGrid(roundNumber === 2);
}

function startRound() {
  state.started = true;
  ui.startBtn.disabled = true;
  ui.message.textContent = `Round ${state.round} started. Find numbers in ascending order.`;
  startTimer();
}

function startTimer() {
  stopTimer();
  state.timerId = setInterval(() => {
    state.timeLeft -= 1;
    ui.timerValue.textContent = String(Math.max(state.timeLeft, 0));

    if (state.timeLeft <= 10) {
      ui.timerWrap.classList.add("warning");
    }

    if (state.timeLeft <= 0) {
      endRound();
    }
  }, 1000);
}

function stopTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function endRound() {
  stopTimer();
  state.allowInput = false;
  ui.startBtn.disabled = true;

  const reached = state.maxReachedInRound;
  state.roundResults.push(reached);
  saveBestScore(reached);

  ui.roundScore.textContent = `Round ${state.round} score: ${reached}`;

  if (state.round < TOTAL_ROUNDS) {
    ui.message.textContent = `Round ${state.round} complete. Starting harder Round 2...`;
    setTimeout(() => {
      prepareRound(state.round + 1);
      ui.message.textContent = "Round 2 ready. Press Start.";
      ui.startBtn.disabled = false;
    }, 1100);
  } else {
    const finalBest = Math.max(...state.roundResults, 0);
    ui.message.textContent = `Game over. Highest number reached: ${finalBest}.`;
    ui.roundScore.textContent = `Round 1: ${state.roundResults[0] || 0} | Round 2: ${state.roundResults[1] || 0}`;
    ui.startBtn.disabled = true;
  }
}

function renderGrid(hardMode) {
  ui.grid.innerHTML = "";
  const numbers = generateShuffledNumbers(CELL_COUNT);

  numbers.forEach((number) => {
    const cell = createCell(number, hardMode);
    ui.grid.appendChild(cell);
  });
}

function createCell(number, hardMode) {
  const cell = document.createElement("button");
  cell.type = "button";
  cell.className = "cell";
  cell.textContent = String(number);
  cell.dataset.value = String(number);
  cell.setAttribute("aria-label", `Number ${number}`);

  if (hardMode) {
    applyHardModeStyle(cell, number);
  }

  cell.addEventListener("click", () => handleCellClick(cell, number));
  return cell;
}

function reshuffleGridAfterCorrectPick() {
  const numbers = Array.from(ui.grid.children, (cell) => Number(cell.dataset.value));
  const shuffled = [...numbers];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  ui.grid.innerHTML = "";

  shuffled.forEach((number) => {
    const cell = createCell(number, true);
    if (number <= state.maxReachedInRound) {
      cell.classList.add("correct");
      cell.disabled = true;
    }
    ui.grid.appendChild(cell);
  });
}

function handleCellClick(cell, value) {
  if (!state.allowInput) {
    return;
  }

  if (!state.started) {
    startRound();
  }

  if (value === state.expected) {
    cell.classList.add("correct");
    cell.disabled = true;
    state.maxReachedInRound = value;
    state.expected += 1;
    ui.targetValue.textContent = state.expected <= CELL_COUNT ? String(state.expected) : "Done";

    if (state.round === 2 && value < CELL_COUNT) {
      reshuffleGridAfterCorrectPick();
    }

    if (value === CELL_COUNT) {
      endRound();
    }
  } else {
    cell.classList.add("wrong");
    ui.grid.classList.add("shake");
    window.setTimeout(() => {
      cell.classList.remove("wrong");
      ui.grid.classList.remove("shake");
    }, 170);
  }
}

function generateShuffledNumbers(size) {
  const nums = Array.from({ length: size }, (_, i) => i + 1);
  for (let i = nums.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  return nums;
}

function applyHardModeStyle(cell, number) {
  const rotations = [0, 90, 180, 270];
  const rotation = number === 6 || number === 9
    ? 0
    : rotations[Math.floor(Math.random() * rotations.length)];
  const font = SAFE_FONTS[Math.floor(Math.random() * SAFE_FONTS.length)];
  const color = generateReadableColor();
  cell.style.transform = `rotate(${rotation}deg)`;
  cell.style.fontFamily = font;
  cell.style.color = color;
}

function generateReadableColor() {
  const min = 35;
  const max = 160;
  const r = randomInt(min, max);
  const g = randomInt(min, max);
  const b = randomInt(min, max);
  return `rgb(${r}, ${g}, ${b})`;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

initGame();
