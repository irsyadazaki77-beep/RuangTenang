const fs = require('fs');

function fixSchema(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Fix Attachments model
  content = content.replace(
    "data      String   // base64 content for small files or extracted text\n  createdAt DateTime @default(now())",
    "data      String   // base64 content for small files or extracted text\n  createdAt DateTime @default(now())\n\n  message   ChatMessages? @relation(fields: [messageId], references: [id], onDelete: Cascade)"
  );

  // Add attachments to ChatMessages
  if (!content.includes('attachments Attachments[]')) {
    content = content.replace(
      "bookmarks MessageBookmarks[]\n",
      "bookmarks MessageBookmarks[]\n  attachments Attachments[]\n"
    );
  }

  fs.writeFileSync(file, content);
}

fixSchema('prisma/schema.postgres.prisma');
fixSchema('prisma/schema.sqlite.prisma');
console.log('Fixed schema relations');
