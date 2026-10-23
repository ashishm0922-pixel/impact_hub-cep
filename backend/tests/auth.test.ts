import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import { SessionModel } from '../src/models/session.model';
import { UserModel } from '../src/models/user.model';
import { upsertAdmin } from '../src/modules/admin/admin.service';
import { TEST_ADMIN, TestClient, VALID_SIGNUP, clearDb, startTestDb, startTestServer } from './helpers';

let stopDb: () => Promise<void>;
let server: Awaited<ReturnType<typeof startTestServer>>;

before(async () => {
  stopDb = await startTestDb();
  server = await startTestServer();
});
after(async () => {
  await server.close();
  await stopDb();
});
beforeEach(async () => {
  await clearDb();
  await upsertAdmin(TEST_ADMIN.username, TEST_ADMIN.password);
});

const client = () => new TestClient(server.baseUrl);
const fieldMessage = (body: any, field: string) => body.fields?.find((f: any) => f.field === field)?.message;

async function signupAndApprove(overrides: Partial<typeof VALID_SIGNUP> = {}) {
  const data = { ...VALID_SIGNUP, ...overrides };
  const signup = await client().post('/api/auth/signup', data);
  assert.equal(signup.status, 201, JSON.stringify(signup.body));
  const admin = client();
  await admin.post('/api/admin/auth/login', TEST_ADMIN);
  const approve = await admin.patch(`/api/admin/users/${signup.body.user.id}/status`, { status: 'approved' });
  assert.equal(approve.status, 200);
  return { data, id: signup.body.user.id as string, admin };
}

describe('sign-up validation', () => {
  const cases: Array<[string, Record<string, unknown>, string, RegExp]> = [
    ['phone with 9 digits', { phone: '987654321' }, 'phone', /exactly 10 digits/],
    ['phone with 11 digits', { phone: '98765432101' }, 'phone', /exactly 10 digits/],
    ['phone with letters', { phone: '98765abcde' }, 'phone', /digits only/],
    ['phone with +91', { phone: '+919876543210' }, 'phone', /digits only/],
    ['phone with spaces', { phone: '98765 43210' }, 'phone', /digits only/],
    ['phone starting with 5', { phone: '5876543210' }, 'phone', /start with 6, 7, 8 or 9/],
    ['missing phone', { phone: undefined }, 'phone', /Mobile number is required/],
    ['invalid email', { email: 'neha@' }, 'email', /valid email/],
    ['name with digits', { name: 'Neha 123' }, 'name', /letters/],
    ['name too short', { name: 'N' }, 'name', /at least 2/],
    ['short password', { password: 'abc12', confirmPassword: 'abc12' }, 'password', /at least 8/],
    ['password without number', { password: 'abcdefgh', confirmPassword: 'abcdefgh' }, 'password', /number/],
    ['password without letter', { password: '12345678', confirmPassword: '12345678' }, 'password', /letter/],
    ['passwords differ', { confirmPassword: 'Volunteer124' }, 'confirmPassword', /do not match/],
    ['unknown role', { role: 'admin' }, 'role', /Volunteer, Donor or NGO/]
  ];

  for (const [label, override, field, expected] of cases) {
    test(`rejects ${label}`, async () => {
      const res = await client().post('/api/auth/signup', { ...VALID_SIGNUP, ...override });
      assert.equal(res.status, 400);
      assert.match(fieldMessage(res.body, field) ?? '', expected);
      assert.equal(await UserModel.countDocuments(), 0, 'no user should be created');
    });
  }

  test('reports every missing field at once', async () => {
    const res = await client().post('/api/auth/signup', {});
    assert.equal(res.status, 400);
    const fields = res.body.fields.map((f: any) => f.field).sort();
    assert.deepEqual(fields, ['confirmPassword', 'email', 'name', 'password', 'phone']);
  });
});

