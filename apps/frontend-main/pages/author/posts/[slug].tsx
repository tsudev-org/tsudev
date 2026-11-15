import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Badge, Button, Input, Layout } from '@tsudev/ui';

import Seo from '../../../components/Seo';
import { Notice } from '../../../components/AuthShell';
import { MarkdownEditor } from '../../../components/MarkdownEditor';
import { MfaRequiredNotice } from '../../../components/MfaRequiredNotice';
import { formatDateTimeVN } from '../../../lib/format';
import { isMfaRequired } from '../../../lib/mfa';
import { useLoader } from '../../../lib/useLoader';
import { STATUS_LABEL, type PostStatus as Status } from '../../../lib/postStatus';

/**
 * Trang soạn bài hai cột (P2.3, khuôn CMS quantri): trái trình soạn Tiptap (D3,
 * ra Markdown), phải hộp Xuất bản / Chuyên mục / Thẻ / Ảnh bìa / SEO.
 * `/author/posts/new` = bài mới; lưu lần đầu thì URL đổi sang slug thật.
 *
 * Tự lưu mỗi 10 giây CHỈ khi bài là BẢN NHÁP. Bài đã đăng mà tự lưu thì mỗi lần
 * lưu là một lần sửa nội dung bài công khai - với tác giả, nó kéo bài về chờ duyệt
 * (postWorkflow.editedStatus). Bài đã đăng chỉ lưu khi người dùng bấm.
 */
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
};

const AUTOSAVE_MS = 10_000;
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
});

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
});

