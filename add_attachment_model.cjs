const fs = require('fs');

const attachmentModel = `
model Attachments {
  id        String   @id
  messageId String?
  chatId    String?
  userId    String
  filename  String
  mimeType  String
  size      Int
  data      String   // base64 content for small files or extracted text
  createdAt DateTime @default(now())

  @@index([messageId])
  @@index([chatId])
  @@index([userId])
}
`;

function addModel(file) {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes('model Attachments')) {
      fs.writeFileSync(file, content + '\n' + attachmentModel);
      console.log('Added to', file);
    }
  }
}

addModel('prisma/schema.postgres.prisma');
addModel('prisma/schema.sqlite.prisma');
