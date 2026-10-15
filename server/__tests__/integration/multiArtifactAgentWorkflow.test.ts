import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../../database.js';
import {
  createWorkspacePlan,
  findWorkspacePlan,
  startWorkspaceTask,
  finishWorkspaceTask,
  reviewWorkspaceTask,
  transitionWorkspacePlan
} from '../../services/workspaceWorkflowService.js';
import { createAcademicDocxBlob } from '../../../src/features/workspace/utils/exportDocx.js';
import { createEditablePptxBuffer } from '../../../src/features/workspace/utils/exportPptx.js';
import { createXlsxBuffer } from '../../../src/features/workspace/utils/exportXlsx.js';

const suffix = `${Date.now()}_multi_artifact`;
const userId = `multi-art-user-${suffix}`;
const workspaceId = `multi-art-chat-${suffix}`;
const planId = `multi-art-plan-${suffix}`;
const timestamp = new Date().toISOString();

const task1Id = `task-1-doc-${suffix}`;
const task2Id = `task-2-deck-${suffix}`;
const task3Id = `task-3-table-${suffix}`;

async function seedData() {
  await prisma.$executeRaw`INSERT INTO "Users" ("id", "name", "email", "passwordHash") VALUES (${userId}, 'Multi Artifact User', ${`user-${suffix}@test.local`}, 'hash')`;
  await prisma.$executeRaw`INSERT INTO "Chats" ("id", "userId", "title", "workspaceMode", "updatedAt") VALUES (${workspaceId}, ${userId}, 'Multi Artifact Workspace', 'RUANG_KERJA', ${new Date()})`;
  await prisma.$executeRaw`INSERT INTO "Workspaces" ("chatId", "settings", "updatedAt") VALUES (${workspaceId}, '{}', ${new Date()})`;
}

