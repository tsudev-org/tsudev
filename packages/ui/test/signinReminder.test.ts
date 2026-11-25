import { readFileSync } from 'fs';
import { join } from 'path';

import {
  EMPTY_REMINDER_STATE,
  SIGNIN_REMINDER_CADENCE,
  SIGNIN_REMINDER_TEXT,
  clearReminderState,
  loadReminderState,
  markDismissed,
  markShown,
  markSignedOut,
  markSnoozed,
  orderProviders,
  saveReminderState,
  shouldShowReminder,
} from '../src/lib/signinReminder';
import type { ReminderContext, ReminderState } from '../src/lib/signinReminder';
import { defineSignInReminder, reminderMarkup } from '../src/elements/signinReminder';

/**
 * LG3-a - `<tsu-signin-reminder>` (tsudev-standards AUTH_AND_ACCOUNT 14.4, ca kiểm thử 14.4.7).
 * Hỏng im lặng:
 *  - nhắc khi không mạng / Chế độ ngoại tuyến / đã đăng nhập, hoặc chồng lên modal khoá cập nhật;
 *  - nhịp sai (làm phiền, mẫu giao diện lừa dối) hoặc không bao giờ nhắc lại;
 *  - câu chữ lệch nguyên văn bộ quy ước;
 *  - thành phần tự gọi mạng trước khi người dùng bấm lối vào (vi phạm 14.1);
 *  - modal có ô nhập mật khẩu (trang giả mạo).
 */
const H = 60 * 60 * 1000;
const D = 24 * H;
const T0 = Date.parse('2026-11-26T00:00:00Z');

const ctx = (o: Partial<ReminderContext> = {}): ReminderContext => ({
  signedIn: false,
  online: true,
  offlineMode: false,
  idle: true,
  ready: true,
  otherModalOpen: false,
  shownThisSession: false,
  now: T0,
  ...o,
});

describe('R1-R6 (14.4.1)', () => {
  const s = EMPTY_REMINDER_STATE;
  it('đủ điều kiện ⇒ hiện', () => expect(shouldShowReminder(s, ctx())).toEqual({ show: true }));
  it.each([
    [{ signedIn: true }, 'signed_in'],
    [{ online: false }, 'offline'],
    [{ offlineMode: true }, 'offline_mode'],
    [{ idle: false }, 'busy'],
    [{ ready: false }, 'not_ready'],
    [{ otherModalOpen: true }, 'other_modal'],
    [{ shownThisSession: true }, 'session'],
  ] as const)('%p ⇒ không hiện (%s)', (o, reason) => {
    expect(shouldShowReminder(s, ctx(o))).toEqual({ show: false, reason });
  });
});

describe('nhịp 14.4.2 (đồng hồ giả)', () => {
  const at = (st: ReminderState, now: number) => shouldShowReminder(st, ctx({ now })).show;
  it('Để sau ⇒ 24 giờ → 3 ngày → 7 ngày → 7 ngày', () => {
    let st = markDismissed(markShown(EMPTY_REMINDER_STATE, T0), T0);
    expect(at(st, T0 + D - 1)).toBe(false);
    expect(at(st, T0 + D)).toBe(true);
    let t = T0 + D;
    for (const gap of [3 * D, 7 * D, 7 * D]) {
      st = markDismissed(markShown(st, t), t);
      expect(at(st, t + gap - 1)).toBe(false);
      expect(at(st, t + gap)).toBe(true);
      t += gap;
    }
  });
  it('Không nhắc trong 30 ngày ⇒ hoãn 30 ngày rồi về nhịp 7 ngày', () => {
    let st = markSnoozed(markShown(EMPTY_REMINDER_STATE, T0), T0);
    expect(at(st, T0 + 30 * D - 1)).toBe(false);
    expect(at(st, T0 + 30 * D)).toBe(true);
    const t = T0 + 30 * D;
    st = markDismissed(markShown(st, t), t);
    expect(at(st, t + 7 * D - 1)).toBe(false);
    expect(at(st, t + 7 * D)).toBe(true);
  });
  it('Đăng xuất chủ động ⇒ không nhắc 24 giờ', () => {
    const st = markSignedOut(EMPTY_REMINDER_STATE, T0);
    expect(at(st, T0 + D - 1)).toBe(false);
    expect(at(st, T0 + D)).toBe(true);
  });
  it('hằng số đúng chuẩn', () => {
    expect(SIGNIN_REMINDER_CADENCE.afterDismissMs).toEqual([D, 3 * D, 7 * D]);
    expect(SIGNIN_REMINDER_CADENCE.snoozeMs).toBe(30 * D);
    expect(SIGNIN_REMINDER_CADENCE.readyDelayMs).toBe(30_000);
  });
});

