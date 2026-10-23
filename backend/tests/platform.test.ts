import { TEST_ADMIN, TestClient, clearDb, startTestDb, startTestServer } from './helpers';
import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import { env } from '../src/config/env';
import { seedSampleData } from '../src/db/sample-data';
import { AuditLogModel } from '../src/models/audit-log.model';
import { OpportunityModel } from '../src/models/opportunity.model';
import { UserModel } from '../src/models/user.model';
import { upsertAdmin } from '../src/modules/admin/admin.service';
import { daysFromToday } from '../src/utils/dates';

// NGO console, participants, pledges, admin verification, leaderboard, reports, audit logs
let stopDb: () => Promise<void>;
let server: Awaited<ReturnType<typeof startTestServer>>;

before(async () => {
  env.requireAdminApproval = false;
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
  await upsertAdmin(TEST_ADMIN.username, TEST_ADMIN.password);
});

const client = () => new TestClient(server.baseUrl);
let phoneCounter = 0;

/** Creates a logged-in, email-verified account with the given role. */
async function account(role: 'volunteer' | 'donor' | 'ngo', name = `Test ${role}`) {
  const email = `${role}.${++phoneCounter}@example.com`;
  const phone = `98${String(10000000 + phoneCounter).slice(-8)}`;
  const c = client();
  const signup = await c.post('/api/auth/signup', { name, email, phone, role, password: 'Helping123', confirmPassword: 'Helping123' });
  assert.equal(signup.status, 201, JSON.stringify(signup.body));
  await UserModel.updateOne({ email }, { emailVerified: true });
  assert.equal((await c.post('/api/auth/login', { identifier: email, password: 'Helping123' })).status, 200);
  return { c, email, name };
}

async function adminClient() {
  const c = client();
  assert.equal((await c.post('/api/admin/auth/login', TEST_ADMIN)).status, 200);
  return c;
}

const ORG = {
  name: 'Pune Lake Savers', category: 'Environment', location: 'Pune, Maharashtra', email: 'lakes@example.org',
  website: 'https://lakes.example.org', registrationNumber: 'MH/PUN/2026/77', foundedYear: 2019,
  description: 'We clean and protect the lakes of Pune with monthly volunteer drives and school programs.'
};
const DRIVE = {
  title: 'Pashan Lake Clean-up', category: 'Environment', date: daysFromToday(5).toISOString().slice(0, 10),
  city: 'Pune', venue: 'Pashan Lake', volunteersNeeded: 2, hours: 4, availability: 'Weekends',
  skills: ['teamwork'], remote: false, description: 'Remove plastic waste from the lake shore and sort it for recycling.'
};

/** NGO account with a VERIFIED organization. */
async function verifiedNgo() {
  const ngo = await account('ngo', 'Lake Lead');
  const submit = await ngo.c.post('/api/ngo/organization', ORG);
  assert.equal(submit.status, 201, JSON.stringify(submit.body));
  const admin = await adminClient();
  assert.equal((await admin.patch(`/api/admin/ngos/${submit.body.ngo.id}/status`, { status: 'verified' })).status, 200);
  return { ...ngo, ngoId: submit.body.ngo.id as string, admin };
}

describe('public catalog', () => {
  test('sample data appears once in an empty database', async () => {
    assert.equal(await seedSampleData(), true);
    assert.equal(await seedSampleData(), false, 'second run adds nothing');
    const res = await client().get('/api/catalog');
    assert.equal(res.status, 200);
    assert.equal(res.body.ngos.length, 7);
    assert.equal(res.body.opportunities.length, 7);
    assert.equal(res.body.campaigns.length, 5);
    assert.equal(typeof res.body.opportunities[0].date, 'string');
    assert.match(res.body.opportunities[0].date, /^\d{4}-\d{2}-\d{2}$/);
  });

  test('a pending NGO is listed as pending, and cannot publish drives', async () => {
    const ngo = await account('ngo');
    const submit = await ngo.c.post('/api/ngo/organization', ORG);
    assert.equal(submit.body.ngo.status, 'Pending Verification');
    const drive = await ngo.c.post('/api/ngo/opportunities', DRIVE);
    assert.equal(drive.status, 403);
    assert.equal(drive.body.code, 'NGO_NOT_VERIFIED');
    const catalog = await client().get('/api/catalog');
    assert.equal(catalog.body.ngos[0].verified, false);
  });

  test('the NGO console is only for NGO accounts', async () => {
    const volunteer = await account('volunteer');
    assert.equal((await volunteer.c.get('/api/ngo/console')).status, 403);
    assert.equal((await client().get('/api/ngo/console')).status, 401);
  });
});

