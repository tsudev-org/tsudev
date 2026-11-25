import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Badge, Button, Icon, Input } from '@tsudev/ui';

import { WorkspaceLayout } from '../../../components/WorkspaceLayout';
import { Notice } from '../../../components/AuthShell';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { MfaRequiredNotice } from '../../../components/MfaRequiredNotice';
import { ShortcutsDialog } from '../../../components/editor/ShortcutsDialog';
import { formatDateTimeVN, formatTimeVN } from '../../../lib/format';
import { isMfaRequired } from '../../../lib/mfa';
import { useLoader } from '../../../lib/useLoader';
import { STATUS_LABEL, type PostStatus as Status } from '../../../lib/postStatus';
import type { Device } from '../../../components/editor/PostInsights';

// Trình soạn Tiptap nặng (~150 KB gzip cùng bảng + menu nổi) - nạp lười để trang
// giữ ngân sách JS tải ban đầu ≤ 170 KB (`npm run budget:js`, .standards
// LANGUAGE_SELECTION 5.1). Chỉ chạy ở trình duyệt: Tiptap cần DOM.
const MarkdownEditor = dynamic(
  () => import('../../../components/MarkdownEditor').then((m) => m.MarkdownEditor),
  {
    ssr: false,
    loading: () => (
      <p className="rounded-lg border border-line p-4 text-sm text-fg-muted" role="status">
        Đang nạp trình soạn…
      </p>
    ),
  }
);
// Xem trước + Kiểm tra cần `marked` - chunk lười thứ hai, tách khỏi Tiptap.
const PostPreview = dynamic(
  () => import('../../../components/editor/PostInsights').then((m) => m.PostPreview),
  { ssr: false }
);
const PostChecks = dynamic(
  () => import('../../../components/editor/PostInsights').then((m) => m.PostChecks),
  { ssr: false }
);

/**
 * Trang soạn bài (P2.3 → UX1-b/PR 4.6): trái trình soạn Tiptap (D3, ra Markdown)
 * hoặc Xem trước, phải hộp Xuất bản / Kiểm tra / Phân loại / Nguồn / SEO.
 * `/studio/posts/new` = bài mới; lưu lần đầu thì URL đổi sang slug thật.
 *
 * Tự lưu (ED-08): 30 giây sau thay đổi đầu tiên, CHỈ khi bài là BẢN NHÁP, qua
 * `POST …/autosave` - endpoint gộp bản lịch sử trong 10 phút. PATCH thường tạo
 * MỘT `PostRevision` mỗi lần, nên tự lưu bằng PATCH là đổ rác vào lịch sử. Bài
 * đã đăng không tự lưu: mỗi lần lưu kéo bài về chờ duyệt (postWorkflow.editedStatus).
 *
 * Mọi lần ghi gửi `updatedAt` đã đọc (ED-10): máy chủ trả 409 `edit_conflict` khi
 * bài bị sửa ở nơi khác, trang mở hộp "Bài đã được sửa lúc HH:mm bởi X".
 */
type Ref = { label: string; url: string };
type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  contentMd: string;
  tags: string[];
  status: Status;
  reviewNote: string | null;
  categoryId: string | null;
  publishedAt: string | null;
  coverImageUrl: string | null;
  metaDescription: string | null;
  references?: Ref[];
  updatedAt: string;
};
type Category = { id: string; name: string };
type Form = {
  title: string;
  slug: string;
  contentMd: string;
  excerpt: string;
  tags: string;
  categoryId: string;
  coverImageUrl: string;
  metaDescription: string;
  publishedAt: string;
  references: Ref[];
};

const EMPTY: Form = {
  title: '',
  slug: '',
  contentMd: '',
  excerpt: '',
  tags: '',
  categoryId: '',
  coverImageUrl: '',
  metaDescription: '',
  publishedAt: '',
  references: [],
};

