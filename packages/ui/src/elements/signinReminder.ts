/**
 * `<tsu-signin-reminder>` - modal nổi nhắc đăng nhập (LG3, tsudev-standards AUTH_AND_ACCOUNT 14.4).
 *
 * Custom Element thuần (Shadow DOM, không React) để mọi website/PWA/trò chơi web của TsuDEV gắn
 * được như nhau. Chính sách R1-R6 + nhịp 14.4.2 ở `lib/signinReminder.ts`; tệp này chỉ vẽ và nối sự
 * kiện.
 *
 * Bất biến (test quét nguồn canh):
 *  - 0 gói mạng trước khi người dùng bấm lối vào: KHÔNG fetch/XHR/beacon/WebSocket/ảnh ngoài.
 *    "Có internet" chỉ đọc `navigator.onLine` + sự kiện `online` (R2).
 *  - KHÔNG ô nhập nào (14.4.4): bấm lối vào chỉ phát sự kiện `tsu-signin`; trang chủ chuyển sang
 *    luồng Authorization Code + PKCE của IdP - mật khẩu chỉ gõ trên trang IdP.
 *  - Luôn đóng được: X, Esc, chạm nền đều là "Để sau".
 *
 * Dùng:
 *   import { defineSignInReminder } from '@tsudev/ui';
 *   defineSignInReminder();
 *   <tsu-signin-reminder lang="vi" providers="google,github,email,qr" auto></tsu-signin-reminder>
 *   el.addEventListener('tsu-signin', (e) => signIn(e.detail.provider));
 *
 * Thuộc tính: `lang` (vi|en) · `providers` (danh sách từ IdP, phẩy) · `signed-in` · `offline-mode`
 * (Chế độ ngoại tuyến hoàn toàn) · `busy` (đang tác vụ - R4) · `auto` (tự hẹn giờ R5 và tự hỏi lại
 * khi có mạng / khi hết `busy`).
 * Phương thức: `maybeShow()` · `coreTaskDone()` (R5 sớm) · `signedOut()` · `close()`.
 * Sự kiện (bubbles + composed): `tsu-signin` {provider} · `tsu-signin-reminder-dismiss` {action:
 * 'later' | 'snooze'}.
 */
import { ICONS } from '../components/icons';
import {
  SIGNIN_REMINDER_CADENCE,
  SIGNIN_REMINDER_IDENTITY_HOST,
  SIGNIN_REMINDER_SESSION_KEY,
  SIGNIN_REMINDER_TEXT,
  WHY_SIGN_IN_URL,
  loadReminderState,
  markDismissed,
  markShown,
  markSignedOut,
  markSnoozed,
  orderProviders,
  saveReminderState,
  shouldShowReminder,
} from '../lib/signinReminder';
import type { ReminderLang, ReminderProvider } from '../lib/signinReminder';

export const SIGNIN_REMINDER_TAG = 'tsu-signin-reminder';

const esc = (s: string): string =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  );

// Logo hãng giữ màu chính chủ ở mọi chế độ (như trang /login) - đừng thay bằng token.
const GOOGLE_SVG =
  '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.89-1.74 2.98-4.3 2.98-7.35Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.24-2.5c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.06a10 10 0 0 0 0 9.02l3.35-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.83 1.5l2.87-2.87A10 10 0 0 0 3.06 7.49l3.35 2.59C7.2 7.72 9.4 5.96 12 5.96Z"/></svg>';
