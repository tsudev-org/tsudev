import React, { useCallback, useEffect, useSyncExternalStore } from 'react';

/**
 * Bộ chọn giao diện - BA lựa chọn: Sáng · Tối · Hệ thống (giống supabase.com,
 * chủ dự án chốt 10/11/2026 cho TOÀN hệ sinh thái tsudev). Chế độ Ấm đã bỏ.
 *
 * Dạng: nhóm ba nút biểu tượng liền nhau (radiogroup) đặt ở CHÂN TRANG cạnh
 * "© tsudev" - cùng chỗ supabase.com đặt nó. Ba nút luôn hiện nên không cần
 * menu thả xuống, và một lần bấm là đổi xong.
 *
 * MẶC ĐỊNH là Tối cho khách vãng lai - "Hệ thống" là lựa chọn NGƯỜI DÙNG TỰ
 * BẬT, không phải mặc định: site đổi diện mạo theo cài đặt máy nghĩa là hai
 * người mở CÙNG một đường link thấy hai thứ khác nhau mà không ai chọn gì cả.
 *
 * Lựa chọn ghi vào localStorage và được áp lại TRƯỚC KHI VẼ bởi script nội tuyến
 * trong `apps/frontend-main/pages/_document.tsx`. Component này chỉ phụ trách
 * việc ĐỔI, không phụ trách việc khôi phục - hai phần đó dùng chung đúng một
 * khoá và đúng một bảng màu nền, và `apps/frontend-main/test/themeTokens.test.ts`
 * canh cho chúng không trôi lệch. Giá trị cũ 'warm' (trước 10/11/2026) được đọc
 * thành 'light' ở cả hai nơi - người từng chọn Ấm muốn nền sáng.
 *
 * Vì sao có `mounted`: máy chủ không đọc được localStorage, nên lượt đầu vẽ một
 * ô giữ chỗ ĐÚNG KÍCH THƯỚC - không thì nút "đang chọn" nhảy sau hydrat.
 */
const STORAGE_KEY = 'tsudev-theme';

/** Chế độ THẬT được ghi vào `data-theme`. */
export type ThemeMode = 'light' | 'dark';
/** Điều người dùng CHỌN - thêm 'system' là một lựa chọn, không phải một bảng màu. */
export type ThemeChoice = ThemeMode | 'system';

// Phải khớp `--bg-base` của hai chế độ trong tokens.css (sinh từ
// .standards/tokens/design-tokens.json); có test canh. Dùng cho <meta name="theme-color">,
// thứ chạy trước khi trình duyệt tính lại style nên không đọc được biến CSS.
const BASE: Record<ThemeMode, string> = {
  light: '#fafafa',
  dark: '#0a0a0a',
};

const CHOICES: Array<{ value: ThemeChoice; label: string }> = [
  { value: 'light', label: 'Sáng' },
  { value: 'dark', label: 'Tối' },
  { value: 'system', label: 'Hệ thống' },
];

const prefersDark = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

/** Lựa chọn của người dùng → bảng màu thật sự được vẽ. */
export const resolveTheme = (choice: ThemeChoice): ThemeMode =>
  choice === 'system' ? (prefersDark() ? 'dark' : 'light') : choice;

const applyTheme = (mode: ThemeMode) => {
  document.documentElement.setAttribute('data-theme', mode);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', BASE[mode]);
};

const readChoice = (): ThemeChoice => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
    if (v === 'warm') return 'light';
  } catch (e) {
    // localStorage ném lỗi khi cookie bên thứ ba bị chặn hoặc trang chạy trong
    // iframe sandbox. Hỏng ở đây phải là "về mặc định", không phải trang trắng.
  }
  return 'dark';
};

// Kho lựa chọn cho `useSyncExternalStore`: đọc localStorage làm ảnh chụp (máy
// chủ trả `null` - chưa biết), và nghe sự kiện `storage` nên đổi chế độ ở một
// tab thì nút ở tab kia theo luôn. `inSession` giữ lựa chọn khi localStorage
// ném lỗi (iframe sandbox, chặn cookie) - chế độ vẫn đổi cho phiên này.
const choiceListeners = new Set<() => void>();
let inSession: ThemeChoice | null = null;
const subscribeChoice = (cb: () => void) => {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    inSession = null;
    cb();
  };
  choiceListeners.add(cb);
  window.addEventListener('storage', onStorage);
  return () => {
    choiceListeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
};
const getChoice = (): ThemeChoice => inSession ?? readChoice();
const getServerChoice = (): ThemeChoice | null => null;
const setChoiceInSession = (next: ThemeChoice) => {
  inSession = next;
  choiceListeners.forEach((cb) => cb());
};

// Icon 16px nét mảnh stroke 1.5, đúng đặc tả item dropdown ở DESIGN_SYSTEM.md §5.
const ICONS: Record<ThemeChoice, React.ReactNode> = {
  light: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
    </>
  ),
  dark: <path d="M20.5 14.3A8.5 8.5 0 1 1 9.7 3.5a6.8 6.8 0 0 0 10.8 10.8Z" />,
  system: (
    <>
      <rect x="2.8" y="4.4" width="18.4" height="12.2" rx="1.6" />
      <path d="M8.6 20.2h6.8M12 16.6v3.6" />
    </>
  ),
};

const Glyph = ({ choice }: { choice: ThemeChoice }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {ICONS[choice]}
  </svg>
);

export const ThemeToggle = () => {
  // `null` = đang dựng ở máy chủ / lượt hydrat - xem ghi chú `mounted` ở đầu tệp.
  const stored = useSyncExternalStore(subscribeChoice, getChoice, getServerChoice);
  const mounted = stored !== null;
  const choice: ThemeChoice = stored ?? 'dark';

  // Chọn "Hệ thống" thì phải đổi NGAY khi máy đổi, không chờ tải lại trang.
  useEffect(() => {
    if (choice !== 'system' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme(resolveTheme('system'));
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [choice]);

  const pick = useCallback((next: ThemeChoice) => {
    setChoiceInSession(next);
    applyTheme(resolveTheme(next));
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (e) {
      // Chế độ vẫn đổi cho phiên này; chỉ là không nhớ được sang lần sau.
    }
  }, []);

  // Phím mũi tên chuyển lựa chọn trong nhóm - hành vi chuẩn của radiogroup.
  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = CHOICES.findIndex((c) => c.value === choice);
    const step = e.key === 'ArrowRight' ? 1 : CHOICES.length - 1;
    const next = CHOICES[(i + step) % CHOICES.length]!;
    pick(next.value);
    const btn = e.currentTarget.parentElement?.querySelector<HTMLButtonElement>(
      `[data-choice="${next.value}"]`
    );
    btn?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label="Giao diện"
      className="inline-flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5"
    >
      {CHOICES.map((c) => {
        const active = mounted && c.value === choice;
        return (
          <button
            key={c.value}
            type="button"
            role="radio"
            data-choice={c.value}
            aria-checked={active}
            aria-label={c.label}
            title={c.label}
            tabIndex={active || (!mounted && c.value === 'dark') ? 0 : -1}
            onClick={() => pick(c.value)}
            onKeyDown={onKeyDown}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-fast ease-standard focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus ${
              active ? 'bg-hovered text-fg' : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Glyph choice={c.value} />
          </button>
        );
      })}
    </div>
  );
};

export default ThemeToggle;
