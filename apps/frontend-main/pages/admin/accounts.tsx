import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Seo from '../../components/Seo';
import { useSession, signIn } from 'next-auth/react';
import {
  Layout,
  Card,
  Button,
  Badge,
  SectionHeading,
  RecordFooter,
  Modal,
  Input,
} from '@tsudev/ui';
import type { BadgeTone } from '@tsudev/ui';
import { formatDateTimeVN } from '../../lib/format';
import { emailGraceRemainingMs } from '@tsudev/types';
import type { PageMeta } from '@tsudev/types';

import { useUrlPaging, useUrlPagingSync } from '../../lib/useUrlPaging';
import { EmailAliases } from '../../components/EmailAliases';
import { MfaRequiredNotice } from '../../components/MfaRequiredNotice';
import { isMfaRequired, isStepUpRequired, requestStepUp } from '../../lib/mfa';
import {
  AccountFilters,
  EMPTY_FILTER,
  OriginCell,
  isFilterEmpty,
  methodLabel,
  type AccountFilter,
  type Facets,
} from '../../components/AccountFilters';
import { useLoader } from '../../lib/useLoader';

// Trang quản lý tài khoản & phân quyền - CHỈ tài khoản OWNER (tsudev) dùng được.
//
// Cổng thật nằm ở auth-service (requireOwner, đọc User.role từ DB, fail closed);
// trang này chỉ là giao diện. Vì thế gating ở đây bám theo PHẢN HỒI của backend
// (401/403) chứ không tin `session.role` - `token.role` của next-auth chỉ ghi ở
// lần đăng nhập đầu nên có thể cũ (xem gotcha ở CLAUDE.md). Backend luôn là nơi
// quyết định; giao diện chỉ hiển thị cho đúng.

// OWNER cố ý VẮNG MẶT khỏi danh sách cấp được: bậc cao nhất chỉ đến từ seed/DB.
// VIP gỡ khỏi danh sách cùng Con dấu (04/11/2026) - khớp ASSIGNABLE_ROLES của
// auth-service. Tài khoản cũ đang mang VIP vẫn HIỂN THỊ đúng nhờ ROLE_LABEL.
const ASSIGNABLE: { value: string; label: string }[] = [
  { value: 'MEMBER', label: 'Thành viên' },
  { value: 'AUTHOR', label: 'Đăng bài' },
  { value: 'MODERATOR', label: 'Điều hành' },
  { value: 'ADMIN', label: 'Quản trị' },
];

const ROLE_LABEL: Record<string, string> = {
  GUEST: 'Khách',
  MEMBER: 'Thành viên',
  AUTHOR: 'Đăng bài',
  VIP: 'VIP (cũ)',
  MODERATOR: 'Điều hành',
  ADMIN: 'Quản trị',
  OWNER: 'Chủ sở hữu',
};

const ROLE_TONE: Record<string, BadgeTone> = {
  GUEST: 'neutral',
  MEMBER: 'neutral',
  AUTHOR: 'success',
  VIP: 'teal',
  MODERATOR: 'info',
  ADMIN: 'warning',
  OWNER: 'brand',
};

interface AccountRow {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  /** Dấu vết lần đăng nhập gần nhất - xem ghi chú trên `User` ở schema. */
  lastLoginIp: string | null;
  lastLoginCountry: string | null;
  lastLoginMethod: string | null;
  lockedUntil: string | null;
  /** NĂNG LỰC đăng nhập, không phải lần cuối dùng cách nào. */
  loginMethods?: string[];
  twoFactorEnabled: boolean;
  deactivatedAt: string | null;
  deletionScheduledAt: string | null;
}

/**
 * `<input type="date">` cho ra 'YYYY-MM-DD', mà `new Date('2026-08-25')` là nửa
 * đêm UTC - tức ĐẦU ngày. Dùng thẳng làm cận trên thì "đến 25/08" loại sạch mọi
 * bản ghi tạo trong chính ngày 25, và bảng chỉ trông như ít người hơn thực tế.
 */
