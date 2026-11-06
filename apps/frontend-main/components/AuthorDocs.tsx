import React, { useCallback, useState } from 'react';
import { Card, Button, Input, Badge, Icon, RecordFooter } from '@tsudev/ui';
import { viWordCount } from '@tsudev/search';
import { formatDateTimeVN } from '../lib/format';
import { renderMarkdown } from '../lib/md';
import type { PageMeta } from '@tsudev/types';
import type { UrlPaging } from '../lib/useUrlPaging';
import { useLoader } from '../lib/useLoader';

/**
 * Thẻ "Tài liệu" của trang /author - soạn Doc cho /docs.
 *
 * Trước thẻ này, đường ghi Doc duy nhất ở production là Toà soạn Agent AI; gỡ
 * Toà soạn mà thiếu nó thì /docs đóng băng (kế hoạch Q4/2026 §8.3b). Tài liệu là
 * của SITE, không của một người: mọi AUTHOR trở lên sửa được mọi tài liệu.
 */
interface AuthorDoc {
  id: string;
  slug: string;
  title: string;
  contentMd: string;
  category: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

type DocForm = {
  slug: string;
  title: string;
  category: string;
  position: string;
  contentMd: string;
};

const EMPTY: DocForm = { slug: '', title: '', category: '', position: '', contentMd: '' };

type Message = { tone: 'ok' | 'error'; text: string };

/**
 * `paging` do trang cha giữ: trang cha gom MỌI bảng vào một `useUrlPagingSync`,
 * vì hai lần `router.replace` trong cùng một lượt giẫm lên nhau.
 */
export default function AuthorDocs({
  paging,
  onDenied,
}: {
  paging: UrlPaging;
  onDenied: () => void;
}) {
  const [docs, setDocs] = useState<AuthorDoc[]>([]);
  const [form, setForm] = useState<DocForm>(EMPTY);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [msg, setMsg] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const { page, setPage, pageSize, setPageSize, meta } = paging;

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!paging.ready) return;
      setLoading(true);
      const res = await fetch(`/api/content/author/docs?page=${page}&page_size=${pageSize}`, {
        signal,
      });
      setLoading(false);
      if (res.status === 403) {
        onDenied();
        return;
      }
      if (!res.ok) {
        setMsg({ tone: 'error', text: 'Không tải được danh sách tài liệu.' });
        return;
      }
      const body = (await res.json()) as { data?: AuthorDoc[]; meta?: PageMeta };
      if (Array.isArray(body?.data)) setDocs(body.data);
      if (body?.meta) paging.setMeta(body.meta);
    },
    // `paging` cố ý không nằm trong deps: nó là object mới mỗi lần dựng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, pageSize, paging.ready]
  );

  // `load` đổi theo trang/mốc; `onDenied` là hàm của cha, không phải dữ liệu.
  useLoader(load);

  const set =
    (k: keyof DocForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const reset = () => {
    setEditingSlug(null);
    setForm(EMPTY);
    setPreview(false);
  };

  const startEdit = (d: AuthorDoc) => {
    setEditingSlug(d.slug);
    setForm({
      slug: d.slug,
      title: d.title,
      category: d.category,
      position: String(d.position),
      contentMd: d.contentMd,
    });
    setMsg(null);
    setPreview(false);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const body = {
      title: form.title,
      slug: form.slug || undefined,
      category: form.category.trim() || undefined,
      // Rỗng ⇒ backend tự xếp cuối nhóm khi tạo, giữ nguyên khi sửa.
      position: form.position.trim() === '' ? undefined : Number(form.position),
      contentMd: form.contentMd,
    };
    const url = editingSlug
      ? `/api/content/author/docs/${editingSlug}`
      : '/api/content/author/docs';
    const res = await fetch(url, {
      method: editingSlug ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg({ tone: 'error', text: data.error || 'Lưu không thành công.' });
      return;
    }
    setMsg({ tone: 'ok', text: editingSlug ? 'Đã cập nhật tài liệu.' : 'Đã đăng tài liệu.' });
    reset();
    load();
  };

  const remove = async (slug: string) => {
    if (typeof window !== 'undefined' && !window.confirm(`Xoá tài liệu "${slug}"?`)) return;
    const res = await fetch(`/api/content/author/docs/${slug}`, { method: 'DELETE' });
    if (!res.ok) {
      setMsg({ tone: 'error', text: 'Xoá không thành công.' });
      return;
    }
    if (editingSlug === slug) reset();
    load();
  };

  const fieldClass =
    'rounded-md border border-line bg-base px-3 py-2.5 text-sm text-fg outline-hidden focus:border-primary';

  return (
    <>
      {msg && (
        <Card
          className={`p-4 mb-6 text-sm ${
            msg.tone === 'error' ? 'text-danger-ink' : 'text-success-ink'
          }`}
        >
          {msg.text}
        </Card>
      )}

      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-fg">
            {editingSlug ? `Sửa: ${editingSlug}` : 'Viết tài liệu mới'}
          </h2>
          <Button
            type="button"
            size="sm"
            variant={preview ? 'primary' : 'ghost'}
            onClick={() => setPreview((p) => !p)}
          >
            {preview ? 'Đang xem trước' : 'Xem trước'}
          </Button>
        </div>

        <form onSubmit={submit} className="grid gap-4">
          <Input
            id="doc-title"
            label="Tiêu đề"
            value={form.title}
            onChange={set('title')}
            required
          />
          <Input
            id="doc-slug"
            label="Slug"
            value={form.slug}
            onChange={set('slug')}
            placeholder="Bỏ trống để tự suy từ tiêu đề"
          />
          <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
            <Input
              id="doc-category"
              label="Nhóm"
              value={form.category}
              onChange={set('category')}
              placeholder="Cài đặt, Nhật ký thay đổi… (trống = general)"
            />
            <Input
              id="doc-position"
              label="Thứ tự"
              type="number"
              min={0}
              value={form.position}
              onChange={set('position')}
              placeholder="Tự xếp"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="doc-contentMd" className="text-sm font-medium text-fg-secondary">
                Nội dung (Markdown)
              </label>
              <span className="text-xs text-fg-muted">{viWordCount(form.contentMd)} từ</span>
            </div>
            <textarea
              id="doc-contentMd"
              rows={16}
              value={form.contentMd}
              onChange={set('contentMd')}
              required
              className={`${fieldClass} font-mono`}
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? 'Đang lưu…' : editingSlug ? 'Cập nhật' : 'Đăng tài liệu'}
            </Button>
            {editingSlug && (
              <Button type="button" variant="ghost" onClick={reset}>
                Huỷ
              </Button>
            )}
          </div>
        </form>
      </Card>

      {preview && (
        <Card className="p-6 mb-8">
          <div className="text-xs uppercase tracking-wide text-fg-muted mb-3">Xem trước</div>
          <h1 className="text-2xl font-bold text-fg mb-2">{form.title || '(chưa có tiêu đề)'}</h1>
          <div
            className="prose-tsu min-w-0"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(form.contentMd || '') }}
          />
        </Card>
      )}

      <div className="space-y-3">
        {!loading && docs.length === 0 && (
          <Card className="p-6 text-fg-muted">Chưa có tài liệu nào.</Card>
        )}
        {docs.map((d) => (
          <Card key={d.id} className="p-5 flex flex-wrap items-start gap-4">
            <div className="flex-1 min-w-[16rem]">
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                <span className="font-semibold text-fg">{d.title}</span>
                <span className="font-mono text-xs text-fg-muted">{d.slug}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="neutral">{d.category}</Badge>
                <span className="text-xs text-fg-muted">#{d.position}</span>
                <span className="text-xs text-fg-muted">
                  Sửa lần cuối {formatDateTimeVN(d.updatedAt)}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button size="sm" variant="ghost" onClick={() => startEdit(d)}>
                <Icon name="edit" />
                Sửa
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remove(d.slug)}>
                <Icon name="trash" />
                Xoá
              </Button>
            </div>
          </Card>
        ))}
        <RecordFooter
          meta={meta}
          pageSize={pageSize}
          loading={loading}
          label="tài liệu"
          onPageSize={(size, nextPage) => {
            setPageSize(size);
            setPage(nextPage);
          }}
          onPage={setPage}
        />
      </div>
    </>
  );
}
