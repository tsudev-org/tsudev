import React, { useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Badge, Button, Layout, TsuBadge, writeBadgeCache } from '@tsudev/ui';
import type { BadgeTone } from '@tsudev/ui';
import Seo from '../../components/Seo';
import { Notice } from '../../components/AuthShell';
import ProRenewalBanner from '../../components/ProRenewalBanner';
import { useLoader } from '../../lib/useLoader';
import { formatDateTimeVN, formatDateVN } from '../../lib/format';
import { PLAN_LABEL, STATUS_LABEL, payCall, payErr, previewBadge, vnd } from '../../lib/pay';
import type { BadgeDisplay, IntentStatus, PayStatus } from '../../lib/pay';

/**
 * Tài khoản → Huy hiệu & Pro (PRODUCT_POLICY 4.1, PRO-B bước B3): trạng thái Pro/Ủng hộ, chọn
 * cách hiển thị huy hiệu (`badgeDisplay`, lưu ở máy chủ quyền lợi - đồng bộ mọi app) có xem
 * trước bằng `<TsuBadge>`, và lịch sử mã thanh toán VietQR của chính mình.
 *
 * Lựa chọn hiện theo bảng 4.1: chỉ Pro ⇒ hiện/ẩn; chỉ Ủng hộ ⇒ hiện/ẩn; cả hai ⇒ Pro · Ủng hộ ·
 * Cả hai · Ẩn. Xem trước dùng `previewBadge` (bản sao `badgeFor` của auth-service) - giá trị
 * thật luôn là thứ máy chủ trả về sau khi lưu.
 */
const OPTIONS: {
  value: BadgeDisplay;
  label: string;
  when: (pro: boolean, donor: boolean) => boolean;
}[] = [
  { value: 'AUTO', label: 'Hiện (mặc định)', when: (p, d) => !(p && d) },
  { value: 'BOTH', label: 'Cả hai', when: (p, d) => p && d },
  { value: 'PRO', label: 'Chỉ Pro', when: (p, d) => p && d },
  { value: 'DONOR', label: 'Chỉ Ủng hộ', when: (p, d) => p && d },
  { value: 'HIDDEN', label: 'Ẩn', when: () => true },
];

const TONE: Record<IntentStatus, BadgeTone> = {
  pending: 'warning',
  confirmed: 'success',
  expired: 'neutral',
  rejected: 'danger',
};

