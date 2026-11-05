import React, { useMemo, useState } from 'react';
import { useRecoverBuildPlaceholder } from '../../lib/useRecoverBuildPlaceholder';
import Seo from '../../components/Seo';
import PageHeader from '../../components/PageHeader';
import { Layout, Card, Badge, EmptyState } from '@tsudev/ui';
import { api } from '../../lib/api';
import { KIND_LABEL, STATUS_LABEL, copyrightMeta } from '../../lib/projectLabels';
import type { Project } from '../../lib/types';
import { keepStaleOnFailure } from '../../lib/isr';

const FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'APP', label: 'Ứng dụng' },
  { key: 'TOOL', label: 'Công cụ' },
  { key: 'LIBRARY', label: 'Thư viện' },
  { key: 'SERVICE', label: 'Dịch vụ' },
];

type ProjectsIndexProps = { projects: Project[]; failed: boolean };

export default function ProjectsIndex({ projects, failed }: ProjectsIndexProps) {
  const retrying = useRecoverBuildPlaceholder(failed);
  const [kind, setKind] = useState('all');
  const shown = useMemo(
    () => (kind === 'all' ? projects : projects.filter((p) => p.kind === kind)),
    [kind, projects]
  );
  const registered = projects.filter((p) => p.copyrightStatus === 'REGISTERED').length;

  return (
    <Layout active="/projects" bare>
      <Seo
        title="Dự án"
        path="/projects"
        description="Dự án, công cụ và phần mềm do tsudev phát triển, kèm giấy phép và trạng thái đăng ký bản quyền."
      />
      <PageHeader
        eyebrow="Dự án"
        title="Ứng dụng, công cụ & thư viện"
        description="Mọi thứ tsudev phát triển và phát hành. Mỗi dự án ghi rõ giấy phép; mỗi bản phát hành kèm SHA-256 và chữ ký Ed25519 để bạn tự kiểm trước khi cài."
        meta={
          <>
            <span className="text-sm text-fg-muted">{projects.length} dự án</span>
            {registered > 0 && <Badge tone="success">{registered} đã đăng ký bản quyền</Badge>}
          </>
        }
      />
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Lọc theo loại">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setKind(f.key)}
              aria-pressed={kind === f.key}
              className={`px-3.5 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                kind === f.key
                  ? 'border-transparent bg-subtle text-link'
                  : 'border-line text-fg-muted hover:text-fg'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* BA trạng thái ở trang này, không phải hai: gọi thất bại · chưa có dự
              án nào · có dự án nhưng bộ lọc đang chọn không khớp cái nào. Gộp
              hai cái sau lại là nói sai với người vừa bấm một nhãn lọc. */}
          {failed ? (
            <div className="md:col-span-2">
              <EmptyState
                kind="failed"
                icon="warning"
                title={retrying ? 'Đang cập nhật nội dung…' : 'Không tải được danh sách dự án'}
                explain="Máy chủ nội dung không trả lời. Danh sách dự án vẫn còn nguyên; thử tải lại sau ít phút."
              />
            </div>
          ) : (
            shown.length === 0 && (
              <div className="md:col-span-2">
                <EmptyState
                  icon="tag"
                  title={projects.length === 0 ? 'Chưa có dự án nào' : 'Không có dự án khớp bộ lọc'}
                  explain={
                    projects.length === 0
                      ? 'Dự án do chủ dự án đăng thủ công, vì mỗi dự án mang phiên bản, giấy phép và trạng thái bản quyền.'
                      : 'Có dự án trong hệ thống, nhưng không cái nào thuộc mục đang chọn. Chọn "Tất cả" để xem toàn bộ.'
                  }
                />
              </div>
            )
          )}
          {shown.map((p) => {
            const cr = copyrightMeta(p.copyrightStatus);
            return (
              <Card
                key={p.id}
                as="a"
                href={`/projects/${p.slug}`}
                hover
                className="p-6 flex flex-col group"
              >
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  <Badge tone="neutral">{KIND_LABEL[p.kind] || p.kind}</Badge>
                  <Badge tone="outline">{STATUS_LABEL[p.status] || p.status}</Badge>
                  {p.featured && <Badge tone="brand">Nổi bật</Badge>}
                </div>
                <h2 className="text-xl font-bold text-fg leading-snug group-hover:text-link transition-colors text-balance">
                  {p.name}
                </h2>
                <p className="mt-2 text-sm text-fg-muted flex-1">{p.summary}</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-fg-muted">
                  <Badge tone={cr.tone}>{cr.label}</Badge>
                  {p.license && <span className="font-mono">{p.license}</span>}
                  {p.version && <span className="font-mono">v{p.version}</span>}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

export async function getStaticProps() {
  const r = await api.projects(100);
  const revalidate = keepStaleOnFailure(r.failed, '/projects');
  return { revalidate, props: { projects: r.data, failed: r.failed } };
}
