import { Router } from 'express';
import { env } from '../../config/env';
import { getSessionUser, requireUser } from '../../middlewares/auth';
import rateLimit from 'express-rate-limit';
import { loginLimiter, signupLimiter } from '../../middlewares/security';
import { HttpError } from '../../utils/http-error';
import { audit } from '../audit/audit.service';
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
    await audit(req, 'SIGNUP', {
      actor: { type: 'user', id: user._id, name: user.name, role: user.role },
      target: { type: 'User', id: user._id },
      details: { email: user.email, role: user.role, emailSent }
    });
    const emailNote = emailSent
      ? `We sent a verification link to ${user.email}.`
      : 'Email sending is not set up on the server yet, so no verification email was sent.';
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
    let user;
    try {
      user = await authenticateUser(input);
    } catch (err) {
      // Record failed attempts (never the password) so admins can spot attacks
      if (err instanceof HttpError) {
        await audit(req, 'LOGIN_FAILED', { details: { identifier: 'email' in input ? input.email : input.phone, reason: err.code } });
      }
      throw err;
    }

    // Throw away any old session on this browser first (prevents session fixation)
    await endSession('user', req, res);
    await startSession('user', user._id, req, res);
    await audit(req, 'LOGIN_SUCCESS', {
      actor: { type: 'user', id: user._id, name: user.name, role: user.role },
      target: { type: 'User', id: user._id },
      details: { role: user.role }
    });
    res.json({ message: `Welcome back, ${user.name}!`, user: publicUser(user) });
  });

  // POST /api/auth/logout
  router.post('/logout', async (req, res) => {
    const user = await getSessionUser(req, res);
    if (user) await audit(req, 'LOGOUT', { actor: { type: 'user', id: user._id, name: user.name, role: user.role }, target: { type: 'User', id: user._id } });
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
    await audit(req, 'EMAIL_VERIFIED', {
      actor: { type: 'user', id: user._id, name: user.name, role: user.role },
      target: { type: 'User', id: user._id },
      details: { email: user.email }
    });
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
    const delivery = await sendVerificationEmail(user);
    if (delivery === 'console') {
      // Be honest: nothing reached the inbox. (The link was printed in the server terminal.)
      throw new HttpError(503, 'Email sending is not set up on the server yet (SMTP settings missing in backend/.env). '
        + 'The verification link was printed in the server terminal instead.', { code: 'EMAIL_NOT_CONFIGURED' });
    }
    await audit(req, 'VERIFICATION_RESENT', { target: { type: 'User', id: user._id } });
    res.json({ message: `A new verification link was sent to ${user.email}. Check your inbox and spam folder.` });
  });

  return router;
}
