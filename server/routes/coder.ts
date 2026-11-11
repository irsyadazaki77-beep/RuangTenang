import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import expressRateLimit from 'express-rate-limit';
import { optionalAuth } from '../middleware/auth.js';
import { getGenAIClient } from '../config/aiConfig.js';
import {
  AGENT_PERSONAS,
  buildLocalFileTree,
  ensureCoderWorkspaceInitialized,
  executeSafeShellCommand,
  getStarterFiles,
  listInstalledOllamaModels,
  resolveSafeWorkspacePath,
  resolveWorkspaceSessionDir,
  runCoderAgentLoop,
  searchWorkspaceCode,
  type FileTreeNode,
  type SandboxMode
} from '../services/coder/coderAgentService.js';
import {
  GEMINI_CODING_MODELS,
  PROFESSIONAL_COUNCIL_PERSONAS,
  type CoderAiProvider,
  type CouncilPersonaMode
} from '../services/coder/coderModelOrchestrator.js';

const router = express.Router();

const getRequestWorkspaceDir = (req: any): string => {
  const wsId = String(
    req.headers['x-workspace-id'] ||
    req.query.workspaceId ||
    req.body?.workspaceId ||
    ''
  ).trim();
  return resolveWorkspaceSessionDir(wsId);
};

const coderTerminalLimiter = expressRateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST),
  message: {
    success: false,
    error: 'Terlalu banyak eksekusi terminal (maks 20 per menit). Silakan coba sesaat lagi.'
  }
});

const coderAgentLimiter = expressRateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST),
  message: {
    success: false,
    error: 'Terlalu banyak permintaan AI agent (maks 15 per menit). Silakan coba sesaat lagi.'
  }
});

const requireAuthInProduction = (req: any, res: any, next: any) => {
  if (process.env.NODE_ENV === 'production' && !req.user) {
    return res.status(401).json({
      success: false,
      error: 'Akses disk lokal dan terminal server memerlukan login akun terdaftar pada lingkungan produksi.'
    });
  }
  next();
};

// 1. Discover AI Models (Ollama Local + Gemini Cloud) & Starter Sandbox Files & Multi-Agent Council
router.get('/coder/models', optionalAuth, async (_req, res) => {
  try {
    const ollamaStatus = await listInstalledOllamaModels();
    const hasGenAI = Boolean(getGenAIClient());
    res.json({
      success: true,
      data: {
        ...ollamaStatus,
        gemini: {
          available: hasGenAI,
          models: GEMINI_CODING_MODELS,
          defaultModel: GEMINI_CODING_MODELS[0]
        },
        starterFiles: getStarterFiles(),
        personas: {
          creative: AGENT_PERSONAS,
          professional: Object.values(PROFESSIONAL_COUNCIL_PERSONAS)
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message || 'Gagal memuat daftar model AI.'
    });
  }
});

// 1b. Multi-Project Management: List Projects
router.get('/coder/projects', optionalAuth, async (_req, res) => {
  try {
    const baseDir = path.resolve(process.cwd(), 'coder-workspace');
    await fs.mkdir(baseDir, { recursive: true });
    const sessionsDir = path.join(baseDir, 'sessions');
    await fs.mkdir(sessionsDir, { recursive: true });

    const projects: Array<{ id: string; name: string; path: string; updatedAt: string }> = [
      { id: 'default', name: 'Default Workspace', path: 'coder-workspace', updatedAt: new Date().toISOString() }
    ];

    try {
      const entries = await fs.readdir(sessionsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const stats = await fs.stat(path.join(sessionsDir, entry.name));
          projects.push({
            id: entry.name,
            name: entry.name.replace(/[-_]/g, ' '),
            path: `coder-workspace/sessions/${entry.name}`,
            updatedAt: stats.mtime.toISOString()
          });
        }
      }
    } catch {
      // ignore empty
    }

    res.json({ success: true, data: { projects } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Gagal memuat daftar proyek.' });
  }
});

// 1c. Multi-Project Management: Create New Project
router.post('/coder/projects', optionalAuth, requireAuthInProduction, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) {
      return res.status(400).json({ success: false, error: 'Nama proyek wajib diisi.' });
    }
    const sanitizedId = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 40) || `project-${Date.now()}`;
    const targetDir = resolveWorkspaceSessionDir(sanitizedId);
    await ensureCoderWorkspaceInitialized(targetDir);

    res.json({
      success: true,
      data: {
        id: sanitizedId,
        name,
        path: `coder-workspace/sessions/${sanitizedId}`
      }
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message || 'Gagal membuat proyek baru.' });
  }
});

