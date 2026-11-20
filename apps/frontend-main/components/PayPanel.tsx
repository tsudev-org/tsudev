import React, { useMemo, useState } from 'react';
import { Icon } from '@tsudev/ui';
import { QrSvg } from './QrSvg';
import { KENH_THANH_TOAN, noiDungTsu, vietQrDong } from '../lib/ungHo';
import { formatDateTimeVN } from '../lib/format';
import { PLAN_LABEL, payCall, payErr, vnd } from '../lib/pay';
import type { Intent, PlanKind } from '../lib/pay';

/**
 * Luồng mua dùng chung của /pro và /ung-ho (PRO-B bước B3): tạo `PaymentIntent` ở auth-service
 * ⇒ vẽ VietQR ĐỘNG (số tiền + nội dung `TSU <mã>`) ngay trên trang ⇒ OWNER đối soát sao kê ở
 * /admin/thanh-toan. Bấm lại cùng gói trả lại đúng mã đang chờ (máy chủ dùng lại), nên người
 * đã chuyển khoản không bị cấp mã mới lệch với nội dung đã gửi.
 */
export function usePurchase(app: string | null) {
  const [intent, setIntent] = useState<Intent | null>(null);
  const [busy, setBusy] = useState<PlanKind | null>(null);
  const [error, setError] = useState('');

  const buy = async (kind: PlanKind) => {
    setBusy(kind);
    setError('');
    const r = await payCall<Intent>('pay/create', { kind, ...(app ? { app } : {}) });
    setBusy(null);
    if (!r.ok) return setError(payErr(r.data));
    setIntent(r.data);
  };

  return { intent, busy, error, buy, reset: () => setIntent(null) };
}

type Row = { key: string; label: string; value: string; copy?: string; mono?: boolean };

export function PaymentInstructions({ intent, onClose }: { intent: Intent; onClose?: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const noiDung = noiDungTsu(intent.code);
  // Dựng + kiểm lại ở máy khách; sai (dữ liệu kênh hỏng) thì NÉM và không vẽ mã nào.
  const qr = useMemo(() => {
    try {
      return vietQrDong(KENH_THANH_TOAN.vietqr, intent.amountVnd, noiDung);
    } catch {
      return null;
    }
  }, [intent.amountVnd, noiDung]);

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard bị chặn: giá trị vẫn hiện nguyên văn để chép tay */
    }
  };

  const rows: Row[] = [
    {
      key: 'so-tien',
      label: 'Số tiền',
      value: vnd(intent.amountVnd),
      copy: String(intent.amountVnd),
    },
    { key: 'noi-dung', label: 'Nội dung', value: noiDung, copy: noiDung, mono: true },
    { key: 'ngan-hang', label: 'Ngân hàng', value: KENH_THANH_TOAN.nganHang },
    {
      key: 'stk',
      label: 'Số tài khoản',
      value: KENH_THANH_TOAN.soTaiKhoan,
      copy: KENH_THANH_TOAN.soTaiKhoan,
      mono: true,
    },
    { key: 'chu-tk', label: 'Chủ tài khoản', value: KENH_THANH_TOAN.chuTaiKhoan, mono: true },
  ];

  return (
    <section
      className="mt-6 grid gap-6 rounded-lg border border-line-strong bg-surface p-5 md:grid-cols-[auto_1fr] md:p-6"
      aria-labelledby={`tt-${intent.code}`}
    >
      <div className="mx-auto w-full max-w-60 md:mx-0">
        <div className="rounded-lg bg-white p-2">
          {qr ? (
            <QrSvg
              value={qr}
              label={`Mã VietQR chuyển ${vnd(intent.amountVnd)}, nội dung ${noiDung}`}
            />
          ) : (
            <p className="p-6 text-center text-sm text-black">
              Không dựng được mã QR - chuyển khoản theo thông tin bên cạnh.
            </p>
          )}
        </div>
        <p className="mt-2 text-center text-xs text-fg-muted">VietQR · NAPAS 247</p>
      </div>
      <div className="min-w-0">
        <h3 id={`tt-${intent.code}`} className="text-lg font-semibold text-fg">
          {PLAN_LABEL[intent.kind] ?? intent.kind}
        </h3>
        <p className="mt-1 text-sm text-fg-secondary">
          Quét mã bằng ứng dụng ngân hàng, hoặc chuyển khoản với{' '}
          <strong className="text-fg">đúng nội dung {noiDung}</strong> - thiếu nội dung thì không
          đối soát được. Mã giữ tới {formatDateTimeVN(intent.expiresAt)} (72 giờ).
        </p>
        <dl className="mt-4 divide-y divide-line rounded-md border border-line">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center gap-3 px-3 py-2.5">
              <dt className="w-28 shrink-0 text-sm text-fg-secondary">{r.label}</dt>
              <dd
                className={`min-w-0 flex-1 break-words text-fg ${r.mono ? 'font-mono text-base' : 'text-sm'}`}
              >
                {r.value}
              </dd>
              {r.copy && (
                <button
                  type="button"
                  onClick={() => copy(r.key, r.copy!)}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded px-2 text-sm text-fg-secondary hover:bg-subtle hover:text-fg"
                >
                  <Icon name={copied === r.key ? 'check' : 'copy'} size={14} />
                  <span aria-live="polite">{copied === r.key ? 'Đã chép' : 'Chép'}</span>
                  <span className="sr-only"> {r.label.toLowerCase()}</span>
                </button>
              )}
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-fg-muted">
          Sau khi tiền về, chủ dự án đối soát sao kê và kích hoạt (thường trong 24 giờ). Theo dõi ở{' '}
          <a href="/settings/badge" className="text-link hover:underline">
            Tài khoản → Huy hiệu &amp; Pro
          </a>
          .
        </p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="mt-3 text-sm text-fg-secondary hover:text-fg hover:underline"
          >
            Chọn gói khác
          </button>
        )}
      </div>
    </section>
  );
}

/** Nút "Đăng nhập để tiếp tục" - quyền lợi gắn với tài khoản (PRODUCT_POLICY 3.4). */
export function loginHref(path: string) {
  return `/login?callbackUrl=${encodeURIComponent(path)}`;
}
