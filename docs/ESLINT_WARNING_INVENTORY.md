# ESLint warning inventory

Last checked with `npm run lint` on 2026-10-09. ESLint exits successfully with **0 errors and 0 warnings (0 problems)**.

| Category | Rule | Count | Notes |
| --- | --- | ---: | --- |
| Unused variables/imports | `@typescript-eslint/no-unused-vars` | 0 | All unused imports and variables cleaned up or prefixed with `_`. |
| Console usage | `no-console` | 0 | Scoped properly: CLI scripts and server logging permitted; client bundle guarded. |
| React Hook dependencies | `react-hooks/exhaustive-deps` | 0 | All hook dependencies and callbacks properly aligned. |
| Unnecessary escapes | `no-useless-escape` | 0 | Cleaned up all unnecessary regex character class escapes. |
| CommonJS imports | `@typescript-eslint/no-require-imports` | 0 | CommonJS `.cjs` files correctly permitted require imports. |
| Regex control characters | `no-control-regex` | 0 | Addressed with scoped safety suppressions for intentional PII & payload control sanitizers. |
| Prefer const | `prefer-const` | 0 | Converted all single-assignment bindings to const. |
| TypeScript suppression comments | `@typescript-eslint/ban-ts-comment` | 0 | Handled without suppressions or with ts-expect-error. |
| TypeScript namespace | `@typescript-eslint/no-namespace` | 0 | Scoped declaration merging for Express Request. |

The workspace now has **0 problems** detected across TypeScript and ESLint.
