import React, { useEffect, useRef } from 'react';
import { gateCopy } from '../lib/appGate';
import type { GateKind, GateLang } from '../lib/appGate';

export type AppGateModalProps = {
  kind: GateKind;
  lang?: GateLang;
  /** Phiên bản mới nhất của kênh và phiên bản đang chạy (chỉ modal cập nhật). */
  latest?: string;
  current?: string;
  /** "Cập nhật ngay" (web/PWA: tải lại sau khi service worker nhận bản mới) / "Tải bản chính thức". */
  onPrimary: () => void;
  /** "Xuất dữ liệu" ra tệp (LOCAL_SYNC 9) - LUÔN có, không giam dữ liệu để ép cập nhật (APP_INTEGRITY I6). */
  onExport: () => void;
};

/**
 * Modal khoá phiên bản / "Phiên bản không chính thức" (APP_INTEGRITY 2.2-2.3). KHÁC `Modal` thường có
 * chủ đích: toàn màn, KHÔNG đóng được (không Escape, không bấm nền, không nút Đóng), đúng HAI nút, bẫy
 * focus giữa hai nút. `role="alertdialog"` để trình đọc màn hình đọc ngay tiêu đề + thân.
 */
export const AppGateModal = ({
  kind,
  lang = 'vi',
  latest,
  current,
  onPrimary,
  onExport,
}: AppGateModalProps) => {
  const primaryRef = useRef<HTMLButtonElement | null>(null);
  const secondaryRef = useRef<HTMLButtonElement | null>(null);
  const copy = gateCopy(kind, lang, { latest, current });

  useEffect(() => {
    primaryRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key !== 'Tab') return;
      // Chỉ có hai điểm dừng: Tab/Shift+Tab luôn chuyển qua lại giữa chúng, không bao giờ ra ngoài.
      e.preventDefault();
      const next =
        document.activeElement === primaryRef.current ? secondaryRef.current : primaryRef.current;
      next?.focus();
    };
    document.addEventListener('keydown', onKeyDown, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const btn =
    'inline-flex h-control items-center justify-center rounded-md px-sp4 text-sm font-semibold transition-colors duration-fast ease-standard focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-base p-4"
      data-app-gate={kind}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="tsu-app-gate-title"
        aria-describedby="tsu-app-gate-body"
        lang={lang}
        className="w-full max-w-lg rounded-lg border border-line bg-surface p-sp6 shadow-lg"
      >
        <h2 id="tsu-app-gate-title" className="text-h3 font-semibold text-fg">
          {copy.title}
        </h2>
        <p id="tsu-app-gate-body" className="mt-sp3 text-sm text-fg-secondary">
          {copy.body}
        </p>
        <div className="mt-sp6 flex flex-col-reverse gap-sp2 sm:flex-row sm:justify-end">
          <button
            ref={secondaryRef}
            type="button"
            className={`${btn} border border-line text-fg hover:bg-hovered`}
            onClick={onExport}
          >
            {copy.secondary}
          </button>
          <button
            ref={primaryRef}
            type="button"
            className={`${btn} bg-primary text-on-primary hover:bg-primary-hover`}
            onClick={onPrimary}
          >
            {copy.primary}
          </button>
        </div>
      </div>
    </div>
  );
};
