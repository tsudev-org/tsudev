// P4 OIDC - chạy bằng `node --test` trên dist/ THẬT, không qua Jest: `oidc-provider`
// là ESM thuần và môi trường VM của Jest không nạp được `import()` động. Đi trọn luồng
// giao thức qua HTTP với DB thật (cần DATABASE_URL, như mọi test service).
//
// Canh các bất biến ở đầu src/oidc.ts: chỉ code + PKCE S256, không đăng ký động,
// redirect URI khớp tuyệt đối, refresh token xoay vòng + dùng lại ⇒ thu hồi grant,
// đổi sessionVersion ⇒ token chết (trigger Postgres).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_IDENTITY_SECRET = 'khoa-test-du-dai-cho-hmac-256-bit!!';
delete process.env.INTERNAL_API_TOKEN;
delete process.env.OIDC_SIGNING_JWK;

const require = createRequire(import.meta.url);
const { prisma } = require('@tsudev/db');
const { signIdentity } = require('@tsudev/identity-token');

let base = '';
let server;
let app;
let userId = '';
const stamp = Date.now();
const USER = `test-oidc-${stamp}`;
const CLIENT = `site-thu-${stamp}`;
const REDIRECT = 'https://site-thu.tsudev.com/callback';

before(async () => {
  // Cổng ngẫu nhiên PHẢI biết trước khi dựng provider (issuer là URL tuyệt đối).
  const http = require('node:http');
  const probe = http.createServer();
  await new Promise((r) => probe.listen(0, '127.0.0.1', r));
  const port = probe.address().port;
  await new Promise((r) => probe.close(r));
  base = `http://127.0.0.1:${port}`;
  process.env.OIDC_ISSUER = `${base}/oidc`;

  ({ app } = require('../dist/index.js'));
  await require('../dist/oidc.js').initOidc();
  server = app.listen(port, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));

  userId = (
    await prisma.user.create({
      data: { username: USER, email: `${USER}@tsudev.local`, emailVerifiedAt: new Date() },
    })
  ).id;
  await prisma.oAuthClient.create({
    data: { id: CLIENT, name: 'Site thử', redirectUris: [REDIRECT] },
  });
});

