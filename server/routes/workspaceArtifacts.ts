import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../database.js';
import { requireAuth } from '../middleware/auth.js';
import { encryptionService } from '../services/encryptionService.js';
import { sanitizeInput } from '../security.js';

const router = Router();

const artifactTypeSchema = z.enum(['DOCUMENT', 'CODE', 'CITATION', 'OUTLINE']);

const createOrUpdateArtifactSchema = z.object({
  id: z.string().optional(),
  chatId: z.string().nullable().optional(),
  title: z.string().min(1).max(200).default('Artefak Akademik'),
  type: artifactTypeSchema.default('DOCUMENT'),
  language: z.string().nullable().optional(),
  content: z.string().default(''),
  version: z.number().int().positive().optional()
});

const autoSaveArtifactSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  type: artifactTypeSchema.optional(),
  language: z.string().nullable().optional(),
  content: z.string().optional(),
  createNewVersion: z.boolean().optional()
});

const rollbackArtifactSchema = z.object({
  targetVersion: z.number().int().positive().optional(),
  versionId: z.string().optional()
});

function decryptArtifact(art: any) {
  if (!art) return null;
  const decryptedContent = encryptionService.decryptSensitive(art.content) || art.content;
  const decryptedVersions = Array.isArray(art.versions)
    ? art.versions.map((v: any) => ({
        ...v,
        content: encryptionService.decryptSensitive(v.content) || v.content
      }))
    : [];

  return {
    ...art,
    content: decryptedContent,
    versions: decryptedVersions
  };
}

/**
 * GET /api/v1/workspace/artifacts
 * Fetch all artifacts for the authenticated user, optionally filtered by chatId
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const chatId = typeof req.query.chatId === 'string' && req.query.chatId.trim() ? req.query.chatId.trim() : undefined;

    const whereClause: any = { userId };
    if (chatId) {
      whereClause.chatId = chatId;
    }

    const artifacts = await prisma.artifacts.findMany({
      where: whereClause,
      include: {
        versions: {
          orderBy: { version: 'desc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const decrypted = artifacts.map(decryptArtifact);

    return res.status(200).json({
      success: true,
      data: decrypted
    });
  } catch (err: any) {
    console.error('[WORKSPACE_ARTIFACTS_GET_ERROR]', err?.message || err);
    return res.status(500).json({
      success: false,
      code: 'FETCH_ARTIFACTS_FAILED',
      message: 'Gagal mengambil daftar artefak'
    });
  }
});

/**
 * POST /api/v1/workspace/artifacts
 * Save a new artifact or update/append revision for an existing artifact
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const parsed = createOrUpdateArtifactSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Payload artefak tidak valid',
        details: parsed.error.issues
      });
    }

    const { id, chatId, title, type, language, content } = parsed.data;
    const cleanTitle = sanitizeInput(title.trim(), 200);
    const encryptedContent = encryptionService.encryptSensitive(content) || content;

    let artifactRecord: any = null;

    if (id) {
      const existing = await prisma.artifacts.findFirst({
        where: { id, userId },
        include: { versions: true }
      });

      if (existing) {
        const nextVersion = (existing.version || 1) + 1;

        // Create a new version snapshot
        await prisma.artifactVersions.create({
          data: {
            id: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            artifactId: existing.id,
            version: nextVersion,
            title: cleanTitle,
            content: encryptedContent,
            createdAt: new Date()
          }
        });

        // Update main artifact record
        artifactRecord = await prisma.artifacts.update({
          where: { id: existing.id },
          data: {
            title: cleanTitle,
            type,
            language: language || null,
            content: encryptedContent,
            version: nextVersion,
            chatId: chatId || existing.chatId,
            updatedAt: new Date()
          },
          include: {
            versions: {
              orderBy: { version: 'desc' }
            }
          }
        });
      }
    }

    if (!artifactRecord) {
      const newId = id && id.startsWith('art_') ? id : `art_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // Create new artifact
      artifactRecord = await prisma.artifacts.create({
        data: {
          id: newId,
          userId,
          chatId: chatId || null,
          title: cleanTitle,
          type,
          language: language || null,
          content: encryptedContent,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          versions: {
            create: [
              {
                id: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                version: 1,
                title: cleanTitle,
                content: encryptedContent,
                createdAt: new Date()
              }
            ]
          }
        },
        include: {
          versions: {
            orderBy: { version: 'desc' }
          }
        }
      });
    }

    const decrypted = decryptArtifact(artifactRecord);

    return res.status(200).json({
      success: true,
      data: decrypted,
      message: 'Artefak berhasil disimpan'
    });
  } catch (err: any) {
    console.error('[WORKSPACE_ARTIFACTS_POST_ERROR]', err?.message || err);
    return res.status(500).json({
      success: false,
      code: 'SAVE_ARTIFACT_FAILED',
      message: 'Gagal menyimpan artefak'
    });
  }
});

/**
 * PUT /api/v1/workspace/artifacts/:id
 * Auto-save updates made manually in the Canvas editor
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const parsed = autoSaveArtifactSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Payload pembaruan artefak tidak valid',
        details: parsed.error.issues
      });
    }

    const existing = await prisma.artifacts.findFirst({
      where: { id, userId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1
        }
      }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Artefak tidak ditemukan atau bukan milik Anda'
      });
    }

    const { title, type, language, content, createNewVersion } = parsed.data;
    const cleanTitle = title ? sanitizeInput(title.trim(), 200) : existing.title;
    const newContent = content !== undefined ? content : (encryptionService.decryptSensitive(existing.content) || existing.content);
    const encryptedContent = encryptionService.encryptSensitive(newContent) || newContent;

    let targetVersion = existing.version;

    if (createNewVersion) {
      targetVersion = existing.version + 1;
      await prisma.artifactVersions.create({
        data: {
          id: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          artifactId: existing.id,
          version: targetVersion,
          title: cleanTitle,
          content: encryptedContent,
          createdAt: new Date()
        }
      });
    } else {
      // Update latest version snapshot if it exists for the same version
      const latestVer = existing.versions[0];
      if (latestVer && latestVer.version === existing.version) {
        await prisma.artifactVersions.update({
          where: { id: latestVer.id },
          data: {
            title: cleanTitle,
            content: encryptedContent
          }
        });
      } else {
        await prisma.artifactVersions.create({
          data: {
            id: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            artifactId: existing.id,
            version: existing.version,
            title: cleanTitle,
            content: encryptedContent,
            createdAt: new Date()
          }
        });
      }
    }

    const updated = await prisma.artifacts.update({
      where: { id: existing.id },
      data: {
        title: cleanTitle,
        type: type || existing.type,
        language: language !== undefined ? (language || null) : existing.language,
        content: encryptedContent,
        version: targetVersion,
        updatedAt: new Date()
      },
      include: {
        versions: {
          orderBy: { version: 'desc' }
        }
      }
    });

    const decrypted = decryptArtifact(updated);

    return res.status(200).json({
      success: true,
      data: decrypted,
      message: 'Perubahan artefak berhasil disimpan'
    });
  } catch (err: any) {
    console.error('[WORKSPACE_ARTIFACTS_PUT_ERROR]', err?.message || err);
    return res.status(500).json({
      success: false,
      code: 'AUTOSAVE_FAILED',
      message: 'Gagal memperbarui artefak'
    });
  }
});

/**
 * POST /api/v1/workspace/artifacts/:id/rollback
 * Rollback artifact content to a previous version
 */
