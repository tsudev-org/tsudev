import React from 'react';
import { Layout, ECOSYSTEM_APPS } from '@tsudev/ui';
import Seo from '../components/Seo';
import PageHeader from '../components/PageHeader';
import { formatDateVN } from '../lib/format';
import trust from '../data/trust.json';

/**
 * Trang An toàn & bằng chứng tin cậy (phiếu SEC2-e, 25/11/2026).
 *
 * Nguyên tắc của phiếu SEC2 mục 0 (chủ dự án chốt): KHÔNG nhãn trang trí. Mỗi dòng ở bảng bằng chứng
 * có trạng thái THẬT + liên kết tới trang kết quả do bên thứ ba lưu trữ + ngày đo; không có liên
 * kết thì không hiện (ghi ở mục "Chưa có / không áp dụng" kèm lý do). Dữ liệu là `data/trust.json`
 * trong repo, đọc lúc build - trang không gọi dịch vụ ngoài khi người xem mở (CSP, ngân sách JS).
 * test/trustData.test.ts canh khuôn dữ liệu và tuổi số đo.
 */

type Evidence = { id: string; name: string; status: string; url: string; measured: string };
type Missing = { id: string; name: string; reason: string };

const EVIDENCE = trust.evidence as Evidence[];
const MISSING = trust.notApplicable as Missing[];
const PRODUCT_SECURITY = trust.products as Record<string, string>;

const link = 'text-link underline-offset-2 hover:underline';
const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

export default function SecurityPage() {
  return (
    <Layout active="/security" bare>
      <Seo
        title="An toàn & bằng chứng tin cậy"
        path="/security"
        description="Cách báo lỗ hổng cho TsuDEV và các bằng chứng an toàn tự kiểm chứng được: SSL Labs, Mozilla Observatory, OpenSSF, HSTS preload, chữ ký bản phát hành."
      />
      <PageHeader
        title="An toàn & bằng chứng tin cậy"
        description="Mọi mục dưới đây có liên kết tới trang kết quả do bên thứ ba lưu trữ - bạn bấm vào là tự kiểm được, không cần tin lời chúng tôi."
        crumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'An toàn' }]}
      />

      <div className="mx-auto max-w-6xl px-4 py-10 space-y-12 [&>section]:max-w-4xl">
        <section aria-labelledby="bao-lo-hong">
          <h2 id="bao-lo-hong" className="text-xl font-semibold text-fg">
            Báo lỗ hổng
          </h2>
          <ul className="mt-3 space-y-2 text-fg-secondary">
            <li>
              Kênh riêng tư (ưu tiên):{' '}
              <a
                className={link}
                href="https://github.com/tsudev-org/tsudev/security/advisories/new"
                {...ext}
              >
                GitHub Security Advisory
              </a>
            </li>
            <li>
              Thư điện tử:{' '}
              <a className={link} href="mailto:security@tsudev.com">
                security@tsudev.com
              </a>
            </li>
            <li>Phản hồi lần đầu trong 7 ngày. Vui lòng không công khai trước khi có bản vá.</li>
            <li>
              Tệp máy đọc:{' '}
              <a className={link} href="/.well-known/security.txt">
                /.well-known/security.txt
              </a>
            </li>
          </ul>
        </section>

        <section aria-labelledby="bang-chung">
          <h2 id="bang-chung" className="text-xl font-semibold text-fg">
            Bằng chứng tự kiểm chứng được - tsudev.com
          </h2>
          <div className="mt-4 overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-subtle text-left text-fg">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Bằng chứng</th>
                  <th className="px-4 py-2.5 font-semibold">Kết quả</th>
                  <th className="px-4 py-2.5 font-semibold">Kiểm chứng</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Ngày đo</th>
                </tr>
              </thead>
              <tbody>
                {EVIDENCE.map((e) => (
                  <tr key={e.id} className="border-t border-line">
                    <td className="px-4 py-2.5 text-fg">{e.name}</td>
                    <td className="px-4 py-2.5 text-fg-secondary">{e.status}</td>
                    <td className="px-4 py-2.5">
                      <a className={`${link} whitespace-nowrap`} href={e.url} {...ext}>
                        Kiểm chứng ↗<span className="sr-only"> (mở tab mới)</span>
                      </a>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-fg-muted">
                      {formatDateVN(e.measured)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="tu-kiem">
          <h2 id="tu-kiem" className="text-xl font-semibold text-fg">
            Tự kiểm tệp tải về
          </h2>
          <p className="mt-3 text-fg-secondary">
            SHA-256 của mọi tệp phát hành qua tsudev.com do máy chủ tự tính lúc niêm phong (không
            nhận giá trị khai từ người tải lên) và được ký Ed25519. So mã băm in trên trang tải với
            kết quả:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md border border-line bg-subtle p-3 font-mono text-sm text-fg">
            {`# Windows (PowerShell)\nGet-FileHash .\\tep-cai-dat.exe -Algorithm SHA256\n\n# macOS / Linux\nsha256sum tep-cai-dat`}
          </pre>
          <p className="mt-3 text-fg-secondary">
            Khoá công khai để kiểm chữ ký:{' '}
            <a className={link} href="/.well-known/tsudev-release-jwks.json">
              /.well-known/tsudev-release-jwks.json
            </a>
            . Hướng dẫn chi tiết ở{' '}
            <a className={link} href="/docs">
              Tài liệu
            </a>
            .
          </p>
        </section>

        <section aria-labelledby="toan-he">
          <h2 id="toan-he" className="text-xl font-semibold text-fg">
            Các sản phẩm trong hệ sinh thái
          </h2>
          <p className="mt-2 text-sm text-fg-muted">
            Mỗi sản phẩm tự đo và công bố bằng chứng trên trang An toàn của mình. Trạng thái kiểm
            theo nội dung trang ngày {formatDateVN(trust.productsChecked)}.
          </p>
          <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
            {ECOSYSTEM_APPS.map((a) => {
              const page = PRODUCT_SECURITY[a.id];
              return (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
                >
                  <span className="text-fg">{a.name}</span>
                  {page ? (
                    <a className={`${link} text-sm`} href={page} {...ext}>
                      Trang An toàn ↗<span className="sr-only"> (mở tab mới)</span>
                    </a>
                  ) : (
                    <span className="text-sm text-fg-muted">Chưa có trang An toàn</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="chua-co">
          <h2 id="chua-co" className="text-xl font-semibold text-fg">
            Chưa có / không áp dụng
          </h2>
          <ul className="mt-3 space-y-2 text-fg-secondary">
            {MISSING.map((m) => (
              <li key={m.id}>
                <strong className="font-medium text-fg">{m.name}:</strong> {m.reason}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Layout>
  );
}