after(async () => {
  await prisma.oidcPayload.deleteMany({
    where: { payload: { path: ['accountId'], equals: userId } },
  });
  await prisma.oAuthClient.deleteMany({ where: { id: CLIENT } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
  server?.close();
});

const b64url = (b) => Buffer.from(b).toString('base64url');
const pkce = () => {
  const verifier = b64url(randomBytes(32));
  return { verifier, challenge: b64url(createHash('sha256').update(verifier).digest()) };
};
const cookiesOf = (res) => res.headers.getSetCookie().map((c) => c.split(';')[0]);
const get = (url, cookies = []) =>
  fetch(url.startsWith('http') ? url : `${base}${url}`, {
    redirect: 'manual',
    headers: cookies.length ? { cookie: cookies.join('; ') } : {},
  });
const tokenReq = (params) =>
  fetch(`${base}/oidc/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT, ...params }),
  });

/** Chạy trọn luồng tới lúc có mã ủy quyền; trả { code, verifier }. */
async function authorize() {
  const { verifier, challenge } = pkce();
  const q = new URLSearchParams({
    client_id: CLIENT,
    response_type: 'code',
    redirect_uri: REDIRECT,
    scope: 'openid profile email offline_access',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state: 'st',
    prompt: 'consent',
  });
  const start = await get(`/oidc/auth?${q}`);
  assert.equal(start.status, 303);
  const interaction = start.headers.get('location');
  assert.match(interaction, /^\/oidc\/interaction\/[\w-]+$/);
  let jar = cookiesOf(start);

  const auth = `Bearer ${await signIdentity({ sub: USER }, process.env.INTERNAL_IDENTITY_SECRET)}`;
  const fin = await fetch(`${base}/api/identity/oidc/interaction/finish`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: auth,
      'x-oidc-cookie': jar.join('; '),
    },
    body: JSON.stringify({ allow: true }),
  });
  assert.equal(fin.status, 200, await fin.clone().text());
  const { redirectTo } = await fin.json();

  // Lần chuyển hướng tiếp theo có thể qua thêm một chặng resume - theo tới redirect_uri.
  let url = redirectTo;
  for (let i = 0; i < 4 && !url.startsWith(REDIRECT); i++) {
    const r = await get(url, jar);
    jar = [...jar, ...cookiesOf(r)];
    url = r.headers.get('location');
    assert.ok(url, `chặng ${i} không chuyển hướng (mã ${r.status})`);
  }
  const back = new URL(url);
  assert.equal(back.searchParams.get('state'), 'st');
  return { code: back.searchParams.get('code'), verifier };
}

test('discovery: chỉ code + PKCE S256, không implicit/password, không đăng ký động', async () => {
  const d = await (await get('/oidc/.well-known/openid-configuration')).json();
  assert.equal(d.issuer, `${base}/oidc`);
  assert.deepEqual(d.response_types_supported, ['code']);
  assert.deepEqual(d.code_challenge_methods_supported, ['S256']);
  assert.ok(!d.grant_types_supported.includes('implicit'));
  assert.ok(!d.grant_types_supported.includes('password'));
  assert.equal(d.registration_endpoint, undefined);
});

test('JWKS công khai: ES256, KHÔNG lộ phần riêng tư', async () => {
  const { keys } = await (await get('/oidc/jwks')).json();
  assert.equal(keys[0].alg, 'ES256');
  assert.equal(keys[0].d, undefined);
});

test('thiếu PKCE ⇒ từ chối (invalid_request), không phát mã', async () => {
  const q = new URLSearchParams({
    client_id: CLIENT,
    response_type: 'code',
    redirect_uri: REDIRECT,
    scope: 'openid',
  });
  const r = await get(`/oidc/auth?${q}`);
  const loc = r.headers.get('location') || '';
  assert.match(loc, /error=invalid_request/);
  assert.doesNotMatch(loc, /[?&]code=/);
});

test('redirect_uri lệch (dù cùng tiền tố) ⇒ 400 tại chỗ, KHÔNG chuyển hướng', async () => {
  const { challenge } = pkce();
  const q = new URLSearchParams({
    client_id: CLIENT,
    response_type: 'code',
    redirect_uri: `${REDIRECT}/../evil`,
    scope: 'openid',
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  const r = await get(`/oidc/auth?${q}`);
  assert.equal(r.status, 400);
  assert.equal(r.headers.get('location'), null);
});

test('trọn luồng: mã + PKCE ⇒ id_token đúng sub; sai verifier ⇒ invalid_grant', async () => {
  const { code, verifier } = await authorize();
  const bad = await tokenReq({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT,
    code_verifier: 'x'.repeat(43),
  });
  assert.equal(bad.status, 400);

  const again = await authorize();
  const ok = await tokenReq({
    grant_type: 'authorization_code',
    code: again.code,
    redirect_uri: REDIRECT,
    code_verifier: again.verifier,
  });
  assert.equal(ok.status, 200, await ok.clone().text());
  const t = await ok.json();
  const claims = JSON.parse(Buffer.from(t.id_token.split('.')[1], 'base64url').toString());
  assert.equal(claims.sub, userId);
  assert.ok(t.refresh_token);
  void verifier;
});

test('refresh token xoay vòng; dùng lại token cũ ⇒ thu hồi cả grant', async () => {
  const { code, verifier } = await authorize();
  const first = await (
    await tokenReq({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT,
      code_verifier: verifier,
    })
  ).json();
  const r1 = await tokenReq({ grant_type: 'refresh_token', refresh_token: first.refresh_token });
  assert.equal(r1.status, 200);
  const second = await r1.json();
  assert.notEqual(second.refresh_token, first.refresh_token);

  const reuse = await tokenReq({ grant_type: 'refresh_token', refresh_token: first.refresh_token });
  assert.equal(reuse.status, 400);
  const after = await tokenReq({
    grant_type: 'refresh_token',
    refresh_token: second.refresh_token,
  });
  assert.equal(after.status, 400, 'grant phải bị thu hồi sau khi phát hiện dùng lại');
});

test('đổi sessionVersion ⇒ refresh token chết (trigger Postgres)', async () => {
  const { code, verifier } = await authorize();
  const t = await (
    await tokenReq({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT,
      code_verifier: verifier,
    })
  ).json();
  await prisma.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
  const r = await tokenReq({ grant_type: 'refresh_token', refresh_token: t.refresh_token });
  assert.equal(r.status, 400);
});