const endOfDay = (d: string): string => (d ? `${d}T23:59:59.999Z` : '');

const inputCls =
  'w-full rounded-md border border-line bg-base px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-primary outline-none';
const labelCls = 'block text-sm font-medium text-fg-secondary mb-1.5';

const ERR: Record<string, string> = {
  invalid_username: 'Tên đăng nhập không hợp lệ (3-32 ký tự, chữ thường/số/._-).',
  invalid_email: 'Email không hợp lệ.',
  invalid_role: 'Vai trò không hợp lệ.',
  invalid_displayName: 'Tên hiển thị không được trống.',
  weak_password: 'Mật khẩu chưa đủ mạnh.',
  username_taken: 'Tên đăng nhập đã có người dùng.',
  email_taken: 'Email đã được đăng ký.',
  cannot_change_self: 'Không thể tự đổi vai trò của chính mình.',
  cannot_delete_self: 'Không thể tự xoá tài khoản của chính mình.',
  cannot_target_owner: 'Không thao tác được lên tài khoản chủ sở hữu.',
  has_linked_records: 'Tài khoản có dữ liệu liên kết - hãy thu hồi vai trò và phiên thay vì xoá.',
  not_found: 'Không tìm thấy tài khoản.',
  forbidden: 'Chỉ tài khoản chủ sở hữu mới vào được trang này.',
};

