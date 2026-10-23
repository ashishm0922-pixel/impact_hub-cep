import { TEST_ADMIN, TestClient, VALID_SIGNUP, clearDb, startTestDb, startTestServer } from './helpers';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import { env } from '../src/config/env';
import { EmailTokenModel } from '../src/models/email-token.model';
import { UserModel } from '../src/models/user.model';
import { upsertAdmin } from '../src/modules/admin/admin.service';
import { testOutbox } from '../src/utils/mailer';

// Default flow: sign up → log in immediately → click the emailed link → verified
let stopDb: () => Promise<void>;
let server: Awaited<ReturnType<typeof startTestServer>>;

before(async () => {
  env.requireAdminApproval = false;
  // Pretend an email server is configured (in tests the mailer still only stores emails in testOutbox)
  env.smtp.host = 'smtp.test.local';
  stopDb = await startTestDb();
  server = await startTestServer();
});
after(async () => {
  await server.close();
  await stopDb();
});
beforeEach(async () => {
  await clearDb();
  testOutbox.length = 0;
  await upsertAdmin(TEST_ADMIN.username, TEST_ADMIN.password);
});

const client = () => new TestClient(server.baseUrl);
const login = (c: TestClient, identifier = VALID_SIGNUP.email) =>
  c.post('/api/auth/login', { identifier, password: VALID_SIGNUP.password });

/** Pulls the token out of the link in the last email sent. */
function tokenFromLastEmail() {
  const mail = testOutbox.at(-1);
  assert.ok(mail, 'an email should have been sent');
  const match = mail.text.match(/verify-email\.html\?token=([A-Za-z0-9_-]+)/);
  assert.ok(match, 'the email should contain a verification link');
  return match[1];
}

describe('sign-up → immediate login', () => {
  test('sign-up creates an ACTIVE but unverified account and emails a link', async () => {
    const res = await client().post('/api/auth/signup', VALID_SIGNUP);
    assert.equal(res.status, 201);
    assert.equal(res.body.user.status, 'approved');
    assert.equal(res.body.user.emailVerified, false);
    assert.equal(res.body.emailSent, true);
    assert.match(res.body.message, /verification link/);
    assert.match(res.body.message, /log in now/);

    assert.equal(testOutbox.length, 1);
    assert.equal(testOutbox[0].to, VALID_SIGNUP.email);
    assert.match(testOutbox[0].subject, /Verify your email/);
    assert.match(testOutbox[0].html, /Verify my email/);
  });

  test('the user can log in right away (by email or mobile) before verifying', async () => {
    await client().post('/api/auth/signup', VALID_SIGNUP);
    const byEmail = await login(client());
    assert.equal(byEmail.status, 200);
    assert.equal(byEmail.body.user.emailVerified, false);
    const byPhone = await login(client(), VALID_SIGNUP.phone);
    assert.equal(byPhone.status, 200);
  });

  test('only a hash of the token is stored in the database', async () => {
    await client().post('/api/auth/signup', VALID_SIGNUP);
    const token = tokenFromLastEmail();
    assert.equal(await EmailTokenModel.countDocuments({ tokenHash: token }), 0);
    assert.equal(await EmailTokenModel.countDocuments(), 1);
  });

  test('an old "pending" account (from approval mode) can log in once approval is off', async () => {
    await client().post('/api/auth/signup', VALID_SIGNUP);
    await UserModel.updateOne({ email: VALID_SIGNUP.email }, { status: 'pending' });
    const res = await login(client());
    assert.equal(res.status, 200);
    assert.equal((await UserModel.findOne({ email: VALID_SIGNUP.email }))!.status, 'approved');
  });

  test('suspended users still cannot log in', async () => {
    await client().post('/api/auth/signup', VALID_SIGNUP);
    await UserModel.updateOne({ email: VALID_SIGNUP.email }, { status: 'suspended', statusReason: 'Spam' });
    const res = await login(client());
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'ACCOUNT_SUSPENDED');
  });
});

