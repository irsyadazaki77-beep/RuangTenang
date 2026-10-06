CREATE INDEX IF NOT EXISTS "DocumentChunks_userId_attachmentId_chunkIndex_idx"
ON "DocumentChunks"("userId", "attachmentId", "chunkIndex");
