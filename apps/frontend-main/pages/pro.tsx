import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Button, Icon, Layout, TsuBadge } from '@tsudev/ui';
import Seo from '../components/Seo';
import PageHeader from '../components/PageHeader';
import { PaymentInstructions, loginHref, usePurchase } from '../components/PayPanel';
import { useLoader } from '../lib/useLoader';
import { formatDateVN } from '../lib/format';
import {
  appParam,
  payCall,
  vnd,
  webTerms,
  PLAN_PRICE,
  PRO_CONSENT,
  PRO_POSITIONING,
} from '../lib/pay';
import type { PayStatus, PlanKind } from '../lib/pay';

/**
 * Trang mua TsuDEV Pro trên web - đích của `https://tsudev.com/pro?app=<client_id>`
 * (PRODUCT_POLICY 7.4) cho bản web/desktop/APK ngoài cửa hàng. Thanh toán bằng chuyển khoản
 * VietQR có mã `TSU <8 ký tự>`, OWNER đối soát ở /admin/thanh-toan (PRO-B bước B3).
 *
 * Điều khoản đứng TRƯỚC nút mua, NGUYÊN VĂN PRODUCT_POLICY 7.5 (v4.0.0: một kỳ 1 năm, không
 * tự gia hạn ở mọi kênh) - `webTerms()` trong lib/pay.ts, test/proTerms.test.ts canh.
 *
 * PRO3 (PRODUCT_POLICY 3.7, v6.1.0): Pro là gói dịch vụ KHÔNG BẮT BUỘC để ủng hộ tác giả. Thứ tự
 * trước nút mua: câu định vị → quyền lợi ĐANG CHẠY → điều khoản 7.5 + liên kết chính sách → ô xác
 * nhận không chọn sẵn; nút mua (kể cả "Đăng nhập để mua") vô hiệu tới khi đánh dấu.
 */
/** PRODUCT_POLICY 7.2 (v4.0.0): MỘT gói Pro kỳ 1 năm - gói tháng đã bỏ (PRO2). */
const PLAN: PlanKind = 'pro_year';

/**
 * Danh sách ĐÓNG (PRODUCT_POLICY 3.7.1), CHỈ quyền lợi đang chạy thật: Q1 huy hiệu, Q3 đồng bộ +
 * sao lưu. Q2 (giao diện Pro) chỉ thêm vào đây khi chủ đề Pro đã có ở Cài đặt → Giao diện.
 */
const FEATURES = [
  'Huy hiệu Pro cạnh tên tài khoản (ẩn được)',
  'Giao diện Pro: thêm chủ đề màu cho website (Sáng, Tối, Hệ thống vẫn miễn phí)',
  'Đồng bộ dữ liệu giữa các thiết bị cùng tài khoản',
  'Sao lưu đám mây, mã hoá đầu cuối - máy chủ chỉ giữ bản mã',
  'Một gói cho MỌI ứng dụng TsuDEV, gắn với tài khoản',
];

export default function ProPage() {
  const router = useRouter();
  const app = appParam(router.query.app);
  const { status } = useSession();
  const [me, setMe] = useState<PayStatus | null>(null);
  const { intent, busy, error, buy, reset } = usePurchase(app);
  // Ô xác nhận KHÔNG chọn sẵn (3.7.3 bước 4).
  const [agreed, setAgreed] = useState(false);

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
        description="TsuDEV Pro là gói dịch vụ không bắt buộc để ủng hộ tác giả: huy hiệu Pro, đồng bộ và sao lưu đám mây mã hoá đầu cuối. 490.000 ₫ cho 1 năm, không tự gia hạn. Mọi ứng dụng TsuDEV miễn phí và mã nguồn mở."
      />
      <PageHeader
        eyebrow="Hệ sinh thái TsuDEV"
        title={
          <>
            TsuDEV <span className="tsu-text-gradient">Pro</span>
          </>
        }
        description="Gói không bắt buộc để ủng hộ tác giả. Bản miễn phí có đủ tính năng cốt lõi và không gửi gì lên mạng; Pro thêm huy hiệu và đồng bộ, sao lưu đám mây - cho mọi ứng dụng TsuDEV, bằng một tài khoản."
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

        {/* Câu định vị NGUYÊN VĂN (PRODUCT_POLICY 3.7.3 bước 1). */}
        <p className="mb-6 max-w-3xl text-base text-fg">{PRO_POSITIONING}</p>

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
          {webTerms(PLAN_PRICE[PLAN])} Xem thêm{' '}
          <a href="/chinh-sach-thanh-toan" className="text-link hover:underline">
            Chính sách thanh toán, hoàn tiền và khiếu nại
          </a>{' '}
          và{' '}
          <a href="/terms" className="text-link hover:underline">
            Điều khoản sử dụng
          </a>
          .
        </p>

        <label className="mt-4 flex max-w-2xl cursor-pointer items-start gap-2.5 text-sm text-fg">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-(--primary)"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <span>{PRO_CONSENT}</span>
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {status === 'authenticated' ? (
            <Button onClick={() => buy(PLAN)} disabled={!agreed || busy !== null}>
              {busy
                ? 'Đang tạo mã…'
                : me?.proActive
                  ? `Gia hạn 1 năm - ${vnd(PLAN_PRICE[PLAN])}`
                  : `Mua 1 năm - ${vnd(PLAN_PRICE[PLAN])}`}
            </Button>
          ) : agreed ? (
            <Button as="a" href={loginHref(here)}>
              Đăng nhập để mua
            </Button>
          ) : (
            <Button disabled>Đăng nhập để mua</Button>
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
