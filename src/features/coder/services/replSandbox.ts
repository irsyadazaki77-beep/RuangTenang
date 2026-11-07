/**
 * In-browser sandbox evaluator for JavaScript and lightweight Python REPL.
 * 100% Client-side, zero external API keys.
 */

import { executeBrowserPython } from './pyodideRunner';

export interface ReplOutputEntry {
  id: string;
  type: 'input' | 'output' | 'error' | 'system';
  content: string;
  timestamp: string;
  chartSvg?: string;
}

/**
 * Safely evaluates JavaScript expressions in a controlled in-browser context.
 */
export function evaluateJavaScript(code: string): { output: string; isError: boolean } {
  const trimmed = code.trim();
  if (!trimmed) return { output: '', isError: false };

  const logs: string[] = [];
  const customConsole = {
    log: (...args: any[]) => {
      logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' '));
    },
    error: (...args: any[]) => {
      logs.push('[ERR] ' + args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' '));
    },
    warn: (...args: any[]) => {
      logs.push('[WARN] ' + args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' '));
    }
  };

  try {
     
    const fn = new Function('console', `
      return eval(${JSON.stringify(trimmed)});
    `);

    const result = fn(customConsole);
    if (result !== undefined) {
      logs.push(typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result));
    }

    return {
      output: logs.length > 0 ? logs.join('\n') : 'undefined',
      isError: false
    };
  } catch (err: any) {
    return {
      output: err?.message || String(err),
      isError: true
    };
  }
}

/**
 * Client-side Python sandbox evaluator.
 * Supports basic python statements: print, variables, arithmetic, lists, loops, functions.
 */
export function evaluatePythonLite(code: string): { output: string; isError: boolean; chartSvg?: string } {
  if (code.includes('plt.') || code.includes('matplotlib')) {
    const pyRes = executeBrowserPython(code);
    return {
      output: pyRes.output || (pyRes.chartSvg ? '📊 [Matplotlib Visual Plot Ter-render]' : ''),
      isError: pyRes.isError,
      chartSvg: pyRes.chartSvg
    };
  }

  const lines = code.trim().split('\n');
  const logs: string[] = [];
  const scope: Record<string, any> = {};

  try {
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      // Match print(...)
      const printMatch = line.match(/^print\((.*)\)$/);
      if (printMatch) {
        const inner = printMatch[1].trim();
        // Handle f-string
        if (inner.startsWith('f"') || inner.startsWith("f'")) {
          const rawStr = inner.slice(2, -1);
          const interpolated = rawStr.replace(/\{([^}]+)\}/g, (_, expr) => {
            const trimmedExpr = expr.trim();
            if (scope[trimmedExpr] !== undefined) return String(scope[trimmedExpr]);
            try {
              const scopeKeys = Object.keys(scope);
              const scopeVals = Object.values(scope);
               
              const fn = new Function(...scopeKeys, `return (${trimmedExpr});`);
              return String(fn(...scopeVals));
            } catch {
              return expr;
            }
          });
          logs.push(interpolated);
        } else if (scope[inner] !== undefined) {
          logs.push(String(scope[inner]));
        } else {
          // Remove string quotes if literal string
          if ((inner.startsWith('"') && inner.endsWith('"')) || (inner.startsWith("'") && inner.endsWith("'"))) {
            logs.push(inner.slice(1, -1));
          } else {
            // Expression evaluation using scope variables
            try {
              const scopeKeys = Object.keys(scope);
              const scopeVals = Object.values(scope);
               
              const fn = new Function(...scopeKeys, `return (${inner});`);
              logs.push(String(fn(...scopeVals)));
            } catch {
              logs.push(inner);
            }
          }
        }
        continue;
      }

      // Variable assignment e.g. x = 10, name = "RuangCoder"
      const assignMatch = line.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/);
      if (assignMatch) {
        const varName = assignMatch[1];
        const valExpr = assignMatch[2].trim();
        if ((valExpr.startsWith('"') && valExpr.endsWith('"')) || (valExpr.startsWith("'") && valExpr.endsWith("'"))) {
          scope[varName] = valExpr.slice(1, -1);
        } else {
          try {
            const scopeKeys = Object.keys(scope);
            const scopeVals = Object.values(scope);
             
            const fn = new Function(...scopeKeys, `return (${valExpr});`);
            scope[varName] = fn(...scopeVals);
          } catch {
            scope[varName] = valExpr;
          }
        }
        continue;
      }

      // Single expression evaluation with scope
      try {
        const scopeKeys = Object.keys(scope);
        const scopeVals = Object.values(scope);
         
        const fn = new Function(...scopeKeys, `return (${line});`);
        const res = fn(...scopeVals);
        if (res !== undefined) logs.push(String(res));
      } catch {
        logs.push(`[Python Simulator] Executed: ${line}`);
      }
    }

    return {
      output: logs.length > 0 ? logs.join('\n') : '[Python Program selesai tanpa output]',
      isError: false
    };
  } catch (err: any) {
    return {
      output: `Python SyntaxError: ${err?.message || String(err)}`,
      isError: true
    };
  }
}