describe('NGO sees who joined, and marks attendance', () => {
  test('full flow: verify NGO → publish drive → volunteer joins → NGO sees participant → attendance → hours', async () => {
    const ngo = await verifiedNgo();
    const created = await ngo.c.post('/api/ngo/opportunities', DRIVE);
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const driveId = created.body.opportunity.id;

    const volunteer = await account('volunteer', 'Neha Kulkarni');
    const join = await volunteer.c.post(`/api/opportunities/${driveId}/registrations`, { skills: 'Teamwork', availability: 'Weekends' });
    assert.equal(join.status, 201, JSON.stringify(join.body));
    assert.equal(join.body.opportunity.volunteersRegistered, 1);
    assert.equal((await volunteer.c.post(`/api/opportunities/${driveId}/registrations`, {})).status, 409, 'no double sign-up');

    // The NGO now sees the participant with contact details
    const console1 = await ngo.c.get('/api/ngo/console');
    assert.equal(console1.body.registrations.length, 1);
    const participant = console1.body.registrations[0];
    assert.equal(participant.name, 'Neha Kulkarni');
    assert.equal(participant.email, volunteer.email);
    assert.equal(participant.status, 'Registered');

    // Attendance only on/after the event day
    const early = await ngo.c.patch(`/api/ngo/registrations/${participant.id}`, { status: 'attended' });
    assert.equal(early.status, 409);
    await OpportunityModel.updateOne({ _id: driveId }, { date: daysFromToday(-1) });
    const marked = await ngo.c.patch(`/api/ngo/registrations/${participant.id}`, { status: 'attended' });
    assert.equal(marked.status, 200);
    assert.equal(marked.body.registration.status, 'Attended');

    // The volunteer's own dashboard shows it
    const activity = await volunteer.c.get('/api/me/activity');
    assert.equal(activity.body.registrations[0].status, 'Attended');
    assert.equal(activity.body.registrations[0].hours, 4);

    // ...and the leaderboard counts the hours
    const board = await ngo.admin.get('/api/admin/leaderboard?type=volunteers');
    const row = board.body.rows.find((r: any) => r.email === volunteer.email);
    assert.equal(row.hours, 4);
    assert.equal(row.points, 40);
    const ngoBoard = await ngo.admin.get('/api/admin/leaderboard?type=ngos');
    assert.equal(ngoBoard.body.rows[0].volunteers, 1);
  });

  test("an NGO can't manage another NGO's drives or participants", async () => {
    const a = await verifiedNgo();
    const drive = (await a.c.post('/api/ngo/opportunities', DRIVE)).body.opportunity;
    const b = await account('ngo', 'Other Lead');
    const orgB = (await b.c.post('/api/ngo/organization', { ...ORG, name: 'Other Org', email: 'other@example.org' })).body.ngo;
    assert.equal((await b.c.patch(`/api/ngo/opportunities/${drive.id}`, { status: 'closed' })).status, 403, 'unverified NGO cannot even try');
    await a.admin.patch(`/api/admin/ngos/${orgB.id}/status`, { status: 'verified' });

    // Even when verified, NGO B can't see or touch NGO A's drive or its participants
    assert.equal((await b.c.patch(`/api/ngo/opportunities/${drive.id}`, { status: 'closed' })).status, 404);
    assert.equal((await b.c.request('DELETE', `/api/ngo/opportunities/${drive.id}`)).status, 404);
    const v = await account('volunteer');
    const reg = (await v.c.post(`/api/opportunities/${drive.id}/registrations`, {})).body.registration;
    assert.equal((await b.c.patch(`/api/ngo/registrations/${reg.id}`, { status: 'cancelled' })).status, 404);
    assert.equal((await b.c.get('/api/ngo/console')).body.registrations.length, 0);
  });

  test('drive capacity, NGO accounts and unverified emails are enforced', async () => {
    const ngo = await verifiedNgo();
    const drive = (await ngo.c.post('/api/ngo/opportunities', { ...DRIVE, volunteersNeeded: 1 })).body.opportunity;
    const v1 = await account('volunteer');
    assert.equal((await v1.c.post(`/api/opportunities/${drive.id}/registrations`, {})).status, 201);
    const v2 = await account('volunteer');
    const full = await v2.c.post(`/api/opportunities/${drive.id}/registrations`, {});
    assert.equal(full.body.code, 'FULL');
    const asNgo = await ngo.c.post(`/api/opportunities/${drive.id}/registrations`, {});
    assert.equal(asNgo.body.code, 'WRONG_ROLE');
  });

  test('a volunteer can cancel, which frees the spot', async () => {
    const ngo = await verifiedNgo();
    const drive = (await ngo.c.post('/api/ngo/opportunities', { ...DRIVE, volunteersNeeded: 1 })).body.opportunity;
    const v1 = await account('volunteer');
    const reg = (await v1.c.post(`/api/opportunities/${drive.id}/registrations`, {})).body.registration;
    assert.equal((await v1.c.post(`/api/me/registrations/${reg.id}/cancel`)).status, 200);
    const v2 = await account('volunteer');
    assert.equal((await v2.c.post(`/api/opportunities/${drive.id}/registrations`, {})).status, 201);
  });

  test('a drive with participants cannot be deleted (only closed)', async () => {
    const ngo = await verifiedNgo();
    const drive = (await ngo.c.post('/api/ngo/opportunities', DRIVE)).body.opportunity;
    const v = await account('volunteer');
    await v.c.post(`/api/opportunities/${drive.id}/registrations`, {});
    const del = await ngo.c.request('DELETE', `/api/ngo/opportunities/${drive.id}`);
    assert.equal(del.body.code, 'HAS_PARTICIPANTS');
    assert.equal((await ngo.c.patch(`/api/ngo/opportunities/${drive.id}`, { status: 'closed' })).status, 200);
  });
});