const fillSvg = (d: string) =>
  `<svg width="18" height="18" viewBox="-2 -2 28 28" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;
const strokeSvg = (d: string) =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

const PROVIDER_ICON: Record<ReminderProvider, string> = {
  google: GOOGLE_SVG,
  github: fillSvg(ICONS.github.d),
  apple: fillSvg(ICONS.apple.d),
  email: strokeSvg('M3.5 6.5h17v11h-17zM3.5 7l8.5 6 8.5-6'),
  qr: strokeSvg('M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2'),
};

/** Đánh dấu HTML của modal - thuần, để test đọc được mà không cần DOM. */
export function reminderMarkup(lang: ReminderLang, providers: readonly ReminderProvider[]): string {
  const t = SIGNIN_REMINDER_TEXT[lang];
  const buttons = providers
    .map(
      (p, i) =>
        `<button type="button" class="entry${i === 0 ? ' primary' : ''}" data-provider="${p}">${PROVIDER_ICON[p]}<span>${esc(t.providers[p])}</span></button>`
    )
    .join('');
  return (
    `<div class="backdrop" part="backdrop" data-action="later"></div>` +
    `<div class="panel" part="panel" role="dialog" aria-modal="true" aria-labelledby="tsr-title" aria-describedby="tsr-body">` +
    `<button type="button" class="close" data-action="later" aria-label="${esc(t.close)}">${strokeSvg('M6 6l12 12M18 6 6 18')}</button>` +
    `<h2 id="tsr-title">${esc(t.title)}</h2>` +
    `<p id="tsr-body">${esc(t.body)}</p>` +
    `<div class="entries">${buttons}</div>` +
    `<p class="identity">${esc(t.identityPrefix)}<strong>${SIGNIN_REMINDER_IDENTITY_HOST}</strong></p>` +
    `<button type="button" class="later" data-action="later">${esc(t.notNow)}</button>` +
    `<p class="links"><button type="button" class="link" data-action="snooze">${esc(t.snooze)}</button>` +
    ` · <a class="link" href="${WHY_SIGN_IN_URL}" target="_blank" rel="noopener noreferrer">${esc(t.why)}</a></p>` +
    `</div>`
  );
}

// Token qua biến CSS: biến tuỳ biến đi xuyên Shadow DOM, nên modal ăn đúng chế độ Sáng/Tối của
// trang chủ. Giá trị dự phòng là chế độ Tối mặc định của hệ sinh thái.
const STYLE = `
:host{position:fixed;inset:0;z-index:var(--z-modal,1000);display:none;font-family:var(--font-family,system-ui,sans-serif)}
:host([open]){display:grid;place-items:center}
.backdrop{position:absolute;inset:0;background:var(--overlay,rgba(0,0,0,.6))}
.panel{position:relative;box-sizing:border-box;width:min(28rem,calc(100vw - 2rem));max-height:calc(100vh - 2rem);overflow:auto;
 padding:var(--sp-6,1.5rem);border-radius:var(--radius-lg,12px);border:1px solid var(--border,#262626);
 background:var(--bg-surface,#141414);color:var(--text-primary,#ededed);box-shadow:var(--shadow-lg,0 10px 30px rgba(0,0,0,.5))}
h2{margin:0 2rem var(--sp-3,.75rem) 0;font-size:var(--fs-h3,1.25rem);font-weight:var(--fw-semibold,600);line-height:var(--lh-heading,1.3)}
p{margin:0 0 var(--sp-4,1rem);font-size:var(--fs-sm,.875rem);line-height:var(--lh-body,1.6);color:var(--text-secondary,#a3a3a3)}
.entries{display:grid;gap:var(--sp-2,.5rem);margin-bottom:var(--sp-3,.75rem)}
button{font:inherit;cursor:pointer}
.entry,.later{display:flex;align-items:center;justify-content:center;gap:var(--sp-2,.5rem);min-height:var(--control-h,2.5rem);
 padding:0 var(--sp-4,1rem);border-radius:var(--radius-control,8px);border:1px solid var(--border-strong,#404040);
 background:var(--bg-base,#0a0a0a);color:var(--text-primary,#ededed);font-size:var(--fs-sm,.875rem);font-weight:var(--fw-semibold,600)}
.entry:hover,.later:hover{background:var(--bg-hover,#1f1f1f)}
.entry.primary{background:var(--primary,#3ec6e0);border-color:var(--primary,#3ec6e0);color:var(--on-primary,#0a0a0a)}
.entry.primary:hover{background:var(--primary-hover,var(--primary,#3ec6e0))}
.later{width:100%;margin-bottom:var(--sp-3,.75rem)}
.identity{margin-bottom:var(--sp-3,.75rem);text-align:center}
.identity strong{color:var(--text-primary,#ededed)}
.links{margin:0;text-align:center}
.link{background:none;border:0;padding:0;color:var(--text-link,#3ec6e0);text-decoration:underline;font-size:var(--fs-sm,.875rem)}
.close{position:absolute;top:var(--sp-3,.75rem);right:var(--sp-3,.75rem);display:grid;place-items:center;width:2.25rem;height:2.25rem;
 border:0;border-radius:var(--radius-control,8px);background:transparent;color:var(--text-secondary,#a3a3a3)}
.close:hover{background:var(--bg-hover,#1f1f1f)}
:is(button,a):focus-visible{outline:2px solid var(--focus-ring,#3ec6e0);outline-offset:2px}
@media (prefers-reduced-motion:no-preference){.panel{animation:tsr-in var(--motion-base,200ms) var(--motion-easing-enter,ease-out)}}
@keyframes tsr-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
`;

/** Bộ chọn modal khác đang mở (R6) - modal khoá cập nhật dùng `role="alertdialog"`. */
const OTHER_MODAL_SELECTOR =
  '[role="alertdialog"][aria-modal="true"], [role="dialog"][aria-modal="true"], dialog[open]';

/**
 * Đăng ký `<tsu-signin-reminder>`. Gọi được nhiều lần; không làm gì khi không có
 * `customElements` (SSR, Workers) - nên import `@tsudev/ui` ở máy chủ vẫn an toàn.
 */
export function defineSignInReminder(): void {
  if (typeof window === 'undefined' || typeof customElements === 'undefined') return;
  if (customElements.get(SIGNIN_REMINDER_TAG)) return;

  class TsuSignInReminder extends HTMLElement {
    static get observedAttributes() {
      return ['lang', 'providers', 'busy', 'signed-in', 'offline-mode'];
    }

    private root: ShadowRoot;
    private readyAt = 0;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private returnFocus: HTMLElement | null = null;
    private onOnline = () => this.autoCheck();
    private onKey = (e: KeyboardEvent) => this.handleKey(e);

    constructor() {
      super();
      this.root = this.attachShadow({ mode: 'open' });
      this.root.addEventListener('click', (e) => this.handleClick(e));
    }

    connectedCallback() {
      this.readyAt = Date.now() + SIGNIN_REMINDER_CADENCE.readyDelayMs;
      this.render();
      window.addEventListener('online', this.onOnline);
      if (this.hasAttribute('auto')) {
        this.timer = setTimeout(() => this.autoCheck(), SIGNIN_REMINDER_CADENCE.readyDelayMs + 50);
      }
    }

    disconnectedCallback() {
      window.removeEventListener('online', this.onOnline);
      document.removeEventListener('keydown', this.onKey, true);
      if (this.timer) clearTimeout(this.timer);
    }

    attributeChangedCallback(name: string, oldV: string | null, newV: string | null) {
      if (oldV === newV) return;
      if (name === 'lang' || name === 'providers') this.render();
      // Đăng nhập xong trong lúc modal mở ⇒ đóng (không tính là "Để sau").
      if (name === 'signed-in' && newV !== null && this.isOpen) this.hide();
      // Hết tác vụ ⇒ tới điểm dừng tự nhiên (R4).
      if (name === 'busy' && newV === null) this.autoCheck();
    }

    get isOpen(): boolean {
      return this.hasAttribute('open');
    }

    private get uiLang(): ReminderLang {
      return this.getAttribute('lang') === 'en' ? 'en' : 'vi';
    }

    private render() {
      const providers = orderProviders((this.getAttribute('providers') || '').split(','));
      this.root.innerHTML = `<style>${STYLE}</style>${reminderMarkup(this.uiLang, providers)}`;
    }

    private session(): Storage | null {
      try {
        return window.sessionStorage;
      } catch {
        return null;
      }
    }

    private local(): Storage | null {
      try {
        return window.localStorage;
      } catch {
        return null;
      }
    }

    private otherModalOpen(): boolean {
      return Array.from(document.querySelectorAll(OTHER_MODAL_SELECTOR)).some(
        (el) => !this.contains(el)
      );
    }

    private autoCheck() {
      if (this.hasAttribute('auto')) this.maybeShow();
    }

    /** R5 sớm: tác vụ lõi đầu tiên vừa xong. */
    coreTaskDone() {
      this.readyAt = Math.min(this.readyAt, Date.now());
      this.maybeShow();
    }

    /** Đăng xuất chủ động ⇒ không nhắc 24 giờ (14.4.2). */
    signedOut() {
      saveReminderState(this.local(), markSignedOut(loadReminderState(this.local()), Date.now()));
    }

    /** Hỏi chính sách R1-R6; đủ thì mở. Trả `true` khi đã mở. */
    maybeShow(): boolean {
      if (this.isOpen) return true;
      const now = Date.now();
      let shownThisSession = false;
      try {
        shownThisSession = this.session()?.getItem(SIGNIN_REMINDER_SESSION_KEY) === '1';
      } catch {
        /* bỏ qua */
      }
      const verdict = shouldShowReminder(loadReminderState(this.local()), {
        signedIn: this.hasAttribute('signed-in'),
        online: typeof navigator === 'undefined' ? false : navigator.onLine,
        offlineMode: this.hasAttribute('offline-mode'),
        idle: !this.hasAttribute('busy'),
        ready: now >= this.readyAt,
        otherModalOpen: this.otherModalOpen(),
        shownThisSession,
        now,
      });
      if (!verdict.show) return false;
      this.open(now);
      return true;
    }

    private open(now: number) {
      try {
        this.session()?.setItem(SIGNIN_REMINDER_SESSION_KEY, '1');
      } catch {
        /* bỏ qua */
      }
      saveReminderState(this.local(), markShown(loadReminderState(this.local()), now));
      const active = document.activeElement;
      this.returnFocus = active instanceof HTMLElement ? active : null;
      this.setAttribute('open', '');
      document.addEventListener('keydown', this.onKey, true);
      this.root.querySelector<HTMLButtonElement>('.entry')?.focus();
    }

    private hide() {
      this.removeAttribute('open');
      document.removeEventListener('keydown', this.onKey, true);
      this.returnFocus?.focus?.();
      this.returnFocus = null;
    }

    /** Đóng = "Để sau". */
    close() {
      this.dismiss('later');
    }

    private dismiss(action: 'later' | 'snooze') {
      if (!this.isOpen) return;
      const now = Date.now();
      const s = loadReminderState(this.local());
      saveReminderState(
        this.local(),
        action === 'snooze' ? markSnoozed(s, now) : markDismissed(s, now)
      );
      this.hide();
      this.dispatchEvent(
        new CustomEvent('tsu-signin-reminder-dismiss', {
          detail: { action },
          bubbles: true,
          composed: true,
        })
      );
    }

    private handleClick(e: Event) {
      const target = e.target instanceof Element ? e.target : null;
      const entry = target?.closest<HTMLElement>('[data-provider]');
      if (entry) {
        const provider = entry.dataset.provider as ReminderProvider;
        this.hide();
        this.dispatchEvent(
          new CustomEvent('tsu-signin', { detail: { provider }, bubbles: true, composed: true })
        );
        return;
      }
      const action = target?.closest<HTMLElement>('[data-action]')?.dataset.action;
      if (action === 'later' || action === 'snooze') this.dismiss(action);
    }

    private handleKey(e: KeyboardEvent) {
      if (!this.isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.dismiss('later');
        return;
      }
      if (e.key !== 'Tab') return;
      // Bẫy tiêu điểm trong modal (ACCESSIBILITY): Tab/Shift+Tab vòng quanh các điểm dừng.
      const stops = Array.from(
        this.root.querySelectorAll<HTMLElement>('.panel button, .panel a[href]')
      );
      if (!stops.length) return;
      const i = stops.indexOf(this.root.activeElement as HTMLElement);
      e.preventDefault();
      const next = e.shiftKey
        ? stops[i <= 0 ? stops.length - 1 : i - 1]
        : stops[i < 0 || i >= stops.length - 1 ? 0 : i + 1];
      next?.focus();
    }
  }

  customElements.define(SIGNIN_REMINDER_TAG, TsuSignInReminder);
}
