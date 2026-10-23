// Must run before anything else: makes the mailer store emails in memory instead of sending them
process.env.NODE_ENV = 'test';

import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app';
import type { ApiOptions } from '../src/routes';

/** Starts an in-memory MongoDB once per test file. */
export async function startTestDb() {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri('hopeconnect-test'));
  await mongoose.connection.syncIndexes();
  return async () => {
    await mongoose.disconnect();
    await mongo.stop();
  };
}

export async function clearDb() {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map(c => c.deleteMany({})));
}

/** Starts the Express app on a random port and returns its base URL. */
export async function startTestServer(options: ApiOptions = { loginLimit: 1000, signupLimit: 1000, resendLimit: 1000 }) {
  const server: Server = createApp(options).listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  return { baseUrl: `http://127.0.0.1:${port}`, close: () => new Promise(resolve => server.close(resolve)) };
}

/**
 * A tiny HTTP client that remembers cookies like a browser does
 * (one client = one browser).
 */
export class TestClient {
  cookies = new Map<string, string>();
  lastSetCookies: string[] = [];

  constructor(private baseUrl: string) {}

  async request(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await fetch(this.baseUrl + path, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(this.cookies.size ? { Cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ') } : {}),
        ...headers
      },
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined
    });

    this.lastSetCookies = res.headers.getSetCookie();
    for (const raw of this.lastSetCookies) {
      const [pair] = raw.split(';');
      const [name, ...rest] = pair.split('=');
      const value = rest.join('=');
      // Expired / cleared cookie → forget it
      if (!value || /expires=Thu, 01 Jan 1970/i.test(raw) || /max-age=0/i.test(raw)) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }

    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = text; }
    return { status: res.status, body: json, headers: res.headers };
  }

  get(path: string) { return this.request('GET', path); }
  post(path: string, body?: unknown, headers?: Record<string, string>) { return this.request('POST', path, body, headers); }
  patch(path: string, body?: unknown) { return this.request('PATCH', path, body); }
}

export const VALID_SIGNUP = {
  name: 'Neha Kulkarni',
  email: 'neha@example.com',
  phone: '9876543210',
  role: 'volunteer',
  password: 'Volunteer123',
  confirmPassword: 'Volunteer123'
};

export const TEST_ADMIN = { username: 'testadmin', password: 'Test-Admin-Pass-123!' };
