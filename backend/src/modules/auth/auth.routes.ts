import { Router } from 'express';
import { env } from '../../config/env';
import { getSessionUser, requireUser } from '../../middlewares/auth';
import { loginLimiter, signupLimiter } from '../../middlewares/security';
import { loginSchema, signupSchema } from './auth.schemas';
import { authenticateUser, publicUser, registerUser } from './auth.service';
import { endSession, startSession } from './session.service';

/** /api/auth/* — user sign-up, login, logout and "who am I". */
export function createAuthRoutes(options: { loginLimit?: number; signupLimit?: number } = {}) {
  const router = Router();

  // POST /api/auth/signup  { name, email, phone, role, password, confirmPassword }
  router.post('/signup', signupLimiter(options.signupLimit), async (req, res) => {
    const input = signupSchema.parse(req.body);
    const user = await registerUser(input);
    res.status(201).json({
      message: env.autoApproveUsers
        ? 'Account created. You can log in now.'
        : 'Account created! An admin will review it. You can log in once it is approved.',
      user: publicUser(user)
    });
  });

  // POST /api/auth/login  { identifier: email or 10-digit mobile, password }
  router.post('/login', loginLimiter(options.loginLimit), async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await authenticateUser(input);

    // Throw away any old session on this browser first (prevents session fixation)
    await endSession('user', req, res);
    await startSession('user', user._id, req, res);
    res.json({ message: `Welcome back, ${user.name}!`, user: publicUser(user) });
  });

  // POST /api/auth/logout
  router.post('/logout', async (req, res) => {
    await endSession('user', req, res);
    res.json({ message: 'You have been logged out.' });
  });

  // GET /api/auth/me → the logged-in user, or 401 (use in code that REQUIRES login)
  router.get('/me', requireUser, (req, res) => {
    res.json({ user: publicUser(req.user!) });
  });

  // GET /api/auth/session → { user } or { user: null }. Always 200, so pages can
  // check "am I logged in?" on load without an error showing in the console.
  router.get('/session', async (req, res) => {
    const user = await getSessionUser(req, res);
    res.json({ user: user ? publicUser(user) : null });
  });

  return router;
}
