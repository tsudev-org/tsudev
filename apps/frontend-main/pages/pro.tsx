import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Button, Icon, Layout, TsuBadge } from '@tsudev/ui';
import Seo from '../components/Seo';
import PageHeader from '../components/PageHeader';
import { PaymentInstructions, loginHref, usePurchase } from '../components/PayPanel';
import { useLoader } from '../lib/useLoader';
import { formatDateVN } from '../lib/format';
import { appParam, payCall, vnd, webTerms, PLAN_PRICE } from '../lib/pay';
import type { PayStatus, PlanKind } from '../lib/pay';

/**
 * Trang mua TsuDEV Pro trên web - đích của `https://tsudev.com/pro?app=<client_id>`
 * (PRODUCT_POLICY 7.4) cho bản web/desktop/APK ngoài cửa hàng. Thanh toán bằng chuyển khoản
 * VietQR có mã `TSU <8 ký tự>`, OWNER đối soát ở /admin/thanh-toan (PRO-B bước B3).
 *
 * Điều khoản đứng TRƯỚC nút mua, NGUYÊN VĂN PRODUCT_POLICY 7.5 (v4.0.0: một kỳ 1 năm, không
 * tự gia hạn ở mọi kênh) - `webTerms()` trong lib/pay.ts, test/proTerms.test.ts canh.
 */
/** PRODUCT_POLICY 7.2 (v4.0.0): MỘT gói Pro kỳ 1 năm - gói tháng đã bỏ (PRO2). */
const PLAN: PlanKind = 'pro_year';

const FEATURES = [
  'Đồng bộ dữ liệu giữa các thiết bị cùng tài khoản',
  'Sao lưu đám mây, mã hoá đầu cuối - máy chủ chỉ giữ bản mã',
  'Một gói cho MỌI ứng dụng TsuDEV, gắn với tài khoản',
  'Huy hiệu Pro cạnh tên tài khoản (ẩn được)',
];

export default function ProPage() {
  const router = useRouter();
  const app = appParam(router.query.app);
  const { status } = useSession();
  const [me, setMe] = useState<PayStatus | null>(null);
  const { intent, busy, error, buy, reset } = usePurchase(app);

  const load = useCallback(async (signal?: AbortSignal) => {
    const r = await payCall<PayStatus>('pay/status', {}, signal);
    if (signal?.aborted || !r.ok) return;
    setMe(r.data);
  }, []);
  useLoader(load, status === 'authenticated');

  const here = app ? `/pro?app=${encodeURIComponent(app)}` : '/pro';

  return (
    <Layout active="/pro" bare>
      <Seo
        title="TsuDEV Pro"
        path="/pro"
        description="TsuDEV Pro: đồng bộ và sao lưu đám mây mã hoá đầu cuối cho mọi ứng dụng TsuDEV. 490.000 ₫ cho 1 năm, trả bằng chuyển khoản VietQR, không tự gia hạn."
      />
      <PageHeader
        eyebrow="Hệ sinh thái TsuDEV"
        title={
          <>
            TsuDEV <span className="tsu-text-gradient">Pro</span>
          </>
        }
        description="Bản miễn phí lưu mọi thứ trên thiết bị của bạn và không gửi gì lên mạng. Pro thêm đồng bộ và sao lưu đám mây giữa các thiết bị - cho mọi ứng dụng TsuDEV, bằng một tài khoản."
        crumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Pro' }]}
      />

      <div className="max-w-5xl mx-auto px-4 py-10">
        {me?.proActive && (
          <div
            className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-4 text-sm text-fg-secondary"
            role="status"
          >
            <TsuBadge badge="pro" />
            <span>
              Tài khoản của bạn đang có Pro tới{' '}
              <strong className="text-fg">{formatDateVN(me.proUntil)}</strong>. Gia hạn sẽ cộng thêm
              1 năm vào mốc này.
            </span>
          </div>
        )}

        <ul className="grid gap-3 sm:grid-cols-2" aria-label="Quyền lợi Pro">
          {FEATURES.map((f) => (
            <li key={f} className="flex gap-2.5 text-sm text-fg-secondary">
              <span className="mt-0.5 shrink-0 text-link" aria-hidden="true">
                <Icon name="check" size={16} />
              </span>
              {f}
            </li>
          ))}
        </ul>

        <div className="mt-8 max-w-md rounded-lg border border-primary bg-surface p-5">
          <span className="flex items-baseline justify-between gap-3">
            <span className="text-base font-semibold text-fg">TsuDEV Pro - 1 năm</span>
            <span className="font-mono text-xl text-fg">{vnd(PLAN_PRICE[PLAN])}</span>
          </span>
          <span className="mt-1.5 block text-sm text-fg-secondary">
            Trả trước một lần cho 12 tháng. Gia hạn sớm không mất ngày nào.
          </span>
        </div>

        {/* Điều khoản TRƯỚC nút mua (PRODUCT_POLICY 7.5). */}
        <p className="mt-6 rounded-md border border-line bg-subtle p-4 text-sm text-fg" role="note">
          {webTerms(PLAN_PRICE[PLAN])}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {status === 'authenticated' ? (
            <Button onClick={() => buy(PLAN)} disabled={busy !== null}>
              {busy
                ? 'Đang tạo mã…'
                : me?.proActive
                  ? `Gia hạn 1 năm - ${vnd(PLAN_PRICE[PLAN])}`
                  : `Mua 1 năm - ${vnd(PLAN_PRICE[PLAN])}`}
            </Button>
          ) : (
            <Button as="a" href={loginHref(here)}>
              Đăng nhập để mua
            </Button>
          )}
          <span className="text-xs text-fg-muted">Không dùng thử miễn phí. Giá đã gồm thuế.</span>
        </div>
        {error && (
          <p className="mt-3 text-sm text-danger-ink" role="alert">
            {error}
          </p>
        )}

        {intent && <PaymentInstructions intent={intent} onClose={reset} />}

        <section className="mt-12 grid gap-6 md:grid-cols-2" aria-label="Câu hỏi thường gặp">
          <div>
            <h2 className="text-base font-semibold text-fg">Hết Pro thì dữ liệu ra sao?</h2>
            <p className="mt-1.5 text-sm text-fg-secondary">
              Dữ liệu trên thiết bị không bao giờ bị xoá. Bản trên máy chủ vẫn tải về và xuất được
              thêm 90 ngày (có báo trước ở mốc 30 và 7 ngày), sau đó mới bị xoá.
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-fg">Mua trong ứng dụng Android?</h2>
            <p className="mt-1.5 text-sm text-fg-secondary">
              Bản tải từ Google Play mua qua Google Play. Trang này dành cho bản web, máy tính và
              APK ngoài cửa hàng. Quyền lợi gắn với tài khoản nên dùng được ở mọi nơi.
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-fg">Chỉ muốn ủng hộ?</h2>
            <p className="mt-1.5 text-sm text-fg-secondary">
              Xem{' '}
              <a
                href={app ? `/ung-ho?app=${encodeURIComponent(app)}` : '/ung-ho'}
                className="text-link hover:underline"
              >
                trang Ủng hộ
              </a>{' '}
              - ủng hộ không mở khoá tính năng, chỉ có huy hiệu Ủng hộ (tuỳ chọn).
            </p>
          </div>
        </section>
      </div>
    </Layout>
  );
}