async function call(action: string, body: Record<string, unknown>) {
  const r = await fetch(`/api/account/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data } as const;
}

/**
 * Token step-up còn dùng được (chừa 15 giây cho độ trễ mạng), hay phải hỏi lại.
 * Đặt ngoài component: đọc đồng hồ là thao tác không thuần, chỉ được nằm trong
 * handler, không nằm trong thân component.
 */
function stillValidToken(c: { token: string; expiresAt: number } | null): string | null {
  return c && c.expiresAt - 15_000 > Date.now() ? c.token : null;
}

/** Hạn của token do máy chủ trả; đọc hỏng thì giả định 4 phút (máy chủ cấp 5). */
function expiryOrDefault(parsed: number): number {
  return Number.isFinite(parsed) ? parsed : Date.now() + 4 * 60_000;
}

export default function AdminAccounts() {
  const { status } = useSession();
  const [rows, setRows] = useState<AccountRow[]>([]);
  // URL thắng lựa chọn đã nhớ, và lựa chọn đã nhớ thắng mặc định 10 (mục 5).
  const paging = useUrlPaging('admin-accounts');
  const { page, setPage, pageSize, setPageSize, meta } = paging;
  useUrlPagingSync([paging]);
  const [denied, setDenied] = useState(false);
  /// 403 MFA_REQUIRED: là OWNER nhưng chưa bật 2FA - KHÁC "không có quyền", và
  /// thay cả trang bằng hướng dẫn bật 2FA, thôi gọi API từ đó.
  const [mfaRequired, setMfaRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AccountFilter>(EMPTY_FILTER);
  const [facets, setFacets] = useState<Facets>({ role: [], country: [] });
  const [totalUnfiltered, setTotalUnfiltered] = useState(0);
  /**
   * Các hàng đang chọn, giữ theo ID chứ không theo chỉ số.
   *
   * Chỉ số thì đổi nghĩa mỗi lần lật trang hoặc đổi bộ lọc, và thao tác hàng
   * loạt khi đó sẽ áp lên NHỮNG NGƯỜI KHÁC với những người đang hiện sáng - một
   * lỗi không có cách nào lấy lại được sau khi bấm.
   */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  /**
   * Xác thực lại (step-up, G7). Đổi vai trò và xoá tài khoản đòi mã TOTP < 5
   * phút. Token giữ trong bộ nhớ trang (KHÔNG localStorage) để vài thao tác liền
   * nhau không phải gõ mã lại; máy chủ vẫn là nơi quyết định - hết hạn hay bị
   * thu hồi thì nó trả STEP_UP_REQUIRED và hộp nhập mã mở lại.
   */
  const stepUpRef = useRef<{ token: string; expiresAt: number } | null>(null);
  const [stepUpPrompt, setStepUpPrompt] = useState<{
    label: string;
    run: (token: string) => Promise<void>;
  } | null>(null);
  const [stepUpCode, setStepUpCode] = useState('');
  const [stepUpError, setStepUpError] = useState('');
  const [stepUpBusy, setStepUpBusy] = useState(false);

  // Khoá phụ thuộc của `load`. Dùng chuỗi hoá thay vì chính object: `filter` là
  // object mới mỗi lần dựng, nên đặt nó vào deps là tải lại vô hạn.
  const filterKey = useMemo(() => JSON.stringify(filter), [filter]);

  // Những hàng thao tác hàng loạt CHẠM ĐƯỢC trên trang này. OWNER bị loại ở
  // đây, cùng chỗ với ô kiểm - để "chọn tất cả" không bao giờ đưa OWNER vào một
  // danh sách rồi mới bị máy chủ từ chối từng cái một.
  const selectableIds = useMemo(
    () => rows.filter((u) => u.role !== 'OWNER').map((u) => u.id),
    [rows]
  );

  const router = useRouter();
  const [filterAdopted, setFilterAdopted] = useState(false);

  // Đọc bộ lọc TỪ URL, cùng bẫy với phân trang: `router.query` rỗng ở lần dựng
  // đầu trên trang tối ưu tĩnh, nên phải chờ `isReady` rồi mới nhận - và effect
  // ghi ngược bên dưới chỉ chạy SAU khi đã nhận, nếu không nó xoá bộ lọc trong
  // liên kết mà người ta vừa mở. Nhận ngay trong render (không trong effect) nên
  // effect ghi ngược thấy luôn bộ lọc đã nhận, không thấy bộ lọc rỗng trước đó.
  if (router.isReady && !filterAdopted) {
    setFilterAdopted(true);
    const one = (k: string) =>
      typeof router.query[k] === 'string' ? (router.query[k] as string) : '';
    const many = (k: string) => {
      const v = router.query[k];
      if (Array.isArray(v)) return v;
      return typeof v === 'string' && v ? v.split(',').filter(Boolean) : [];
    };
    const fromUrl: AccountFilter = {
      q: one('q'),
      ip: one('ip'),
      createdFrom: one('createdFrom'),
      createdTo: one('createdTo'),
      lastLoginFrom: one('lastLoginFrom'),
      lastLoginTo: one('lastLoginTo'),
      role: many('role'),
      loginMethods: many('loginMethods'),
      country: many('country'),
      status: many('status'),
    };
    if (!isFilterEmpty(fromUrl)) setFilter(fromUrl);
  }

  // Ghi bộ lọc lên URL. Tham số rỗng bị XOÁ khỏi URL thay vì để `?q=`: URL là
  // thứ người ta gửi cho nhau, và một chuỗi đầy tham số rỗng thì không đọc được.
  useEffect(() => {
    if (!router.isReady || !filterAdopted) return;
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(filter)) {
      const encoded = Array.isArray(v) ? v.join(',') : String(v ?? '');
      if (encoded) next[k] = encoded;
    }
    const keys = Object.keys(EMPTY_FILTER);
    const current = { ...router.query };
    for (const k of keys) delete current[k];
    const merged = { ...current, ...next };
    if (JSON.stringify(merged) === JSON.stringify(router.query)) return;
    router.replace({ pathname: router.pathname, query: merged }, undefined, { shallow: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, router.isReady, filterAdopted]);

  /**
   * Đổi bộ lọc là ĐỔI TẬP KẾT QUẢ ⇒ về trang 1 và bỏ chọn hết.
   *
   * Giữ nguyên trang 7 thì bộ lọc mới gần như luôn rỗng và trông y hệt "không
   * tìm thấy ai". Giữ nguyên lựa chọn còn tệ hơn: người dùng thấy 0 hàng sáng
   * mà thanh thao tác vẫn nói "đã chọn 12" - rồi bấm.
   */
  const prevFilterKey = useRef(filterKey);
  useEffect(() => {
    if (prevFilterKey.current === filterKey) return;
    prevFilterKey.current = filterKey;
    setPage(1);
    setSelected(new Set());
  }, [filterKey, setPage]);
  /**
   * Đã tải xong ít nhất một lần chưa.
   *
   * Tách khỏi `loading` vì hai trạng thái đó đòi hai cách hiển thị khác hẳn:
   * lần ĐẦU được phép thay cả trang bằng "Đang tải…", còn mỗi lần TẢI LẠI (đổi
   * trang, đổi mốc) thì bảng phải giữ nguyên chiều cao và bộ chọn phải mờ đi
   * chứ KHÔNG biến mất (DATA_TABLE.md mục 4). Dùng chung một cờ thì mỗi lần lật
   * trang cả trang chớp một cái và tiêu điểm trên bộ chọn bị mất.
   */
  const [booted, setBooted] = useState(false);
  const [msg, setMsg] = useState<{ tone: BadgeTone; text: string } | null>(null);

  // Form tạo tài khoản
  const [form, setForm] = useState({
    username: '',
    email: '',
    displayName: '',
    password: '',
    role: 'AUTHOR',
  });
  const [creating, setCreating] = useState(false);

  const flash = (tone: BadgeTone, text: string) => setMsg({ tone, text });
  const flashErr = (data: { error?: string; detail?: string }) =>
    flash('danger', ERR[data?.error || ''] || data?.detail || data?.error || 'Có lỗi xảy ra.');
  const fail = (r: { status: number; data: { error?: string; detail?: string } }) =>
    isMfaRequired(r.status, r.data) ? setMfaRequired(true) : flashErr(r.data);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!paging.ready || mfaRequired) return;
      setLoading(true);
      // Đổi mốc PHẢI tải lại từ máy chủ (DATA_TABLE.md mục 4). Tải sẵn 200 dòng
      // rồi cắt ở máy khách thì mốc 10 không tiết kiệm được gì.
      const r = await call('useradmin/list', {
        page,
        page_size: pageSize,
        // Ngày từ <input type="date"> là 'YYYY-MM-DD' = nửa đêm UTC. `createdTo`
        // phải là CUỐI ngày, không thì chọn "đến 25/08" loại hết tài khoản tạo
        // trong chính ngày 25 - và bảng trông như thiếu người.
        ...filter,
        createdTo: endOfDay(filter.createdTo),
        lastLoginTo: endOfDay(filter.lastLoginTo),
      });
      if (signal?.aborted) return;
      setLoading(false);
      setBooted(true);
      if (isMfaRequired(r.status, r.data)) {
        setMfaRequired(true);
        return;
      }
      if (r.status === 401 || r.status === 403) {
        setDenied(true);
        return;
      }
      const body = r.data as {
        data?: AccountRow[];
        meta?: PageMeta;
        facets?: Facets;
        total_unfiltered?: number;
      };
      if (Array.isArray(body?.data)) setRows(body.data);
      if (body?.meta) paging.setMeta(body.meta);
      if (body?.facets) setFacets(body.facets);
      if (typeof body?.total_unfiltered === 'number') setTotalUnfiltered(body.total_unfiltered);
    },
    // `paging` cố ý không nằm trong deps: nó là object mới mỗi lần dựng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, pageSize, paging.ready, filterKey, mfaRequired]
  );

  useLoader(load, status === 'authenticated');

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const r = await call('useradmin/create', form);
    setCreating(false);
    if (!r.ok) return fail(r);
    flash('success', `Đã tạo tài khoản "${form.username}".`);
    setForm({ username: '', email: '', displayName: '', password: '', role: 'AUTHOR' });
    load();
  }

  /**
   * Gọi một thao tác đòi step-up. Có token còn hạn thì dùng luôn; máy chủ đòi
   * xác thực lại (thiếu/hết hạn) thì mở hộp nhập TOTP rồi chạy lại đúng thao tác
   * đó sau khi có token mới.
   */
  async function guarded(
    action: 'useradmin/role' | 'useradmin/delete',
    body: Record<string, unknown>,
    label: string,
    onOk: () => void
  ) {
    const attempt = async (token: string | null) => {
      const r = await call(action, token ? { ...body, stepUp: token } : body);
      if (isStepUpRequired(r.status, r.data)) {
        stepUpRef.current = null;
        setStepUpCode('');
        setStepUpError(token ? 'Phiên xác thực lại đã hết hạn - nhập mã TOTP mới.' : '');
        setStepUpPrompt({ label, run: (t) => attempt(t) });
        return;
      }
      setStepUpPrompt(null);
      if (!r.ok) return fail(r);
      onOk();
    };
    const cached = stepUpRef.current;
    await attempt(stillValidToken(cached));
  }

  async function submitStepUp(e: React.FormEvent) {
    e.preventDefault();
    if (!stepUpPrompt) return;
    if (!/^\d{6}$/.test(stepUpCode.trim())) return setStepUpError('Nhập mã TOTP 6 chữ số.');
    setStepUpBusy(true);
    setStepUpError('');
    const got = await requestStepUp(stepUpCode.trim());
    if (!got) {
      setStepUpBusy(false);
      return setStepUpError('Mã TOTP không đúng hoặc đã hết hạn.');
    }
    const exp = Date.parse(got.expiresAt);
    stepUpRef.current = {
      token: got.token,
      expiresAt: expiryOrDefault(exp),
    };
    await stepUpPrompt.run(got.token);
    setStepUpBusy(false);
  }

  async function changeRole(u: AccountRow, role: string) {
    if (role === u.role) return;
    await guarded(
      'useradmin/role',
      { id: u.id, role },
      `Đổi vai trò của "${u.username}" → ${ROLE_LABEL[role]}`,
      () => {
        flash('success', `Vai trò của "${u.username}" → ${ROLE_LABEL[role]}.`);
        load();
      }
    );
  }

  async function revoke(u: AccountRow) {
    if (
      !confirm(
        `Thu hồi mọi phiên của "${u.username}"? Tài khoản sẽ bị đăng xuất khỏi mọi thiết bị.`
      )
    )
      return;
    const r = await call('useradmin/revoke', { id: u.id });
    if (!r.ok) return fail(r);
    flash('success', `Đã thu hồi phiên của "${u.username}".`);
  }

  /**
   * Thu hồi phiên cho nhiều tài khoản.
   *
   * Chạy TUẦN TỰ chứ không `Promise.all`: đây là đường ghi vào bảng người dùng,
   * và bắn 200 request song song vào auth-service để tiết kiệm vài giây là đổi
   * một tiện nghi lấy nguy cơ nghẽn chính dịch vụ đăng nhập. Đếm cả số hỏng và
   * báo lại - "đã thu hồi 200" trong khi 37 cái thất bại là một câu nói dối mà
   * người vận hành sẽ tin.
   */
  async function bulkRevoke() {
    const ids = [...selected];
    const targets = rows.filter((u) => ids.includes(u.id) && u.role !== 'OWNER');
    if (targets.length === 0) return;
    if (
      !confirm(
        `Thu hồi mọi phiên của ${targets.length} tài khoản? Họ sẽ bị đăng xuất khỏi mọi thiết bị.`
      )
    )
      return;
    setBulkBusy(true);
    let done = 0;
    let failed = 0;
    for (const u of targets) {
      const r = await call('useradmin/revoke', { id: u.id });
      // Dừng ở lỗi ĐẦU: chưa bật 2FA thì mọi tài khoản còn lại cũng bị chặn y hệt.
      if (isMfaRequired(r.status, r.data)) {
        setBulkBusy(false);
        setMfaRequired(true);
        return;
      }
      if (r.ok) done++;
      else failed++;
    }
    setBulkBusy(false);
    setSelected(new Set());
    if (failed === 0) flash('success', `Đã thu hồi phiên của ${done} tài khoản.`);
    else flash('warning', `Đã thu hồi ${done} tài khoản, ${failed} tài khoản thất bại.`);
  }

  async function remove(u: AccountRow) {
    if (!confirm(`Xoá vĩnh viễn tài khoản "${u.username}"? Không thể hoàn tác.`)) return;
    await guarded('useradmin/delete', { id: u.id }, `Xoá vĩnh viễn "${u.username}"`, () => {
      flash('success', `Đã xoá tài khoản "${u.username}".`);
      load();
    });
  }

  if (status === 'loading' || (status === 'authenticated' && !booted && loading))
    return (
      <Layout>
        <Seo title="Quản lý tài khoản" path="/admin/accounts" noindex />
        <Card className="p-8 text-center text-fg-muted">Đang tải…</Card>
      </Layout>
    );

  if (status === 'unauthenticated')
    return (
      <Layout>
        <Seo title="Quản lý tài khoản" path="/admin/accounts" noindex />
        <Card className="mx-auto max-w-md p-8 text-center">
          <p className="mb-4 text-fg-secondary">Bạn cần đăng nhập để tiếp tục.</p>
          <Button onClick={() => signIn()} size="lg">
            Đăng nhập
          </Button>
        </Card>
      </Layout>
    );

  if (mfaRequired)
    return (
      <Layout>
        <Seo title="Quản lý tài khoản" path="/admin/accounts" noindex />
        <MfaRequiredNotice />
      </Layout>
    );

  if (denied)
    return (
      <Layout>
        <Seo title="Quản lý tài khoản" path="/admin/accounts" noindex />
        <Card className="mx-auto max-w-md p-8 text-center">
          <h1 className="mb-2 text-lg font-semibold text-fg">Không có quyền</h1>
          <p className="text-fg-secondary">Trang này chỉ dành cho tài khoản chủ sở hữu (tsudev).</p>
        </Card>
      </Layout>
    );

  return (
    <Layout>
      <Seo title="Quản lý tài khoản" path="/admin/accounts" noindex />
      <SectionHeading eyebrow="Chủ sở hữu" title="Quản lý tài khoản" />
      <p className="mt-2 text-sm text-fg-muted">
        Tạo tài khoản, phân quyền, thu hồi vai trò và phiên. Chỉ chủ sở hữu (tsudev) dùng được.
      </p>

      {msg && (
        <div className="mt-4">
          <Badge tone={msg.tone}>{msg.text}</Badge>
        </div>
      )}

      {/* Tạo tài khoản mới */}
      <Card className="mt-6 p-6">
        <h2 className="mb-4 text-base font-semibold text-fg">Tạo tài khoản mới</h2>
        <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Tên đăng nhập</span>
            <input
              className={inputCls}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="vd: tacgia01"
              autoComplete="off"
            />
          </label>
          <label className="block">
            <span className={labelCls}>Email</span>
            <input
              className={inputCls}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="vd: tacgia@tsudev.com"
              autoComplete="off"
            />
          </label>
          <label className="block">
            <span className={labelCls}>Tên hiển thị</span>
            <input
              className={inputCls}
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="Để trống = dùng tên đăng nhập"
            />
          </label>
          <label className="block">
            <span className={labelCls}>Vai trò</span>
            <select
              className={inputCls}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {ASSIGNABLE.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Mật khẩu ban đầu</span>
            <input
              className={inputCls}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Người dùng có thể tự đổi sau khi đăng nhập"
              autoComplete="new-password"
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={creating}>
              {creating ? 'Đang tạo…' : 'Tạo tài khoản'}
            </Button>
          </div>
        </form>
      </Card>

      <EmailAliases
        onMessage={(tone, text) => flash(tone as BadgeTone, text)}
        onMfaRequired={() => setMfaRequired(true)}
      />

      <Card className="mt-6 p-4">
        <AccountFilters value={filter} onChange={setFilter} facets={facets} busy={loading} />
      </Card>

      {/* Danh sách tài khoản */}
      <Card className="mt-6 p-0">
        {/*
          Vùng cuộn ngang PHẢI có tabindex và nhãn để cuộn được bằng bàn phím
          (DATA_TABLE.md mục 7). Nó bọc RIÊNG cái bảng - chân vùng bản ghi nằm
          NGOÀI nó, nếu không chân sẽ trôi ngang theo bảng và bộ chọn biến mất
          khỏi màn hình đúng lúc người dùng cần nó.
        */}
        <div
          tabIndex={0}
          role="region"
          aria-label="Bảng tài khoản (cuộn ngang được)"
          className="overflow-x-auto"
        >
          <table className="w-full min-w-[720px] text-sm" aria-busy={loading}>
            <thead>
              <tr className="border-b border-line text-left text-fg-muted">
                <th className="w-10 px-4 py-3 font-medium">
                  <input
                    type="checkbox"
                    aria-label="Chọn mọi tài khoản trên trang này"
                    // "Chọn tất cả" chỉ chọn TRANG NÀY, không phải toàn bộ kết
                    // quả lọc. Hộp kiểm nằm trong bảng thì nó nói về bảng; một ô
                    // kiểm âm thầm chọn 4.000 người là cách gây ra thao tác mà
                    // không ai lấy lại được.
                    checked={
                      selectableIds.length > 0 && selectableIds.every((id) => selected.has(id))
                    }
                    onChange={(e) =>
                      setSelected(e.target.checked ? new Set(selectableIds) : new Set())
                    }
                  />
                </th>
                <th className="px-4 py-3 font-medium">Tài khoản</th>
                <th className="px-4 py-3 font-medium">Vai trò</th>
                <th className="px-4 py-3 font-medium">Đăng nhập được bằng</th>
                <th className="px-4 py-3 font-medium">Nơi đăng nhập gần nhất</th>
                <th className="px-4 py-3 font-medium">Tạo lúc</th>
                <th className="px-4 py-3 font-medium">Đăng nhập gần nhất</th>
                <th className="px-4 py-3 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                rows.map((u) => {
                  const isOwner = u.role === 'OWNER';
                  return (
                    <tr key={u.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3">
                        {/* OWNER không thao tác hàng loạt được - cùng luật với
                            nút Xoá/Thu hồi từng hàng. Ẩn ô kiểm thay vì để nó
                            bấm được rồi lọc ra sau: hiện lên là hứa. */}
                        {!isOwner && (
                          <input
                            type="checkbox"
                            aria-label={`Chọn tài khoản ${u.username}`}
                            checked={selected.has(u.id)}
                            onChange={(e) =>
                              setSelected((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(u.id);
                                else next.delete(u.id);
                                return next;
                              })
                            }
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-fg">{u.displayName || u.username}</div>
                        <div className="text-fg-muted">
                          @{u.username} · {u.email}
                          {!u.emailVerified &&
                            (emailGraceRemainingMs(null, u.createdAt) > 0
                              ? ' · chưa xác minh (còn ân hạn)'
                              : ' · chưa xác minh (quá hạn)')}
                          {u.deletionScheduledAt ? (
                            <span className="text-danger"> · hẹn xoá</span>
                          ) : u.deactivatedAt ? (
                            <span className="text-warning"> · vô hiệu hoá</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isOwner ? (
                          <Badge tone={ROLE_TONE.OWNER}>{ROLE_LABEL.OWNER}</Badge>
                        ) : (
                          <select
                            className={inputCls + ' w-auto py-1.5'}
                            value={u.role}
                            onChange={(e) => changeRole(u, e.target.value)}
                          >
                            {ASSIGNABLE.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {(u.loginMethods ?? []).map((m) => (
                            <Badge key={m} tone="neutral">
                              {methodLabel(m)}
                            </Badge>
                          ))}
                          {(u.loginMethods ?? []).length === 0 && (
                            <span className="text-fg-muted">chưa đặt</span>
                          )}
                          {u.twoFactorEnabled && <Badge tone="success">2FA</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-fg-secondary">
                        <OriginCell ip={u.lastLoginIp} country={u.lastLoginCountry} />
                      </td>
                      <td className="px-4 py-3 text-fg-secondary">
                        {formatDateTimeVN(u.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-fg-secondary">
                        {u.lastLoginAt ? (
                          <>
                            {formatDateTimeVN(u.lastLoginAt)}
                            {u.lastLoginMethod && (
                              <div className="text-xs text-fg-muted">
                                bằng {methodLabel(u.lastLoginMethod.replace(/^oauth:/, ''))}
                              </div>
                            )}
                          </>
                        ) : (
                          // Ô này từng VĨNH VIỄN trống với tài khoản chỉ dùng
                          // GitHub/Google, vì đường OAuth không ghi gì cả. Nay
                          // nó ghi - nên trống thật sự nghĩa là chưa đăng nhập
                          // lại kể từ 26/08/2026.
                          <span className="text-fg-muted">chưa có</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isOwner ? (
                          <span className="text-fg-muted">-</span>
                        ) : (
                          <div className="flex gap-2">
                            <Button variant="secondary" size="sm" onClick={() => revoke(u)}>
                              Thu hồi phiên
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => remove(u)}>
                              Xoá
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              {/*
              Khung xương ĐÚNG SỐ DÒNG của trang đang tải (mục 4): bảng giữ
              nguyên chiều cao thay vì co lại rồi giãn ra. Trang nhảy là lỗi bố
              cục, không phải hiệu ứng.
            */}
              {loading &&
                Array.from({ length: Math.max(1, Math.min(pageSize, meta.total || pageSize)) }).map(
                  (_, i) => (
                    <tr key={`skel-${i}`} className="border-b border-line last:border-0">
                      <td colSpan={8} className="px-4 py-3">
                        <span className="block h-4 w-full animate-pulse rounded bg-hovered" />
                      </td>
                    </tr>
                  )
                )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-fg-muted">
                    Chưa có tài khoản nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line bg-subtle px-4 py-3">
            <span className="text-sm text-fg-secondary">
              Đã chọn {selected.size.toLocaleString('vi-VN')} tài khoản trên trang này
            </span>
            <Button variant="secondary" size="sm" disabled={bulkBusy} onClick={bulkRevoke}>
              {bulkBusy ? 'Đang thu hồi…' : 'Thu hồi phiên'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Bỏ chọn
            </Button>
          </div>
        )}
        <RecordFooter
          meta={meta}
          pageSize={pageSize}
          loading={loading}
          label="tài khoản"
          totalUnfiltered={isFilterEmpty(filter) ? undefined : totalUnfiltered}
          selectedCount={selected.size}
          onClearSelection={() => setSelected(new Set())}
          onPageSize={(size, nextPage) => {
            setPageSize(size);
            setPage(nextPage);
          }}
          onPage={setPage}
        />
      </Card>
      <Modal
        open={stepUpPrompt !== null}
        onClose={() => setStepUpPrompt(null)}
        title="Xác thực lại"
      >
        {stepUpPrompt && (
          <form className="space-y-4" onSubmit={submitStepUp}>
            <p className="text-sm text-fg-secondary">
              {stepUpPrompt.label}. Thao tác này cần mã TOTP từ ứng dụng xác thực; mã đổi lấy phiên
              xác thực lại 5 phút.
            </p>
            <Input
              id="ua-stepup-code"
              label="Mã TOTP"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={stepUpCode}
              onChange={(e) => setStepUpCode(e.target.value)}
              placeholder="6 chữ số"
            />
            {stepUpError && (
              <p className="text-sm text-danger-ink" role="alert">
                {stepUpError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setStepUpPrompt(null)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={stepUpBusy}>
                {stepUpBusy ? 'Đang xử lý…' : 'Xác nhận'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </Layout>
  );
}
