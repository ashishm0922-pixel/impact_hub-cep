import { Router } from 'express';
import { env } from '../../config/env';
import { getSessionUser, requireUser } from '../../middlewares/auth';
import rateLimit from 'express-rate-limit';
import { loginLimiter, signupLimiter } from '../../middlewares/security';
import { HttpError } from '../../utils/http-error';
import { loginSchema, signupSchema, verifyEmailSchema } from './auth.schemas';
import { sendVerificationEmail, verifyEmailToken } from './email-verification.service';
import { authenticateUser, publicUser, registerUser } from './auth.service';
import { endSession, startSession } from './session.service';

/** /api/auth/* — user sign-up, login, logout and "who am I". */
export function createAuthRoutes(options: { loginLimit?: number; signupLimit?: number; resendLimit?: number } = {}) {
  const router = Router();

  // POST /api/auth/signup  { name, email, phone, role, password, confirmPassword }
  router.post('/signup', signupLimiter(options.signupLimit), async (req, res) => {
    const input = signupSchema.parse(req.body);
    const { user, emailSent } = await registerUser(input);
    const emailNote = emailSent
      ? `We sent a verification link to ${user.email}.`
      : 'We could not send the verification email right now; you can resend it after logging in.';
    res.status(201).json({
      message: env.requireAdminApproval
        ? `Account created! ${emailNote} An admin will also review your account before you can log in.`
        : `Account created! ${emailNote} You can log in now.`,
      user: publicUser(user),
      emailSent
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

  // POST /api/auth/verify-email  { token }  — called by pages/verify-email.html.
  // (POST, not a plain GET link, so email scanners that "open" links can't use up the token.)
  router.post('/verify-email', async (req, res) => {
    const { token } = verifyEmailSchema.parse(req.body);
    const user = await verifyEmailToken(token);
    res.json({ message: 'Your email is verified. Thank you!', user: publicUser(user) });
  });

  // POST /api/auth/resend-verification — logged-in users who haven't verified yet
  const resendLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: options.resendLimit ?? 3,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Please wait a few minutes before asking for another email.', code: 'RATE_LIMITED' }
  });
  router.post('/resend-verification', requireUser, resendLimiter, async (req, res) => {
    const user = req.user!;
    if (user.emailVerified) {
      throw new HttpError(409, 'Your email is already verified.', { code: 'ALREADY_VERIFIED' });
    }
    await sendVerificationEmail(user);
    res.json({ message: `A new verification link was sent to ${user.email}.` });
  });

  return router;
}
