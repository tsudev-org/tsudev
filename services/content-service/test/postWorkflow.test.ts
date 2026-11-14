// P2.2 máy trạng thái bài viết - module thuần, không DB. Nghiệm thu P2: MỌI cạnh
// cấm ⇒ 409, quyền sai ⇒ 403, trả về thiếu lý do ⇒ 400.
export {}

import type { PostStatus } from '@prisma/client'
import {
  ACTIONS,
  transition,
  statusFields,
  effectiveStatus,
  editedStatus,
  initialStatus,
} from '../src/postWorkflow'

const STATUSES: PostStatus[] = ['DRAFT', 'PENDING', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']
const NOW = new Date('2026-11-14T10:00:00Z')
const FUTURE = new Date('2026-12-01T00:00:00Z')

// Bảng cạnh HỢP LỆ (from → action → to). Mọi cặp khác phải 409.
const ALLOWED: Record<string, PostStatus> = {
  'DRAFT:submit': 'PENDING',
  'PENDING:withdraw': 'DRAFT',
  'PENDING:approve': 'PUBLISHED',
  'PENDING:reject': 'DRAFT',
  'DRAFT:publish': 'PUBLISHED',
  'PUBLISHED:archive': 'ARCHIVED',
  'SCHEDULED:archive': 'ARCHIVED',
  'ARCHIVED:restore': 'DRAFT',
}

describe('mọi cặp (trạng thái, hành động) với người kiểm duyệt', () => {
  const cases = STATUSES.flatMap((from) => ACTIONS.map((a) => [from, a] as const))
  test.each(cases)('%s + %s', (from, action) => {
    const r = transition({
      action,
      from,
      moderator: true,
      owner: true,
      publishedAt: null,
      note: 'x',
      now: NOW,
    })
    const want = ALLOWED[`${from}:${action}`]
    if (want) expect(r).toEqual({ ok: true, to: want, note: 'x' })
    else expect(r).toMatchObject({ ok: false, status: 409 })
  })
})

test('duyệt bài có giờ đăng tương lai ⇒ SCHEDULED', () => {
  const r = transition({
    action: 'approve',
    from: 'PENDING',
    moderator: true,
    owner: false,
    publishedAt: FUTURE,
    now: NOW,
  })
  expect(r).toMatchObject({ ok: true, to: 'SCHEDULED' })
})

test('AUTHOR (chủ bài) không duyệt/đăng thẳng/trả về được ⇒ 403', () => {
  for (const action of ['approve', 'publish', 'reject']) {
    const r = transition({
      action,
      from: 'PENDING',
      moderator: false,
      owner: true,
      publishedAt: null,
      note: 'x',
    })
    expect(r).toMatchObject({ ok: false, status: 403 })
  }
})

test('AUTHOR không phải chủ bài ⇒ 403 cả với hành động của tác giả', () => {
  const r = transition({
    action: 'submit',
    from: 'DRAFT',
    moderator: false,
    owner: false,
    publishedAt: null,
  })
  expect(r).toMatchObject({ ok: false, status: 403 })
})

test('trả về thiếu lý do ⇒ 400; action lạ ⇒ 400', () => {
  expect(
    transition({
      action: 'reject',
      from: 'PENDING',
      moderator: true,
      owner: false,
      publishedAt: null,
    })
  ).toMatchObject({
    ok: false,
    status: 400,
  })
  expect(
    transition({ action: 'xoa', from: 'DRAFT', moderator: true, owner: true, publishedAt: null })
  ).toMatchObject({
    ok: false,
    status: 400,
  })
})

test('statusFields: published suy ra đúng cho cả năm trạng thái', () => {
  expect(STATUSES.map((s) => statusFields(s).published)).toEqual([false, false, true, true, false])
})

test('effectiveStatus: SCHEDULED quá giờ ⇒ PUBLISHED', () => {
  expect(effectiveStatus({ status: 'SCHEDULED', publishedAt: new Date('2026-11-01') }, NOW)).toBe(
    'PUBLISHED'
  )
  expect(effectiveStatus({ status: 'SCHEDULED', publishedAt: FUTURE }, NOW)).toBe('SCHEDULED')
})

test('editedStatus: tác giả sửa bài đã đăng ⇒ PENDING; kiểm duyệt sửa ⇒ giữ', () => {
  expect(editedStatus('PUBLISHED', false)).toBe('PENDING')
  expect(editedStatus('SCHEDULED', false)).toBe('PENDING')
  expect(editedStatus('DRAFT', false)).toBe('DRAFT')
  expect(editedStatus('PUBLISHED', true)).toBe('PUBLISHED')
})

test('initialStatus: AUTHOR không đăng thẳng; MODERATOR thì được', () => {
  expect(initialStatus(undefined, false, null)).toEqual({ ok: true, status: 'DRAFT' })
  expect(initialStatus('PENDING', false, null)).toEqual({ ok: true, status: 'PENDING' })
  expect(initialStatus('PUBLISHED', false, null).ok).toBe(false)
  expect(initialStatus('PUBLISHED', true, FUTURE, NOW)).toEqual({ ok: true, status: 'SCHEDULED' })
  expect(initialStatus('ARCHIVED', true, null).ok).toBe(false)
})
