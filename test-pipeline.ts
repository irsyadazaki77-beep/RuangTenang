import { aiSafetyService } from './server/services/ai/aiSafetyService.js';
import { consentService } from './server/services/consentService.js';

async function test() {
  const c = await consentService.canUseAI('mock-user-123');
  console.log('canUseAI:', c);
  
  const res = await aiSafetyService.runUnifiedPipeline({
      userId: 'mock-user-123',
      input: 'hah',
      chatMode: 'Teman Cerita',
      responseStyle: 'Seimbang',
      isStreaming: true
  });
  console.log(res);
}

test().catch(console.error);