describe('sign-up', () => {
  test('creates a PENDING account, hashes the password and never returns it', async () => {
    const res = await client().post('/api/auth/signup', { ...VALID_SIGNUP, email: '  Neha@Example.COM ' });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.status, 'pending');
    assert.equal(res.body.user.email, 'neha@example.com');
    assert.match(res.body.message, /admin/i);
    assert.equal(JSON.stringify(res.body).includes('Volunteer123'), false);
    assert.equal('passwordHash' in res.body.user, false);

    const stored = await UserModel.findOne({ email: 'neha@example.com' }).select('+passwordHash').lean();
    assert.ok(stored!.passwordHash.startsWith('scrypt$'));
    assert.equal(stored!.passwordHash.includes('Volunteer123'), false);
  });

  test('does not log the user in (no session cookie)', async () => {
    const c = client();
    await c.post('/api/auth/signup', VALID_SIGNUP);
    assert.equal(c.cookies.size, 0);
    assert.equal(await SessionModel.countDocuments(), 0);
  });

  test('rejects a duplicate email and a duplicate phone, naming both fields', async () => {
    await client().post('/api/auth/signup', VALID_SIGNUP);
    const res = await client().post('/api/auth/signup', { ...VALID_SIGNUP, name: 'Someone Else' });
    assert.equal(res.status, 409);
    assert.match(fieldMessage(res.body, 'email'), /email already exists/);
    assert.match(fieldMessage(res.body, 'phone'), /mobile number already exists/);
  });

  test('rejects a duplicate email even with different capitalisation', async () => {
    await client().post('/api/auth/signup', VALID_SIGNUP);
    const res = await client().post('/api/auth/signup', { ...VALID_SIGNUP, email: 'NEHA@EXAMPLE.COM', phone: '9123456789' });
    assert.equal(res.status, 409);
    assert.ok(fieldMessage(res.body, 'email'));
    assert.equal(fieldMessage(res.body, 'phone'), undefined);
  });
});

