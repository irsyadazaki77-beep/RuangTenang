import { prisma } from '../database.js';
import { encryptionService } from '../services/encryptionService.js';
import { backfillLegacyPlan } from '../services/workspaceWorkflowService.js';

function parseSettings(value: string | null | undefined): Record<string, any> {
  try {
    const parsed = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function readLegacyPlan(settings: Record<string, any>): unknown | null {
  const stored = settings.agentWorkflow;
  if (!stored) return null;
  if (stored.storage === 'encrypted-v1') {
    if (typeof stored.payload !== 'string') throw new Error('Legacy workflow payload is malformed.');
    const plaintext = encryptionService.decryptSensitive(stored.payload);
    if (!plaintext || encryptionService.isEncrypted(plaintext)) throw new Error('Legacy workflow payload could not be decrypted.');
    return JSON.parse(plaintext)?.plan ?? null;
  }
  return stored.plan ?? null;
}

async function main() {
  const workspaces = await prisma.workspaces.findMany({
    select: { chatId: true, settings: true, chat: { select: { userId: true } } }
  });
  let migrated = 0;
  let skipped = 0;
  for (const workspace of workspaces) {
    let currentSettings = workspace.settings;
    let completed = false;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const settings = parseSettings(currentSettings);
      const storedWorkflow = settings.agentWorkflow;
      const plan = readLegacyPlan(settings);
      if (!plan) { completed = true; skipped += 1; break; }

      await backfillLegacyPlan(workspace.chatId, workspace.chat.userId, plan);
      if (storedWorkflow?.storage === 'encrypted-v1') {
        completed = true;
        migrated += 1;
        break;
      }

      const encryptedSettings = {
        ...settings,
        agentWorkflow: {
          storage: 'encrypted-v1',
          payload: encryptionService.encryptRequiredSensitive(JSON.stringify(storedWorkflow))
        }
      };
      const saved = await prisma.workspaces.updateMany({
        where: { chatId: workspace.chatId, settings: currentSettings },
        data: { settings: JSON.stringify(encryptedSettings) }
      });
      if (saved.count) {
        completed = true;
        migrated += 1;
        break;
      }

      // Preferences or another migration may have changed settings concurrently. Retry
      // against the newest value instead of replacing that update with a stale snapshot.
      const fresh = await prisma.workspaces.findUnique({ where: { chatId: workspace.chatId }, select: { settings: true } });
      if (!fresh) { completed = true; break; }
      currentSettings = fresh.settings;
    }
    if (!completed) throw new Error('Workspace settings changed repeatedly during workflow backfill.');
  }
  console.log(`[workspace workflow backfill] Verified or migrated ${migrated} legacy plans; skipped ${skipped} workspaces without a plan.`);
}

main().catch(error => {
  const code = error instanceof Error && error.name === 'WorkspaceWorkflowError' ? error.name : 'WORKSPACE_BACKFILL_FAILED';
  console.error(`[workspace workflow backfill] Failed: ${code}`);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
