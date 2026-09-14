const fs = require('fs');
let content = fs.readFileSync('prisma/schema.sqlite.prisma', 'utf8');

const target = `  @@index([userId])
}

model Counselors {`;

const replacement = `  @@index([userId])
  @@index([userId, createdAt])
}

model Counselors {`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('prisma/schema.sqlite.prisma', content);
    console.log("Updated UserMemories index");
} else {
    console.log("Target not found");
}
