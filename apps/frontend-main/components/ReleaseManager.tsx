import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Badge, Input, Icon } from '@tsudev/ui';

import { formatDateTimeVN } from '../lib/format';
import { useLoader } from '../lib/useLoader';
import { MfaRequiredError, isMfaRequired } from '../lib/mfa';
import {
  acceptCho,
  duoiHopLe,
  kiemTep,
  thanhLoiApi,
  thongDiepLoi,
  thongDiepPut,
} from '../lib/releaseUpload';
import type { ReleaseChannel, ReleasePlatform } from '../lib/types';

/**
 * Quản lý bản phát hành của MỘT dự án, nhúng trong trang `/admin/projects`.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * VÌ SAO LÀ MỘT KHỐI GẬP MỞ CHỨ KHÔNG PHẢI MỘT TRANG RIÊNG
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Bản phát hành không có nghĩa khi đứng rời khỏi dự án của nó: mọi câu hỏi vận
 * hành ("dự án này đã có bản Android chưa", "bản 1.0 đã công bố chưa") đều hỏi
 * về MỘT dự án. Một trang `/admin/releases` phẳng sẽ buộc người dùng tự ghép lại
 * mối quan hệ đó bằng mắt.
 *
 * Gập lại theo mặc định và chỉ gọi API khi MỞ: trang quản trị dự án hiện 10 dự
 * án một lượt, và nạp sẵn phát hành của cả 10 là 10 lượt truy vấn database cho
 * một khối mà người ta có thể không mở cái nào. Database này tính tiền theo thời
 * gian compute còn thức (xem docs/free-tier.md).
 */

const NEN_TANG: { v: ReleasePlatform; nhan: string }[] = [
  { v: 'ANDROID', nhan: 'Android' },
  { v: 'WINDOWS', nhan: 'Windows' },
  { v: 'MACOS', nhan: 'macOS' },
  { v: 'LINUX', nhan: 'Linux' },
  { v: 'WEB', nhan: 'Trình duyệt' },
  { v: 'SOURCE', nhan: 'Mã nguồn' },
];

const KENH: ReleaseChannel[] = ['STABLE', 'BETA', 'ALPHA'];

/** Hình dạng admin trả về - GỒM `storageKey`, khác đường đọc công khai. */
type AdminRelease = {
  id: string;
  version: string;
  channel: ReleaseChannel;
  platform: ReleasePlatform;
  arch: string;
  storageKey: string | null;
  externalUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  sha256: string | null;
  signature: string | null;
  signingKid: string | null;
  minOsVersion: string | null;
  releaseNotesMd: string;
  downloadCount: number;
  publishedAt: string | null;
  deletedAt: string | null;
};

type Form = {
  version: string;
  platform: ReleasePlatform;
  channel: ReleaseChannel;
  arch: string;
  externalUrl: string;
  /// Chỉ cho đường dẫn ngoài (WEB/SOURCE). Tệp tải lên thì máy chủ tự tính.
  sha256: string;
  minOsVersion: string;
  releaseNotesMd: string;
  published: boolean;
};

const TRONG: Form = {
  version: '',
  platform: 'ANDROID',
  channel: 'STABLE',
  arch: '',
  externalUrl: '',
  sha256: '',
  minOsVersion: '',
  releaseNotesMd: '',
  published: false,
};