/** Trường mà endpoint autosave nhận - phần còn lại chỉ lưu khi bấm Lưu. */
const AUTO_FIELDS = ['title', 'contentMd', 'excerpt'] as const;
const AUTOSAVE_MS = 30_000;
const META_MAX = 160;
const toLocal = (iso: string | null) =>
  iso
    ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : '';
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

const fromPost = (p: Post): Form => ({
  title: p.title,
  slug: p.slug,
  contentMd: p.contentMd,
  excerpt: p.excerpt ?? '',
  tags: p.tags.join(', '),
  categoryId: p.categoryId ?? '',
  coverImageUrl: p.coverImageUrl ?? '',
  metaDescription: p.metaDescription ?? '',
  publishedAt: toLocal(p.publishedAt),
  references: (p.references ?? []).map((r) => ({ label: r.label ?? '', url: r.url ?? '' })),
});

const cleanRefs = (refs: Ref[]) =>
  refs.map((r) => ({ label: r.label.trim(), url: r.url.trim() })).filter((r) => r.url);

const toBody = (f: Form) => ({
  title: f.title.trim(),
  ...(f.slug.trim() ? { slug: f.slug.trim() } : {}),
  contentMd: f.contentMd,
  excerpt: f.excerpt.trim() || null,
  tags: f.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean),
  categoryId: f.categoryId || null,
  coverImageUrl: f.coverImageUrl.trim() || null,
  metaDescription: f.metaDescription.trim() || null,
  publishedAt: fromLocal(f.publishedAt),
  references: cleanRefs(f.references),
});

const same = (a: Form, b: Form, keys?: readonly (keyof Form)[]) =>
  (keys ?? (Object.keys(a) as (keyof Form)[])).every(
    (k) => JSON.stringify(a[k]) === JSON.stringify(b[k])
  );

