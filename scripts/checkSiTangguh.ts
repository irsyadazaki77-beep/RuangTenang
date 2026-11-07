import 'dotenv/config';
import { AI_MODEL_REGISTRY } from '../server/services/ai/aiModelRegistry.js';
import { ollamaService } from '../server/services/ai/ollamaService.js';
import { refreshOllamaInventory, isLocalModelAvailable } from '../server/services/ai/ollamaRuntime.js';
import { smartModelRouter } from '../server/services/ai/smartModelRouter.js';

async function runCheck() {
  console.log('=======================================================');
  console.log('   Diagnostik & Verifikasi Si Tangguh 12B (Workhorse)');
  console.log('=======================================================');

  await refreshOllamaInventory(true);
  const modelDef = AI_MODEL_REGISTRY.find(m => m.id === 'ollama-si-tangguh');
  if (!modelDef) {
    console.error('[FAIL] ollama-si-tangguh tidak ditemukan di registry.');
    process.exit(1);
  }
  console.log(`[PASS] Registry: ${modelDef.name} (${modelDef.providerModelId}) - ${modelDef.speed}`);

  const routingDecision = smartModelRouter.routeModel({
    profileId: 'kerja-santai',
    workspaceMode: true,
    userTier: 'Free'
  }, 'Halo Si Tangguh, tolong analisis arsitektur ini');
  console.log(`[PASS] Routing (Kerja Santai / Balanced): ${routingDecision.selectedModelId} via ${routingDecision.provider}`);

  const available = isLocalModelAvailable('si-tangguh:latest') || isLocalModelAvailable('si-tangguh');
  if (!available) {
    console.log('[INFO] Model si-tangguh belum ter-build di Ollama lokal.');
    console.log('       Jalankan: local_ai_lab/setup_si_tangguh.bat untuk membangun model.');
    return;
  }

  console.log('[INFO] Menguji inferensi nyata ke Ollama si-tangguh...');
  const tStart = Date.now();
  const res = await ollamaService.generateResponse({
    requestedModelId: 'ollama-si-tangguh',
    prompt: 'Jawab dalam satu kalimat: Apa tugas utamamu sebagai workhorse 12B di ekosistem RuangTenang & RuangCoder?',
    maxOutputTokens: 256
  }, 'ollama-si-tangguh');
  const elapsedSec = ((Date.now() - tStart) / 1000).toFixed(2);

  console.log(`[WAKTU RESPON]: ${elapsedSec} detik`);
  console.log('[HASIL INFERENSI]:');
  console.log(res.text);
  console.log('=======================================================');
}

runCheck().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