const dungLuong = (n: number) =>
  n >= 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(1)} MB`
    : n >= 1024
      ? `${(n / 1024).toFixed(0)} KB`
      : `${n} B`;

/**
 * PUT tệp thẳng vào R2 qua URL presign, có tiến độ.
 *
 * XHR chứ không `fetch`: `fetch` không báo tiến độ tải LÊN, và một thanh tiến độ
 * đứng im trong hai phút với tệp 200 MB là lý do người ta bấm F5 giữa chừng.
 */
function putCoTienDo(
  url: string,
  file: File,
  contentType: string,
  onTienDo: (phanTram: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onTienDo(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(thongDiepPut(xhr.status)));
    xhr.onerror = () =>
      reject(new Error('Không gửi được tệp tới kho lưu trữ (mạng hoặc CORS của bucket)'));
    xhr.send(file);
  });
}

export type ReleaseManagerProps = {
  slug: string;
  /// Báo lên trang cha để dùng CHUNG một vùng thông báo. Hai vùng thông báo trên
  /// cùng một trang thì người dùng không biết nhìn vào đâu.
  onMessage: (tone: string, text: string) => void;
  /// Backend trả 403 MFA_REQUIRED (quản trị viên chưa bật 2FA). Trang cha thay
  /// mình bằng hướng dẫn bật 2FA; khối này thôi gọi API từ đó.
  onMfaRequired?: () => void;
};

export default function ReleaseManager({ slug, onMessage, onMfaRequired }: ReleaseManagerProps) {
  const [mo, setMo] = useState(false);
  const [dsach, setDsach] = useState<AdminRelease[] | null>(null);
  const [form, setForm] = useState<Form>(TRONG);
  const [busy, setBusy] = useState(false);
  const [hienForm, setHienForm] = useState(false);
  const [tep, setTep] = useState<File | null>(null);
  /// Bước đang chạy của luồng tải lên - NÓI RA, vì niêm phong một tệp lớn mất
  /// vài chục giây và một nút "Đang lưu…" câm lặng trông y hệt treo.
  const [buoc, setBuoc] = useState<string | null>(null);
  /// Đã gặp MFA_REQUIRED thì DỪNG: mọi lời gọi sau cũng bị chặn y hệt, gọi lại
  /// chỉ tốn thêm lượt truy vấn database.
  const daChanMfa = useRef(false);
  // Ref chứ không phải dependency: trang cha truyền arrow mới mỗi lần vẽ, đưa
  // vào deps của `nap` là nạp lại sau mỗi lần vẽ.
  const mfaRef = useRef(onMfaRequired);
  useEffect(() => {
    mfaRef.current = onMfaRequired;
  });
  const baoMfa = useCallback(() => {
    daChanMfa.current = true;
    mfaRef.current?.();
  }, []);

  const nap = useCallback(
    async (signal?: AbortSignal) => {
      if (daChanMfa.current) return;
      try {
        const res = await fetch(`/api/content/admin/projects/${slug}/releases`, { signal });
        if (!res.ok) {
          if (isMfaRequired(res.status, await res.json().catch(() => null))) {
            baoMfa();
            setDsach([]);
            return;
          }
          // ĐỌC mã trạng thái và NÓI RA. Bản đầu của trang toà soạn từng gọi fetch
          // rồi vứt phản hồi đi, nên 401/404/500 trông y hệt thành công - bài học
          // của trang toà soạn (đã gỡ 29/10/2026).
          onMessage('danger', `Không đọc được danh sách bản phát hành (HTTP ${res.status})`);
          setDsach([]);
          return;
        }
        setDsach(await res.json());
      } catch {
        // Đóng khung (hoặc mở lại) giữa chừng huỷ lượt nạp - không phải lỗi mạng.
        if (signal?.aborted) return;
        onMessage('danger', 'Không kết nối được máy chủ nội dung');
        setDsach([]);
      }
    },
    [slug, onMessage, baoMfa]
  );

  // Chỉ nạp khi MỞ, và nạp lại nếu đóng rồi mở lại (dữ liệu có thể đã đổi).
  useLoader(nap, mo);

  const set =
    (k: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const t = e.target as HTMLInputElement;
      setForm((f) => ({ ...f, [k]: t.type === 'checkbox' ? t.checked : t.value }));
    };

  const goiJson = async (url: string, method: string, than?: unknown) => {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: than === undefined ? undefined : JSON.stringify(than),
    });
    const body = await res.json().catch(() => ({}));
    // Hiện NGUYÊN VĂN lỗi của backend. Những phép kiểm ở đó rất cụ thể ("tệp chưa
    // niêm phong") và dịch chúng thành "Lưu thất bại" là vứt đi đúng phần thông
    // tin người dùng cần để sửa.
    if (isMfaRequired(res.status, body)) {
      baoMfa();
      throw new MfaRequiredError(body.error);
    }
    // Kèm `code`/`status` để `thongDiepLoi` rẽ nhánh theo mã ổn định của backend.
    if (!res.ok)
      throw Object.assign(new Error(body.error || `HTTP ${res.status}`), {
        code: body.code,
        status: res.status,
      });
    return body;
  };

  const niemPhong = async (id: string) => {
    setBuoc('Máy chủ đang đọc lại tệp để tính SHA-256 và ký…');
    return goiJson(`/api/content/admin/releases/${id}/seal`, 'POST');
  };

  const guiTao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (canTep && !tep) return onMessage('danger', 'Chọn tệp cài đặt trước đã');
    // Chặn sớm cho đỡ đợi - máy chủ vẫn kiểm lại đủ cả ba thứ.
    const loiTepSom = canTep && tep ? kiemTep(form.platform, tep) : null;
    if (loiTepSom) return onMessage('danger', loiTepSom);
    setBusy(true);
    let idDaTao: string | null = null;
    try {
      // `arch` là chuỗi rỗng hợp lệ: cột đó NOT NULL default '' (xem schema.prisma).
      const than: Record<string, unknown> = {
        version: form.version.trim(),
        platform: form.platform,
        channel: form.channel,
        arch: form.arch.trim(),
      };
      for (const k of ['minOsVersion', 'releaseNotesMd'] as const) {
        const v = form[k].trim();
        if (v) than[k] = v;
      }

      if (canTep && tep) {
        // 1. Xin URL tải lên. Khoá, Content-Type do máy chủ đặt; kích thước được
        //    ký vào URL. KHÔNG gửi `contentType` - máy chủ trả 400 nếu nhận được.
        setBuoc('Xin chỗ trong kho lưu trữ…');
        const cho = await goiJson(
          `/api/content/admin/projects/${slug}/releases/upload-url`,
          'POST',
          { fileName: tep.name, platform: form.platform, fileSize: tep.size }
        );
        // 2. Tệp đi THẲNG vào R2 - không qua Worker (trần 100 MB) hay Render.
        //    Đúng `Content-Type` máy chủ trả, không fallback: nó đã nằm trong chữ
        //    ký, lệch một ký tự là kho trả 403.
        await putCoTienDo(cho.url, tep, cho.contentType, (p) =>
          setBuoc(`Đang tải lên ${p}% (${dungLuong(tep.size)})…`)
        );
        than.storageKey = cho.key;
        than.fileName = tep.name;
        than.fileSize = tep.size;
      } else {
        than.externalUrl = form.externalUrl.trim();
        if (form.sha256.trim()) than.sha256 = form.sha256.trim();
      }

      // 3. Tạo dạng NHÁP. Công bố là bước sau cùng: backend chặn công bố một tệp
      //    chưa niêm phong, và tách bước thì một lần niêm phong lỗi không để lại
      //    một bản công khai thiếu checksum.
      setBuoc('Tạo bản phát hành…');
      const r = await goiJson(`/api/content/admin/projects/${slug}/releases`, 'POST', than);
      idDaTao = r.id;

      // 4. Niêm phong: máy chủ đọc lại ĐÚNG object trong R2, tính sha256, ký.
      if (canTep) await niemPhong(r.id);

      // 5. Công bố nếu được yêu cầu.
      if (form.published) {
        setBuoc('Công bố…');
        await goiJson(`/api/content/admin/releases/${r.id}`, 'PATCH', { published: true });
      }

      onMessage(
        'success',
        `Đã tạo bản ${than.version} cho ${form.platform}${canTep ? ' - đã niêm phong và ký' : ''}`
      );
      setForm(TRONG);
      setTep(null);
      setHienForm(false);
    } catch (err) {
      // Trang cha đã thay khối này bằng hướng dẫn bật TOTP - không đẩy thêm thông báo lỗi.
      if (err instanceof MfaRequiredError) return;
      const { text, thuLai } = thongDiepLoi(
        thanhLoiApi(err),
        tep ? duoiHopLe(form.platform, tep.name) : null
      );
      onMessage(
        'danger',
        !idDaTao
          ? text
          : thuLai
            ? `Bản phát hành đã được tạo (nháp) nhưng bước sau lỗi: ${text}. Bấm "Niêm phong" ở danh sách để thử lại.`
            : `Bản phát hành đã được tạo (nháp) nhưng bước sau lỗi: ${text}`
      );
    } finally {
      setBusy(false);
      setBuoc(null);
      await nap();
    }
  };

  const niemPhongLai = async (r: AdminRelease) => {
    setBusy(true);
    try {
      await niemPhong(r.id);
      onMessage('success', `Đã niêm phong và ký bản ${r.version}`);
    } catch (err) {
      if (err instanceof MfaRequiredError) return;
      const { text } = thongDiepLoi(
        thanhLoiApi(err),
        r.storageKey ? duoiHopLe(r.platform, r.storageKey) : null
      );
      onMessage('danger', text);
    } finally {
      setBusy(false);
      setBuoc(null);
      await nap();
    }
  };

  const doiCongBo = async (r: AdminRelease) => {
    const res = await fetch(`/api/content/admin/releases/${r.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !r.publishedAt }),
    });
    const body = await res.json().catch(() => ({}));
    if (isMfaRequired(res.status, body)) return baoMfa();
    if (!res.ok) return onMessage('danger', body.error || `Thất bại (HTTP ${res.status})`);
    onMessage('success', r.publishedAt ? `Đã rút bản ${r.version}` : `Đã công bố bản ${r.version}`);
    await nap();
  };

  const xoa = async (r: AdminRelease) => {
    // Hỏi lại, nhưng nói rõ đây là XOÁ MỀM - người ta quyết định khác nhau giữa
    // "mất vĩnh viễn" và "ẩn đi, còn trong database".
    if (
      !window.confirm(
        `Xoá mềm bản ${r.version} (${r.platform})?\n\nHàng vẫn còn trong database - một bản đã công bố có thể đang được ai đó đối chiếu checksum.`
      )
    )
      return;
    const res = await fetch(`/api/content/admin/releases/${r.id}`, { method: 'DELETE' });
    const body = await res.json().catch(() => ({}));
    if (isMfaRequired(res.status, body)) return baoMfa();
    if (!res.ok) return onMessage('danger', body.error || `Thất bại (HTTP ${res.status})`);
    onMessage('success', `Đã xoá mềm bản ${r.version}`);
    await nap();
  };

  // SOURCE: máy chủ nay nhận tệp .zip/.tar.gz, nhưng giao diện GIỮ đường dẫn ngoài
  // cho mã nguồn (thường là GitHub) - mở ô chọn tệp cho SOURCE cần thêm một nút
  // chuyển giữa hai đường, chưa đáng lúc này.
  const canTep = form.platform !== 'WEB' && form.platform !== 'SOURCE';
  const loiTep = canTep && tep ? kiemTep(form.platform, tep) : null;

  return (
    <div className="w-full border-t border-line pt-3 mt-1">
      <button
        type="button"
        onClick={() => setMo((v) => !v)}
        aria-expanded={mo}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-link hover:underline"
      >
        <Icon name={mo ? 'chevron-down' : 'chevron'} size={14} />
        Bản phát hành
        {dsach && <span className="text-fg-muted font-normal">({dsach.length})</span>}
      </button>

      {mo && (
        <div className="mt-3">
          {buoc && !hienForm && (
            <p className="mb-2 text-xs text-fg-muted" role="status" aria-live="polite">
              {buoc}
            </p>
          )}
          {dsach === null ? (
            <p className="text-sm text-fg-muted">Đang tải…</p>
          ) : dsach.length === 0 ? (
            <p className="text-sm text-fg-muted">
              Dự án này chưa có bản phát hành nào. Thêm một bản để nó xuất hiện ở khối &quot;Tải
              về&quot; trên trang chủ.
            </p>
          ) : (
            <div className="space-y-2">
              {dsach.map((r) => (
                <div
                  key={r.id}
                  className={`rounded-md border border-line p-3 ${r.deletedAt ? 'opacity-50' : ''}`}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-sm font-semibold text-fg">{r.version}</span>
                    <Badge tone="neutral">{r.platform}</Badge>
                    {r.arch && (
                      <Badge tone="outline" mono>
                        {r.arch}
                      </Badge>
                    )}
                    {r.channel !== 'STABLE' && <Badge tone="warning">{r.channel}</Badge>}
                    {r.deletedAt ? (
                      <Badge tone="danger">Đã xoá</Badge>
                    ) : r.publishedAt ? (
                      <Badge tone="success">Đã công bố</Badge>
                    ) : (
                      <Badge tone="warning">Bản nháp</Badge>
                    )}
                    {r.sha256 ? (
                      <Badge tone="teal" icon={<Icon name="hash" size={11} />}>
                        checksum
                      </Badge>
                    ) : (
                      // NÓI RA việc thiếu checksum ở trang quản trị: đây là nơi
                      // duy nhất người ta còn sửa được nó.
                      <Badge tone="outline">thiếu checksum</Badge>
                    )}
                    {r.signature && (
                      <Badge tone="teal" icon={<Icon name="signature" size={11} />}>
                        đã ký
                      </Badge>
                    )}
                    <span className="ml-auto text-xs text-fg-muted">
                      {r.downloadCount} lượt tải
                    </span>
                  </div>

                  <div className="mt-1.5 font-mono text-xs text-fg-muted break-all">
                    {r.storageKey || r.externalUrl}
                  </div>
                  {r.publishedAt && (
                    <div className="text-xs text-fg-muted">
                      Công bố {formatDateTimeVN(r.publishedAt)}
                    </div>
                  )}

                  {!r.deletedAt && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => doiCongBo(r)}>
                        {r.publishedAt ? 'Rút khỏi công khai' : 'Công bố'}
                      </Button>
                      {r.storageKey && !r.sha256 && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => niemPhongLai(r)}
                        >
                          <Icon name="signature" size={14} />
                          Niêm phong
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => xoa(r)}>
                        Xoá mềm
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!hienForm ? (
            <Button
              size="sm"
              variant="secondary"
              className="mt-3"
              onClick={() => setHienForm(true)}
            >
              <Icon name="plus" size={14} />
              Thêm bản phát hành
            </Button>
          ) : (
            <form onSubmit={guiTao} className="mt-3 rounded-md border border-line bg-subtle p-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  label="Phiên bản (semver)"
                  value={form.version}
                  onChange={set('version')}
                  placeholder="1.0.0"
                  required
                />
                <label className="block">
                  <span className="block text-sm font-medium text-fg mb-1">Nền tảng</span>
                  <select
                    value={form.platform}
                    onChange={set('platform')}
                    className="w-full rounded-md border border-line-control bg-surface px-3 py-2 text-fg"
                  >
                    {NEN_TANG.map((p) => (
                      <option key={p.v} value={p.v}>
                        {p.nhan}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-sm font-medium text-fg mb-1">Kênh</span>
                  <select
                    value={form.channel}
                    onChange={set('channel')}
                    className="w-full rounded-md border border-line-control bg-surface px-3 py-2 text-fg"
                  >
                    {KENH.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  label="Kiến trúc (bỏ trống = không phân biệt)"
                  value={form.arch}
                  onChange={set('arch')}
                  placeholder="arm64"
                />

                {/* Hai đường dẫn LOẠI TRỪ NHAU, và form nói ra điều đó bằng cách
                    chỉ hiện một ô theo nền tảng. Backend vẫn kiểm lại - giao diện
                    dẫn đường, backend mới là cổng. */}
                {canTep ? (
                  <>
                    <label className="block sm:col-span-2">
                      <span className="block text-sm font-medium text-fg mb-1">Tệp cài đặt</span>
                      <input
                        type="file"
                        required
                        accept={acceptCho(form.platform)}
                        onChange={(e) => setTep(e.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-fg file:mr-3 file:rounded-md file:border file:border-line-control file:bg-surface file:px-3 file:py-1.5 file:text-fg"
                      />
                      <span
                        className={`mt-1 block text-xs ${
                          loiTep ? 'text-danger-ink' : 'text-fg-muted'
                        }`}
                        role={loiTep ? 'alert' : undefined}
                      >
                        {tep
                          ? `${tep.name} · ${dungLuong(tep.size)}${loiTep ? ` - ${loiTep}` : ''}`
                          : 'Tệp đi thẳng vào R2. SHA-256 và chữ ký Ed25519 do máy chủ tính sau khi tải lên - không khai tay.'}
                      </span>
                    </label>
                    <Input
                      label="Yêu cầu hệ điều hành"
                      value={form.minOsVersion}
                      onChange={set('minOsVersion')}
                      placeholder="Android 8.0+"
                    />
                  </>
                ) : (
                  <>
                    <Input
                      label="Đường dẫn ngoài"
                      value={form.externalUrl}
                      onChange={set('externalUrl')}
                      placeholder={
                        form.platform === 'SOURCE' ? 'https://github.com/…' : 'https://…'
                      }
                      required
                      className="sm:col-span-2"
                    />
                    <Input
                      label="SHA-256 (tuỳ chọn - máy chủ sẽ ký lời khai này)"
                      value={form.sha256}
                      onChange={set('sha256')}
                      placeholder="3f7a1c…"
                      className="sm:col-span-2"
                    />
                  </>
                )}

                <label className="block sm:col-span-2">
                  <span className="block text-sm font-medium text-fg mb-1">
                    Có gì mới (Markdown)
                  </span>
                  <textarea
                    value={form.releaseNotesMd}
                    onChange={set('releaseNotesMd')}
                    rows={3}
                    className="w-full rounded-md border border-line-control bg-surface px-3 py-2 font-mono text-sm text-fg"
                  />
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-fg sm:col-span-2">
                  <input type="checkbox" checked={form.published} onChange={set('published')} />
                  Công bố ngay (bỏ trống = lưu dạng bản nháp, không hiện ra công khai)
                </label>
              </div>

              <div className="mt-3 flex gap-2">
                <Button type="submit" size="sm" disabled={busy || !!loiTep}>
                  {busy ? 'Đang lưu…' : canTep ? 'Tải lên và tạo' : 'Tạo bản phát hành'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setHienForm(false);
                    setForm(TRONG);
                    setTep(null);
                  }}
                >
                  Huỷ
                </Button>
              </div>
              {buoc && (
                <p className="mt-2 text-xs text-fg-muted" role="status" aria-live="polite">
                  {buoc}
                </p>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  );
}