describe('email verification link', () => {
  test('clicking the link verifies the email, and the session sees it', async () => {
    await client().post('/api/auth/signup', VALID_SIGNUP);
    const c = client();
    await login(c);

    const verify = await client().post('/api/auth/verify-email', { token: tokenFromLastEmail() });
    assert.equal(verify.status, 200);
    assert.equal(verify.body.user.emailVerified, true);

    const session = await c.get('/api/auth/session');
    assert.equal(session.body.user.emailVerified, true);
  });

  test('a link works only once', async () => {
    await client().post('/api/auth/signup', VALID_SIGNUP);
    const token = tokenFromLastEmail();
    assert.equal((await client().post('/api/auth/verify-email', { token })).status, 200);
    const again = await client().post('/api/auth/verify-email', { token });
    assert.equal(again.status, 400);
    assert.equal(again.body.code, 'TOKEN_INVALID');
  });

  test('expired links are rejected', async () => {
    await client().post('/api/auth/signup', VALID_SIGNUP);
    const token = tokenFromLastEmail();
    await EmailTokenModel.updateMany({}, { expiresAt: new Date(Date.now() - 1000) });
    const res = await client().post('/api/auth/verify-email', { token });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'TOKEN_EXPIRED');
    assert.equal((await UserModel.findOne({ email: VALID_SIGNUP.email }))!.emailVerified, false);
  });

  test('made-up and malformed tokens are rejected', async () => {
    assert.equal((await client().post('/api/auth/verify-email', { token: 'a'.repeat(43) })).status, 400);
    assert.equal((await client().post('/api/auth/verify-email', { token: '<script>' })).status, 400);
    assert.equal((await client().post('/api/auth/verify-email', {})).status, 400);
  });
});

describe('resend verification email', () => {
  test('requires login', async () => {
    assert.equal((await client().post('/api/auth/resend-verification')).status, 401);
  });

  test('sends a new link and the OLD link stops working', async () => {
    await client().post('/api/auth/signup', VALID_SIGNUP);
    const oldToken = tokenFromLastEmail();
    const c = client();
    await login(c);

    const resend = await c.post('/api/auth/resend-verification');
    assert.equal(resend.status, 200);
    assert.equal(testOutbox.length, 2);
    const newToken = tokenFromLastEmail();
    assert.notEqual(newToken, oldToken);

    assert.equal((await client().post('/api/auth/verify-email', { token: oldToken })).status, 400);
    assert.equal((await client().post('/api/auth/verify-email', { token: newToken })).status, 200);
  });

  test('refuses when already verified', async () => {
    await client().post('/api/auth/signup', VALID_SIGNUP);
    await client().post('/api/auth/verify-email', { token: tokenFromLastEmail() });
    const c = client();
    await login(c);
    const res = await c.post('/api/auth/resend-verification');
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'ALREADY_VERIFIED');
  });

  test('is rate-limited', async () => {
    const limited = await startTestServer({ loginLimit: 1000, signupLimit: 1000, resendLimit: 2 });
    try {
      const c = new TestClient(limited.baseUrl);
      await c.post('/api/auth/signup', VALID_SIGNUP);
      await c.post('/api/auth/login', { identifier: VALID_SIGNUP.email, password: VALID_SIGNUP.password });
      assert.equal((await c.post('/api/auth/resend-verification')).status, 200);
      assert.equal((await c.post('/api/auth/resend-verification')).status, 200);
      assert.equal((await c.post('/api/auth/resend-verification')).status, 429);
    } finally {
      await limited.close();
    }
  });
});

describe('verified email is required for volunteering via the API', () => {
  test('unverified users get EMAIL_NOT_VERIFIED', async () => {
    await client().post('/api/auth/signup', VALID_SIGNUP);
    const c = client();
    await login(c);
    const res = await c.post('/api/opportunities/64b7f9f9f9f9f9f9f9f9f9f9/registrations', { availability: 'Weekends' });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'EMAIL_NOT_VERIFIED');
  });
});

describe('when email sending is NOT configured', () => {
  before(() => { env.smtp.host = ''; });
  after(() => { env.smtp.host = 'smtp.test.local'; });

  test('sign-up says honestly that no email was sent', async () => {
    const res = await client().post('/api/auth/signup', VALID_SIGNUP);
    assert.equal(res.status, 201);
    assert.equal(res.body.emailSent, false);
    assert.match(res.body.message, /not set up/);
  });

  test('"Resend email" does not pretend it worked', async () => {
    await client().post('/api/auth/signup', VALID_SIGNUP);
    const c = client();
    await login(c);
    const res = await c.post('/api/auth/resend-verification');
    assert.equal(res.status, 503);
    assert.equal(res.body.code, 'EMAIL_NOT_CONFIGURED');
  });
});
