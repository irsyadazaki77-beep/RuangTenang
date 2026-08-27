import { aiSafetyService, UnifiedPipelineInput, UnifiedPipelineOutput } from './aiSafetyService.js';
import { consentService } from '../consentService.js';
import { scanAndSanitizePII } from '../piiService.js';
import { sanitizeInput } from '../../security.js';
import { getGenAIClient } from '../../config/aiConfig.js';
import { aiModelRouter } from './aiModelRouter.js';
import { formatEmergencyContactsForAiPrompt, getVerifiedEmergencyContacts } from '../../config/emergencyRegistry.js';
import { analyzeMessageSentiment } from '../../../src/lib/crisisDetector.js';
import { validateAndSanitizeToolCall, ValidToolName } from './aiToolSchemas.js';

export interface ChatStreamGatewayParams {
  userId?: string;
  userRole?: string;
  userTier?: string;
  chatId?: string;
  message?: string;
  pluginResult?: string;
  chatMode?: string;
  responseStyle?: string;
  aiModel?: string;
  history?: Array<{ role: 'user' | 'model'; parts: { text: string }[] }>;
}

export interface ReflectionPromptsParams {
  userId?: string;
  mood?: string;
  feeling?: string;
  context?: string;
}

export interface MoodInsightsParams {
  userId?: string;
  logs: Array<{ date: string; mood: number; emotions?: string[]; notes?: string }>;
  averageMood: number | string;
  streak: number;
}

export interface EmergencyCrisisParams {
  userId?: string;
  text: string;
}

export interface CounselorSimulationParams {
  userId?: string;
  userTier?: string;
  studentName?: string;
  counselorName?: string;
  counselorTitle?: string;
  counselorUniversity?: string;
  counselorSpecialties?: string[];
  concern?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export const aiGateway = {
  /**
   * Main conversational streaming gateway.
   * Handles security, consent, PII redaction, prompt injection defense, local crisis triage, and AI model routing.
   */
  async chatStream(params: ChatStreamGatewayParams): Promise<UnifiedPipelineOutput> {
    const input: UnifiedPipelineInput = {
      userId: params.userId,
      userRole: params.userRole,
      userTier: params.userTier || 'Free',
      chatId: params.chatId,
      input: params.message || '',
      pluginResult: params.pluginResult,
      chatMode: params.chatMode,
      responseStyle: params.responseStyle,
      aiModel: params.aiModel || 'gemini-3.1-flash-lite',
      history: params.history || [],
      isStreaming: true
    };

    return await aiSafetyService.runUnifiedPipeline(input);
  },

  /**
   * Main conversational non-streaming gateway.
   */
  async chat(params: ChatStreamGatewayParams): Promise<UnifiedPipelineOutput> {
    const input: UnifiedPipelineInput = {
      userId: params.userId,
      userRole: params.userRole,
      userTier: params.userTier || 'Free',
      chatId: params.chatId,
      input: params.message || '',
      pluginResult: params.pluginResult,
      chatMode: params.chatMode,
      responseStyle: params.responseStyle,
      aiModel: params.aiModel || 'gemini-3.1-flash-lite',
      history: params.history || [],
      isStreaming: false
    };

    return await aiSafetyService.runUnifiedPipeline(input);
  },

  /**
   * Daily AI Reflection Prompts generation.
   * Consent policy: Requires user consent for AI and journal/reflection (if authenticated).
   * Fallback: Safe deterministic reflection questions.
   */
  async generateReflectionPrompts(params: ReflectionPromptsParams): Promise<{ prompts: string[]; source: 'ai' | 'deterministic_fallback' }> {
    const defaultPrompts = [
      "Apa satu hal kecil hari ini yang membuatmu merasa sedikit lebih tenang atau bersyukur?",
      "Jika rasa lelahmu saat ini bisa berbicara, apa yang sebenarnya paling ia butuhkan sekarang?",
      "Apa batasan diri (boundary) yang perlu kamu jaga hari ini agar pikiranmu tidak terlalu terbebani?"
    ];

    const { userId, mood, feeling, context } = params;

    // Check DB Consent
    if (userId) {
      const hasAiConsent = await consentService.canUseAI(userId);
      const hasJournalConsent = await consentService.canUseJournalForAI(userId);
      if (!hasAiConsent || !hasJournalConsent) {
        return { prompts: defaultPrompts, source: 'deterministic_fallback' };
      }
    }

    const aiClient = getGenAIClient();
    if (!aiClient) {
      return { prompts: defaultPrompts, source: 'deterministic_fallback' };
    }

    try {
      const sanitizedMood = scanAndSanitizePII(sanitizeInput(mood || 'Sedang', 50)).sanitizedText;
      const sanitizedFeeling = scanAndSanitizePII(sanitizeInput(feeling || 'Biasa', 50)).sanitizedText;
      const sanitizedContext = scanAndSanitizePII(sanitizeInput(context || 'Aktivitas Kuliah', 100)).sanitizedText;

      const prompt = `[SYSTEM_DIRECTIVE: Refleksi Mahasiswa Non-Klinis]
Buat 3 pertanyaan refleksi diri harian yang hangat, singkat (1 kalimat per pertanyaan), dan relevan untuk mahasiswa Indonesia.
Kondisi saat ini: Mood = ${sanitizedMood}, Perasaan = ${sanitizedFeeling}, Konteks = ${sanitizedContext}.
Fokus pada self-compassion, active coping, dan kesadaran emosional non-klinis.
Format keluaran JSON murni: {"prompts": ["pertanyaan 1", "pertanyaan 2", "pertanyaan 3"]}`;

      const { response } = await aiModelRouter.executeWithFallback('gemini-3.1-flash-lite', 'Free', async (modelName) => {
        return await aiClient.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { responseMimeType: 'application/json', temperature: 0.7 }
        });
      }, { allowFallback: true });

      const parsed = JSON.parse(response.text || '{}');
      if (Array.isArray(parsed.prompts) && parsed.prompts.length > 0) {
        const cleanedPrompts = parsed.prompts
          .slice(0, 3)
          .map((p: any) => typeof p === 'string' ? scanAndSanitizePII(p).sanitizedText : '')
          .filter(Boolean);

        if (cleanedPrompts.length > 0) {
          return { prompts: cleanedPrompts, source: 'ai' };
        }
      }
    } catch (err) {
      console.warn('[AI_GATEWAY] Reflection prompt generation fallback triggered:', err);
    }

