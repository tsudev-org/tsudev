import React, { useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ID_URL, Layout, MAIN_URL, ProThemePicker, ThemeToggle, setProEntitled } from '@tsudev/ui';
import Seo from '../../components/Seo';
import { Notice } from '../../components/AuthShell';
import { useLoader } from '../../lib/useLoader';
import { payCall, payErr } from '../../lib/pay';
import type { PayStatus } from '../../lib/pay';

/**
 * Cài đặt → Giao diện (PRO3 (c); .standards DESIGN_SYSTEM.md mục 1.3, PRODUCT_POLICY 3.7.1).
 *
 * - Chế độ Sáng / Tối / Hệ thống: MIỄN PHÍ cho mọi người, cùng bộ chọn với chân trang.
 * - Chủ đề màu (Q2): tài khoản có Pro chọn được mọi chủ đề chuẩn; chưa có Pro thì thấy mẫu, chỉ
 *   "Mặc định" chọn được, kèm một liên kết "Tìm hiểu TsuDEV Pro" - không khoá mờ cả màn.
 *
 * Trạng thái Pro lấy từ `pay/status` (máy chủ quyền lợi) và đồng bộ ngay vào cờ áp chủ đề
 * (`setProEntitled`) - không chờ bộ đệm 10 phút của header.
 */
export default function AppearanceSettings() {
  const { status } = useSession();
  const [me, setMe] = useState<PayStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    const r = await payCall<PayStatus>('pay/status', {}, signal);
    if (signal?.aborted) return;
    if (!r.ok) return setErr(payErr(r.data));
    setMe(r.data);
    setProEntitled(Boolean(r.data.proActive));
  }, []);
  useLoader(load, status === 'authenticated');

  const pro = Boolean(me?.proActive);

  return (
    <Layout active="/settings">
      <Seo title="Giao diện" path="/settings/appearance" noindex />
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-fg">Giao diện</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Lựa chọn lưu trên trình duyệt này. Chế độ Sáng, Tối, Hệ thống luôn miễn phí.
        </p>

        <section
          className="mt-6 rounded-lg border border-line bg-surface p-5"
          aria-labelledby="che-do"
        >
          <h2 id="che-do" className="text-base font-semibold text-fg">
            Chế độ
          </h2>
          <p className="mt-1 text-sm text-fg-secondary">
            Sáng, Tối hoặc đi theo cài đặt của máy (Hệ thống).
          </p>
          <div className="mt-3">
            <ThemeToggle />
          </div>
        </section>

        <section
          className="mt-6 rounded-lg border border-line bg-surface p-5"
          aria-labelledby="chu-de"
        >
          <h2 id="chu-de" className="text-base font-semibold text-fg">
            Chủ đề màu
          </h2>
          <p className="mt-1 text-sm text-fg-secondary">
            Đổi màu nhấn và sắc nền của website; mỗi chủ đề có đủ bản Sáng và Tối. Tương phản cao
            của hệ điều hành luôn được ưu tiên.
          </p>
          {err && (
            <div className="mt-3">
              <Notice kind="error">{err}</Notice>
            </div>
          )}
          {status === 'loading' || (status === 'authenticated' && !me && !err) ? (
            <p className="mt-3 text-sm text-fg-muted">Đang tải…</p>
          ) : status !== 'authenticated' ? (
            <>
              <ProThemePicker pro={false} className="mt-4" />
              <p className="mt-3 text-sm text-fg-secondary">
                <a
                  href={`${ID_URL}/login?callbackUrl=${encodeURIComponent(`${MAIN_URL}/settings/appearance`)}`}
                  className="text-link hover:underline"
                >
                  Đăng nhập
                </a>{' '}
                để dùng chủ đề màu của tài khoản có TsuDEV Pro.
              </p>
            </>
          ) : (
            <ProThemePicker pro={pro} className="mt-4" />
          )}
        </section>
      </div>
    </Layout>
  );
}