router.post('/:id/rollback', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const parsed = rollbackArtifactSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Parameter rollback tidak valid',
        details: parsed.error.issues
      });
    }

    const existing = await prisma.artifacts.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Artefak tidak ditemukan atau bukan milik Anda'
      });
    }

    const { targetVersion, versionId } = parsed.data;

    let targetVerRecord: any = null;
    if (versionId) {
      targetVerRecord = await prisma.artifactVersions.findFirst({
        where: { id: versionId, artifactId: id }
      });
    } else if (targetVersion !== undefined) {
      targetVerRecord = await prisma.artifactVersions.findFirst({
        where: { artifactId: id, version: targetVersion }
      });
    }

    if (!targetVerRecord) {
      return res.status(404).json({
        success: false,
        code: 'VERSION_NOT_FOUND',
        message: 'Versi target artefak tidak ditemukan'
      });
    }

    const restoredVersionNum = (existing.version || 1) + 1;
    const restoredTitle = targetVerRecord.title;
    const restoredContent = targetVerRecord.content; // already encrypted in db

    // Record new snapshot for the restored state
    await prisma.artifactVersions.create({
      data: {
        id: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        artifactId: existing.id,
        version: restoredVersionNum,
        title: restoredTitle,
        content: restoredContent,
        createdAt: new Date()
      }
    });

    // Update main artifact
    const updated = await prisma.artifacts.update({
      where: { id: existing.id },
      data: {
        title: restoredTitle,
        content: restoredContent,
        version: restoredVersionNum,
        updatedAt: new Date()
      },
      include: {
        versions: {
          orderBy: { version: 'desc' }
        }
      }
    });

    const decrypted = decryptArtifact(updated);

    return res.status(200).json({
      success: true,
      data: decrypted,
      message: `Artefak berhasil dipulihkan ke versi v${targetVerRecord.version}`
    });
  } catch (err: any) {
    console.error('[WORKSPACE_ARTIFACTS_ROLLBACK_ERROR]', err?.message || err);
    return res.status(500).json({
      success: false,
      code: 'ROLLBACK_FAILED',
      message: 'Gagal memulihkan versi artefak'
    });
  }
});

/**
 * DELETE /api/v1/workspace/artifacts/:id
 * Delete an artifact
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await prisma.artifacts.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: 'Artefak tidak ditemukan'
      });
    }

    await prisma.artifacts.delete({
      where: { id }
    });

    return res.status(200).json({
      success: true,
      message: 'Artefak berhasil dihapus'
    });
  } catch (err: any) {
    console.error('[WORKSPACE_ARTIFACTS_DELETE_ERROR]', err?.message || err);
    return res.status(500).json({
      success: false,
      code: 'DELETE_FAILED',
      message: 'Gagal menghapus artefak'
    });
  }
});

export default router;
