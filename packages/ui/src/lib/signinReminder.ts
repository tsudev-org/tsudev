/**
 * Chính sách nhắc đăng nhập khi có internet (LG3, tsudev-standards AUTH_AND_ACCOUNT 14.4).
 *
 * Thuần, không DOM, không mạng: đồng hồ và kho lưu được TIÊM vào để test nhịp 14.4.2 bằng
 * đồng hồ giả. `<tsu-signin-reminder>` (elements/signinReminder.ts) chỉ vẽ theo kết quả ở đây.
 *
 * Bất biến:
 *  - Trạng thái nhịp chỉ nằm ở kho CỤC BỘ (localStorage + sessionStorage); không gửi đi đâu.
 *  - Hằng số nhịp lấy từ chuẩn - không sản phẩm nào tự đặt khác (14.4.2).
 *  - Modal khoá cập nhật / "không chính thức" luôn ưu tiên (R6): không bao giờ chồng hai modal.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Hằng số 14.4.2 + R5. */
export const SIGNIN_REMINDER_CADENCE = {
  /** Sau lần "Để sau" thứ 1, 2, ≥3: chờ ít nhất 24 giờ, 3 ngày, 7 ngày. */
  afterDismissMs: [DAY, 3 * DAY, 7 * DAY] as const,
  snoozeMs: 30 * DAY,
  afterSignOutMs: DAY,
  /** R5: sớm nhất 30 giây sau khi app sẵn sàng (hoặc ngay sau tác vụ lõi đầu tiên). */
  readyDelayMs: 30 * 1000,
} as const;

export const SIGNIN_REMINDER_STORAGE_KEY = 'tsu.signinReminder';
export const SIGNIN_REMINDER_SESSION_KEY = 'tsu.signinReminder.shown';
export const WHY_SIGN_IN_URL = 'https://tsudev.com/privacy#dang-nhap';

export type ReminderState = {
  lastShownAt: number | null;
  dismissCount: number;
  snoozeUntil: number | null;
};

export const EMPTY_REMINDER_STATE: ReminderState = {
  lastShownAt: null,
  dismissCount: 0,
  snoozeUntil: null,
};

/** Bối cảnh lúc hỏi "có hiện không" - R1-R6 của 14.4.1. */
export type ReminderContext = {
  /** R1: đã đăng nhập (và phiên ngoại tuyến chưa quá 7 ngày) ⇒ không bao giờ hiện. */
  signedIn: boolean;
  /** R2: tín hiệu của nền tảng (web: `navigator.onLine`) - KHÔNG gửi gói thăm dò. */
  online: boolean;
  /** R3: Chế độ ngoại tuyến hoàn toàn. */
  offlineMode: boolean;
  /** R4: đang ở điểm dừng tự nhiên (không quét/ghi/nhập dở/ván chơi đang diễn ra). */
  idle: boolean;
  /** R5: app sẵn sàng ≥ 30 giây, hoặc tác vụ lõi đầu tiên vừa xong. */
  ready: boolean;
  /** R6: modal khác (nhất là modal khoá cập nhật) đang mở. */
  otherModalOpen: boolean;
  /** R6: đã hiện trong phiên chạy này (web: tab, theo sessionStorage). */
  shownThisSession: boolean;
  now: number;
};

export type ReminderVerdict =
  | { show: true }
  | {
      show: false;
      reason:
        | 'signed_in'
        | 'offline'
        | 'offline_mode'
        | 'busy'
        | 'not_ready'
        | 'other_modal'
        | 'session'
        | 'cadence';
    };

/** Mốc sớm nhất được nhắc lại theo nhịp 14.4.2 (`null` = chưa từng hiện ⇒ hiện được ngay). */
export function nextEligibleAt(s: ReminderState): number | null {
  const gaps = SIGNIN_REMINDER_CADENCE.afterDismissMs;
  let at: number | null = null;
  if (s.lastShownAt !== null && s.dismissCount > 0) {
    const gap: number = gaps[Math.min(s.dismissCount, gaps.length) - 1] ?? gaps[2];
    at = s.lastShownAt + gap;
  }
  if (s.snoozeUntil !== null) at = Math.max(at ?? 0, s.snoozeUntil);
  return at;
}

export function shouldShowReminder(s: ReminderState, c: ReminderContext): ReminderVerdict {
  if (c.signedIn) return { show: false, reason: 'signed_in' };
  if (c.offlineMode) return { show: false, reason: 'offline_mode' };
  if (!c.online) return { show: false, reason: 'offline' };
  if (c.otherModalOpen) return { show: false, reason: 'other_modal' };
  if (c.shownThisSession) return { show: false, reason: 'session' };
  if (!c.ready) return { show: false, reason: 'not_ready' };
  if (!c.idle) return { show: false, reason: 'busy' };
  const at = nextEligibleAt(s);
  if (at !== null && c.now < at) return { show: false, reason: 'cadence' };
  return { show: true };
}

/** Đã hiện modal. */
export const markShown = (s: ReminderState, now: number): ReminderState => ({
  ...s,
  lastShownAt: now,
});

/** "Để sau" - kể cả X, Esc, Back, chạm ra ngoài (14.4.3). */
export const markDismissed = (s: ReminderState, now: number): ReminderState => ({
  ...s,
  lastShownAt: s.lastShownAt ?? now,
  dismissCount: s.dismissCount + 1,
});