describe('user login', () => {
  test('a pending account cannot log in, even with the right password', async () => {
    await client().post('/api/auth/signup', VALID_SIGNUP);
    const c = client();
    const res = await c.post('/api/auth/login', { identifier: VALID_SIGNUP.email, password: VALID_SIGNUP.password });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'ACCOUNT_PENDING');
    assert.equal(c.cookies.size, 0);
  });

  test('wrong password and unknown account give the SAME generic message', async () => {
    await signupAndApprove();
    const wrong = await client().post('/api/auth/login', { identifier: VALID_SIGNUP.email, password: 'Wrong12345' });
    const unknown = await client().post('/api/auth/login', { identifier: 'nobody@example.com', password: 'Wrong12345' });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrong.body.error, unknown.body.error);
    assert.equal(wrong.body.code, 'INVALID_CREDENTIALS');
  });

  test('a pending account with the WRONG password still gets the generic error (status not leaked)', async () => {
    await client().post('/api/auth/signup', VALID_SIGNUP);
    const res = await client().post('/api/auth/login', { identifier: VALID_SIGNUP.email, password: 'Wrong12345' });
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'INVALID_CREDENTIALS');
  });

  test('rejects an identifier that is neither an email nor a 10-digit mobile', async () => {
    const res = await client().post('/api/auth/login', { identifier: '12345', password: 'x' });
    assert.equal(res.status, 400);
    assert.match(fieldMessage(res.body, 'identifier'), /valid email or 10-digit mobile/);
  });

  test('approved user can log in with email (any case) and with mobile number', async () => {
    await signupAndApprove();
    const byEmail = client();
    const r1 = await byEmail.post('/api/auth/login', { identifier: 'NEHA@example.com', password: VALID_SIGNUP.password });
    assert.equal(r1.status, 200);
    assert.equal(r1.body.user.email, 'neha@example.com');

    const byPhone = client();
    const r2 = await byPhone.post('/api/auth/login', { identifier: VALID_SIGNUP.phone, password: VALID_SIGNUP.password });
    assert.equal(r2.status, 200);
  });

  test('session cookie is httpOnly + SameSite=Lax, and /me returns the user without secrets', async () => {
    await signupAndApprove();
    const c = client();
    await c.post('/api/auth/login', { identifier: VALID_SIGNUP.email, password: VALID_SIGNUP.password });
    const cookie = c.lastSetCookies.find(s => s.startsWith('hc_session='))!;
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Lax/i);
    assert.match(cookie, /Path=\//);

    const me = await c.get('/api/auth/me');
    assert.equal(me.status, 200);
    assert.deepEqual(Object.keys(me.body.user).sort(), ['createdAt', 'email', 'id', 'name', 'phone', 'role', 'status']);

    // The token is stored hashed in the DB, never as-is
    const token = c.cookies.get('hc_session')!;
    assert.equal(await SessionModel.countDocuments({ tokenHash: token }), 0);
    assert.equal(await SessionModel.countDocuments({ kind: 'user' }), 1);
  });

  test('logging in again replaces the old session on that browser', async () => {
    await signupAndApprove();
    const c = client();
    await c.post('/api/auth/login', { identifier: VALID_SIGNUP.email, password: VALID_SIGNUP.password });
    const first = c.cookies.get('hc_session');
    await c.post('/api/auth/login', { identifier: VALID_SIGNUP.email, password: VALID_SIGNUP.password });
    assert.notEqual(c.cookies.get('hc_session'), first);
    assert.equal(await SessionModel.countDocuments({ kind: 'user' }), 1);
  });

  test('logout ends the session; the old cookie stops working', async () => {
    await signupAndApprove();
    const c = client();
    await c.post('/api/auth/login', { identifier: VALID_SIGNUP.email, password: VALID_SIGNUP.password });
    const oldToken = c.cookies.get('hc_session')!;

    const out = await c.post('/api/auth/logout');
    assert.equal(out.status, 200);
    assert.equal(c.cookies.has('hc_session'), false);

    const replay = new TestClient(server.baseUrl);
    replay.cookies.set('hc_session', oldToken);
    assert.equal((await replay.get('/api/auth/me')).status, 401);
  });

  test('/session answers 200 with user: null when logged out, and the user when logged in', async () => {
    const anon = await client().get('/api/auth/session');
    assert.equal(anon.status, 200);
    assert.equal(anon.body.user, null);

    await signupAndApprove();
    const c = client();
    await c.post('/api/auth/login', { identifier: VALID_SIGNUP.email, password: VALID_SIGNUP.password });
    const res = await c.get('/api/auth/session');
    assert.equal(res.body.user.email, VALID_SIGNUP.email);
  });

  test('/me rejects missing, forged and expired sessions', async () => {
    assert.equal((await client().get('/api/auth/me')).status, 401);

    const forged = client();
    forged.cookies.set('hc_session', 'x'.repeat(43));
    assert.equal((await forged.get('/api/auth/me')).status, 401);

    await signupAndApprove();
    const c = client();
    await c.post('/api/auth/login', { identifier: VALID_SIGNUP.email, password: VALID_SIGNUP.password });
    await SessionModel.updateMany({}, { expiresAt: new Date(Date.now() - 1000) });
    assert.equal((await c.get('/api/auth/me')).status, 401);
  });

  test('a user cookie cannot be used as an admin session', async () => {
    await signupAndApprove();
    const c = client();
    await c.post('/api/auth/login', { identifier: VALID_SIGNUP.email, password: VALID_SIGNUP.password });
    c.cookies.set('hc_admin_session', c.cookies.get('hc_session')!);
    assert.equal((await c.get('/api/admin/users')).status, 401);
  });
});

