import type { NextFunction, Request, Response } from 'express';
import { AdminModel, type AdminDocument } from '../models/admin.model';
import { UserModel, type UserDocument } from '../models/user.model';
import { clearSessionCookie, endAllSessions, findSession } from '../modules/auth/session.service';
import { HttpError } from '../utils/http-error';

// Adds req.user / req.admin to Express's Request type
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserDocument;
      admin?: AdminDocument;
    }
  }
}

/**
 * Returns the logged-in, APPROVED user for this request, or null.
 * If the account was suspended/rejected after login, all its sessions are ended.
 */
export async function getSessionUser(req: Request, res: Response): Promise<UserDocument | null> {
  const session = await findSession('user', req);
  if (!session) {
    if (req.cookies?.hc_session) clearSessionCookie('user', res);
    return null;
  }

  const user = await UserModel.findById(session.subjectId);
  if (!user || user.status !== 'approved') {
    await endAllSessions('user', session.subjectId);
    clearSessionCookie('user', res);
    return null;
  }
  return user;
}

/** Only logged-in, APPROVED users get through. Sets req.user. */
export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const user = await getSessionUser(req, res);
  if (!user) throw new HttpError(401, 'Please log in to continue.', { code: 'NOT_AUTHENTICATED' });
  req.user = user;
  next();
}

/** Only logged-in admins get through. Sets req.admin. */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = await findSession('admin', req);
  const admin = session ? await AdminModel.findById(session.subjectId) : null;
  if (!session || !admin) {
    clearSessionCookie('admin', res);
    throw new HttpError(401, 'Admin login required.', { code: 'NOT_AUTHENTICATED' });
  }
  req.admin = admin;
  next();
}
