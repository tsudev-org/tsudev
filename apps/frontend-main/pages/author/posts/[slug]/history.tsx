import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Button, Layout } from '@tsudev/ui';

import Seo from '../../../../components/Seo';
import { Notice } from '../../../../components/AuthShell';
import { formatDateTimeVN } from '../../../../lib/format';
import { lineDiff } from '../../../../lib/lineDiff';
import { useLoader } from '../../../../lib/useLoader';

/**
 * Lịch sử chỉnh sửa (P2.3): danh sách bản đã lưu, so sánh một bản với nội dung
 * HIỆN TẠI theo dòng, khôi phục. Khôi phục cũng là một lần sửa: nó ghi thêm một
 * bản mới (lịch sử chỉ-thêm) và theo luật sửa bài đã đăng (tác giả ⇒ chờ duyệt lại).
 */
type Rev = { id: string; title: string; createdAt: string; length: number };
type Full = Rev & { contentMd: string };

export default function PostHistory() {
  const router = useRouter();
  const { status } = useSession();
  const slug = typeof router.query.slug === 'string' ? router.query.slug : '';
  const [revs, setRevs] = useState<Rev[]>([]);
  const [current, setCurrent] = useState('');
  const [picked, setPicked] = useState<Full | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!slug) return;
      const base = `/api/content/author/posts/${encodeURIComponent(slug)}`;
      const [r, p] = await Promise.all([
        fetch(`${base}/revisions?page_size=100`, { signal }),
        fetch(base, { signal }),
      ]);
      if (signal?.aborted) return;
      if (!r.ok || !p.ok) return setMsg({ kind: 'error', text: 'Không mở được lịch sử bài này.' });
      setRevs(((await r.json()) as { data: Rev[] }).data);
      setCurrent(((await p.json()) as { contentMd: string }).contentMd);
    },
    [slug]
  );
  useLoader(load, status === 'authenticated' && router.isReady);

  const pick = async (id: string) => {
    const r = await fetch(`/api/content/author/posts/${encodeURIComponent(slug)}/revisions/${id}`);
    if (r.ok) setPicked((await r.json()) as Full);
  };

  const restore = async () => {
    if (!picked) return;
    if (!window.confirm('Khôi phục bản này? Nội dung hiện tại vẫn còn trong lịch sử.')) return;
    const r = await fetch(
      `/api/content/author/posts/${encodeURIComponent(slug)}/revisions/${picked.id}/restore`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
    );
    if (!r.ok) return setMsg({ kind: 'error', text: 'Không khôi phục được.' });
    router.push(`/author/posts/${encodeURIComponent(slug)}`);
  };

  const diff = picked ? lineDiff(picked.contentMd, current) : null;

  return (
    <Layout active="/author">
      <Seo title="Lịch sử chỉnh sửa" path="/author/posts" noindex />
      <a
        href={`/author/posts/${encodeURIComponent(slug)}`}
        className="text-sm text-link hover:underline"
      >
        ← Về trang soạn
      </a>
      <h1 className="mt-2 text-xl font-semibold text-fg">Lịch sử chỉnh sửa</h1>
      {msg && (
        <div className="mt-4">
          <Notice kind={msg.kind}>{msg.text}</Notice>
        </div>
      )}
      <div className="mt-5 grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
          {revs.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => pick(r.id)}
                aria-pressed={picked?.id === r.id}
                className={`w-full px-3 py-2.5 text-left text-sm hover:bg-hovered ${
                  picked?.id === r.id ? 'bg-glow' : ''
                }`}
              >
                <span className="block text-fg">{formatDateTimeVN(r.createdAt)}</span>
                <span className="block truncate text-xs text-fg-muted">
                  {r.title} · {r.length} ký tự
                </span>
              </button>
            </li>
          ))}
          {revs.length === 0 && (
            <li className="px-3 py-2.5 text-sm text-fg-muted">Chưa có bản nào.</li>
          )}
        </ul>
        <section className="min-w-0 rounded-lg border border-line bg-surface p-4">
          {!picked ? (
            <p className="text-sm text-fg-muted">
              Chọn một bản bên trái để so sánh với nội dung hiện tại.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-fg">
                  Bản {formatDateTimeVN(picked.createdAt)} → hiện tại
                </h2>
                <Button size="sm" onClick={restore}>
                  Khôi phục bản này
                </Button>
              </div>
              {diff === null ? (
                <p className="mt-3 text-sm text-fg-muted">Bài quá dài để so sánh từng dòng.</p>
              ) : (
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
                  {diff.map((l, i) => (
                    <div
                      key={i}
                      className={
                        l.kind === 'add'
                          ? 'bg-success-tint text-success-ink'
                          : l.kind === 'del'
                            ? 'bg-danger-tint text-danger-ink line-through'
                            : 'text-fg-secondary'
                      }
                    >
                      <span aria-hidden="true">
                        {l.kind === 'add' ? '+ ' : l.kind === 'del' ? '- ' : '  '}
                      </span>
                      <span className="sr-only">
                        {l.kind === 'add' ? 'Thêm: ' : l.kind === 'del' ? 'Bỏ: ' : ''}
                      </span>
                      {l.text || ' '}
                    </div>
                  ))}
                </pre>
              )}
            </>
          )}
        </section>
      </div>
    </Layout>
  );
}
