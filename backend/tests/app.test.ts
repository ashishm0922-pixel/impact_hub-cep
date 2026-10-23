import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app';
import { registrationSchema } from '../src/modules/opportunities/opportunities.schemas';

// These tests run WITHOUT a database: only server.ts loads .env, so DATABASE_URL is unset here.
let baseUrl = '';
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

before(() => {
  server = createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});

after(() => server.close());

test('GET /api/health reports ok', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok', database: 'not configured' });
});

test('data routes answer 503 when no database is configured', async () => {
  const res = await fetch(`${baseUrl}/ngos`);
  assert.equal(res.status, 503);
});

test('donations are refused until a payment provider is connected', async () => {
  const res = await fetch(`${baseUrl}/campaigns/x/donations`, { method: 'POST' });
  assert.equal(res.status, 501);
});

test('unknown routes return 404 JSON', async () => {
  const res = await fetch(`${baseUrl}/nope`);
  assert.equal(res.status, 404);
});

test('registration validation rejects bad input', () => {
  const result = registrationSchema.safeParse({ name: 'A', email: 'bad', phone: '123' });
  assert.equal(result.success, false);
  assert.deepEqual(result.error?.issues.map(i => i.path[0]).sort(), ['email', 'name', 'phone']);
});

test('registration validation accepts good input and normalises email', () => {
  const result = registrationSchema.parse({
    name: 'Neha Kulkarni', email: ' Neha@Example.com ', phone: '+91 99887 76655'
  });
  assert.equal(result.email, 'neha@example.com');
  assert.equal(result.availability, 'FLEXIBLE');
});