describe('admin', () => {
  test('wrong admin password is rejected; correct one sets a path-restricted httpOnly cookie', async () => {
    const bad = await client().post('/api/admin/auth/login', { ...TEST_ADMIN, password: 'nope' });
    assert.equal(bad.status, 401);

    const c = client();
    const ok = await c.post('/api/admin/auth/login', { username: 'TestAdmin', password: TEST_ADMIN.password });
    assert.equal(ok.status, 200);
    const cookie = c.lastSetCookies.find(s => s.startsWith('hc_admin_session='))!;
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /Path=\/api\/admin/);
  });

  test('user list requires an admin session', async () => {
    assert.equal((await client().get('/api/admin/users')).status, 401);
  });

  test('lists pending users with counts, and searches', async () => {
    await client().post('/api/auth/signup', VALID_SIGNUP);
    await client().post('/api/auth/signup', { ...VALID_SIGNUP, name: 'Rohan Patil', email: 'rohan@example.com', phone: '9123456789' });
    const admin = client();
    await admin.post('/api/admin/auth/login', TEST_ADMIN);

    const res = await admin.get('/api/admin/users?status=pending');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 2);
    assert.equal(res.body.counts.pending, 2);
    assert.equal(JSON.stringify(res.body).includes('passwordHash'), false);

    const search = await admin.get('/api/admin/users?search=rohan');
    assert.equal(search.body.total, 1);

    // Regex characters in the search are treated as plain text
    assert.equal((await admin.get('/api/admin/users?search=.*')).body.total, 0);
  });

  test('suspending needs a reason, and immediately logs the user out everywhere', async () => {
    const { id, admin } = await signupAndApprove();
    const user = client();
    await user.post('/api/auth/login', { identifier: VALID_SIGNUP.email, password: VALID_SIGNUP.password });
    assert.equal((await user.get('/api/auth/me')).status, 200);

    const noReason = await admin.patch(`/api/admin/users/${id}/status`, { status: 'suspended' });
    assert.equal(noReason.status, 400);
    assert.ok(fieldMessage(noReason.body, 'reason'));

    const suspend = await admin.patch(`/api/admin/users/${id}/status`, { status: 'suspended', reason: 'Spam reports' });
    assert.equal(suspend.status, 200);
    assert.equal((await user.get('/api/auth/me')).status, 401);

    const login = await client().post('/api/auth/login', { identifier: VALID_SIGNUP.email, password: VALID_SIGNUP.password });
    assert.equal(login.status, 403);
    assert.equal(login.body.code, 'ACCOUNT_SUSPENDED');
    assert.match(login.body.error, /Spam reports/);
  });

  test('a rejected user sees the reason when logging in', async () => {
    const signup = await client().post('/api/auth/signup', VALID_SIGNUP);
    const admin = client();
    await admin.post('/api/admin/auth/login', TEST_ADMIN);
    await admin.patch(`/api/admin/users/${signup.body.user.id}/status`, { status: 'rejected', reason: 'Duplicate account' });
    const login = await client().post('/api/auth/login', { identifier: VALID_SIGNUP.email, password: VALID_SIGNUP.password });
    assert.equal(login.body.code, 'ACCOUNT_REJECTED');
    assert.match(login.body.error, /Duplicate account/);
  });

  test('handles bad ids and unknown users', async () => {
    const admin = client();
    await admin.post('/api/admin/auth/login', TEST_ADMIN);
    assert.equal((await admin.patch('/api/admin/users/not-an-id/status', { status: 'approved' })).status, 400);
    assert.equal((await admin.patch('/api/admin/users/64b7f9f9f9f9f9f9f9f9f9f9/status', { status: 'approved' })).status, 404);
  });

  test('admin logout ends the admin session', async () => {
    const admin = client();
    await admin.post('/api/admin/auth/login', TEST_ADMIN);
    assert.equal((await admin.get('/api/admin/auth/me')).status, 200);
    await admin.post('/api/admin/auth/logout');
    assert.equal((await admin.get('/api/admin/auth/me')).status, 401);
  });
});

describe('request protection', () => {
  test('blocks state-changing requests from other websites (CSRF)', async () => {
    const res = await client().post('/api/auth/login', { identifier: 'a@b.com', password: 'x' }, { Origin: 'https://evil.example' });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'BAD_ORIGIN');
  });

  test('requires JSON bodies', async () => {
    const res = await client().post('/api/auth/login', 'identifier=a&password=b', { 'Content-Type': 'application/x-www-form-urlencoded' });
    assert.equal(res.status, 415);
  });

  test('answers broken JSON with a clean 400', async () => {
    const res = await client().post('/api/auth/login', '{bad json', { 'Content-Type': 'application/json' });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'INVALID_JSON');
  });

  test('volunteer registration requires login', async () => {
    const res = await client().post('/api/opportunities/64b7f9f9f9f9f9f9f9f9f9f9/registrations', { availability: 'Weekends' });
    assert.equal(res.status, 401);
  });

  test('failed logins are rate-limited', async () => {
    const limited = await startTestServer({ loginLimit: 3, signupLimit: 1000 });
    try {
      const c = new TestClient(limited.baseUrl);
      for (let i = 0; i < 3; i++) {
        assert.equal((await c.post('/api/auth/login', { identifier: 'x@example.com', password: 'Wrong12345' })).status, 401);
      }
      const blocked = await c.post('/api/auth/login', { identifier: 'x@example.com', password: 'Wrong12345' });
      assert.equal(blocked.status, 429);
      assert.equal(blocked.body.code, 'RATE_LIMITED');
    } finally {
      await limited.close();
    }
  });
});
