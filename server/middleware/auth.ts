import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { serverDb } from '../database.js';
import { getValidatedJwtSecret } from '../config/envValidation.js';

export const getJwtSecret = () => {
  return getValidatedJwtSecret();
};

export const getTokenFromReq = (req: Request) => {
  let token = req.cookies?.ruangtenang_session || req.cookies?.token;
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  return token;
};

const verifyAndLoadSession = async (token: string, res: Response) => {
  try {
    const JWT_SECRET = getJwtSecret();
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (decoded.sessionId && decoded.userId) {
      const isSessionValid = await serverDb.isSessionActive(decoded.userId, decoded.sessionId);
      if (!isSessionValid) {
        throw new Error('SESSION_REVOKED');
      }
    }
    return decoded;
  } catch (err: any) {
    res.clearCookie('ruangtenang_session', { path: '/' });
    res.clearCookie('token', { path: '/' });
    if (err.message === 'SESSION_REVOKED') {
      throw err;
    }
    throw new Error('INVALID_SESSION');
  }
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = getTokenFromReq(req);
  if (!token) {
    return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Akses ditolak. Silakan login.' });
  }

  try {
    const decoded = await verifyAndLoadSession(token, res);
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.message === 'SESSION_REVOKED') {
      return res.status(401).json({ success: false, code: 'SESSION_REVOKED', message: 'Sesi perangkat ini telah dicabut atau dikeluarkan. Silakan masuk kembali.' });
    }
    return res.status(401).json({ success: false, code: 'INVALID_SESSION', message: 'Sesi tidak valid. Silakan masuk kembali.' });
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = getTokenFromReq(req);
  if (token) {
    try {
      const decoded = await verifyAndLoadSession(token, res);
      req.user = decoded;
    } catch (err) {
      // Ignored for optional auth, user remains undefined, but cookies are cleared by verifyAndLoadSession
    }
  }
  next();
};

export const requireRole = (allowedRoles: ('mahasiswa' | 'konselor' | 'admin')[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Akses ditolak. Silakan login terlebih dahulu.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Akses ditolak. Anda tidak memiliki izin untuk halaman ini.' });
    }

    next();
  };
};
