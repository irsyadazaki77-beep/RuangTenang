const fs = require('fs');

const content = fs.readFileSync('server/database.ts', 'utf8');

const splitRegex = /export const serverDb = \{([\s\S]*)\};/m;
const match = content.match(splitRegex);

if (!match) {
  console.log("Could not find serverDb");
  process.exit(1);
}

const dbBody = match[1];

// We will just let the LLM do it file by file or I can write a rough parser.
// Actually, it's easier to just create the files manually using tools.
