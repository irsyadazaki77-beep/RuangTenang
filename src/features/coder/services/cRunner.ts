/**
 * In-Browser C/C++ Student Code Simulator & Memory Visualizer.
 * Designed for CS101 / Dasar Pemrograman & Struktur Data.
 * Simulates stdout, gcc diagnostics, variable memory layout, and pointer dereferencing.
 */

export interface CMemoryCell {
  address: string;
  variableName: string;
  type: string;
  value: any;
  isPointer?: boolean;
  pointsToAddress?: string;
}

export interface CExecutionResult {
  stdout: string;
  exitCode: number;
  compilationOutput: string;
  isError: boolean;
  memoryLayout: CMemoryCell[];
  durationMs: number;
}

export function executeStudentCCode(cSource: string, stdinInput: string = ''): CExecutionResult {
  const startTime = performance.now();
  const stdoutLines: string[] = [];
  const memoryLayout: CMemoryCell[] = [];

  // Check basic C structural requirements
  if (!cSource.includes('main')) {
    return {
      stdout: '',
      exitCode: 1,
      compilationOutput: `cc1: fatal error: function 'main' is not defined in source translation unit\ncompilation terminated.`,
      isError: true,
      memoryLayout: [],
      durationMs: 1
    };
  }

  // Pre-compilation syntax checks (e.g. check for missing semicolons on statement lines)
  const lines = cSource.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('#')) continue;
    if (line.endsWith('{') || line.endsWith('}') || line.startsWith('case') || line.startsWith('default:')) continue;
    if (line.startsWith('if') || line.startsWith('else') || line.startsWith('for') || line.startsWith('while')) {
      if (!line.includes('(') || !line.includes(')')) {
        return {
          stdout: '',
          exitCode: 1,
          compilationOutput: `main.c:${i + 1}:1: error: expected '(' or ')' in control statement\n   ${line}`,
          isError: true,
          memoryLayout: [],
          durationMs: 2
        };
      }
      continue;
    }

    // Statements should end with semicolon
    if (!line.endsWith(';') && !line.endsWith('{') && !line.endsWith('}')) {
      return {
        stdout: '',
        exitCode: 1,
        compilationOutput: `main.c:${i + 1}:${line.length}: error: expected ';' before end of line\n   ${line}\n   ${' '.repeat(line.length)}^`,
        isError: true,
        memoryLayout: [],
        durationMs: 2
      };
    }
  }

  // Simulated Virtual Memory Allocator
  let baseAddress = 0x7ffd1000;
  const variables: Record<string, { type: string; value: any; address: string }> = {};

  const stdinTokens = stdinInput.trim().split(/\s+/).filter(Boolean);
  let stdinIdx = 0;

  // Execute C code logic line-by-line within main()
  try {
    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i].trim();
      if (!rawLine || rawLine.startsWith('//') || rawLine.startsWith('#')) continue;

      // Match variable declarations: int x = 10; or float y = 3.14; or char nama[] = "Budi";
      const declMatch = rawLine.match(/^(int|float|double|char|long)\s+(\*?)([a-zA-Z0-9_]+)(?:\[(\d*)\])?(?:\s*=\s*(.+))?;/);
      if (declMatch) {
        const type = declMatch[1];
        const isPtr = declMatch[2] === '*';
        const varName = declMatch[3];
        const rawInitVal = declMatch[5] ? declMatch[5].trim() : undefined;

        const currentAddr = `0x${(baseAddress += 4).toString(16)}`;
        let evaluatedVal: any = isPtr ? null : 0;

        if (rawInitVal !== undefined) {
          if (rawInitVal.startsWith('&')) {
            // Pointer referencing: int *p = &x;
            const targetVar = rawInitVal.slice(1).trim();
            if (variables[targetVar]) {
              evaluatedVal = variables[targetVar].address;
            }
          } else if (rawInitVal.startsWith('"') && rawInitVal.endsWith('"')) {
            evaluatedVal = rawInitVal.slice(1, -1);
          } else if (!isNaN(Number(rawInitVal))) {
            evaluatedVal = type === 'int' || type === 'long' ? parseInt(rawInitVal, 10) : parseFloat(rawInitVal);
          } else if (variables[rawInitVal]) {
            evaluatedVal = variables[rawInitVal].value;
          }
        }

        variables[varName] = { type: isPtr ? `${type}*` : type, value: evaluatedVal, address: currentAddr };
        memoryLayout.push({
          address: currentAddr,
          variableName: varName,
          type: isPtr ? `${type}*` : type,
          value: evaluatedVal,
          isPointer: isPtr,
          pointsToAddress: isPtr && String(evaluatedVal).startsWith('0x') ? evaluatedVal : undefined
        });
      }

      // Match printf(...)
      const printfMatch = rawLine.match(/printf\s*\(\s*"([^"]*)"(?:,\s*(.+))?\s*\);/);
      if (printfMatch) {
        let fmtString = printfMatch[1];
        const rawArgs = printfMatch[2] ? printfMatch[2].split(',').map(a => a.trim()) : [];

        // Replace escape sequences
        fmtString = fmtString.replace(/\\n/g, '\n').replace(/\\t/g, '\t');

        // Substitute format specifiers (%d, %s, %f, %p)
        rawArgs.forEach(arg => {
          let valToPrint: any = arg;
          if (variables[arg]) {
            valToPrint = variables[arg].value;
          } else if (arg.startsWith('*') && variables[arg.slice(1)]) {
            // Pointer dereference: *p
            const ptrAddr = variables[arg.slice(1)].value;
            const targetCell = memoryLayout.find(c => c.address === ptrAddr);
            valToPrint = targetCell ? targetCell.value : '[invalid ptr]';
          } else if (arg.startsWith('&') && variables[arg.slice(1)]) {
            valToPrint = variables[arg.slice(1)].address;
          }

          if (fmtString.includes('%d') || fmtString.includes('%i')) {
            fmtString = fmtString.replace(/%[di]/, String(valToPrint));
          } else if (fmtString.includes('%f')) {
            fmtString = fmtString.replace(/%f/, typeof valToPrint === 'number' ? valToPrint.toFixed(2) : String(valToPrint));
          } else if (fmtString.includes('%s')) {
            fmtString = fmtString.replace(/%s/, String(valToPrint));
          } else if (fmtString.includes('%p')) {
            fmtString = fmtString.replace(/%p/, String(valToPrint));
          }
        });

        stdoutLines.push(fmtString);
      }

      // Match scanf("%d", &x)
      const scanfMatch = rawLine.match(/scanf\s*\(\s*"[^"]*"\s*,\s*&([a-zA-Z0-9_]+)\s*\);/);
      if (scanfMatch) {
        const targetVar = scanfMatch[1];
        if (variables[targetVar] && stdinTokens[stdinIdx] !== undefined) {
          const rawInput = stdinTokens[stdinIdx++];
          const parsed = !isNaN(Number(rawInput)) ? Number(rawInput) : rawInput;
          variables[targetVar].value = parsed;

          const cell = memoryLayout.find(c => c.variableName === targetVar);
          if (cell) cell.value = parsed;
        }
      }
    }
  } catch (err: any) {
    return {
      stdout: stdoutLines.join(''),
      exitCode: 1,
      compilationOutput: `Runtime Exception: ${err?.message || String(err)}`,
      isError: true,
      memoryLayout,
      durationMs: Math.max(1, Math.round(performance.now() - startTime))
    };
  }

  const duration = Math.max(1, Math.round(performance.now() - startTime));
  const fullStdout = stdoutLines.join('');

  return {
    stdout: fullStdout || '[Program selesai dieksekusi tanpa keluaran stdout (return 0)]',
    exitCode: 0,
    compilationOutput: `gcc -Wall -O2 main.c -o main.out\nBuild finished successfully (0 warnings, 0 errors).`,
    isError: false,
    memoryLayout,
    durationMs: duration
  };
}
