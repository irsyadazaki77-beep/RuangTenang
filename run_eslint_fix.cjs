const { ESLint } = require("eslint");

async function main() {
  const eslint = new ESLint({ fix: true });
  const results = await eslint.lintFiles(["src/**/*.tsx", "src/**/*.ts"]);
  await ESLint.outputFixes(results);
  console.log("Fixes applied successfully.");
}

main().catch((error) => {
  process.exitCode = 1;
  console.error(error);
});