async function api(path: string, method = 'GET', body?: unknown) {
  const res = await fetch(`/api/content/author/${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data: data as Record<string, unknown> };
}

type Conflict = { updatedAt: string; lastEditor: string | null };

export default function StudioPostEditor() {
  const router = useRouter();
  const { status: auth } = useSession();
  const slugParam = typeof router.query.slug === 'string' ? router.query.slug : '';
  const isNew = slugParam === 'new';

  const [post, setPost] = useState<Post | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  // Ảnh chụp form ở lần lưu thành công gần nhất - "chưa lưu" là SO VỚI nó, không
  // phải một cờ bật khi gõ: gõ rồi xoá về như cũ thì không còn gì để lưu.
  const [saved, setSaved] = useState<Form>(EMPTY);
  const [cats, setCats] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [mfa, setMfa] = useState(false);
  const [resetKey, setResetKey] = useState('init');
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [device, setDevice] = useState<Device>('desktop');
  const [help, setHelp] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const [autoOff, setAutoOff] = useState(false);

  const dirty = !same(form, saved);
  const dirtyAuto = !same(form, saved, AUTO_FIELDS);

  const formRef = useRef(form);
  const postRef = useRef(post);
  const dirtyRef = useRef(dirty);
  const leavingRef = useRef(false);
  useEffect(() => {
    formRef.current = form;
    postRef.current = post;
    dirtyRef.current = dirty;
  }, [form, post, dirty]);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!router.isReady) return;
      const c = await fetch('/api/content/author/categories', { signal }).catch(() => null);
      if (signal?.aborted) return;
      if (c?.ok) setCats(await c.json());
      if (isNew) {
        setResetKey('new');
        return;
      }
      const r = await api(`posts/${encodeURIComponent(slugParam)}`);
      if (signal?.aborted) return;
      if (!r.ok)
        return setMsg({
          kind: 'error',
          text: 'Không mở được bài (không có hoặc không phải của bạn).',
        });
      const p = r.data as unknown as Post;
      setPost(p);
      setForm(fromPost(p));
      setSaved(fromPost(p));
      setResetKey(p.id + p.updatedAt);
    },
    [router.isReady, slugParam, isNew]
  );
  useLoader(load, auth === 'authenticated');

  /** Kết quả ghi chung: MFA, 409 sửa chồng, lỗi. Trả `true` khi xong việc ở đây. */
  const handleFailure = (r: Awaited<ReturnType<typeof api>>, quiet: boolean) => {
    if (isMfaRequired(r.status, r.data)) {
      setMfa(true);
      return true;
    }
    if (r.status === 409 && r.data.code === 'edit_conflict') {
      setConflict({
        updatedAt: String(r.data.updatedAt ?? ''),
        lastEditor: (r.data.lastEditor as string | null) ?? null,
      });
      return true;
    }
    if (r.status === 409 && r.data.code === 'not_draft') {
      // Bài đã rời trạng thái Nháp ở nơi khác - ngừng tự lưu, người dùng lưu tay.
      setAutoOff(true);
      return true;
    }
    if (!r.ok) {
      setMsg({
        kind: 'error',
        text: String(
          r.data.error || (quiet ? 'Tự lưu không được - sẽ thử lại.' : 'Lưu không được.')
        ),
      });
      return true;
    }
    return false;
  };

  const save = useCallback(
    async (quiet = false): Promise<Post | null> => {
      const f = formRef.current;
      const p = postRef.current;
      if (!f.title.trim() || !f.contentMd.trim()) {
        if (!quiet) setMsg({ kind: 'error', text: 'Cần tiêu đề và nội dung.' });
        return null;
      }
      const bad = f.references.find((x) => x.url.trim() && !/^https?:\/\//i.test(x.url.trim()));
      if (bad) {
        setMsg({ kind: 'error', text: `Nguồn tham khảo phải là liên kết http(s): ${bad.url}` });
        return null;
      }
      setSaving(true);
      const r = p
        ? await api(`posts/${encodeURIComponent(p.slug)}`, 'PATCH', {
            ...toBody(f),
            updatedAt: p.updatedAt,
          })
        : await api('posts', 'POST', { ...toBody(f), status: 'DRAFT' });
      setSaving(false);
      if (handleFailure(r, quiet)) return null;
      const out = r.data as unknown as Post;
      setPost(out);
      setSaved(f);
      setSavedAt(formatTimeVN(new Date()));
      if (!quiet) setMsg({ kind: 'ok', text: 'Đã lưu.' });
      if (!p || out.slug !== p.slug) {
        leavingRef.current = true;
        await router.replace(`/studio/posts/${out.slug}`, undefined, { shallow: true });
        leavingRef.current = false;
      }
      return out;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- đọc trạng thái qua ref
    [router]
  );

  /** Tự lưu: tiêu đề + nội dung + tóm tắt qua endpoint gộp lịch sử. */
  const autosave = useCallback(async () => {
    const f = formRef.current;
    const p = postRef.current;
    if (!p) {
      // Bài mới: lần ghi đầu tiên là TẠO bản nháp (chưa có slug để tự lưu vào).
      await save(true);
      return;
    }
    if (!f.title.trim() || !f.contentMd.trim()) return;
    setSaving(true);
    const r = await api(`posts/${encodeURIComponent(p.slug)}/autosave`, 'POST', {
      title: f.title.trim(),
      contentMd: f.contentMd,
      excerpt: f.excerpt.trim() || null,
      updatedAt: p.updatedAt,
    });
    setSaving(false);
    if (handleFailure(r, true)) return;
    setPost({
      ...p,
      title: f.title.trim(),
      contentMd: f.contentMd,
      updatedAt: String(r.data.updatedAt),
    });
    setSaved((s) => ({ ...s, title: f.title, contentMd: f.contentMd, excerpt: f.excerpt }));
    setSavedAt(formatTimeVN(new Date()));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- đọc trạng thái qua ref
  }, [save]);

  // Hẹn tự lưu 30 s sau thay đổi ĐẦU TIÊN (không đặt lại mỗi phím: gõ liên tục
  // vẫn được lưu đều đặn). Chỉ Nháp, và không khi đang mở hộp sửa chồng.
  const canAuto = !autoOff && !conflict && (!post || post.status === 'DRAFT');
  useEffect(() => {
    if (!dirtyAuto || !canAuto) return;
    const t = setTimeout(() => {
      void autosave();
    }, AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [dirtyAuto, canAuto, autosave]);

  // Rời trang khi chưa lưu (ED-09): đóng tab/tải lại/gõ địa chỉ ⇒ hộp của trình
  // duyệt (cách DUY NHẤT trình duyệt cho phép); bấm liên kết trong site ⇒
  // ConfirmDialog của trang. Liên kết của WorkspaceLayout là `<a>` thường (tải
  // trang đầy đủ, không qua router) nên phải chặn ở sự kiện click - chỉ nghe
  // `routeChangeStart` thì hộp không bao giờ hiện (đo 25/11/2026).
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      if (leavingRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.hash) return;
      e.preventDefault();
      setLeaveTo(url.pathname + url.search + url.hash);
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', warn);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty]);
  useEffect(() => {
    const onStart = (url: string, { shallow }: { shallow: boolean }) => {
      if (leavingRef.current || shallow || !dirtyRef.current) return;
      setLeaveTo(url);
      router.events.emit('routeChangeError');
      // Next (Pages Router) chỉ huỷ điều hướng khi handler NÉM - đây là cách được ghi nhận.
      throw 'Đã chặn rời trang khi còn thay đổi chưa lưu.';
    };
    router.events.on('routeChangeStart', onStart);
    return () => router.events.off('routeChangeStart', onStart);
  }, [router]);
  const leave = () => {
    const to = leaveTo;
    setLeaveTo(null);
    if (!to) return;
    // Tải trang đầy đủ như liên kết gốc; cờ `leavingRef` tắt hộp beforeunload.
    leavingRef.current = true;
    window.location.assign(to);
  };

  const set =
    (k: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  const setContent = useCallback((md: string) => {
    setForm((f) => (f.contentMd === md ? f : { ...f, contentMd: md }));
  }, []);
  const setRef = (i: number, k: keyof Ref, v: string) =>
    setForm((f) => ({
      ...f,
      references: f.references.map((r, j) => (j === i ? { ...r, [k]: v } : r)),
    }));

  const act = async (action: string) => {
    const current = dirty ? await save(true) : post;
    if (!current) return;
    const r = await api(`posts/${encodeURIComponent(current.slug)}/transition`, 'POST', { action });
    if (!r.ok)
      return setMsg({ kind: 'error', text: String(r.data.error || 'Không thực hiện được.') });
    setPost(r.data as unknown as Post);
    setMsg({
      kind: 'ok',
      text: `Trạng thái: ${STATUS_LABEL[(r.data as unknown as Post).status].text}.`,
    });
  };

  const st = post?.status ?? 'DRAFT';

  // Phím tắt trang (ED-14). Ctrl+S chặn hộp "Lưu trang" của trình duyệt.
  const keysRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keysRef.current = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (mod && !e.shiftKey && k === 's') {
        e.preventDefault();
        void save(false);
      } else if (mod && e.shiftKey && k === 'p') {
        e.preventDefault();
        setView((v) => (v === 'edit' ? 'preview' : 'edit'));
      } else if (mod && e.key === 'Enter') {
        e.preventDefault();
        if (st === 'DRAFT') void act('submit');
        else void save(false);
      } else if (mod && e.key === '/') {
        e.preventDefault();
        setHelp(true);
      } else if (e.key === '?' && !mod) {
        // `?` chỉ mở bảng khi KHÔNG gõ trong ô chữ/trình soạn - nếu không thì gõ được dấu hỏi.
        const t = e.target as HTMLElement | null;
        if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
        e.preventDefault();
        setHelp(true);
      }
    };
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => keysRef.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const label = STATUS_LABEL[st];
  const published = st === 'PUBLISHED' || st === 'SCHEDULED';

  // Chỉ báo lưu (ED-08): "Đã lưu 10:42" - giờ trong ngày, đủ để biết còn mới không.
  const saveState = saving
    ? 'Đang lưu…'
    : dirty
      ? savedAt && !dirtyAuto
        ? `Đã tự lưu nội dung ${savedAt} · còn thay đổi chưa lưu`
        : 'Có thay đổi chưa lưu'
      : savedAt
        ? `Đã lưu ${savedAt}`
        : '';
  const shell = {
    section: 'posts' as const,
    title: isNew && !post ? 'Bài mới' : form.title.trim() || 'Sửa bài',
    path: '/studio/posts',
    parent: { label: 'Bài viết', href: '/studio/posts' },
  };

  if (auth !== 'authenticated' || mfa) {
    return <WorkspaceLayout {...shell}>{mfa && <MfaRequiredNotice />}</WorkspaceLayout>;
  }

  const seg = (on: boolean) =>
    `rounded px-3 py-1 text-sm transition-colors ${
      on ? 'bg-surface text-fg shadow-sm' : 'text-fg-secondary hover:text-fg'
    }`;

  return (
    <WorkspaceLayout
      {...shell}
      meta={
        <span className="inline-flex flex-wrap items-center gap-2">
          <Badge tone={label.tone}>{label.text}</Badge>
          <span aria-live="polite">{saveState}</span>
        </span>
      }
      actions={
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setView((v) => (v === 'edit' ? 'preview' : 'edit'))}
            aria-pressed={view === 'preview'}
            title="Ctrl+Shift+P"
          >
            <Icon name={view === 'edit' ? 'eye' : 'edit'} />
            {view === 'edit' ? 'Xem trước' : 'Soạn tiếp'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => save(false)}
            disabled={saving}
            title="Ctrl+S"
          >
            <Icon name="save" />
            Lưu
          </Button>
          {st === 'DRAFT' && (
            <Button size="sm" onClick={() => act('submit')} disabled={saving} title="Ctrl+Enter">
              <Icon name="send" />
              Gửi duyệt
            </Button>
          )}
        </>
      }
    >
      {post?.reviewNote && st === 'DRAFT' && (
        <div className="mb-4">
          <Notice kind="error">Người duyệt trả bài về: {post.reviewNote}</Notice>
        </div>
      )}
      {msg && (
        <div className="mb-4">
          <Notice kind={msg.kind}>{msg.text}</Notice>
        </div>
      )}
      {published && (
        <p className="mb-3 text-sm text-fg-muted">
          Bài đang công khai. Sửa tiêu đề hoặc nội dung rồi lưu ⇒ bài được gỡ xuống và chờ duyệt
          lại.
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Input id="title" label="Tiêu đề" value={form.title} onChange={set('title')} required />
          {view === 'preview' && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div
                role="group"
                aria-label="Khung xem trước"
                className="inline-flex gap-1 rounded-md bg-subtle p-1"
              >
                <button
                  type="button"
                  className={seg(device === 'desktop')}
                  aria-pressed={device === 'desktop'}
                  onClick={() => setDevice('desktop')}
                >
                  Máy tính
                </button>
                <button
                  type="button"
                  className={seg(device === 'mobile')}
                  aria-pressed={device === 'mobile'}
                  onClick={() => setDevice('mobile')}
                >
                  Di động (390 px)
                </button>
              </div>
              <span className="text-xs text-fg-muted">
                Vẽ bằng đúng bộ vẽ của trang bài công khai.
              </span>
            </div>
          )}
          {/* Trình soạn GIỮ trong cây khi xem trước (chỉ ẩn): gỡ ra là mất lịch sử hoàn tác. */}
          <div hidden={view === 'preview'}>
            <MarkdownEditor
              value={form.contentMd}
              onChange={setContent}
              resetKey={resetKey}
              onHelp={() => setHelp(true)}
            />
          </div>
          {view === 'preview' && (
            <PostPreview title={form.title} contentMd={form.contentMd} device={device} />
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-lg border border-line bg-surface p-4">
            <h2 className="text-sm font-semibold text-fg">Xuất bản</h2>
            <div className="mt-3 flex flex-col gap-2">
              {st === 'DRAFT' && (
                <p className="text-sm text-fg-muted">
                  Bản nháp chỉ bạn thấy, tự lưu sau 30 giây. Bấm &quot;Gửi duyệt&quot; ở thanh trên
                  khi xong.
                </p>
              )}
              {st === 'PENDING' && (
                <Button variant="secondary" onClick={() => act('withdraw')}>
                  Rút về bản nháp
                </Button>
              )}
              {published && (
                <Button variant="ghost" onClick={() => setConfirmArchive(true)}>
                  Lưu trữ
                </Button>
              )}
              {st === 'ARCHIVED' && (
                <Button variant="secondary" onClick={() => act('restore')}>
                  Khôi phục về bản nháp
                </Button>
              )}
              {post && (
                <a
                  className="text-center text-sm text-link hover:underline"
                  href={`/studio/posts/${post.slug}/history`}
                >
                  Lịch sử chỉnh sửa
                </a>
              )}
            </div>
            <div className="mt-4">
              <Input
                id="publishedAt"
                type="datetime-local"
                label="Giờ đăng, GMT+7 (tương lai = hẹn giờ)"
                value={form.publishedAt}
                onChange={set('publishedAt')}
              />
            </div>
          </section>

          <section
            className="rounded-lg border border-line bg-surface p-4"
            aria-labelledby="checks-h"
          >
            <h2 id="checks-h" className="text-sm font-semibold text-fg">
              Kiểm tra
            </h2>
            <PostChecks
              title={form.title}
              contentMd={form.contentMd}
              metaDescription={form.metaDescription}
              excerpt={form.excerpt}
              coverImageUrl={form.coverImageUrl}
            />
          </section>

          <section className="rounded-lg border border-line bg-surface p-4">
            <h2 className="text-sm font-semibold text-fg">Phân loại</h2>
            <label htmlFor="categoryId" className="mt-3 block text-sm text-fg-secondary">
              Chuyên mục
            </label>
            <select
              id="categoryId"
              value={form.categoryId}
              onChange={set('categoryId')}
              className="mt-1 w-full rounded-md border border-line-control bg-surface px-3 py-2 text-sm text-fg"
            >
              <option value="">Không chuyên mục</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="mt-3">
              <Input
                id="tags"
                label="Thẻ (cách nhau bằng dấu phẩy)"
                value={form.tags}
                onChange={set('tags')}
              />
            </div>
          </section>

          <section
            className="rounded-lg border border-line bg-surface p-4"
            aria-labelledby="refs-h"
          >
            <h2 id="refs-h" className="text-sm font-semibold text-fg">
              Nguồn tham khảo
            </h2>
            <p className="mt-1 text-xs text-fg-muted">
              Hiện ở cuối bài. Chỉ nhận liên kết http(s); tên để trống thì dùng tên miền.
            </p>
            <ul className="mt-3 flex flex-col gap-3">
              {form.references.map((r, i) => (
                <li key={i} className="flex flex-col gap-1.5 rounded-md border border-line p-2">
                  <Input
                    id={`ref-label-${i}`}
                    label={`Tên nguồn ${i + 1}`}
                    value={r.label}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setRef(i, 'label', e.target.value)
                    }
                  />
                  <Input
                    id={`ref-url-${i}`}
                    label="Liên kết"
                    value={r.url}
                    placeholder="https://…"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setRef(i, 'url', e.target.value)
                    }
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setForm((f) => ({ ...f, references: f.references.filter((_, j) => j !== i) }))
                    }
                  >
                    <Icon name="trash" />
                    Bỏ nguồn {i + 1}
                  </Button>
                </li>
              ))}
            </ul>
            {form.references.length < 50 && (
              <Button
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() =>
                  setForm((f) => ({ ...f, references: [...f.references, { label: '', url: '' }] }))
                }
              >
                <Icon name="plus" />
                Thêm nguồn
              </Button>
            )}
          </section>

          <section className="rounded-lg border border-line bg-surface p-4">
            <h2 className="text-sm font-semibold text-fg">Ảnh bìa và SEO</h2>
            <div className="mt-3 flex flex-col gap-3">
              <Input
                id="coverImageUrl"
                label="Ảnh bìa (https://…)"
                value={form.coverImageUrl}
                onChange={set('coverImageUrl')}
              />
              <Input
                id="slug"
                label="Đường dẫn (slug)"
                value={form.slug}
                onChange={set('slug')}
                placeholder="tự suy từ tiêu đề"
              />
              <Input id="excerpt" label="Tóm tắt" value={form.excerpt} onChange={set('excerpt')} />
              <Input
                id="metaDescription"
                label="Mô tả SEO"
                value={form.metaDescription}
                onChange={set('metaDescription')}
                hint={`${form.metaDescription.trim().length}/${META_MAX} ký tự`}
              />
            </div>
            {/* Xem trước thẻ chia sẻ: đúng ba thứ mạng xã hội lấy - ảnh, tiêu đề, mô tả. */}
            <div className="mt-4 overflow-hidden rounded-md border border-line">
              {form.coverImageUrl.startsWith('https://') && (
                <img
                  src={form.coverImageUrl}
                  alt=""
                  className="aspect-[1.91/1] w-full object-cover"
                />
              )}
              <div className="p-3">
                <p className="text-xs text-fg-muted">tsudev.com</p>
                <p className="truncate text-sm font-medium text-fg">
                  {form.title || 'Tiêu đề bài'}
                </p>
                <p className="line-clamp-2 text-xs text-fg-secondary">
                  {form.metaDescription || form.excerpt || 'Mô tả hiện khi chia sẻ liên kết.'}
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <ShortcutsDialog open={help} onClose={() => setHelp(false)} />
      <ConfirmDialog
        open={confirmArchive}
        title="Lưu trữ bài?"
        confirmLabel="Lưu trữ"
        danger
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => {
          setConfirmArchive(false);
          void act('archive');
        }}
      >
        Bài được gỡ khỏi trang công khai và chuyển vào Lưu trữ (trang đã lưu đệm có thể còn tới 5
        phút). Khôi phục được về bản nháp bất cứ lúc nào.
      </ConfirmDialog>
      <ConfirmDialog
        open={!!leaveTo}
        title="Rời trang khi chưa lưu?"
        confirmLabel="Rời trang, bỏ thay đổi"
        cancelLabel="Ở lại"
        danger
        onCancel={() => setLeaveTo(null)}
        onConfirm={leave}
        extra={
          <Button
            variant="secondary"
            onClick={async () => {
              if (await save(false)) leave();
              else setLeaveTo(null);
            }}
          >
            Lưu rồi rời
          </Button>
        }
      >
        Bài còn thay đổi chưa lưu. Rời trang bây giờ thì các thay đổi đó mất.
      </ConfirmDialog>
      <ConfirmDialog
        open={!!conflict}
        title="Bài đã được sửa ở nơi khác"
        confirmLabel="Tải bản mới"
        cancelLabel="Để sau"
        onCancel={() => setConflict(null)}
        onConfirm={() => {
          setConflict(null);
          setMsg(null);
          void load();
        }}
      >
        <p>
          Bài đã được sửa lúc {conflict ? formatDateTimeVN(conflict.updatedAt) : ''}
          {conflict?.lastEditor ? ` bởi ${conflict.lastEditor}` : ''} - sau khi bạn mở trang. Lưu
          bây giờ sẽ ghi đè lên thay đổi đó, nên máy chủ đã từ chối.
        </p>
        <p className="mt-2">
          &quot;Tải bản mới&quot; thay nội dung đang soạn bằng bản trên máy chủ. Muốn giữ phần đang
          viết: chép nó ra trước, hoặc xem bản kia ở{' '}
          {post ? (
            <a className="text-link hover:underline" href={`/studio/posts/${post.slug}/history`}>
              Lịch sử chỉnh sửa
            </a>
          ) : (
            'Lịch sử chỉnh sửa'
          )}
          .
        </p>
      </ConfirmDialog>
    </WorkspaceLayout>
  );
}