describe('Multi-Artifact AI Agent Workflow Integration Test', () => {
  beforeAll(async () => {
    await seedData();
  });

  afterAll(async () => {
    await prisma.artifacts.deleteMany({ where: { chatId: workspaceId } });
    await prisma.workspacePlans.deleteMany({ where: { id: planId, workspaceId } });
    await prisma.workspaces.deleteMany({ where: { chatId: workspaceId } });
    await prisma.chats.deleteMany({ where: { id: workspaceId } });
    await prisma.users.deleteMany({ where: { id: userId } });
  });

  it('executes a 3-task multi-artifact workflow, reviews proposals, saves artifacts, and produces valid DOCX/PPTX/XLSX exports', async () => {
    // 1. Create a 3-task dependent plan
    const plan = await createWorkspacePlan(workspaceId, userId, {
      id: planId,
      title: 'Analisis Komparatif & Deliverables Multi-Artifact',
      goal: 'Analisis PDF riset, buat laporan Word 6 halaman, presentasi PowerPoint 10 slide, dan tabel ringkasan Excel.',
      status: 'draft',
      revision: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      tasks: [
        {
          id: task1Id,
          title: 'Susun Draf Laporan Riset',
          description: 'Laporan komprehensif dengan bukti sitasi dan referensi APA7',
          type: 'writing',
          dependsOn: [],
          status: 'todo'
        },
        {
          id: task2Id,
          title: 'Susun Presentasi Slide Deck',
          description: 'Slide deck 10 slide berdasarkan temuan laporan riset',
          type: 'writing',
          dependsOn: [task1Id],
          status: 'todo'
        },
        {
          id: task3Id,
          title: 'Susun Tabel Rekapitulasi Data',
          description: 'Dataset terstruktur tabel Excel skor intervensi dan metrik',
          type: 'analysis',
          dependsOn: [task1Id],
          status: 'todo'
        }
      ]
    });

    expect(plan.tasks).toHaveLength(3);
    const approvedPlan = await transitionWorkspacePlan(workspaceId, userId, planId, 'approve');
    expect(approvedPlan.status).toBe('approved');

    // 2. Task 1: Generate Document Proposal
    const exec1Id = `exec-1-${suffix}`;
    const start1 = await startWorkspaceTask(workspaceId, userId, planId, task1Id, exec1Id, {
      inputPrompt: 'Buat laporan penelitian komparasi',
      contextSourceIds: [],
      modelId: 'auto',
      createdAt: timestamp
    });
    expect(start1.claimed).toBe(true);

    const docMarkdown = `# Laporan Analisis Efektivitas Intervensi Psikologis Kampus

## Ringkasan Eksekutif
Penelitian ini mengevaluasi dampak intervensi mindfulness dan konseling kelompok terhadap stres akademik mahasiswa. Berdasarkan data empiris, intervensi kelompok eksperimen menunjukkan perbaikan signifikan dibandingkan kelompok kontrol.

## Metodologi
Penelitian menggunakan desain kuasi-eksperimental dengan pre-test dan post-test. Total partisipan adalah 120 mahasiswa sarjana tingkat akhir yang terbagi dalam dua kelompok seimbang.

## Temuan Utama
1. Penurunan skor stres PSS-10 sebesar 34% pada kelompok eksperimen.
2. Peningkatan skor resiliensi BRS sebesar 28%.
3. Efek moderasi signifikan ditemukan pada durasi kehadiran sesi konseling mingguan.

## Diskusi dan Rekomendasi
Implementasi program RuangTenang dianjurkan untuk diperluas ke seluruh fakultas dengan modul mindfulness terstruktur.

## Referensi
- Santrock, J. W. (2020). Educational Psychology. McGraw-Hill.
- Cohen, S., Kamarck, T., & Mermelstein, R. (1983). A global measure of perceived stress. Journal of Health and Social Behavior, 24(4), 385-396.`;

    const docProposal = {
      title: 'Laporan Analisis Efektivitas Intervensi Psikologis Kampus',
      type: 'DOCUMENT' as const,
      content: docMarkdown
    };

    await finishWorkspaceTask(workspaceId, userId, planId, task1Id, exec1Id, {
      output: 'Draf laporan riset selesai disusun dengan bukti dan referensi.',
      artifactProposal: docProposal
    });

    const reviewed1 = await reviewWorkspaceTask(workspaceId, userId, planId, task1Id, 'accept');
    expect(reviewed1.tasks[0].status).toBe('done');
    const docArtifactId = reviewed1.tasks[0].outputArtifactId!;
    expect(docArtifactId).toBeDefined();

    // 3. Task 2: Generate Slide Deck Proposal (Presentation)
    const exec2Id = `exec-2-${suffix}`;
    const start2 = await startWorkspaceTask(workspaceId, userId, planId, task2Id, exec2Id, {
      inputPrompt: 'Buat slide presentasi 10 slide berdasarkan laporan task 1',
      contextSourceIds: [],
      modelId: 'auto',
      createdAt: timestamp
    });
    expect(start2.claimed).toBe(true);

    const slides = [
      { title: 'Efektivitas Intervensi Psikologis', body: 'Paparan Hasil Evaluasi Komparatif Mahasiswa', notes: 'Salam pembuka dan perkenalan' },
      { title: 'Latar Belakang & Urgensi', body: '- Tingginya angka stres akademik semester akhir\n- Kebutuhan intervensi terstruktur dan terukur', notes: 'Sebutkan prevalensi stres' },
      { title: 'Tujuan Penelitian', body: '- Mengukur dampak konseling kelompok\n- Menganalisis resiliensi mahasiswa', notes: 'Jelaskan tujuan utama' },
      { title: 'Metodologi Riset', body: '- Kuasi-eksperimen pre-post test\n- 120 partisipan terbagi 2 kelompok', notes: 'Jelaskan kriteria inklusi' },
      { title: 'Hasil: Penurunan Stres', body: '- Kelompok eksperimen: penurunan 34%\n- Kelompok kontrol: perubahan tidak signifikan', notes: 'Sorot selisih skor PSS-10' },
      { title: 'Hasil: Resiliensi Akademik', body: '- Peningkatan skor BRS 28%\n- Efek bertahan hingga follow-up 1 bulan', notes: 'Sorot signifikansi p < 0.01' },
      { title: 'Faktor Moderasi Kunci', body: '- Kehadiran sesi konseling (>80% optimal)\n- Praktik mindfulness mandiri harian', notes: 'Tekankan faktor adherensi' },
      { title: 'Implikasi Praktis Kampus', body: '- Integrasi sistem RuangTenang di universitas\n- Layanan screening berkala', notes: 'Sampaikan saran bagi dekanat' },
      { title: 'Rencana Tindak Lanjut', body: '- Pelatihan peer-counselor mahasiswa\n- Perluasan ke jenjang pascasarjana', notes: 'Langkah roadmap berikutnya' },
      { title: 'Kesimpulan & Tanya Jawab', body: 'Terima kasih atas perhatian Anda. Sesi tanya jawab dibuka.', notes: 'Tutup dengan optimisme' }
    ];

    const deckJson = JSON.stringify({
      format: 'ruangtenang-presentation-v1',
      theme: 'professional',
      slides
    }, null, 2);

    const deckProposal = {
      title: 'Presentasi Eksekutif Evaluasi Intervensi Kampus',
      type: 'DOCUMENT' as const,
      language: 'presentation',
      content: deckJson
    };

    await finishWorkspaceTask(workspaceId, userId, planId, task2Id, exec2Id, {
      output: 'Slide presentasi 10 slide berhasil dibuat dan diselaraskan dengan laporan riset.',
      artifactProposal: deckProposal
    });

    const reviewed2 = await reviewWorkspaceTask(workspaceId, userId, planId, task2Id, 'accept');
    expect(reviewed2.tasks[1].status).toBe('done');
    const deckArtifactId = reviewed2.tasks[1].outputArtifactId!;
    expect(deckArtifactId).toBeDefined();

    // 4. Task 3: Generate Summary Table Proposal (Excel)
    const exec3Id = `exec-3-${suffix}`;
    const start3 = await startWorkspaceTask(workspaceId, userId, planId, task3Id, exec3Id, {
      inputPrompt: 'Buat tabel ringkasan Excel dari hasil analisis',
      contextSourceIds: [],
      modelId: 'auto',
      createdAt: timestamp
    });
    expect(start3.claimed).toBe(true);

    const tableJson = JSON.stringify({
      type: 'table',
      title: 'Rekapitulasi Skor Intervensi',
      columns: ['Kelompok', 'Jumlah Sampel', 'Pre-Test Mean', 'Post-Test Mean', 'Delta (%)', 'Signifikansi p'],
      columnTypes: {
        'Kelompok': 'text',
        'Jumlah Sampel': 'number',
        'Pre-Test Mean': 'number',
        'Post-Test Mean': 'number',
        'Delta (%)': 'number',
        'Signifikansi p': 'text'
      },
      rows: [
        { 'Kelompok': 'Eksperimen (Mindfulness)', 'Jumlah Sampel': 60, 'Pre-Test Mean': 28.4, 'Post-Test Mean': 18.7, 'Delta (%)': -34.1, 'Signifikansi p': '< 0.001' },
        { 'Kelompok': 'Kontrol (Waitlist)', 'Jumlah Sampel': 60, 'Pre-Test Mean': 27.9, 'Post-Test Mean': 27.2, 'Delta (%)': -2.5, 'Signifikansi p': '0.312 (ns)' }
      ]
    }, null, 2);

    const tableProposal = {
      title: 'Tabel Ringkasan Data Intervensi',
      type: 'TABLE' as const,
      content: tableJson
    };

    await finishWorkspaceTask(workspaceId, userId, planId, task3Id, exec3Id, {
      output: 'Tabel Excel ringkasan statistik berhasil disusun.',
      artifactProposal: tableProposal
    });

    const reviewed3 = await reviewWorkspaceTask(workspaceId, userId, planId, task3Id, 'accept');
    expect(reviewed3.tasks[2].status).toBe('done');
    const tableArtifactId = reviewed3.tasks[2].outputArtifactId!;
    expect(tableArtifactId).toBeDefined();

    // 5. Complete Workflow
    const completedPlan = await transitionWorkspacePlan(workspaceId, userId, planId, 'complete');
    expect(completedPlan.status).toBe('completed');

    // 6. Verify Artifacts in Database
    const savedArtifacts = await prisma.artifacts.findMany({
      where: { chatId: workspaceId, userId }
    });
    expect(savedArtifacts).toHaveLength(3);
    const savedIds = savedArtifacts.map(a => a.id);
    expect(savedIds).toContain(docArtifactId);
    expect(savedIds).toContain(deckArtifactId);
    expect(savedIds).toContain(tableArtifactId);

    // 7. Verify Document Export to DOCX
    const docBlob = await createAcademicDocxBlob({
      title: docProposal.title,
      content: docProposal.content,
      templateType: 'skripsi'
    });
    expect(docBlob).toBeDefined();
    expect(docBlob.size).toBeGreaterThan(1000);

    // 8. Verify Presentation Export to PPTX
    const pptxBuffer = await createEditablePptxBuffer({
      title: deckProposal.title,
      content: deckProposal.content,
      theme: 'professional'
    });
    expect(pptxBuffer).toBeDefined();
    expect(pptxBuffer.length).toBeGreaterThan(1000);

    // 9. Verify Table Export to XLSX
    const xlsxBuffer = await createXlsxBuffer({
      title: tableProposal.title,
      content: tableProposal.content,
      artifactType: 'TABLE'
    });
    expect(xlsxBuffer).toBeDefined();
    expect(xlsxBuffer.length).toBeGreaterThan(1000);
  });
});
