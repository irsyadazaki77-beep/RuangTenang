import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { guestAttachmentSession } from '../../middleware/guestAttachmentSession.js';

describe('guest attachment sessions', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  afterEach(() => { process.env.NODE_ENV = originalNodeEnv; });

  it('issues a random HttpOnly cookie and binds requests to its hashed owner ID', async () => {
    process.env.NODE_ENV = 'production';
    const app = express();
    app.use(cookieParser());
    app.get('/create', guestAttachmentSession({ issueIfMissing: true }), (req, res) => res.json({ owner: req.attachmentOwnerId }));
    app.get('/read', guestAttachmentSession(), (req, res) => res.json({ owner: req.attachmentOwnerId }));

    const first = await request(app).get('/create');
    expect(first.status).toBe(200);
    expect(first.body.owner).toMatch(/^guest:[a-f0-9]{64}$/);
    expect(first.body).not.toHaveProperty('token');
    const cookie = first.headers['set-cookie'][0] as string;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Max-Age=86400/i);

    const read = await request(app).get('/read').set('Cookie', cookie.split(';')[0]);
    expect(read.body.owner).toBe(first.body.owner);
    const withoutCookie = await request(app).get('/read');
    expect(withoutCookie.status).toBe(401);
  });
});