describe('kho cục bộ', () => {
  const mem = () => {
    const m = new Map<string, string>();
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
    };
  };
  it('lưu rồi đọc lại; xoá bằng Đăng xuất và xóa dữ liệu cục bộ', () => {
    const kv = mem();
    const st = markSnoozed(EMPTY_REMINDER_STATE, T0);
    saveReminderState(kv, st);
    expect(loadReminderState(kv)).toEqual(st);
    clearReminderState(kv);
    expect(loadReminderState(kv)).toEqual(EMPTY_REMINDER_STATE);
  });
  it('dữ liệu hỏng / kho ném lỗi ⇒ trạng thái rỗng, không ném', () => {
    const kv = mem();
    kv.setItem('tsu.signinReminder', '{hỏng');
    expect(loadReminderState(kv)).toEqual(EMPTY_REMINDER_STATE);
    const boom = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
      removeItem: () => undefined,
    };
    expect(loadReminderState(boom)).toEqual(EMPTY_REMINDER_STATE);
    expect(() => saveReminderState(boom, EMPTY_REMINDER_STATE)).not.toThrow();
  });
});

describe('nguyên văn 14.4.3', () => {
  const std = readFileSync(
    join(__dirname, '../../../.standards/docs/AUTH_AND_ACCOUNT.md'),
    'utf8'
  ).replace(/\s*\n\s*/g, ' ');
  it.each(
    (['vi', 'en'] as const).flatMap((l) =>
      (['title', 'body', 'notNow'] as const).map((f) => [`${l}.${f}`, SIGNIN_REMINDER_TEXT[l][f]])
    )
  )('%s có trong bộ quy ước', (_k, text) => {
    expect(std).toContain(`| ${text} |`);
  });
  it.each(['vi', 'en'] as const)('liên kết + dòng nhận diện (%s)', (l) => {
    const t = SIGNIN_REMINDER_TEXT[l];
    expect(std).toContain(t.snooze);
    expect(std).toContain(t.why);
    expect(std).toContain(`${t.identityPrefix}**tsudev.com**`);
  });
});

describe('modal (markup)', () => {
  const html = reminderMarkup('vi', orderProviders(['qr', 'email', 'github', 'google', 'lạ']));
  it('trợ năng: dialog + aria-modal + aria-labelledby', () => {
    expect(html).toMatch(/role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="tsr-title"/);
    expect(html).toContain('id="tsr-title"');
  });
  it('lối vào đúng thứ tự 14.4.3, bỏ giá trị lạ; nút đầu là nút chính', () => {
    expect(orderProviders(['qr', 'apple', 'email', 'github', 'google', 'x'])).toEqual([
      'google',
      'github',
      'apple',
      'email',
      'qr',
    ]);
    expect(orderProviders([])).toEqual(['email']);
    expect(html.indexOf('data-provider="google"')).toBeLessThan(html.indexOf('data-provider="qr"'));
    expect(html).toMatch(/class="entry primary" data-provider="google"/);
  });
  it('KHÔNG ô nhập nào (14.4.4); đủ X + Để sau + hoãn 30 ngày + Vì sao', () => {
    expect(html).not.toMatch(/<input|<textarea|<select|<form/i);
    expect(html).toContain('class="close" data-action="later"');
    expect(html).toContain('class="later" data-action="later">Để sau<');
    expect(html).toContain('data-action="snooze"');
    expect(html).toContain('href="https://tsudev.com/privacy#dang-nhap"');
    expect(html).toContain('class="backdrop" part="backdrop" data-action="later"');
  });
});

describe('0 gói mạng trước khi bấm lối vào (14.1, quét nguồn)', () => {
  const src = ['../src/elements/signinReminder.ts', '../src/lib/signinReminder.ts']
    .map((p) => readFileSync(join(__dirname, p), 'utf8'))
    .join('\n')
    // Bỏ chú thích: tài liệu được phép NHẮC tên API bị cấm.
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  it.each([
    'fetch(',
    'XMLHttpRequest',
    'sendBeacon',
    'WebSocket',
    'EventSource',
    'new Image',
    '<img',
    'import(',
  ])('không dùng %s', (needle) => expect(src).not.toContain(needle));
});

it('SSR/Workers: defineSignInReminder không ném khi thiếu window', () => {
  expect(() => defineSignInReminder()).not.toThrow();
});
