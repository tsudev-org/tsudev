// CP4 - cổng id.tsudev.com. Canh ba bất biến: rpID passkey KHÔNG đổi (passkey cũ dùng được ở id.), origin của
// cổng được nhận thêm, và link thư tài khoản trỏ về cổng; issuer OIDC vẫn ở tsudev.com.
import { readFileSync } from 'fs'
import { join } from 'path'

import { rp } from '../src/passkey'
import { idUrl, mainUrl } from '../src/siteUrls'

const saved = { ...process.env }
afterEach(() => {
  process.env = { ...saved }
})

test('idUrl suy id.<host> giữ giao thức + cổng; biến ID_URL thắng', () => {
  process.env.NEXT_PUBLIC_MAIN_URL = 'https://tsudev.com/'
  delete process.env.ID_URL
  delete process.env.NEXT_PUBLIC_ID_URL
  expect(mainUrl()).toBe('https://tsudev.com')
  expect(idUrl()).toBe('https://id.tsudev.com')
  process.env.NEXT_PUBLIC_MAIN_URL = 'http://tsudev.test:8443'
  expect(idUrl()).toBe('http://id.tsudev.test:8443')
  process.env.ID_URL = 'https://cong.example/'
  expect(idUrl()).toBe('https://cong.example')
})

test('passkey: rpID giữ tsudev.com, origin nhận cả tsudev.com và id.tsudev.com', () => {
  process.env.NEXT_PUBLIC_MAIN_URL = 'https://tsudev.com'
  delete process.env.ID_URL
  delete process.env.NEXT_PUBLIC_ID_URL
  const r = rp()
  expect(r.id).toBe('tsudev.com')
  expect(r.origins).toEqual(['https://tsudev.com', 'https://id.tsudev.com'])
})

test('nguồn: link thư tài khoản trỏ cổng, interactions.url trỏ cổng, issuer không dính idUrl', () => {
  const index = readFileSync(join(__dirname, '../src/index.ts'), 'utf8')
  for (const p of [
    'login',
    'verify-email',
    'reset-password',
    'confirm-email-change',
    'revoke-sessions',
  ]) {
    expect(index).not.toContain('${siteUrl()}/' + p)
  }
  const oidc = readFileSync(join(__dirname, '../src/oidc.ts'), 'utf8')
  expect(oidc).toMatch(/interactions: \{\s*url: .*\$\{idUrl\(\)\}\/oidc\/interaction\//)
  expect(oidc).not.toMatch(/issuer[^\n]*idUrl/i)
  const passkey = readFileSync(join(__dirname, '../src/passkey.ts'), 'utf8')
  expect(passkey).not.toMatch(/rpID:\s*[^,\n]*idUrl/)
})
