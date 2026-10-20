import { Question } from "./types";

/**
 * Course content: a mix of teaching slides (type "info") and practice
 * questions. The facilitator walks through this list in order. Info slides
 * explain a concept first; the questions that follow let students try it.
 * Not every detail is explained — trying things out is part of the learning.
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
    id: "prim-info",
    type: "info",
    prompt: "Data types · Primitives",
    description: "Unit 1 — read, then you'll try a few",
    body:
      "JavaScript has 7 primitive types: string, number, bigint, boolean, undefined, null, and symbol. A primitive is a simple, immutable value — not an object.\n\nUse let for values that change, const for values that don't. typeof tells you the type of a value.",
    codeSample:
      'let age = 25;          // number\nconst name = "Ada";    // string\nlet active = true;     // boolean\nlet nothing = null;    // null\nlet missing;           // undefined\n\nconsole.log(typeof age);   // "number"\nconsole.log(typeof name);  // "string"',
  },
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
  {
    id: "prim-4",
    type: "multiple-choice",
    prompt: "What is the difference between `undefined` and `null`?",
    description: "Unit: Data types. Primitives",
    options: [
      "They are identical",
      "undefined = variable not assigned; null = intentional empty value",
      "null is a number; undefined is a string",
      "undefined cannot be used in code",
    ],
    correctOption: 1,
    sampleAnswer:
      "`undefined` means a variable has been declared but not assigned a value. `null` is an intentionally assigned 'empty' value.",
  },
  {
    id: "prim-5",
    type: "multiple-choice",
    prompt: "Which of these is NOT a primitive type in JavaScript?",
    description: "Unit: Data types. Primitives",
    options: ["string", "boolean", "array", "symbol"],
    correctOption: 2,
    sampleAnswer: "`array` is an object, not a primitive.",
  },

  // ─────────────────────────── Data type conversions ────────────────────────
  {
    id: "conv-info",
    type: "info",
    prompt: "Data type conversions",
    description: "Unit 2",
    body:
      "Values can be converted between types — explicitly (you do it) or implicitly (JavaScript does it for you).\n\nNumber(x), String(x) and Boolean(x) convert explicitly. Note: Number() needs the WHOLE string to be numeric, otherwise you get NaN. parseInt() is more forgiving.\n\nEmpty string, 0, null, undefined, NaN and false are all 'falsy'. Everything else is 'truthy'.",
    codeSample:
      'Number("42");     // 42\nNumber("42abc");  // NaN\nparseInt("42abc");// 42\nString(7);        // "7"\nBoolean("");      // false\nBoolean("0");     // true  (non-empty string!)\nBoolean(0);       // false',
  },
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
  {
    id: "conv-4",
    type: "multiple-choice",
    prompt: "What does `'3' + 4` evaluate to?",
    description: "Unit: Data type conversions",
    options: ["7", "'34'", "34", "NaN"],
    correctOption: 1,
    sampleAnswer:
      "`'34'`. With `+`, if either operand is a string the other is converted to a string and they are concatenated.",
  },
  {
    id: "conv-5",
    type: "multiple-choice",
    prompt: "What does `'6' - 2` evaluate to?",
    description: "Unit: Data type conversions",
    options: ["'4'", "4", "'62'", "NaN"],
    correctOption: 1,
    sampleAnswer:
      "`4` (number). Unlike `+`, the `-` operator converts strings to numbers.",
  },

  // ──────────────────── Mathematical operators and operands ─────────────────
  {
    id: "math-info",
    type: "info",
    prompt: "Mathematical operators and operands",
    description: "Unit 3",
    body:
      "Arithmetic operators: + - * / and % (remainder). ** is exponentiation (power).\n\nOperators act on operands: in 2 + 3, the operands are 2 and 3. Watch out for precedence and associativity — ** is right-associative, so it groups from the right.\n\n++ and -- increase/decrease a number by 1.",
    codeSample:
      "10 % 3;      // 1  (remainder)\n2 ** 3;      // 8  (power)\n2 ** 3 ** 2; // 512 (right-to-left: 2 ** 9)\n\nlet x = 5;\nx++;         // x is now 6",
  },
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
  {
    id: "math-4",
    type: "code",
    language: "javascript",
    prompt:
      "Write an expression that checks whether the number `n` is even (use the remainder operator).",
    description: "Unit: Mathematical operators and operands",
    sampleAnswer: "n % 2 === 0;",
  },
  {
    id: "math-5",
    type: "multiple-choice",
    prompt:
      "Given `let y = 10; const z = y++ + 1;` — what is the value of `z`?",
    description: "Unit: Mathematical operators and operands",
    options: ["11", "12", "10", "NaN"],
    correctOption: 0,
    sampleAnswer:
      "`11`. `y++` is post-increment: it uses the current value (10) in the expression, so z = 10 + 1 = 11, and y becomes 11 afterwards.",
  },

  // ──────────── Reduced arithmetic and comparison operators ─────────────────
  {
    id: "cmp-info",
    type: "info",
    prompt: "Reduced (compound) assignment & comparison operators",
    description: "Unit 4",
    body:
      "Compound assignment operators are shorthands: += -= *= /= %=. So total += 5 means total = total + 5.\n\nComparison operators return a boolean: > < >= <=, and == vs ===.\n\n== compares after converting types (loose). === compares value AND type (strict). Prefer === to avoid surprises.",
    codeSample:
      "let total = 10;\ntotal += 5;   // 15\ntotal *= 2;   // 30\n\n'5' == 5;     // true  (types coerced)\n'5' === 5;    // false (different types)\nnull == undefined;  // true\nnull === undefined; // false",
  },
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
  {
    id: "cmp-4",
    type: "multiple-choice",
    prompt: "What does `0 == false` return?",
    description: "Unit: Reduced arithmetic and comparison operators",
    options: ["true", "false", "NaN", "TypeError"],
    correctOption: 0,
    sampleAnswer:
      "`true`. With loose equality, `false` converts to 0, so 0 == 0 is true. (`0 === false` would be false.)",
  },

  // ───────────────────────── Debugging in browser ──────────────────────────
  {
    id: "debug-info",
    type: "info",
    prompt: "Debugging in the browser",
    description: "Unit 5",
    body:
      "Browser DevTools help you find bugs. Open them with F12 (or Ctrl+Shift+I / Cmd+Opt+I).\n\nThe Console runs JS and shows console.log output. The Sources panel lets you set breakpoints to pause code and inspect variables step by step.\n\nYou can also pause anywhere by writing the debugger; statement in your code.",
    codeSample:
      'function total(a, b) {\n  debugger;            // execution pauses here\n  const sum = a + b;\n  console.log("sum", sum);\n  return sum;\n}',
  },
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
    id: "cond-info",
    type: "info",
    prompt: "Conditional statements",
    description: "Unit 6",
    body:
      "Conditionals run code based on a boolean test. Use if / else if / else for branching.\n\nThe ternary operator condition ? a : b is a compact if/else that returns a value.\n\nswitch compares one value against several case labels — don't forget break.",
    codeSample:
      'if (age >= 18) {\n  console.log("adult");\n} else {\n  console.log("minor");\n}\n\nconst label = score > 50 ? "pass" : "fail";',
  },
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
  {
    id: "cond-4",
    type: "code",
    language: "javascript",
    prompt:
      "Write an if/else if/else that logs 'A' for score >= 90, 'B' for score >= 70, otherwise 'C'.",
    description: "Unit: Conditional statements",
    sampleAnswer:
      'if (score >= 90) {\n  console.log("A");\n} else if (score >= 70) {\n  console.log("B");\n} else {\n  console.log("C");\n}',
  },

  // ───────────────────────────── Logical operators ─────────────────────────
  {
    id: "logic-info",
    type: "info",
    prompt: "Logical operators",
    description: "Unit 7",
    body:
      "&& (AND), || (OR) and ! (NOT) combine boolean logic — but they also return one of their operands, not just true/false.\n\n&& returns the first falsy operand, or the last one if all are truthy. || returns the first truthy operand. This enables handy default-value patterns.\n\n?? (nullish coalescing) only falls back for null/undefined — unlike ||, it keeps 0 and ''.",
    codeSample:
      "true && 'hi';   // 'hi'\n0 || 'default'; // 'default'\n0 ?? 'default'; // 0  (?? ignores falsy-but-defined)\n!0;             // true",
  },
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
  {
    id: "logic-4",
    type: "multiple-choice",
    prompt: "What does `!(5 > 3)` evaluate to?",
    description: "Unit: Logical operators",
    options: ["true", "false", "5", "undefined"],
    correctOption: 1,
    sampleAnswer: "`false`. 5 > 3 is true, and `!` negates it to false.",
  },
  {
    id: "logic-5",
    type: "code",
    language: "javascript",
    prompt:
      "Using `||`, write an expression that uses `name` if it is truthy, otherwise the string 'Guest'.",
    description: "Unit: Logical operators",
    sampleAnswer: 'const display = name || "Guest";',
  },
];