    return { prompts: defaultPrompts, source: 'deterministic_fallback' };
  },

  /**
   * Weekly AI Mood Insights generation.
   * Consent policy: Requires user consent for AI AND mood context.
   * Fallback: Safe deterministic statistical summary without external AI.
   */
  async generateMoodInsights(params: MoodInsightsParams): Promise<{
    summary: string;
    patterns: string[];
    recommendations: string[];
    source: 'ai' | 'deterministic_fallback';
  }> {
    const { userId, logs = [], averageMood, streak } = params;

    const fallbackSummary = `Selama beberapa hari terakhir, rata-rata suasana hatimu berada di angka ${averageMood || '3.5'}/5 dengan konsistensi pencatatan ${streak || 1} hari berturut-turut. Terus luangkan waktu untuk jeda napas di tengah rutinitas harianmu.`;
    const fallbackPatterns = ["Pola mood menunjukkan korelasi positif dengan waktu istirahat yang cukup dan manajemen waktu seimbang."];
    const fallbackActions = [
      "Luangkan 10 menit tanpa layar sebelum tidur untuk merilekskan otot mata dan pikiran.",
      "Buat daftar prioritas harian maksimal 3 tugas penting untuk mencegah overthinking.",
      "Lakukan peregangan ringan dan minum segelas air hangat saat mulai merasa penat."
    ];

    // Check DB Consent for AI & Mood
    if (userId) {
      const hasMoodConsent = await consentService.canUseMoodForAI(userId);
      if (!hasMoodConsent) {
        return {
          summary: fallbackSummary,
          patterns: fallbackPatterns,
          recommendations: fallbackActions,
          source: 'deterministic_fallback'
        };
      }
    } else {
      // Guest users without explicit consent fallback to local
      return {
        summary: fallbackSummary,
        patterns: fallbackPatterns,
        recommendations: fallbackActions,
        source: 'deterministic_fallback'
      };
    }

    const aiClient = getGenAIClient();
    if (!aiClient || !Array.isArray(logs) || logs.length === 0) {
      return {
        summary: fallbackSummary,
        patterns: fallbackPatterns,
        recommendations: fallbackActions,
        source: 'deterministic_fallback'
      };
    }

    try {
      const logsSummary = logs.slice(0, 10).map((l: any) => {
        const cleanNotes = l.notes ? scanAndSanitizePII(sanitizeInput(l.notes, 100)).sanitizedText : '-';
        const cleanEmotions = Array.isArray(l.emotions) ? l.emotions.slice(0, 4).join(', ') : '';
        return `Tanggal: ${l.date}, Mood: ${l.mood}/5, Emosi: ${cleanEmotions}, Catatan: ${cleanNotes}`;
      }).join('\n');

      const prompt = `[SYSTEM_DIRECTIVE: Analisis Tren Mood Mahasiswa (Non-Klinis)]
Analisis data log mood mahasiswa berikut secara empatik, non-diagnostik, dan suportif. JANGAN PERNAH mendiagnosis depresi/bipolar atau menyarankan obat.
${logsSummary}
Rata-rata: ${averageMood}/5, Streak: ${streak} hari.

Berikan analisis dalam format JSON murni:
{
  "summary": "Ringkasan naratif 2-3 kalimat yang hangat dan validatif mengenai tren emosi mereka.",
  "patterns": ["1-2 pola keterkaitan antara aktivitas/istirahat dan mood"],
  "recommendations": ["3 rekomendasi mikro self-care praktis non-medis untuk minggu ini"]
}`;

      const { response } = await aiModelRouter.executeWithFallback('gemini-3.1-flash-lite', 'Free', async (modelName) => {
        return await aiClient.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { responseMimeType: 'application/json', temperature: 0.5 }
        });
      }, { allowFallback: true });

      const parsed = JSON.parse(response.text || '{}');
      const validation = aiSafetyService.validateOutput(parsed.summary || '');
      if (!validation.isValid) {
        return {
          summary: fallbackSummary,
          patterns: fallbackPatterns,
          recommendations: fallbackActions,
          source: 'deterministic_fallback'
        };
      }

      return {
        summary: parsed.summary || fallbackSummary,
        patterns: Array.isArray(parsed.patterns) && parsed.patterns.length > 0 ? parsed.patterns : fallbackPatterns,
        recommendations: Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0 ? parsed.recommendations : fallbackActions,
        source: 'ai'
      };
    } catch (err) {
      console.warn('[AI_GATEWAY] Mood insights generation fallback triggered:', err);
      return {
        summary: fallbackSummary,
        patterns: fallbackPatterns,
        recommendations: fallbackActions,
        source: 'deterministic_fallback'
      };
    }
  },

  /**
   * Emergency Crisis Classifier AI Enhancement.
   * Consent policy: Sending raw mental-health text to external AI classifier requires explicit AI consent.
   * If consent is absent or user is anonymous, always use local deterministic clinical classifier.
   */
  async analyzeEmergencyCrisis(params: EmergencyCrisisParams): Promise<{
    severity: 'normal' | 'distress' | 'crisis';
    confidenceScore: number;
    isNegated: boolean;
    requiresDirectSafetyQuestion: boolean;
    reasoning: string;
    isCrisis: boolean;
    triggers: string[];
    recommendedAction: string;
    source: 'local_deterministic' | 'ai_enhanced';
    hotlines?: Array<{ name: string; phone: string; type: string }>;
  }> {
    const { userId, text } = params;
    const cleanText = sanitizeInput(text, 500);

    // 1. Run local deterministic clinical sentiment analysis first
    const localResult = analyzeMessageSentiment(cleanText);
    const baseResponse = {
      severity: localResult.severity,
      confidenceScore: localResult.confidenceScore,
      isNegated: localResult.isNegated,
      requiresDirectSafetyQuestion: localResult.requiresDirectSafetyQuestion,
      reasoning: localResult.reasoning,
      isCrisis: localResult.severity === 'crisis',
      triggers: localResult.detectedTriggers,
      recommendedAction: localResult.recommendedAction,
      source: 'local_deterministic' as const,
      hotlines: getVerifiedEmergencyContacts().map(c => ({ name: c.name, phone: c.phone, type: c.type }))
    };

    // 2. If user has not consented to AI processing, strictly return local result without sending data to Gemini
    if (!userId) {
      return baseResponse;
    }

    const hasAiConsent = await consentService.canUseAI(userId);
    if (!hasAiConsent) {
      return baseResponse;
    }

    // 3. AI-enhanced clinical classification for consented users
    const aiClient = getGenAIClient();
    if (!aiClient) {
      return baseResponse;
    }

    try {
      const sanitizedText = scanAndSanitizePII(cleanText).sanitizedText;
      const prompt = `Analisis teks mahasiswa berikut untuk risiko krisis kesehatan mental:
"${sanitizedText}"

KLASIFIKASIKAN sesuai kriteria klinis berikut:
- KASUS NEGASI: Jika teks menyebut kata bunuh diri/menyakiti diri tetapi disertai penolakan/negasi yang jelas (contoh: "Saya tidak ingin bunuh diri"), kategorikan "distress" atau "normal" (bukan "crisis"). Atur isNegated = true dan requiresDirectSafetyQuestion = false.
- KASUS MASA LALU: Jika teks menceritakan pikiran bunuh diri di masa lalu (contoh: "Dulu saya pernah berpikir begitu"), kategorikan "distress", bukan "crisis" aktif. Atur isNegated = false dan requiresDirectSafetyQuestion = false.
- KASUS PIHAK KETIGA: Jika teks membicarakan tentang orang lain/teman (contoh: "Teman saya bilang ingin mati"), kategorikan "distress" (pengguna khawatir tentang temannya), bukan "crisis" personal aktif bagi pengguna. Atur isNegated = false dan requiresDirectSafetyQuestion = false.
- KASUS KRISIS AKTIF NYATA: Jika pengguna menceritakan keinginan mati/menyakiti diri aktif saat ini (contoh: "ingin mati", "akhiri hidup"), kategorikan "crisis" dengan confidenceScore tinggi (>= 0.95), isNegated = false, dan requiresDirectSafetyQuestion = true.`;

      const { response } = await aiModelRouter.executeWithFallback('gemini-3.1-flash-lite', 'Free', async (modelName) => {
        return await aiClient.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                severity: {
                  type: 'STRING',
                  enum: ['normal', 'distress', 'crisis']
                },
                confidenceScore: {
                  type: 'NUMBER'
                },
                isNegated: {
                  type: 'BOOLEAN'
                },
                requiresDirectSafetyQuestion: {
                  type: 'BOOLEAN'
                },
                reasoning: {
                  type: 'STRING'
                }
              },
              required: ['severity', 'confidenceScore', 'isNegated', 'requiresDirectSafetyQuestion', 'reasoning']
            }
          }
        });
      }, { allowFallback: true });

      const parsedAi = JSON.parse(response.text || '{}');
      if (parsedAi.severity) {
        return {
          severity: parsedAi.severity,
          confidenceScore: typeof parsedAi.confidenceScore === 'number' ? parsedAi.confidenceScore : localResult.confidenceScore,
          isNegated: Boolean(parsedAi.isNegated),
          requiresDirectSafetyQuestion: Boolean(parsedAi.requiresDirectSafetyQuestion),
          reasoning: parsedAi.reasoning || localResult.reasoning,
          isCrisis: parsedAi.severity === 'crisis' && !parsedAi.isNegated,
          triggers: localResult.detectedTriggers,
          recommendedAction: parsedAi.severity === 'crisis' ? 'Tawarkan rujukan ke Hotline Kemenkes 119 ext 8 atau kontak darurat' : localResult.recommendedAction,
          source: 'ai_enhanced',
          hotlines: getVerifiedEmergencyContacts().map(c => ({ name: c.name, phone: c.phone, type: c.type }))
        };
      }
    } catch (err) {
      console.warn('[AI_GATEWAY] AI crisis classifier failed, using local result:', err);
    }

    return baseResponse;
  },

  /**
   * Counselor Simulation Virtual Chat.
   * Consent policy: Checked via DB consent for AI.
   */
  async counselorSimulationChat(params: CounselorSimulationParams): Promise<{
    reply: string;
    modelUsed: string;
    isFallback: boolean;
  }> {
    const {
      userId,
      userTier = 'Free',
      studentName,
      counselorName,
      counselorTitle,
      counselorUniversity,
      counselorSpecialties = [],
      concern,
      messages
    } = params;

    const specialtiesStr = counselorSpecialties.length > 0 ? counselorSpecialties.join(', ') : 'Konseling Umum';

    const systemInstruction = `Anda adalah simulasi AI dari Psikolog/Konselor profesional bernama "${counselorName || 'Konselor Virtual'}" (${counselorTitle || 'Konselor Kampus'}) dari "${counselorUniversity || 'Pusat Bimbingan Konseling'}" yang ramah, hangat, dan sangat empatik.
Keahlian Anda meliputi: ${specialtiesStr}.
Saat ini Anda sedang melakukan sesi konseling virtual simulasi bimbingan konseling dengan mahasiswa bernama "${studentName || 'Mahasiswa'}", yang mendaftar dengan keluhan utama: "${concern || 'Kesehatan Mental'}".

PANDUAN INTERAKSI KONSULER VIRTUAL:
1. Berperanlah dengan empati tinggi, profesional, hangat, tenang, dan terstruktur seperti seorang psikolog bimbingan konseling kampus.
2. Gunakan Bahasa Indonesia yang sopan, ramah, dan profesional. Sapa mahasiswa dengan namanya "${studentName || 'Kawan'}" secara alami.
3. Terapkan pendekatan mendengarkan aktif (active listening) dan teknik konseling (seperti validasi emosi, eksplorasi masalah, Cognitive Behavioral Therapy (CBT) ringan, atau mindfulness).
4. Berikan pertanyaan terbuka yang memandu mahasiswa untuk menguraikan perasaan mereka secara konstruktif.
5. Sesi ini adalah ruang aman bagi mereka untuk menceritakan beban mereka. Dorong mereka dengan empati, tanpa menghakimi.
6. Buat respon yang hangat, ringkas, terstruktur (gunakan bullet points jika memberikan saran praktis), dan mudah dicerna.`;

    const sanitizedMessages = messages.slice(-10).map(m => ({
      role: m.role,
      content: scanAndSanitizePII(sanitizeInput(m.content || '', 1000)).sanitizedText
    }));

    const formattedHistory = sanitizedMessages.slice(0, -1).map(m => ({
      role: (m.role === 'assistant' ? 'model' : 'user') as 'model' | 'user',
      parts: [{ text: m.content }]
    }));
    const lastMessage = sanitizedMessages[sanitizedMessages.length - 1]?.content || '';

    const { aiRequestService } = await import('./aiRequestService.js');
    const result = await aiRequestService.generateChatResponse({
      userId,
      prompt: lastMessage,
      history: formattedHistory,
      systemInstruction,
      userTier,
      requestedModelId: 'gemini-3.7-flash'
    });
    
    return {
      reply: result.text,
      modelUsed: result.modelUsed,
      isFallback: result.isFallback
    };
  },

  /**
   * Helper to validate tool calls coming from AI models.
   */
  validateToolCall(rawToolCall: unknown) {
    return validateAndSanitizeToolCall(rawToolCall);
  }
};