export default function BadgeSettings() {
  const { data: session, status } = useSession();
  const [me, setMe] = useState<PayStatus | null>(null);
  const [choice, setChoice] = useState<BadgeDisplay>('AUTO');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const user = session?.user?.name || session?.user?.email || '';

  const load = useCallback(async (signal?: AbortSignal) => {
    const r = await payCall<PayStatus>('pay/status', {}, signal);
    if (signal?.aborted) return;
    if (!r.ok) return setMsg({ kind: 'error', text: payErr(r.data) });
    setMe(r.data);
    setChoice(r.data.badgeDisplay);
  }, []);
  useLoader(load, status === 'authenticated');

  if (status === 'loading')
    return (
      <Layout active="/settings">
        <Seo title="Huy hiệu & Pro" path="/settings/badge" noindex />
        <h1 className="sr-only">Huy hiệu và Pro</h1>
        <p className="text-sm text-fg-muted">Đang tải…</p>
      </Layout>
    );

  if (status !== 'authenticated')
    return (
      <Layout active="/settings">
        <Seo title="Huy hiệu & Pro" path="/settings/badge" noindex />
        <div className="mx-auto max-w-md">
          <h1 className="mb-4 text-xl font-semibold text-fg">Huy hiệu và Pro</h1>
          <Notice kind="error">Bạn cần đăng nhập để mở trang này.</Notice>
          <Button as="a" href="/login?callbackUrl=/settings/badge" className="mt-4 w-full">
            Đăng nhập
          </Button>
        </div>
      </Layout>
    );

  const pro = Boolean(me?.proActive);
  const donor = Boolean(me?.donor);
  const options = OPTIONS.filter((o) => o.when(pro, donor));
  // AUTO khi đủ cả hai = "Cả hai": gom về một nút để khỏi có hai lựa chọn giống hệt nhau.
  // Chỉ có một loại huy hiệu thì chỉ còn Hiện/Ẩn: lựa chọn PRO/DONOR/BOTH cũ quy về Hiện.
  const shown: BadgeDisplay =
    pro && donor ? (choice === 'AUTO' ? 'BOTH' : choice) : choice === 'HIDDEN' ? 'HIDDEN' : 'AUTO';

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const r = await payCall<{ badgeDisplay: BadgeDisplay; badge: PayStatus['badge'] }>(
      'pay/badge',
      { display: shown }
    );
    setSaving(false);
    if (!r.ok) return setMsg({ kind: 'error', text: payErr(r.data) });
    writeBadgeCache(user, r.data.badge);
    setMe((m) => (m ? { ...m, badgeDisplay: r.data.badgeDisplay, badge: r.data.badge } : m));
    setMsg({
      kind: 'ok',
      text: 'Đã lưu - mọi ứng dụng TsuDEV nhận lựa chọn này ở lần làm mới quyền lợi kế tiếp.',
    });
  };

  return (
    <Layout active="/settings">
      <Seo title="Huy hiệu & Pro" path="/settings/badge" noindex />
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-fg">Huy hiệu và Pro</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Quyền lợi gắn với tài khoản, dùng chung cho mọi ứng dụng TsuDEV.
        </p>

        {msg && (
          <div className="mt-4">
            <Notice kind={msg.kind}>{msg.text}</Notice>
          </div>
        )}

        <ProRenewalBanner proUntil={me?.proUntil} />

        <section
          className="mt-6 rounded-lg border border-line bg-surface p-5"
          aria-labelledby="trang-thai"
        >
          <h2 id="trang-thai" className="text-base font-semibold text-fg">
            Trạng thái
          </h2>
          {!me ? (
            <p className="mt-2 text-sm text-fg-muted">Đang tải…</p>
          ) : (
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[10rem_1fr]">
              <dt className="text-fg-secondary">TsuDEV Pro</dt>
              <dd className="text-fg">
                {pro ? (
                  <>Pro tới {formatDateVN(me.proUntil)}</>
                ) : me.proUntil ? (
                  <>Đã hết hạn ngày {formatDateVN(me.proUntil)}</>
                ) : (
                  'Chưa có'
                )}{' '}
                ·{' '}
                <a href="/pro" className="text-link hover:underline">
                  {pro ? 'Gia hạn' : 'Xem gói Pro'}
                </a>
              </dd>
              <dt className="text-fg-secondary">Ủng hộ</dt>
              <dd className="text-fg">
                {donor ? 'Đã ủng hộ - huy hiệu vĩnh viễn' : 'Chưa'}{' '}
                {!donor && (
                  <>
                    ·{' '}
                    <a href="/ung-ho" className="text-link hover:underline">
                      Ủng hộ
                    </a>
                  </>
                )}
              </dd>
            </dl>
          )}
        </section>

        <section
          className="mt-6 rounded-lg border border-line bg-surface p-5"
          aria-labelledby="huy-hieu"
        >
          <h2 id="huy-hieu" className="text-base font-semibold text-fg">
            Huy hiệu cạnh tên
          </h2>
          {me && !pro && !donor ? (
            <p className="mt-2 text-sm text-fg-secondary">
              Tài khoản chưa có huy hiệu nào. Huy hiệu Pro đi kèm gói Pro còn hạn; huy hiệu Ủng hộ
              có sau lần ủng hộ đã xác nhận đầu tiên.
            </p>
          ) : (
            me && (
              <>
                <fieldset className="mt-3 flex flex-wrap gap-2">
                  <legend className="sr-only">Cách hiển thị huy hiệu</legend>
                  {options.map((o) => (
                    <label
                      key={o.value}
                      className={`cursor-pointer rounded-md border px-3 py-2 text-sm transition-colors ${
                        shown === o.value
                          ? 'border-primary text-fg'
                          : 'border-line text-fg-secondary hover:border-line-strong'
                      }`}
                    >
                      <input
                        type="radio"
                        name="badge"
                        value={o.value}
                        checked={shown === o.value}
                        onChange={() => setChoice(o.value)}
                        className="sr-only"
                      />
                      {o.label}
                    </label>
                  ))}
                </fieldset>
                <div className="mt-4 flex items-center gap-2 rounded-md border border-line bg-subtle px-3 py-2.5 text-sm">
                  <span className="text-fg-muted">Xem trước:</span>
                  <span className="font-medium text-fg">{user}</span>
                  <TsuBadge badge={previewBadge(pro, donor, shown)} />
                  {previewBadge(pro, donor, shown) === 'none' && (
                    <span className="text-fg-muted">(không hiện huy hiệu)</span>
                  )}
                </div>
                <Button className="mt-4" onClick={save} disabled={saving}>
                  {saving ? 'Đang lưu…' : 'Lưu lựa chọn'}
                </Button>
              </>
            )
          )}
        </section>

        {me && me.intents.length > 0 && (
          <section className="mt-6" aria-labelledby="lich-su">
            <h2 id="lich-su" className="text-base font-semibold text-fg">
              Mã thanh toán gần đây
            </h2>
            <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface">
              {me.intents.map((i) => (
                <li
                  key={i.code}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm"
                >
                  <span className="font-mono text-fg">TSU {i.code}</span>
                  <span className="text-fg-secondary">{PLAN_LABEL[i.kind] ?? i.kind}</span>
                  <span className="font-mono text-fg-secondary">{vnd(i.amountVnd)}</span>
                  <Badge tone={TONE[i.status] ?? 'neutral'}>
                    {STATUS_LABEL[i.status] ?? i.status}
                  </Badge>
                  <span className="ml-auto text-xs text-fg-muted">
                    {i.status === 'pending'
                      ? `giữ tới ${formatDateTimeVN(i.expiresAt)}`
                      : formatDateTimeVN(i.confirmedAt || i.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Layout>
  );
}
