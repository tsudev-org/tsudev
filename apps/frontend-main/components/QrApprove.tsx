import React, { useEffect, useRef } from 'react';
import { Button } from '@tsudev/ui';

/**
 * Thiết bị XÁC NHẬN (CROSS_DEVICE_LOGIN mục 6.3): xem thiết bị mới ⇒ Từ chối (mặc định) / Cho phép ⇒ hiện mã khớp.
 * Câu cảnh báo là nguyên văn của chuẩn - chống QRLJacking (T1): kẻ lừa gửi QR qua tin nhắn thì người dùng thấy ngay.
 */
export type XdRequester = { label: string; country: string };

const countryName = (cc: string) => {
  if (!cc || cc === 'XX') return 'không rõ vị trí';
  try {
    return new Intl.DisplayNames(['vi'], { type: 'region' }).of(cc.toUpperCase()) || cc;
  } catch {
    return cc;
  }
};

export function QrApproveCard({
  requester,
  busy,
  onApprove,
  onDeny,
}: {
  requester: XdRequester;
  busy: boolean;
  onApprove: () => void;
  onDeny: () => void;
}) {
  // Từ chối là lựa chọn MẶC ĐỊNH (mục 6.3): nhận tiêu điểm một lần khi màn hiện ra - Enter vô tình không cho phép.
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current
      ?.querySelector<HTMLButtonElement>('[data-xd-deny] button, button[data-xd-deny]')
      ?.focus();
  }, []);
  return (
    <div ref={box} className="flex flex-col gap-4">
      <div className="rounded-lg bg-subtle p-4 text-sm">
        <p className="font-medium text-fg">Một thiết bị đang xin đăng nhập vào tài khoản của bạn</p>
        <p className="mt-1 text-fg-muted">
          {requester.label} · {countryName(requester.country)} ·{' '}
          {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <p className="text-sm text-fg">
        <strong>Chỉ cho phép nếu bạn đang cầm cả hai thiết bị.</strong> Nếu ai đó gửi mã QR này cho
        bạn qua tin nhắn, trang web hay điện thoại, hãy bấm Từ chối.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={onDeny} disabled={busy} data-xd-deny="">
          Từ chối
        </Button>
        <Button onClick={onApprove} disabled={busy}>
          Cho phép
        </Button>
      </div>
    </div>
  );
}

export function QrCodeShow({ code }: { code: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p className="text-sm text-fg-muted">Nhập mã này trên thiết bị mới (hết hạn sau 60 giây):</p>
      <p className="font-mono text-3xl font-semibold tracking-[0.2em] text-fg" aria-live="polite">
        {code}
      </p>
      <p className="text-xs text-fg-muted">
        Nhập mã này trên thiết bị mới. tsudev không bao giờ hỏi mã này qua điện thoại, tin nhắn hay
        trang web khác.
      </p>
    </div>
  );
}
