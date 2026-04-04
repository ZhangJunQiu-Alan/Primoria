type RunnerSuccess = {
  success: true;
  output: string;
};

type RunnerFailure = {
  success: false;
  error: string;
};

export type CodeRunResult = RunnerSuccess | RunnerFailure;

type OperatorMatch = {
  index: number;
  operator: string;
};

export async function runCode(
  code: string,
  {
    language = 'python',
    signal,
  }: {
    language?: string;
    signal?: AbortSignal;
  } = {},
): Promise<CodeRunResult> {
  await delay(450, signal);

  if (signal?.aborted) {
    throw new DOMException('Code execution aborted.', 'AbortError');
  }

  if (language.toLowerCase() !== 'python') {
    return runStringLiteralPrintOnly(code);
  }

  return runPythonLike(code);
}

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    function onAbort() {
      cleanup();
      reject(new DOMException('Code execution aborted.', 'AbortError'));
    }

    function cleanup() {
      window.clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
    }

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function runStringLiteralPrintOnly(code: string): CodeRunResult {
  const printPattern = /print\s*\(\s*["'](.+?)["']\s*\)/g;
  const outputs = Array.from(code.matchAll(printPattern)).map((match) => match[1] ?? '');

  return {
    success: true,
    output: outputs.length > 0 ? outputs.join('\n') : '(no output)',
  };
}

function runPythonLike(code: string): CodeRunResult {
  const outputs: string[] = [];
  const variables = new Map<string, unknown>();

  try {
    for (const rawLine of code.split('\n')) {
      const line = stripInlineComment(rawLine).trim();
      if (!line) {
        continue;
      }

      if (isAssignmentLine(line)) {
        const splitIndex = line.indexOf('=');
        const identifier = line.slice(0, splitIndex).trim();
        const expression = line.slice(splitIndex + 1).trim();

        if (isValidIdentifier(identifier)) {
          variables.set(identifier, evaluateExpression(expression, variables));
        }

        continue;
      }

      const printMatch = /^print\s*\(([\s\S]*)\)\s*$/.exec(line);
      if (printMatch) {
        const expressions = splitTopLevel(printMatch[1] ?? '', ',')
          .map((part) => part.trim())
          .filter(Boolean);
        const values = expressions.map((expression) =>
          formatPythonValue(evaluateExpression(expression, variables)),
        );
        outputs.push(values.join(' '));
      }
    }
  } catch (error) {
    return {
      success: false,
      error: `Runtime error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  return {
    success: true,
    output: outputs.length > 0 ? outputs.join('\n') : '(no output)',
  };
}

function stripInlineComment(line: string) {
  let inSingle = false;
  let inDouble = false;
  let escaped = false;
  let result = '';

  for (const character of line) {
    if (escaped) {
      result += character;
      escaped = false;
      continue;
    }

    if (character === '\\') {
      result += character;
      escaped = true;
      continue;
    }

    if (!inDouble && character === "'") {
      inSingle = !inSingle;
      result += character;
      continue;
    }

    if (!inSingle && character === '"') {
      inDouble = !inDouble;
      result += character;
      continue;
    }

    if (!inSingle && !inDouble && character === '#') {
      break;
    }

    result += character;
  }

  return result;
}

function isAssignmentLine(line: string) {
  if (!line.includes('=')) {
    return false;
  }

  if (
    line.includes('==') ||
    line.includes('!=') ||
    line.includes('>=') ||
    line.includes('<=') ||
    line.startsWith('print(')
  ) {
    return false;
  }

  const splitIndex = line.indexOf('=');
  return splitIndex > 0 && isValidIdentifier(line.slice(0, splitIndex).trim());
}

function isValidIdentifier(value: string) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}

function evaluateExpression(expression: string, variables: Map<string, unknown>): unknown {
  const input = expression.trim();
  if (!input) {
    throw new Error('empty expression');
  }

  if (isWrappedByBalancedParentheses(input)) {
    return evaluateExpression(input.slice(1, -1), variables);
  }

  const stringLiteral = tryParseString(input);
  if (stringLiteral !== null) {
    return stringLiteral;
  }

  const numberLiteral = tryParseNumber(input);
  if (numberLiteral !== null) {
    return numberLiteral;
  }

  if (input === 'True') {
    return true;
  }

  if (input === 'False') {
    return false;
  }

  if (isValidIdentifier(input) && variables.has(input)) {
    return variables.get(input);
  }

  const functionMatch = /^([A-Za-z_][A-Za-z0-9_]*)\(([\s\S]*)\)$/.exec(input);
  if (functionMatch) {
    const functionName = functionMatch[1] ?? '';
    const rawArgs = functionMatch[2] ?? '';
    const args = splitTopLevel(rawArgs, ',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => evaluateExpression(part, variables));
    return evaluateFunction(functionName, args);
  }

  const addSubMatch = findTopLevelOperator(input, ['+', '-']);
  if (addSubMatch) {
    const left = evaluateExpression(input.slice(0, addSubMatch.index), variables);
    const right = evaluateExpression(
      input.slice(addSubMatch.index + addSubMatch.operator.length),
      variables,
    );
    return applyNumericOperator(left, right, addSubMatch.operator);
  }

  const mulDivMatch = findTopLevelOperator(input, ['//', '*', '/', '%']);
  if (mulDivMatch) {
    const left = evaluateExpression(input.slice(0, mulDivMatch.index), variables);
    const right = evaluateExpression(
      input.slice(mulDivMatch.index + mulDivMatch.operator.length),
      variables,
    );
    return applyNumericOperator(left, right, mulDivMatch.operator);
  }

  const powerMatch = findTopLevelOperator(input, ['**'], true);
  if (powerMatch) {
    const left = evaluateExpression(input.slice(0, powerMatch.index), variables);
    const right = evaluateExpression(
      input.slice(powerMatch.index + powerMatch.operator.length),
      variables,
    );
    return applyNumericOperator(left, right, powerMatch.operator);
  }

  throw new Error(`unsupported expression: ${input}`);
}

function evaluateFunction(functionName: string, args: unknown[]) {
  switch (functionName) {
    case 'type': {
      if (args.length !== 1) {
        throw new Error(`type() expects 1 argument, got ${args.length}`);
      }

      const value = args[0];
      const typeName =
        typeof value === 'boolean'
          ? 'bool'
          : typeof value === 'number'
          ? Number.isInteger(value)
            ? 'int'
            : 'float'
          : typeof value === 'string'
          ? 'str'
          : 'object';
      return `<class '${typeName}'>`;
    }
    case 'int':
      return Math.trunc(toNumber(args, functionName));
    case 'float':
      return toNumber(args, functionName);
    case 'round':
      return Math.round(toNumber(args, functionName));
    case 'str':
      return formatPythonValue(expectSingleArg(args, functionName));
    case 'bool': {
      const value = expectSingleArg(args, functionName);
      if (typeof value === 'boolean') {
        return value;
      }
      if (typeof value === 'number') {
        return value !== 0;
      }
      if (typeof value === 'string') {
        return value.length > 0;
      }
      return Boolean(value);
    }
    default:
      throw new Error(`unsupported function: ${functionName}`);
  }
}

function expectSingleArg(args: unknown[], functionName: string) {
  if (args.length !== 1) {
    throw new Error(`${functionName}() expects 1 argument, got ${args.length}`);
  }

  return args[0];
}

function toNumber(args: unknown[], functionName: string) {
  const value = expectSingleArg(args, functionName);
  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
      ? Number(value)
      : NaN;

  if (Number.isNaN(numericValue)) {
    throw new Error(`${functionName}() could not convert ${String(value)}`);
  }

  return numericValue;
}

function applyNumericOperator(left: unknown, right: unknown, operator: string) {
  if (operator === '+' && (typeof left === 'string' || typeof right === 'string')) {
    return `${formatPythonValue(left)}${formatPythonValue(right)}`;
  }

  const leftNumber = typeof left === 'number' ? left : Number(left);
  const rightNumber = typeof right === 'number' ? right : Number(right);

  if (Number.isNaN(leftNumber) || Number.isNaN(rightNumber)) {
    throw new Error(`unsupported operands for ${operator}: ${String(left)} and ${String(right)}`);
  }

  switch (operator) {
    case '+':
      return leftNumber + rightNumber;
    case '-':
      return leftNumber - rightNumber;
    case '*':
      return leftNumber * rightNumber;
    case '/':
      return leftNumber / rightNumber;
    case '//':
      return Math.floor(leftNumber / rightNumber);
    case '%':
      return leftNumber % rightNumber;
    case '**':
      return leftNumber ** rightNumber;
    default:
      throw new Error(`unsupported operator: ${operator}`);
  }
}

function formatPythonValue(value: unknown) {
  if (typeof value === 'boolean') {
    return value ? 'True' : 'False';
  }

  return String(value);
}

function tryParseString(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return null;
}

function tryParseNumber(value: string) {
  if (!/^[-+]?\d+(\.\d+)?$/.test(value)) {
    return null;
  }

  return value.includes('.') ? Number.parseFloat(value) : Number.parseInt(value, 10);
}

function isWrappedByBalancedParentheses(value: string) {
  if (!value.startsWith('(') || !value.endsWith(')')) {
    return false;
  }

  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]!;

    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === '\\') {
      escaped = true;
      continue;
    }

    if (!inDouble && character === "'") {
      inSingle = !inSingle;
      continue;
    }

    if (!inSingle && character === '"') {
      inDouble = !inDouble;
      continue;
    }

    if (inSingle || inDouble) {
      continue;
    }

    if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
      if (depth === 0 && index !== value.length - 1) {
        return false;
      }
    }
  }

  return depth === 0;
}

function findTopLevelOperator(
  value: string,
  operators: string[],
  rightAssociative = false,
): OperatorMatch | null {
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let escaped = false;
  const indexes = [...Array(value.length).keys()];
  const sequence = rightAssociative ? indexes.reverse() : indexes;

  for (const index of sequence) {
    const character = value[index]!;

    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === '\\') {
      escaped = true;
      continue;
    }

    if (!inDouble && character === "'") {
      inSingle = !inSingle;
      continue;
    }

    if (!inSingle && character === '"') {
      inDouble = !inDouble;
      continue;
    }

    if (inSingle || inDouble) {
      continue;
    }

    if (character === ')') {
      depth += 1;
      continue;
    }

    if (character === '(') {
      depth -= 1;
      continue;
    }

    if (depth !== 0) {
      continue;
    }

    for (const operator of operators) {
      const segment = rightAssociative
        ? value.slice(index - operator.length + 1, index + 1)
        : value.slice(index, index + operator.length);

      if (segment !== operator) {
        continue;
      }

      const startIndex = rightAssociative ? index - operator.length + 1 : index;
      const previous = value[startIndex - 1] ?? '';

      if (
        (operator === '+' || operator === '-') &&
        (startIndex === 0 || /[,(+\-*/%]/.test(previous))
      ) {
        continue;
      }

      return { index: startIndex, operator };
    }
  }

  return null;
}

function splitTopLevel(value: string, separator: string) {
  const parts: string[] = [];
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let escaped = false;
  let current = '';

  for (const character of value) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }

    if (character === '\\') {
      current += character;
      escaped = true;
      continue;
    }

    if (!inDouble && character === "'") {
      inSingle = !inSingle;
      current += character;
      continue;
    }

    if (!inSingle && character === '"') {
      inDouble = !inDouble;
      current += character;
      continue;
    }

    if (inSingle || inDouble) {
      current += character;
      continue;
    }

    if (character === '(') {
      depth += 1;
      current += character;
      continue;
    }

    if (character === ')') {
      depth -= 1;
      current += character;
      continue;
    }

    if (character === separator && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  parts.push(current);
  return parts;
}