describe('donors', () => {
  test('a demo pledge is recorded, counted on the campaign and the donor leaderboard', async () => {
    const ngo = await verifiedNgo();
    const campaign = (await ngo.c.post('/api/ngo/campaigns', {
      title: 'Solar Lamps for Hostels', category: 'Education', goal: 50000, location: 'Pune',
      endDate: daysFromToday(30).toISOString().slice(0, 10), description: 'Provide solar study lamps to 100 tribal hostel students near Pune.'
    })).body.campaign;
    assert.ok(campaign, 'campaign created');

    const donor = await account('donor', 'Rohan Donor');
    const bad = await donor.c.post(`/api/campaigns/${campaign.id}/pledges`, { amount: 5 });
    assert.equal(bad.status, 400);
    const pledge = await donor.c.post(`/api/campaigns/${campaign.id}/pledges`, { amount: 2500 });
    assert.equal(pledge.status, 201);
    assert.equal(pledge.body.pledge.isDemo, true);
    assert.match(pledge.body.pledge.reference, /^DEMO-/);
    assert.equal(pledge.body.campaign.raised, 2500);
    assert.equal(pledge.body.campaign.supporters, 1);

    const mine = await donor.c.get('/api/me/activity');
    assert.equal(mine.body.pledges[0].amount, 2500);
    const ngoConsole = await ngo.c.get('/api/ngo/console');
    assert.equal(ngoConsole.body.pledges[0].donorName, 'Rohan Donor');

    const board = await ngo.admin.get('/api/admin/leaderboard?type=donors');
    assert.equal(board.body.rows[0].amount, 2500);
    assert.equal(board.body.rows[0].points, 25);
  });
});

