import { Question } from "./types";

/**
 * Practice questions grouped by course unit.
 *
 * Units (from the NIXS JavaScript curriculum):
 *  1. Data types. Primitives
 *  2. Data type conversions
 *  3. Mathematical operators and operands
 *  4. Reduced arithmetic and comparison operators
 *  5. Debugging in browser
 *  6. Conditional statements
 *  7. Logical operators
 *
 * Edit this file to add / change questions. No database needed.
 */
export const questions: Question[] = [
  // ───────────────────────── Data types. Primitives ─────────────────────────
  {
    id: "prim-1",
    type: "multiple-choice",
    prompt: "How many primitive data types exist in JavaScript?",
    description: "Unit: Data types. Primitives",
    options: ["5", "6", "7", "8"],
    correctOption: 2,
    sampleAnswer:
      "7 primitives: string, number, bigint, boolean, undefined, null, symbol.",
  },
  {
    id: "prim-2",
    type: "code",
    language: "javascript",
    prompt:
      "Declare a variable `age` holding the number 25 and a constant `name` holding your name as a string.",
    description: "Unit: Data types. Primitives",
    sampleAnswer: 'let age = 25;\nconst name = "Ada";',
  },
  {
    id: "prim-3",
    type: "text",
    prompt: "What does `typeof null` return, and why is it considered a bug?",
    description: "Unit: Data types. Primitives",
    sampleAnswer:
      '`typeof null` returns "object". It is a long-standing historical bug in JavaScript that has been kept for backward compatibility.',
  },

  // ─────────────────────────── Data type conversions ────────────────────────
  {
    id: "conv-1",
    type: "multiple-choice",
    prompt: "What is the result of `Number('123abc')`?",
    description: "Unit: Data type conversions",
    options: ["123", "NaN", "'123abc'", "0"],
    correctOption: 1,
    sampleAnswer:
      "`NaN`. `Number()` requires the entire string to be numeric, otherwise it returns NaN. (`parseInt` would return 123.)",
  },
  {
    id: "conv-2",
    type: "code",
    language: "javascript",
    prompt:
      "Convert the string `'42'` to a number and the number `7` to a string. Show both conversions.",
    description: "Unit: Data type conversions",
    sampleAnswer: 'const n = Number("42"); // 42\nconst s = String(7);    // "7"',
  },
  {
    id: "conv-3",
    type: "text",
    prompt:
      "What does `Boolean('')`, `Boolean('0')` and `Boolean(0)` each return?",
    description: "Unit: Data type conversions",
    sampleAnswer:
      "Boolean('') → false (empty string is falsy). Boolean('0') → true (non-empty string). Boolean(0) → false.",
  },

  // ──────────────────── Mathematical operators and operands ─────────────────
  {
    id: "math-1",
    type: "multiple-choice",
    prompt: "What is the result of `10 % 3`?",
    description: "Unit: Mathematical operators and operands",
    options: ["3", "1", "0", "3.33"],
    correctOption: 1,
    sampleAnswer: "`1`. The `%` operator returns the remainder of division.",
  },
  {
    id: "math-2",
    type: "multiple-choice",
    prompt: "What is `2 ** 3 ** 2`?",
    description: "Unit: Mathematical operators and operands",
    options: ["64", "512", "12", "18"],
    correctOption: 1,
    sampleAnswer:
      "`512`. Exponentiation is right-associative, so it is 2 ** (3 ** 2) = 2 ** 9 = 512.",
  },
  {
    id: "math-3",
    type: "code",
    language: "javascript",
    prompt:
      "Given `let x = 5;`, write code that increments `x` by 1 using the increment operator, then logs it.",
    description: "Unit: Mathematical operators and operands",
    sampleAnswer: "let x = 5;\nx++;\nconsole.log(x); // 6",
  },

  // ──────────── Reduced arithmetic and comparison operators ─────────────────
  {
    id: "cmp-1",
    type: "multiple-choice",
    prompt: "What is the result of `'5' == 5` versus `'5' === 5`?",
    description: "Unit: Reduced arithmetic and comparison operators",
    options: [
      "true and true",
      "true and false",
      "false and false",
      "false and true",
    ],
    correctOption: 1,
    sampleAnswer:
      "`'5' == 5` is true (loose equality coerces types). `'5' === 5` is false (strict equality compares type and value).",
  },
  {
    id: "cmp-2",
    type: "code",
    language: "javascript",
    prompt:
      "Rewrite `total = total + 5` and `count = count * 2` using reduced (compound) assignment operators.",
    description: "Unit: Reduced arithmetic and comparison operators",
    sampleAnswer: "total += 5;\ncount *= 2;",
  },
  {
    id: "cmp-3",
    type: "text",
    prompt: "What does `null == undefined` return, and what about `null === undefined`?",
    description: "Unit: Reduced arithmetic and comparison operators",
    sampleAnswer:
      "`null == undefined` is true (they are loosely equal to each other). `null === undefined` is false (different types).",
  },

  // ───────────────────────── Debugging in browser ──────────────────────────
  {
    id: "debug-1",
    type: "text",
    prompt:
      "Which keyboard shortcut typically opens DevTools in Chrome, and which panel do you use to set breakpoints?",
    description: "Unit: Debugging in browser",
    sampleAnswer:
      "F12 (or Ctrl+Shift+I / Cmd+Opt+I) opens DevTools. Breakpoints are set in the Sources panel.",
  },
  {
    id: "debug-2",
    type: "text",
    prompt:
      "What JavaScript statement can you place in code to pause execution in the debugger?",
    description: "Unit: Debugging in browser",
    sampleAnswer: "The `debugger;` statement pauses execution when DevTools is open.",
  },
  {
    id: "debug-3",
    type: "code",
    language: "javascript",
    prompt:
      "Write a console statement that logs the label 'user' together with a variable `user`.",
    description: "Unit: Debugging in browser",
    sampleAnswer: 'console.log("user", user);',
  },

  // ───────────────────────── Conditional statements ────────────────────────
  {
    id: "cond-1",
    type: "code",
    language: "javascript",
    prompt:
      "Write an if/else that logs 'adult' if `age >= 18`, otherwise logs 'minor'.",
    description: "Unit: Conditional statements",
    sampleAnswer:
      'if (age >= 18) {\n  console.log("adult");\n} else {\n  console.log("minor");\n}',
  },
  {
    id: "cond-2",
    type: "multiple-choice",
    prompt: "What does the ternary `const r = 5 > 3 ? 'yes' : 'no';` assign to `r`?",
    description: "Unit: Conditional statements",
    options: ["'yes'", "'no'", "true", "undefined"],
    correctOption: 0,
    sampleAnswer: "'yes', because 5 > 3 is true so the first branch is chosen.",
  },
  {
    id: "cond-3",
    type: "code",
    language: "javascript",
    prompt:
      "Use a `switch` on `day` to log 'weekend' for 'Sat' or 'Sun', and 'weekday' otherwise.",
    description: "Unit: Conditional statements",
    sampleAnswer:
      'switch (day) {\n  case "Sat":\n  case "Sun":\n    console.log("weekend");\n    break;\n  default:\n    console.log("weekday");\n}',
  },

  // ───────────────────────────── Logical operators ─────────────────────────
  {
    id: "logic-1",
    type: "multiple-choice",
    prompt: "What does `true && 'hello'` evaluate to?",
    description: "Unit: Logical operators",
    options: ["true", "'hello'", "false", "undefined"],
    correctOption: 1,
    sampleAnswer:
      "'hello'. `&&` returns the last operand if all are truthy; the first falsy one otherwise.",
  },
  {
    id: "logic-2",
    type: "multiple-choice",
    prompt: "What does `0 || 'default'` evaluate to?",
    description: "Unit: Logical operators",
    options: ["0", "'default'", "true", "false"],
    correctOption: 1,
    sampleAnswer:
      "'default'. `||` returns the first truthy operand; 0 is falsy so it returns 'default'.",
  },
  {
    id: "logic-3",
    type: "text",
    prompt:
      "How does the nullish coalescing operator `??` differ from `||` for the value `0`?",
    description: "Unit: Logical operators",
    sampleAnswer:
      "`0 || 'x'` returns 'x' because 0 is falsy. `0 ?? 'x'` returns 0 because `??` only falls back for null or undefined, not for other falsy values.",
  },
];