async function api(path: string, method = 'GET', body?: unknown) {
  const res = await fetch(`/api/content/author/${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export default function AuthorPostEditor() {
  const router = useRouter();
  const { status: auth } = useSession();
  const slugParam = typeof router.query.slug === 'string' ? router.query.slug : '';
  const isNew = slugParam === 'new';

  const [post, setPost] = useState<Post | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [cats, setCats] = useState<Category[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [mfa, setMfa] = useState(false);
  const [resetKey, setResetKey] = useState('init');
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

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
      setPost(r.data as Post);
      setForm(fromPost(r.data as Post));
      setResetKey((r.data as Post).id + (r.data as Post).updatedAt);
    },
    [router.isReady, slugParam, isNew]
  );
  useLoader(load, auth === 'authenticated');

  const save = useCallback(
    async (quiet = false): Promise<Post | null> => {
      const f = formRef.current;
      if (!f.title.trim() || !f.contentMd.trim()) {
        if (!quiet) setMsg({ kind: 'error', text: 'Cần tiêu đề và nội dung.' });
        return null;
      }
      setSaving(true);
      const r = post
        ? await api(`posts/${encodeURIComponent(post.slug)}`, 'PATCH', toBody(f))
        : await api('posts', 'POST', { ...toBody(f), status: 'DRAFT' });
      setSaving(false);
      if (isMfaRequired(r.status, r.data)) {
        setMfa(true);
        return null;
      }
      if (!r.ok) {
        setMsg({
          kind: 'error',
          text: String((r.data as { error?: string }).error || 'Lưu không được - sẽ thử lại.'),
        });
        return null;
      }
      const saved = r.data as Post;
      setPost(saved);
      setDirty(false);
      setSavedAt(formatDateTimeVN(new Date().toISOString()));
      if (!quiet) setMsg({ kind: 'ok', text: 'Đã lưu.' });
      if (!post || saved.slug !== post.slug) {
        router.replace(`/author/posts/${saved.slug}`, undefined, { shallow: true });
      }
      return saved;
    },
    [post, router]
  );

  // Tự lưu bản nháp mỗi 10 giây khi có thay đổi.
  useEffect(() => {
    if (!dirty || (post && post.status !== 'DRAFT')) return;
    const t = setTimeout(() => {
      void save(true);
    }, AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [dirty, form, post, save]);

  // Cảnh báo khi rời trang mà còn thay đổi chưa lưu.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set =
    (k: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [k]: e.target.value }));
      setDirty(true);
    };
  const setContent = useCallback((md: string) => {
    setForm((f) => (f.contentMd === md ? f : { ...f, contentMd: md }));
    setDirty(true);
  }, []);

  const act = async (action: string, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    const current = dirty ? await save(true) : post;
    if (!current) return;
    const r = await api(`posts/${encodeURIComponent(current.slug)}/transition`, 'POST', { action });
    if (!r.ok)
      return setMsg({
        kind: 'error',
        text: String((r.data as { error?: string }).error || 'Không thực hiện được.'),
      });
    setPost(r.data as Post);
    setMsg({ kind: 'ok', text: `Trạng thái: ${STATUS_LABEL[(r.data as Post).status].text}.` });
  };

  const st = post?.status ?? 'DRAFT';
  const label = STATUS_LABEL[st];
  const published = st === 'PUBLISHED' || st === 'SCHEDULED';

  if (auth !== 'authenticated') {
    return (
      <Layout active="/author">
        <Seo title="Soạn bài" path="/author/posts" noindex />
        <h1 className="sr-only">Soạn bài</h1>
        <p className="text-sm text-fg-muted">
          {auth === 'loading' ? 'Đang tải…' : 'Bạn cần đăng nhập.'}
        </p>
      </Layout>
    );
  }
  if (mfa) {
    return (
      <Layout active="/author">
        <Seo title="Soạn bài" path="/author/posts" noindex />
        <MfaRequiredNotice />
      </Layout>
    );
  }

  return (
    <Layout active="/author">
      <Seo title={isNew ? 'Bài mới' : 'Sửa bài'} path="/author/posts" noindex />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <a href="/author" className="text-sm text-link hover:underline">
            ← Bài của tôi
          </a>
          <h1 className="text-xl font-semibold text-fg">
            {isNew && !post ? 'Bài mới' : 'Sửa bài'}
          </h1>
          <Badge tone={label.tone}>{label.text}</Badge>
        </div>
        <p className="text-xs text-fg-muted" aria-live="polite">
          {saving
            ? 'Đang lưu…'
            : dirty
              ? 'Có thay đổi chưa lưu'
              : savedAt
                ? `Đã lưu lúc ${savedAt}`
                : ''}
        </p>
      </div>

      {post?.reviewNote && st === 'DRAFT' && (
        <div className="mt-4">
          <Notice kind="error">Người duyệt trả bài về: {post.reviewNote}</Notice>
        </div>
      )}
      {msg && (
        <div className="mt-4">
          <Notice kind={msg.kind}>{msg.text}</Notice>
        </div>
      )}
      {published && (
        <p className="mt-3 text-sm text-fg-muted">
          Bài đang công khai. Sửa tiêu đề hoặc nội dung rồi lưu ⇒ bài được gỡ xuống và chờ duyệt
          lại.
        </p>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Input id="title" label="Tiêu đề" value={form.title} onChange={set('title')} required />
          <MarkdownEditor value={form.contentMd} onChange={setContent} resetKey={resetKey} />
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-lg border border-line bg-surface p-4">
            <h2 className="text-sm font-semibold text-fg">Xuất bản</h2>
            <div className="mt-3 flex flex-col gap-2">
              <Button onClick={() => save(false)} disabled={saving}>
                Lưu
              </Button>
              {st === 'DRAFT' && (
                <Button variant="secondary" onClick={() => act('submit')} disabled={saving}>
                  Gửi duyệt
                </Button>
              )}
              {st === 'PENDING' && (
                <Button variant="secondary" onClick={() => act('withdraw')}>
                  Rút về bản nháp
                </Button>
              )}
              {published && (
                <Button
                  variant="ghost"
                  onClick={() => act('archive', 'Gỡ bài khỏi trang công khai và lưu trữ?')}
                >
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
                  href={`/author/posts/${post.slug}/history`}
                >
                  Lịch sử chỉnh sửa
                </a>
              )}
            </div>
            <div className="mt-4">
              <Input
                id="publishedAt"
                type="datetime-local"
                label="Giờ đăng (tương lai = hẹn giờ)"
                value={form.publishedAt}
                onChange={set('publishedAt')}
              />
            </div>
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
                label="Mô tả SEO (≤ 160 ký tự)"
                value={form.metaDescription}
                onChange={set('metaDescription')}
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
    </Layout>
  );
}
