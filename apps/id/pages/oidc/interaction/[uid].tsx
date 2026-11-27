import React from 'react';
import type { GetServerSideProps } from 'next';
import { Button, MAIN_URL } from '@tsudev/ui';

import { AuthShell, Notice } from '../../../../frontend-main/components/AuthShell';
import { IDENTITY, internalHeaders } from '../../../../frontend-main/lib/services';
import { readSessionToken } from '../../../../frontend-main/lib/sessionCookie';

/**
 * Trang đồng ý "Đăng nhập bằng tài khoản TsuDEV" (P4, D1) - ở cổng `id.` từ CP4 (ADR-0005 mục 2). Issuer vẫn là
 * `https://tsudev.com/oidc`; provider chuyển trình duyệt tới đây (`interactions.url`).
 *
 * - Tóm tắt (tên client, scope, gợi ý lối đăng nhập) đọc THEO UID - cookie `_interaction` ở host tsudev.com không
 *   tới được cổng.
 * - Chưa đăng nhập ⇒ `/login` của cổng rồi quay lại; `idp_hint` hợp lệ ⇒ mở thẳng provider đó (QT4).
 * - Cho phép/Từ chối là FORM POST về `tsudev.com/oidc/interaction/<uid>/confirm`: cùng site nên cookie `_interaction`
 *   đi kèm và provider chỉ hoàn tất cho ĐÚNG trình duyệt đã mở luồng (biết uid thôi không đủ).
 */
type Props =
  | { ok: true; uid: string; clientName: string; scopes: string[]; err: string }
  | { ok: false; uid: string };

const SCOPE_TEXT: Record<string, string> = {
  openid: 'Biết bạn là ai (mã tài khoản TsuDEV)',
  profile: 'Tên hiển thị, tên đăng nhập, ảnh đại diện',
  email: 'Địa chỉ email và trạng thái xác minh',
  offline_access: 'Giữ đăng nhập khi bạn không mở trang (tối đa 30 ngày)',
};

const ERR_TEXT: Record<string, string> = {
  'dang-nhap': 'Phiên đăng nhập đã hết. Hãy đăng nhập lại rồi bấm Cho phép.',
  'het-han': 'Không hoàn tất được. Quay lại ứng dụng và thử đăng nhập lại.',
  'ket-noi': 'Không kết nối được dịch vụ đăng nhập. Thử lại sau ít phút.',
};

const UID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const IDP_HINTS = new Set(['google', 'github']);

type Summary = { clientName: string; scopes: string[]; hint: string | null };

async function fetchSummary(uid: string): Promise<Summary | null> {
  const url = `${IDENTITY}/api/identity/oidc-summary/${encodeURIComponent(uid)}`;
  try {
    const r = await fetch(url, { headers: internalHeaders('GET', url) });
    if (!r.ok) return null;
    const d = (await r.json()) as Partial<Summary>;
    return {
      clientName: String(d.clientName || ''),
      scopes: Array.isArray(d.scopes) ? d.scopes.map(String) : [],
      hint: typeof d.hint === 'string' && IDP_HINTS.has(d.hint) ? d.hint : null,
    };
  } catch {
    return null;
  }
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, params, query }) => {
  const uid = String(params?.uid || '');
  if (!UID_RE.test(uid)) return { props: { ok: false, uid: '' } };
  const summary = await fetchSummary(uid);
  if (!summary) return { props: { ok: false, uid } };
  const token = await readSessionToken(req);
  if (!token) {
    const q = new URLSearchParams({ callbackUrl: `/oidc/interaction/${uid}` });
    if (summary.hint) q.set('idp', summary.hint);
    return { redirect: { destination: `/login?${q}`, permanent: false } };
  }
  const loi = typeof query.loi === 'string' && ERR_TEXT[query.loi] ? query.loi : '';
  return {
    props: {
      ok: true,
      uid,
      clientName: summary.clientName,
      scopes: summary.scopes,
      err: loi ? (ERR_TEXT[loi] as string) : '',
    },
  };
};

export default function OidcConsent(props: Props) {
  if (!props.ok) {
    return (
      <AuthShell noindex title="Phiên đăng nhập đã hết hạn">
        <Notice kind="error">
          Yêu cầu đăng nhập này đã hết hạn hoặc không hợp lệ. Quay lại ứng dụng và bấm đăng nhập
          lại.
        </Notice>
      </AuthShell>
    );
  }

  const action = `${MAIN_URL}/oidc/interaction/${encodeURIComponent(props.uid)}/confirm`;
  return (
    <AuthShell noindex title={`${props.clientName} muốn dùng tài khoản TsuDEV của bạn`}>
      {props.err && <Notice kind="error">{props.err}</Notice>}
      <p className="text-sm text-fg-secondary">Ứng dụng sẽ được biết:</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-fg">
        {props.scopes.map((s) => (
          <li key={s}>{SCOPE_TEXT[s] || s}</li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-fg-muted">
        Mật khẩu của bạn KHÔNG được chia sẻ. Thu hồi bất cứ lúc nào bằng &quot;Đăng xuất khỏi mọi
        thiết bị&quot; ở Bảo mật tài khoản.
      </p>
      <form method="post" action={action} className="mt-5 flex gap-2">
        <Button type="submit" name="allow" value="1" className="flex-1">
          Cho phép
        </Button>
        <Button type="submit" name="allow" value="0" className="flex-1" variant="secondary">
          Từ chối
        </Button>
      </form>
    </AuthShell>
  );
}