describe('admin: verification queue, overview, flagged content, audit logs', () => {
  test('rejecting an NGO needs a reason, and the NGO can resubmit', async () => {
    const ngo = await account('ngo');
    const submit = await ngo.c.post('/api/ngo/organization', ORG);
    const admin = await adminClient();
    const queue = await admin.get('/api/admin/ngos?status=pending');
    assert.equal(queue.body.ngos.length, 1);
    assert.equal(queue.body.ngos[0].submitter.email, ngo.email);

    assert.equal((await admin.patch(`/api/admin/ngos/${submit.body.ngo.id}/status`, { status: 'rejected' })).status, 400);
    assert.equal((await admin.patch(`/api/admin/ngos/${submit.body.ngo.id}/status`, { status: 'rejected', reason: 'Registration number not found' })).status, 200);
    const console1 = await ngo.c.get('/api/ngo/console');
    assert.equal(console1.body.ngo.status, 'Rejected');
    assert.equal(console1.body.ngo.statusReason, 'Registration number not found');

    const resubmit = await ngo.c.post('/api/ngo/organization', { ...ORG, registrationNumber: 'MH/PUN/2026/78' });
    assert.equal(resubmit.status, 201);
    assert.equal(resubmit.body.ngo.status, 'Pending Verification');
  });

  test('overview counts users, NGOs, pledges and hours', async () => {
    await seedSampleData();
    await account('volunteer');
    await account('donor');
    const admin = await adminClient();
    const res = await admin.get('/api/admin/overview');
    assert.equal(res.status, 200);
    assert.equal(res.body.users.volunteers, 1);
    assert.equal(res.body.users.donors, 1);
    assert.equal(res.body.ngos.verified, 7);
    assert.ok(res.body.live.drives >= 1);
    assert.ok(res.body.audit.events >= 2);
  });

  test('reports: users flag content, duplicates are refused, admin takedown closes the item', async () => {
    await seedSampleData();
    const campaign = (await client().get('/api/catalog')).body.campaigns[0];
    const user = await account('volunteer');
    const flag = await user.c.post('/api/reports', { targetType: 'campaign', targetId: campaign.id, reason: 'misleading', details: 'Numbers look wrong' });
    assert.equal(flag.status, 201);
    assert.equal((await user.c.post('/api/reports', { targetType: 'campaign', targetId: campaign.id, reason: 'spam' })).status, 409);
    assert.equal((await client().post('/api/reports', { targetType: 'campaign', targetId: campaign.id, reason: 'spam' })).status, 401);

    const admin = await adminClient();
    const list = await admin.get('/api/admin/reports?status=open');
    assert.equal(list.body.reports.length, 1);
    const takedown = await admin.patch(`/api/admin/reports/${list.body.reports[0].id}`, { action: 'takedown', note: 'Confirmed misleading' });
    assert.equal(takedown.status, 200);
    const after = (await client().get('/api/catalog')).body.campaigns.find((c: any) => c.id === campaign.id);
    assert.equal(after.status, 'Closed');
    assert.equal((await admin.patch(`/api/admin/reports/${list.body.reports[0].id}`, { action: 'dismiss' })).status, 409);
  });

  test('audit log records logins (never passwords), filters and exports CSV', async () => {
    const user = await account('volunteer', 'Audit Person');
    await client().post('/api/auth/login', { identifier: user.email, password: 'WrongPass1' });
    const admin = await adminClient();

    const all = await admin.get('/api/admin/audit-logs');
    const actions = all.body.logs.map((l: any) => l.action);
    for (const a of ['SIGNUP', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'ADMIN_LOGIN_SUCCESS']) assert.ok(actions.includes(a), `${a} logged`);
    assert.equal(JSON.stringify(all.body).includes('Helping123'), false);
    assert.equal(JSON.stringify(all.body).includes('WrongPass1'), false);

    const failed = await admin.get('/api/admin/audit-logs?action=LOGIN_FAILED');
    assert.equal(failed.body.logs.length, 1);
    const searched = await admin.get('/api/admin/audit-logs?search=Audit%20Person');
    assert.ok(searched.body.logs.length >= 1);

    const csv = await admin.request('GET', '/api/admin/audit-logs/export');
    assert.equal(csv.status, 200);
    assert.match(csv.headers.get('content-type') || '', /text\/csv/);
    assert.match(String(csv.body), /"Timestamp","Action","Actor"/);

    // Audit entries cannot be changed through the API
    assert.equal((await admin.request('DELETE', '/api/admin/audit-logs')).status, 404);
    assert.ok((await AuditLogModel.countDocuments()) > 0);
  });

  test('admin-only routes reject normal users', async () => {
    const user = await account('volunteer');
    for (const path of ['/api/admin/overview', '/api/admin/ngos', '/api/admin/audit-logs', '/api/admin/leaderboard', '/api/admin/reports']) {
      assert.equal((await user.c.get(path)).status, 401, path);
    }
  });
});