// 2. Local Disk Workspace: File Tree
router.get('/coder/fs/tree', optionalAuth, async (req, res) => {
  try {
    const workspaceRoot = await ensureCoderWorkspaceInitialized(getRequestWorkspaceDir(req));
    const tree = await buildLocalFileTree(workspaceRoot);
    res.json({
      success: true,
      data: {
        workspaceRoot,
        tree
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message || 'Gagal membaca pohon direktori workspace lokal.'
    });
  }
});

// 3. Local Disk Workspace: Read File
router.get('/coder/fs/file', optionalAuth, async (req, res) => {
  try {
    const relPath = String(req.query.path || '').trim();
    if (!relPath) {
      return res.status(400).json({ success: false, error: 'Parameter path wajib diisi.' });
    }
    const fullPath = resolveSafeWorkspacePath(relPath, getRequestWorkspaceDir(req));
    const content = await fs.readFile(fullPath, 'utf-8');
    res.json({
      success: true,
      data: {
        path: relPath,
        content
      }
    });
  } catch (err: any) {
    res.status(404).json({
      success: false,
      error: err?.message || 'File tidak ditemukan.'
    });
  }
});

// 4. Local Disk Workspace: Write / Create File
router.post('/coder/fs/file', optionalAuth, requireAuthInProduction, async (req, res) => {
  try {
    const relPath = String(req.body?.path || '').trim();
    const content = typeof req.body?.content === 'string' ? req.body.content : '';
    if (!relPath) {
      return res.status(400).json({ success: false, error: 'Parameter path wajib diisi.' });
    }
    const fullPath = resolveSafeWorkspacePath(relPath, getRequestWorkspaceDir(req));
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
    res.json({
      success: true,
      data: {
        path: relPath,
        bytesWritten: Buffer.byteLength(content, 'utf-8')
      }
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err?.message || 'Gagal menyimpan file.'
    });
  }
});

// 5. Local Disk Workspace: Delete File
router.delete('/coder/fs/file', optionalAuth, requireAuthInProduction, async (req, res) => {
  try {
    const relPath = String(req.query.path || req.body?.path || '').trim();
    if (!relPath) {
      return res.status(400).json({ success: false, error: 'Parameter path wajib diisi.' });
    }
    const fullPath = resolveSafeWorkspacePath(relPath, getRequestWorkspaceDir(req));
    await fs.rm(fullPath, { recursive: true, force: true });
    res.json({
      success: true,
      data: { deleted: relPath }
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err?.message || 'Gagal menghapus file.'
    });
  }
});

// 5a. Local Disk Workspace: Create Folder (mkdir)
router.post('/coder/fs/mkdir', optionalAuth, requireAuthInProduction, async (req, res) => {
  try {
    const relPath = String(req.body?.path || '').trim();
    if (!relPath) {
      return res.status(400).json({ success: false, error: 'Parameter path wajib diisi.' });
    }
    const fullPath = resolveSafeWorkspacePath(relPath, getRequestWorkspaceDir(req));
    await fs.mkdir(fullPath, { recursive: true });
    res.json({ success: true, data: { path: relPath } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message || 'Gagal membuat folder.' });
  }
});

// 5b. Local Disk Workspace: Rename File / Folder
router.post('/coder/fs/rename', optionalAuth, requireAuthInProduction, async (req, res) => {
  try {
    const oldRelPath = String(req.body?.oldPath || '').trim();
    const newRelPath = String(req.body?.newPath || '').trim();
    if (!oldRelPath || !newRelPath) {
      return res.status(400).json({ success: false, error: 'Parameter oldPath dan newPath wajib diisi.' });
    }
    const fullOldPath = resolveSafeWorkspacePath(oldRelPath, getRequestWorkspaceDir(req));
    const fullNewPath = resolveSafeWorkspacePath(newRelPath, getRequestWorkspaceDir(req));
    await fs.mkdir(path.dirname(fullNewPath), { recursive: true });
    await fs.rename(fullOldPath, fullNewPath);
    res.json({ success: true, data: { oldPath: oldRelPath, newPath: newRelPath } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message || 'Gagal mengubah nama berkas/folder.' });
  }
});

// 5c. Local Disk Workspace: Upload File
router.post('/coder/fs/upload', optionalAuth, requireAuthInProduction, async (req, res) => {
  try {
    const relPath = String(req.body?.path || '').trim();
    const content = req.body?.content;
    const isBase64 = Boolean(req.body?.isBase64);

    if (!relPath || content === undefined) {
      return res.status(400).json({ success: false, error: 'Parameter path dan content wajib diisi.' });
    }
    const fullPath = resolveSafeWorkspacePath(relPath, getRequestWorkspaceDir(req));
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    if (isBase64) {
      const buffer = Buffer.from(content, 'base64');
      await fs.writeFile(fullPath, buffer);
    } else {
      await fs.writeFile(fullPath, String(content), 'utf-8');
    }

    res.json({ success: true, data: { path: relPath } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message || 'Gagal mengunggah berkas.' });
  }
});

// 5a. Local Disk Workspace: Search Code Across Files
router.get('/coder/fs/search', optionalAuth, async (req, res) => {
  try {
    const q = String(req.query.q || req.query.query || '').trim();
    if (!q) {
      return res.json({ success: true, data: { matches: [] } });
    }
    const matches = await searchWorkspaceCode(q, getRequestWorkspaceDir(req));
    res.json({
      success: true,
      data: { query: q, matches }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message || 'Gagal mencari kode di workspace.'
    });
  }
});

// 5b. Local Disk Workspace: Export Workspace as ZIP
router.get('/coder/fs/export-zip', optionalAuth, async (req, res) => {
  try {
    const workspaceRoot = await ensureCoderWorkspaceInitialized(getRequestWorkspaceDir(req));
    const tree = await buildLocalFileTree(workspaceRoot);
    const zip = new JSZip();

    const addNodesToZip = async (nodes: FileTreeNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file') {
          const fullPath = resolveSafeWorkspacePath(node.path, workspaceRoot);
          const content = await fs.readFile(fullPath);
          zip.file(node.path, content);
        } else if (node.type === 'directory' && node.children) {
          await addNodesToZip(node.children);
        }
      }
    };

    await addNodesToZip(tree);
    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="ruangcoder-workspace.zip"');
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message || 'Gagal mengunduh workspace ZIP.'
    });
  }
});

