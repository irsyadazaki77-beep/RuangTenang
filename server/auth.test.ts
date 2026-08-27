import { describe, it, expect, vi } from 'vitest';
import { loginSchema, registerSchema, provisionUserSchema, changePasswordSchema } from './validators/authSchemas.js';
import { requireAuth, requireRole } from './middleware/auth.js';
import { authService } from './services/authService.js';
import { AuthController } from './controllers/authController.js';
import { serverDb } from './database.js';

describe('Auth Validation Schemas (Phase 1 Security)', () => {
  it('Validates login with correct email and password', () => {
    const input = { email: 'user@ui.ac.id', password: 'password123' };
    const result = loginSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('Rejects invalid email format on login', () => {
    const input = { email: 'invalid-email', password: 'password123' };
    const result = loginSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('Rejects register input with short password (< 10 chars)', () => {
    const input = { name: 'User Test', email: 'test@ui.ac.id', password: 'short' };
    const result = registerSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('Validates register input without requiring role from client', () => {
    const input = { name: 'Budi Santoso', email: 'budi@ui.ac.id', password: 'SuperSecretPassword123!', university: 'UI' };
    const result = registerSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('Validates provisionUserSchema for admin creating konselor or admin', () => {
    const validCounselor = { name: 'Dr. Anita', email: 'dr.anita@ui.ac.id', password: 'StrongPassword123!', role: 'konselor' };
    expect(provisionUserSchema.safeParse(validCounselor).success).toBe(true);

    const validAdmin = { name: 'Admin Pusat', email: 'admin@ui.ac.id', password: 'StrongPassword123!', role: 'admin' };
    expect(provisionUserSchema.safeParse(validAdmin).success).toBe(true);

    const invalidRole = { name: 'Test', email: 'test@ui.ac.id', password: 'StrongPassword123!', role: 'mahasiswa' };
    expect(provisionUserSchema.safeParse(invalidRole).success).toBe(false);
  });

  it('Validates change password with strong credentials', () => {
    const input = { currentPassword: 'password123', newPassword: 'newStrongPassword123!' };
    const result = changePasswordSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

describe('Registration Privilege Escalation Prevention', () => {
  it('Forces role to "mahasiswa" regardless of client request payload in AuthController.register', async () => {
    let capturedUser: any = null;
    vi.spyOn(serverDb, 'getUserByEmail').mockResolvedValue(null);
    vi.spyOn(serverDb, 'addUser').mockImplementation(async (userData: any) => {
      capturedUser = userData;
      return { id: 'usr-new-1', ...userData };
    });
    vi.spyOn(serverDb, 'setEmailVerificationCode').mockResolvedValue(undefined as any);
    vi.spyOn(serverDb, 'logAudit').mockResolvedValue({} as any);

    const req: any = {
      body: {
        name: 'Hacker User',
        email: 'hacker@kampus.ac.id',
        password: 'PasswordYangSangatKuat123!',
        role: 'admin', // Attempted privilege escalation
        university: 'UI'
      },
      headers: {},
      socket: {}
    };

    let responseStatus = 200;
    let responseJson: any = null;
    const res: any = {
      status: (s: number) => { responseStatus = s; return res; },
      json: (j: any) => { responseJson = j; return res; }
    };

    await AuthController.register(req, res);

    expect(responseStatus).toBe(201);
    expect(capturedUser).not.toBeNull();
    // Role MUST be forced to 'mahasiswa'
    expect(capturedUser.role).toBe('mahasiswa');
    expect(capturedUser.role).not.toBe('admin');
  });
});

describe('Role-Based Access Control (RBAC) & Middleware Security', () => {
  it('requireAuth rejects unauthenticated requests with 401', () => {
    let status = 200;
    let json: any = {};
    const req: any = { cookies: {}, headers: {} };
    const res: any = {
      status: vi.fn((s: number) => { status = s; return res; }),
      json: vi.fn((j: any) => { json = j; return res; })
    };
    const next = vi.fn();

    requireAuth(req, res, next);
    expect(status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('requireRole rejects mahasiswa trying to access admin endpoints with 403', () => {
    let status = 200;
    let json: any = {};
    const req: any = {
      user: {
        userId: 'usr-student-1',
        email: 'student@ui.ac.id',
        role: 'mahasiswa'
      }
    };
    const res: any = {
      status: vi.fn((s: number) => { status = s; return res; }),
      json: vi.fn((j: any) => { json = j; return res; })
    };
    const next = vi.fn();

    const adminGuard = requireRole(['admin']);
    adminGuard(req, res, next);

    expect(status).toBe(403);
    expect(next).not.toHaveBeenCalled();
    expect(json.message || json.error).toContain('Akses ditolak');
  });

  it('requireRole grants access to admin for admin endpoints', () => {
    const req: any = {
      user: {
        userId: 'usr-admin-1',
        email: 'admin@ui.ac.id',
        role: 'admin'
      }
    };
    const res: any = {};
    const next = vi.fn();

    const adminGuard = requireRole(['admin']);
    adminGuard(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('requireRole grants access to konselor for konselor/admin endpoints', () => {
    const req: any = {
      user: {
        userId: 'usr-counselor-1',
        email: 'konselor@ui.ac.id',
        role: 'konselor'
      }
    };
    const res: any = {};
    const next = vi.fn();

    const counselorGuard = requireRole(['admin', 'konselor']);
    counselorGuard(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

describe('Token & Session Integrity', () => {
  it('Sanitizes user object by removing passwordHash, verificationCode, and reset tokens', () => {
    const rawUser = {
      id: 'usr-123',
      name: 'Test User',
      email: 'test@ui.ac.id',
      passwordHash: '$2a$10$hashedstringhere',
      emailVerificationCode: '123456',
      resetPasswordToken: 'rst-secrettoken',
      mfaSecret: 'JBSWY3DPEHPK3PXP',
      role: 'mahasiswa' as const,
      tier: 'Free' as const,
      university: 'Universitas Indonesia',
      createdAt: new Date().toISOString()
    };

    const sanitized: any = authService.sanitizeUser(rawUser);
    expect(sanitized.id).toBe('usr-123');
    expect(sanitized.passwordHash).toBeUndefined();
    expect(sanitized.emailVerificationCode).toBeUndefined();
    expect(sanitized.resetPasswordToken).toBeUndefined();
    expect(sanitized.mfaSecret).toBeUndefined();
  });
});

