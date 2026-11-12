import React, { useState } from 'react';
import { Layout, Icon } from '@tsudev/ui';
import Seo from '../components/Seo';
import PageHeader from '../components/PageHeader';
import { KENH } from '../lib/ungHo';

/**
 * Trang Ủng hộ TRUNG TÂM của hệ sinh thái tsudev (phiếu 20261112-01 + quyết định
 * theo nền tảng 20261112-02). Ứng dụng desktop/Android và `.github/FUNDING.yml` của
 * các repo chỉ MỞ trang này (hoặc trang riêng của sản phẩm) - không nhúng số tài
 * khoản vào bản build, nên đổi kênh không cần phát hành lại app.
 *
 * Trang TĨNH: dữ liệu ở data/ung-ho.json, kiểm ở lib/ungHo.ts lúc build. Ảnh QR là
 * tệp cùng origin (CSP `img-src 'self'`), không gọi dịch vụ QR bên thứ ba lúc chạy.
 * Thông tin chuyển khoản luôn có bản CHỮ chọn/chép được (trình đọc màn hình, máy
 * không quét được QR).
 */
export default function UngHoPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      // Clipboard bị chặn: giá trị vẫn hiện nguyên văn để chép tay.
    }
  };

  return (
    <Layout active="/ung-ho" bare>
      <Seo
        title="Ủng hộ"
        path="/ung-ho"
        description="Ủng hộ hệ sinh thái phần mềm tsudev bằng chuyển khoản VietQR - tự nguyện, 100% tới nhà phát triển, không mở khoá tính năng nào. Đây là nơi duy nhất công bố kênh ủng hộ."
      />
      <PageHeader
        eyebrow="Hệ sinh thái tsudev"
        title={
          <>
            Ủng hộ <span className="tsu-text-gradient">tsudev</span>
          </>
        }
        description="Mọi ứng dụng và trò chơi của tsudev đều miễn phí. Nếu chúng có ích cho bạn, một khoản ủng hộ nhỏ giúp duy trì máy chủ, chứng thư ký mã và thời gian phát triển."
        crumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Ủng hộ' }]}
      />

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div
          className="flex gap-3 rounded-lg border border-line bg-surface p-4 text-sm text-fg-secondary"
          role="note"
        >
          <span className="mt-0.5 shrink-0 text-link" aria-hidden="true">
            <Icon name="shield" size={18} />
          </span>
          <p>
            <strong className="font-semibold text-fg">
              Trang này là nơi duy nhất công bố kênh ủng hộ của tsudev
            </strong>{' '}
            và chỉ có MỘT tài khoản nhận dưới đây. Ủng hộ là tự nguyện, 100% tới nhà phát triển,
            không mở khoá tính năng, không gỡ quảng cáo, không đổi lấy quyền lợi nào. Ai gửi bạn số
            tài khoản hay mã QR khác nhân danh tsudev đều không phải tsudev.
          </p>
        </div>

        {KENH.map((k) => {
          const rows: { key: string; label: string; value: string; mono?: boolean }[] = [
            { key: 'ngan-hang', label: 'Ngân hàng', value: k.nganHang },
            { key: 'stk', label: 'Số tài khoản', value: k.soTaiKhoan, mono: true },
            { key: 'chu-tk', label: 'Chủ tài khoản', value: k.chuTaiKhoan, mono: true },
          ];
          return (
            <section
              key={k.ten}
              className="mt-8 grid gap-8 rounded-lg border border-line bg-surface p-6 md:grid-cols-[auto_1fr] md:p-8"
              aria-labelledby={`kenh-${k.vietqr.bin}`}
            >
              {/* Mã QR là ảnh nền trắng + vùng lặng: giữ trên ô trắng ở cả hai chế độ để
                  ứng dụng ngân hàng quét được. */}
              <div className="mx-auto w-full max-w-64 md:mx-0">
                <div className="rounded-lg bg-white p-3">
                  <img
                    src={k.anhQr}
                    width={232}
                    height={232}
                    alt={`Mã QR chuyển khoản ${k.nganHang.split(' ')[0]} ${k.soTaiKhoan}`}
                    className="block h-auto w-full"
                  />
                </div>
                <p className="mt-2 text-center text-xs text-fg-muted">VietQR · NAPAS 247</p>
              </div>

              <div className="min-w-0">
                <h2 id={`kenh-${k.vietqr.bin}`} className="text-xl font-semibold text-fg">
                  {k.ten}
                </h2>
                <p className="mt-1.5 text-sm text-fg-secondary">{k.moTa}</p>
                <dl className="mt-5 divide-y divide-line rounded-md border border-line">
                  {rows.map((r) => (
                    <div key={r.key} className="flex items-center gap-3 px-4 py-3">
                      <dt className="w-32 shrink-0 text-sm text-fg-secondary">{r.label}</dt>
                      <dd
                        className={`min-w-0 flex-1 break-words text-fg ${r.mono ? 'font-mono text-base' : 'text-sm'}`}
                      >
                        {r.value}
                      </dd>
                      {r.mono && (
                        <button
                          type="button"
                          onClick={() => copy(r.key, r.value)}
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
              </div>
            </section>
          );
        })}

        <section className="mt-10 grid gap-6 md:grid-cols-2" aria-label="Câu hỏi thường gặp">
          <div>
            <h2 className="text-base font-semibold text-fg">Ứng dụng có hỏi xin ủng hộ không?</h2>
            <p className="mt-1.5 text-sm text-fg-secondary">
              Ứng dụng desktop và Android chỉ có một nút mở trang này trên trình duyệt - không chứa
              số tài khoản hay mã QR trong bản cài. Bản iOS không có lối vào ủng hộ.
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-fg">Làm sao biết đúng tài khoản?</h2>
            <p className="mt-1.5 text-sm text-fg-secondary">
              Mã QR được kiểm tự động mỗi lần dựng trang: mã phải chuyển tới đúng số tài khoản in
              bằng chữ ở trên, và ảnh QR được ghim mã băm SHA-256 - ai tráo ảnh thì bản dựng dừng.
            </p>
          </div>
        </section>
      </div>
    </Layout>
  );
}