// 6. Local Disk Workspace: Execute Safe Terminal Command
router.post('/coder/terminal/exec', optionalAuth, requireAuthInProduction, coderTerminalLimiter, async (req, res) => {
  try {
    const command = String(req.body?.command || '').trim();
    if (!command) {
      return res.status(400).json({ success: false, error: 'Perintah terminal tidak boleh kosong.' });
    }
    const workspaceRoot = await ensureCoderWorkspaceInitialized(getRequestWorkspaceDir(req));
    const result = await executeSafeShellCommand(command, workspaceRoot);
    res.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err?.message || 'Gagal menjalankan perintah terminal.'
    });
  }
});

// 7. Autonomous AI Coding Agent SSE Stream (Supports Local Disk & Browser Sandbox)
router.post('/coder/agent/stream', optionalAuth, coderAgentLimiter, async (req, res) => {
  const prompt = String(req.body?.prompt || '').trim();
  const modelName = String(req.body?.modelName || 'si-pinter:latest').trim();
  const provider: CoderAiProvider = req.body?.provider === 'gemini' ? 'gemini' : (req.body?.provider === 'ollama' ? 'ollama' : 'auto');
  const sandboxMode: SandboxMode = req.body?.sandboxMode === 'browser' ? 'browser' : 'local';
  const personaMode: CouncilPersonaMode = req.body?.personaMode === 'professional' ? 'professional' : 'creative';
  const activeFilePath = typeof req.body?.activeFilePath === 'string' ? req.body.activeFilePath : undefined;
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const virtualFiles =
    req.body?.virtualFiles && typeof req.body.virtualFiles === 'object'
      ? (req.body.virtualFiles as Record<string, string>)
      : undefined;

  if (!prompt) {
    return res.status(400).json({
      success: false,
      error: 'Instruksi prompt untuk RuangCoder tidak boleh kosong.'
    });
  }

  // Extend timeout for multi-step local AI agent execution
  req.setTimeout(300000);
  res.setTimeout(300000);

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Periodically send SSE keepalive heartbeat every 10 seconds to prevent reverse proxy (Nginx), load balancer, and browser timeouts
  const keepAliveTimer = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': keepalive\n\n');
    } else {
      clearInterval(keepAliveTimer);
    }
  }, 10000);

  const cleanupKeepAlive = () => {
    clearInterval(keepAliveTimer);
  };

  const abortController = new AbortController();
  req.on('close', () => {
    cleanupKeepAlive();
    if (!res.writableEnded) {
      abortController.abort();
    }
  });
  res.on('finish', cleanupKeepAlive);
  res.on('close', cleanupKeepAlive);

  const sendEvent = (event: unknown) => {
    if (res.writableEnded) return;
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    await runCoderAgentLoop({
      prompt,
      modelName,
      provider,
      sandboxMode,
      activeFilePath,
      history,
      virtualFiles,
      personaMode,
      workspaceDir: getRequestWorkspaceDir(req),
      abortSignal: abortController.signal,
      onEvent: sendEvent
    });
  } catch (err: any) {
    sendEvent({
      type: 'error',
      message: err?.message || 'Gagal mengeksekusi RuangCoder Agent.'
    });
  } finally {
    cleanupKeepAlive();
    if (!res.writableEnded) {
      res.end();
    }
  }
});

export default router;
