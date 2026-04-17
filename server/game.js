const EASY_MAX = 20;
const MEDIUM_MAX = 12;
const MEDIUM_MIN = 2;
const HARD_MAX = 10;
const HARD_MIN = 2;
const TIERS = ["easy", "medium", "hard"];

// return a random number between min and max
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// return a random item from a list
function pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// create an easy question using addition or subtraction
function buildEasy() {
  const operator = pick(["+", "-"]);
  const a = randomInt(1, EASY_MAX);
  const b = randomInt(1, EASY_MAX);

  if (operator === "-") {
    // keep result non negative by ordering numbers
    const big = Math.max(a, b);
    const small = Math.min(a, b);
    return { text: `${big} - ${small}`, answer: big - small };
  }

  return { text: `${a} + ${b}`, answer: a + b };
}

// create a medium question using multiplication or division
function buildMedium() {
  const operator = pick(["*", "/"]);

  if (operator === "*") {
    const a = randomInt(MEDIUM_MIN, MEDIUM_MAX);
    const b = randomInt(MEDIUM_MIN, MEDIUM_MAX);
    return { text: `${a} × ${b}`, answer: a * b };
  }

  // build division so result is always a whole number
  const divisor = randomInt(MEDIUM_MIN, MEDIUM_MAX);
  const quotient = randomInt(MEDIUM_MIN, MEDIUM_MAX);
  const dividend = divisor * quotient;

  return { text: `${dividend} ÷ ${divisor}`, answer: quotient };
}

// create a hard question with order of operations
function buildHard() {
  const a = randomInt(HARD_MIN, HARD_MAX);
  const b = randomInt(HARD_MIN, HARD_MAX);
  const c = randomInt(HARD_MIN, HARD_MAX);

  const product = a * b;

  // adjust value to avoid negative results
  const safeC = c < product ? c : randomInt(1, product - 1);

  const patterns = [
    { text: `(${a} + ${b}) × ${c}`, answer: (a + b) * c },
    { text: `${a} × ${b} + ${c}`, answer: product + c },
    { text: `${a} × ${b} - ${safeC}`, answer: product - safeC },
  ];

  return pick(patterns);
}

// map difficulty level to builder function
const builders = { easy: buildEasy, medium: buildMedium, hard: buildHard };

// generate a question with a random difficulty level
export function generateQuestion() {
  const tier = pick(TIERS);
  return { ...builders[tier](), tier };
}

// check if submitted answer matches correct answer
export function checkAnswer(submitted, correct) {
  const value = submitted?.trim();

  if (!value) return false;

  const parsed = Number(value);

  return !Number.isNaN(parsed) && parsed === correct;
}
