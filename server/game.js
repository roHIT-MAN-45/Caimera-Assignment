const EASY_MAX = 20;
const MEDIUM_MAX = 12;
const MEDIUM_MIN = 2;
const HARD_MAX = 10;
const HARD_MIN = 2;
const TIERS = ["easy", "medium", "hard"];

// pick a random integer between min and max inclusive
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// pick one item randomly from an array
function pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// build an easy addition or subtraction question using numbers 1 to 20
function buildEasy() {
  const operator = pick(["+", "-"]);
  const a = randomInt(1, EASY_MAX);
  const b = randomInt(1, EASY_MAX);

  if (operator === "-") {
    // put the larger number first so the answer is never negative
    const big = Math.max(a, b);
    const small = Math.min(a, b);
    return { text: `${big} - ${small}`, answer: big - small };
  }

  return { text: `${a} + ${b}`, answer: a + b };
}

// build a medium multiplication or whole-number division question
function buildMedium() {
  const operator = pick(["*", "/"]);

  if (operator === "*") {
    const a = randomInt(MEDIUM_MIN, MEDIUM_MAX);
    const b = randomInt(MEDIUM_MIN, MEDIUM_MAX);
    return { text: `${a} × ${b}`, answer: a * b };
  }

  // build division from the answer backward to guarantee a whole result
  const divisor = randomInt(MEDIUM_MIN, MEDIUM_MAX);
  const quotient = randomInt(MEDIUM_MIN, MEDIUM_MAX);
  const dividend = divisor * quotient;
  return { text: `${dividend} ÷ ${divisor}`, answer: quotient };
}

// build a hard order-of-operations question using three numbers
function buildHard() {
  const a = randomInt(HARD_MIN, HARD_MAX);
  const b = randomInt(HARD_MIN, HARD_MAX);
  const c = randomInt(HARD_MIN, HARD_MAX);
  const product = a * b;

  // clamp c so the subtraction pattern never produces a negative answer
  const safeC = c < product ? c : randomInt(1, product - 1);

  const patterns = [
    { text: `(${a} + ${b}) × ${c}`, answer: (a + b) * c },
    { text: `${a} × ${b} + ${c}`, answer: product + c },
    { text: `${a} × ${b} - ${safeC}`, answer: product - safeC },
  ];

  return pick(patterns);
}

const builders = { easy: buildEasy, medium: buildMedium, hard: buildHard };

// generate a question at a random difficulty tier and attach the tier label
export function generateQuestion() {
  const tier = pick(TIERS);
  return { ...builders[tier](), tier };
}

// parse and compare the submitted answer against the correct number
export function checkAnswer(submitted, correct) {
  const value = submitted?.trim();
  if (!value) return false;
  const parsed = Number(value);
  return !Number.isNaN(parsed) && parsed === correct;
}