/**
 * "Không nhắc trong 30 ngày": hoãn 30 ngày rồi QUAY LẠI nhịp 7 ngày - nên `dismissCount` được
 * nâng tối thiểu lên 3 (bậc 7 ngày) chứ không đặt lại.
 */
export const markSnoozed = (s: ReminderState, now: number): ReminderState => ({
  lastShownAt: now,
  dismissCount: Math.max(s.dismissCount, SIGNIN_REMINDER_CADENCE.afterDismissMs.length),
  snoozeUntil: now + SIGNIN_REMINDER_CADENCE.snoozeMs,
});

/** Đăng xuất chủ động ⇒ không nhắc trong 24 giờ. */
export const markSignedOut = (s: ReminderState, now: number): ReminderState => ({
  ...s,
  snoozeUntil: Math.max(s.snoozeUntil ?? 0, now + SIGNIN_REMINDER_CADENCE.afterSignOutMs),
});

type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;

/** Đọc trạng thái; hỏng/thiếu/kho bị chặn (chế độ riêng tư) ⇒ trạng thái rỗng, không ném. */
export function loadReminderState(store: KV | null | undefined): ReminderState {
  try {
    const raw = store?.getItem(SIGNIN_REMINDER_STORAGE_KEY);
    if (!raw) return { ...EMPTY_REMINDER_STATE };
    const o = JSON.parse(raw) as Record<string, unknown>;
    return {
      lastShownAt: num(o.lastShownAt),
      dismissCount: Math.floor(num(o.dismissCount) ?? 0),
      snoozeUntil: num(o.snoozeUntil),
    };
  } catch {
    return { ...EMPTY_REMINDER_STATE };
  }
}

export function saveReminderState(store: KV | null | undefined, s: ReminderState): void {
  try {
    store?.setItem(SIGNIN_REMINDER_STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* kho đầy/bị chặn: nhịp chỉ còn theo phiên - chấp nhận được, không chặn app */
  }
}

/** "Đăng xuất và xóa dữ liệu cục bộ" gọi hàm này (14.4.2). */
export function clearReminderState(local: KV | null | undefined, session?: KV | null): void {
  try {
    local?.removeItem(SIGNIN_REMINDER_STORAGE_KEY);
    session?.removeItem(SIGNIN_REMINDER_SESSION_KEY);
  } catch {
    /* bỏ qua */
  }
}

// ---------------------------------------------------------------------------
// Nguyên văn 14.4.3 - đổi chuẩn thì đổi ở đây, test so từng chữ.
// ---------------------------------------------------------------------------

export type ReminderLang = 'vi' | 'en';
/** Lối vào mục 3 (+ 3.0 Quét mã QR). Danh sách thật lấy từ IdP - RP không gõ cứng. */
export type ReminderProvider = 'google' | 'github' | 'apple' | 'email' | 'qr';
/** Thứ tự bắt buộc của 14.4.3: Google, GitHub, Apple, Email TsuDEV, Quét mã QR. */
export const REMINDER_PROVIDER_ORDER: readonly ReminderProvider[] = [
  'google',
  'github',
  'apple',
  'email',
  'qr',
];

export const SIGNIN_REMINDER_TEXT = {
  vi: {
    title: 'Đăng nhập để được hỗ trợ tốt hơn',
    body: 'Đăng nhập tài khoản TsuDEV, hoặc bằng Google, GitHub, Apple, giúp bạn khôi phục tài khoản và quyền lợi khi đổi máy, gửi báo cáo sự cố kèm tài khoản để được hỗ trợ nhanh hơn. Dữ liệu của bạn vẫn chỉ nằm trên thiết bị này - đăng nhập không tải dữ liệu lên mạng.',
    notNow: 'Để sau',
    snooze: 'Không nhắc trong 30 ngày',
    why: 'Vì sao nên đăng nhập?',
    identityPrefix: 'Bạn sẽ đăng nhập tại ',
    close: 'Đóng',
    providers: {
      google: 'Tiếp tục với Google',
      github: 'Tiếp tục với GitHub',
      apple: 'Tiếp tục với Apple',
      email: 'Tài khoản TsuDEV',
      qr: 'Quét mã QR',
    },
  },
  en: {
    title: 'Sign in for better support',
    body: 'Sign in with your TsuDEV account, or with Google, GitHub or Apple, to restore your account and benefits on a new device and to send problem reports linked to your account for faster help. Your data stays on this device - signing in does not upload it.',
    notNow: 'Not now',
    snooze: "Don't remind me for 30 days",
    why: 'Why sign in?',
    identityPrefix: 'You will sign in at ',
    close: 'Close',
    providers: {
      google: 'Continue with Google',
      github: 'Continue with GitHub',
      apple: 'Continue with Apple',
      email: 'TsuDEV account',
      qr: 'Scan QR code',
    },
  },
} as const;

export const SIGNIN_REMINDER_IDENTITY_HOST = 'tsudev.com';

/** Chuẩn hoá danh sách lối vào: bỏ giá trị lạ/trùng, xếp đúng thứ tự 14.4.3. Rỗng ⇒ `email`. */
export function orderProviders(list: readonly string[]): ReminderProvider[] {
  const want = new Set(list.map((p) => p.trim().toLowerCase()));
  const out = REMINDER_PROVIDER_ORDER.filter((p) => want.has(p));
  return out.length ? out : ['email'];
}
