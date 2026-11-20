import React, { useCallback, useState } from 'react';
import { Button } from '@tsudev/ui';
import { RENEWAL_TEXT, renewalNotice } from '../lib/proRenewal';
import { payCall } from '../lib/pay';
import type { PayStatus } from '../lib/pay';
import { useLoader } from '../lib/useLoader';

/**
 * Băng nhắc gia hạn 7 ngày cuối (PRODUCT_POLICY 7.6). Đóng được ("Để sau"), không chặn trang;
 * mỗi lần mở trang hiện lại - đúng "mỗi lần mở" của 7.6, không lưu trạng thái đã đóng.
 */
export default function ProRenewalBanner({ proUntil }: { proUntil: string | null | undefined }) {
  const [hidden, setHidden] = useState(false);
  const n = renewalNotice(proUntil);
  if (!n || hidden) return null;
  return (
    <section
      role="status"
      aria-labelledby="nhac-gia-han"
      className="mt-4 rounded-lg border border-line bg-surface p-4"
    >
      <h2 id="nhac-gia-han" className="text-base font-semibold text-fg">
        {RENEWAL_TEXT.title}
      </h2>
      <p className="mt-1 text-sm text-fg-secondary">{n.body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button as="a" href="/pro">
          {RENEWAL_TEXT.primary}
        </Button>
        <Button variant="ghost" type="button" onClick={() => setHidden(true)}>
          {RENEWAL_TEXT.secondary}
        </Button>
      </div>
    </section>
  );
}

/** Bản tự nạp `pay/status` cho trang không có sẵn dữ liệu Pro (Hồ sơ). Lỗi ⇒ không hiện gì. */
export function ProRenewalBannerAuto({ enabled }: { enabled: boolean }) {
  const [proUntil, setProUntil] = useState<string | null>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    const r = await payCall<PayStatus>('pay/status', {}, signal);
    if (signal?.aborted || !r.ok) return;
    setProUntil(r.data.proUntil);
  }, []);
  useLoader(load, enabled);
  return <ProRenewalBanner proUntil={proUntil} />;
}
