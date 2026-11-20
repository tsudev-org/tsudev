# KHO TRI THỨC DÙNG CHUNG CHO AGENT - AKB (v1.0.0)

> Mọi dự án trên máy phát triển của tsudev `MUST` có một thư mục tri thức **ngoài repo**, do agent của dự án đó ghi
> liên tục, để agent của **mọi** dự án khác đọc - tìm - đối chiếu - học lại lỗi đã gặp, cách sửa đã kiểm chứng, quyết
> định thiết kế và ưu/nhược điểm tính năng. Tài liệu này chuẩn hoá đặc tả gốc `20261120-AGENT_KNOWLEDGE_BASE_SPEC.md`
> (v1.0) theo thực tế hệ tsudev ngày 20/11/2026. Quy trình phiên trong repo vẫn là [`AGENT_PROTOCOL.md`](AGENT_PROTOCOL.md);
> tài liệu này bổ sung cho nó, không thay thế.

## 1. Mục tiêu và nguyên tắc

| # | Nguyên tắc | Mức |
| --- | --- | --- |
| P1 | **Ngoài repo**: kho không nằm trong `~/projects/*`, không bị commit vào git của dự án | `MUST` |
| P2 | **Một dự án - một thư mục** `<slug>/` (mục 3.1) | `MUST` |
| P3 | **Chỉ ghi thư mục của mình**; được đọc mọi thư mục; ngoại lệ duy nhất: file MỚI trong `_global/` | `MUST` |
| P4 | **Mỗi mục một file**, không sửa đè lịch sử (đổi trạng thái bằng `akb set`, bổ sung bằng mục `## Bổ sung YYYY-MM-DD`) | `MUST` |
| P5 | **Không bí mật, không dữ liệu cá nhân** (token, khoá, mật khẩu, chuỗi kết nối, email/SĐT người dùng, dữ liệu công dân) - thay bằng `[REDACTED]` | `MUST` |
| P6 | **Có bằng chứng**: thông báo lỗi, lệnh, commit, PR, đường dẫn file | `MUST` |
| P7 | **Có `status` + `confidence`** để agent khác biết có nên áp dụng | `MUST` |
| P8 | **Liên kết tường minh** bằng ID (`<slug>#<ID>`), không mô tả mơ hồ | `MUST` |

### 1.1. Ranh giới với tài liệu trong repo

| Nơi | Giữ gì | Ví dụ |
| --- | --- | --- |
| Repo: `AGENTS.md`, `logs/STATE.md`, `logs/LOCKS.md`, `logs/handover/`, `docs/adr/` | **Việc đang làm** và quyết định chính thức của repo (nguồn sự thật, được review qua PR) | phase, khoá file, phiếu bàn giao, ADR |
| AKB `~/agent-kb/<slug>/` | **Tri thức dùng lại được** cho mọi dự án | lỗi + nguyên nhân + cách sửa, mẹo, runbook, ưu/nhược điểm |

- **Không** chuyển phiếu bàn giao, `AGENTS*.md`, ADR ra khỏi repo: giao thức khoá/bàn giao, CI và các phiên khác đang
  dựa vào chúng. AKB **trỏ tới** chúng (`01_PROFILE.md` tự liệt kê phiếu mới nhất; `DEC` có trường `source` trỏ ADR).
- Phiếu bàn giao nhắc một lỗi/bài học ⇒ ghi ID AKB (`qulythuchi#ISS-...`) thay vì chép lại nội dung.

## 2. Vị trí, sao lưu, quyền

```
AKB_ROOT   = ${AKB_ROOT:-$HOME/agent-kb}                       # kho chính, chmod 700, git
remote     = github.com/tsudev-org/agent-kb  (PRIVATE)           # akb sync
AKB_MIRROR = ${AKB_MIRROR:-/mnt/e/tsudev-sao-luu/agent-kb}      # akb mirror (rsync), bỏ qua khi ổ chưa gắn
```

- Repo `tsudev-org/agent-kb` `MUST` giữ **Private** vĩnh viễn (chứa đường dẫn nội bộ, log). GitHub Free không có
  secret scanning cho repo private ⇒ cổng chặn bí mật ở máy: hook `.githooks/pre-commit` (`akb lint` L07 + gitleaks).
- Mọi script/hướng dẫn đọc biến `AKB_ROOT`, không hard-code.
- Khôi phục máy mới: `README.md` của repo `agent-kb`.

## 3. Cấu trúc

```
~/agent-kb/
├── README.md
├── bin/akb                      # CLI (Python ≥ 3.10, chỉ thư viện chuẩn) - cài: ~/.local/bin/akb
├── tests/test_akb.py            # test nghiệm thu mục 10
├── .githooks/pre-commit         # chặn bí mật
├── _protocol/
│   ├── AGENT_PROTOCOL.md        # giao thức thực thi (mục 7)
│   ├── SCHEMA.md                # tóm tắt máy kiểm (mục 4-6)
│   ├── TAGS.md                  # từ điển tag chuẩn (sửa tay)
│   ├── project-map.tsv          # ghi đè đường dẫn -> slug
│   ├── exclude.txt              # thư mục không tạo kho
│   └── templates/{issue,lesson,decision,session,feature}.md
├── _index/                      # SINH TỰ ĐỘNG bởi akb reindex - không sửa tay
│   ├── PROJECTS.md  ISSUES_INDEX.md  LESSONS_INDEX.md  DECISIONS_INDEX.md  SESSIONS_INDEX.md  TAGS.md
├── _global/lessons/GLS-*.md     # bài học đã xác nhận ở ≥ 2 dự án
└── <slug>/
    ├── 00_README.md  01_PROFILE.md  02_FEATURES.md  03_RUNBOOK.md  CHANGELOG.md  _meta.json
    └── issues/ISS-*.md  lessons/LES-*.md  decisions/DEC-*.md  sessions/SES-*.md
```

### 3.1. Slug

1. Ghi đè trong `_protocol/project-map.tsv` (ví dụ `logs` → `dieu-phoi` cho phiên điều phối `~/projects`).
2. Không có ghi đè ⇒ **tên repo trên GitHub** của remote `origin` (chữ thường). Nhờ vậy worktree và bản sao cùng repo
   (`app-la-ban-a9`, `ubnd-wt-*`, `tsudev-lotus`, `ban-do-3d`) dùng chung một thư mục.
3. Không có git ⇒ tên thư mục. Thư mục chứa nhiều repo (`tsugamelabs/`) ⇒ mỗi repo con một slug, thư mục chứa có
   README thì thêm slug riêng.

`akb slug` in slug của thư mục hiện tại. Phạm vi: **mọi** dự án trong `~/projects` (kể cả repo không thuộc hệ tsudev
và thư mục không git); repo UBND/xanuicam có thư mục kho nhưng agent điều phối tsudev **không** ghi vào đó và không sửa
file nào trong các repo đó.

### 3.2. Tên file

`<ID>-<slug-ngắn-không-dấu>.md`, ví dụ `ISS-20261120-1430-a3f9-loi-mui-gio.md`. ID: `<PREFIX>-<YYYYMMDD>-<HHMM>-<4hex>`,
PREFIX ∈ `ISS | LES | DEC | SES` (`GLS` cho `_global`), giờ `Asia/Ho_Chi_Minh`. Không cần bộ đếm chung ⇒ an toàn khi
nhiều agent chạy song song; `akb new` sinh lại khi trùng.

## 4. `_meta.json`

```json
{
  "schema_version": "1.1", "slug": "qulythuchi", "project_path": "~/projects/qulythuchi",
  "remote": "tsudev-org/qulythuchi", "worktrees": [], "display_name": "Quly Thu Chi", "summary": "...",
  "stack": ["flutter/dart", "cloudflare-workers"], "status": "active",
  "created_at": "2026-11-20T14:58:09+07:00", "last_updated_at": "2026-11-20T14:58:09+07:00",
  "counts": { "issues_open": 0, "issues_resolved": 0, "lessons": 0, "decisions": 0, "sessions": 0 },
  "related_projects": []
}
```

`status` ∈ `active | maintenance | paused | archived`. `counts` do `akb reindex` tính - không sửa tay.

## 5. Định dạng mục (front matter + nội dung)

Front matter là **tập con YAML**, mỗi khoá một dòng; giá trị: chuỗi trần, `"chuỗi JSON"`, số, `true/false`,
`[a, b]`, `{ k: v }`; danh sách đối tượng (`related`) dạng khối `  - { rel: ..., ref: "..." }`.

| Trường chung | Bắt buộc | Ghi chú |
| --- | --- | --- |
| `id` `type` `project` `title` `created_at` `updated_at` `author_agent` `tags` `status` `confidence` | Có | `type` ∈ issue/lesson/decision/session; `confidence` ∈ low/medium/high; `author_agent` = tên phiên (`projects-0d`, `tsudev-9d`...) |
| `related` | Không | mục 6 |

| Loại | `status` | Trường thêm | Mục nội dung bắt buộc (đúng thứ tự) |
| --- | --- | --- | --- |
| issue | open, investigating, workaround, resolved, wontfix | `severity` (low/medium/high/critical), `component`, `environment`, `first_seen_session`, `resolved_in_session`, `commit_refs` | Triệu chứng · Bối cảnh / Cách tái hiện · Bằng chứng (log, thông báo lỗi, lệnh) · Nguyên nhân gốc (Root cause) · Cách khắc phục đã áp dụng · Cách kiểm chứng đã khắc phục · Cách phòng tránh / Dấu hiệu nhận biết sớm · Phạm vi áp dụng cho dự án khác |
| lesson | draft, validated, deprecated | `applies_to`, `evidence_issues`, `reuse_count` | Tình huống · Bài học / Mẹo xử lý · Các bước áp dụng · Khi nào KHÔNG áp dụng · Bằng chứng |
| decision | proposed, accepted, superseded, rejected | `superseded_by`, `source` (ADR trong repo) | Bối cảnh · Các phương án đã xét · Quyết định · Ưu điểm · Nhược điểm / Đánh đổi · Hệ quả |
| session | completed, interrupted | `repo_refs` (PR, commit, phiếu) | Mục tiêu phiên · Việc đã làm · File/Module bị ảnh hưởng · Lỗi phát hiện (liên kết ISS) · Bài học rút ra (liên kết LES) · Việc dang dở / Bước tiếp theo · Lệnh kiểm thử đã chạy và kết quả |

`02_FEATURES.md`: mỗi tính năng một khối `### FEA-<slug>: <Tên>` gồm Trạng thái (planned/in-progress/stable/deprecated),
Mô tả, Vị trí code, Ưu điểm, Nhược điểm / Hạn chế, Lỗi liên quan, Quyết định liên quan, Cập nhật lần cuối.

**Khi nào ghi:** issue khi lỗi tốn > 10 phút, làm CI đỏ, lỗi production, hoặc là bẫy môi trường/công cụ; lesson khi có
mẹo dùng lại được ở dự án khác; decision cho mọi ADR được chấp nhận và mọi quyết định của chủ dự án ảnh hưởng kiến
trúc; session cho MỌI phiên có sửa mã/hạ tầng.

## 6. Liên kết

`<slug>#<ID>` (chéo dự án) hoặc `#<ID>` (cùng dự án). `rel` ∈ `caused_by | fixes | learned_from | applied_from |
supersedes | duplicates | see_also`. Áp bài học của dự án A vào dự án B ⇒ ghi `applied_from: A#LES-...` vào mục của
**B** (vết học chéo); không sửa file của A.

## 7. Quy trình agent (`MUST`)

Bản thực thi chép tại `~/agent-kb/_protocol/AGENT_PROTOCOL.md`. Tóm tắt:

| Thời điểm | Việc |
| --- | --- |
| Đầu phiên (sau khi đọc `AGENTS.md` / STATE / phiếu của repo) | `akb start "<mục tiêu>"` - đọc phần liên quan trong danh sách in ra; việc cụ thể ⇒ `akb search "<thông báo lỗi / thư viện>"` trước khi tự mò |
| Trong phiên | `akb new issue|lesson|decision|feature ...`; sửa xong ⇒ `akb set <ID> status=resolved ...` + điền 3 mục nguyên nhân/khắc phục/kiểm chứng |
| Cuối phiên (cả khi bị cắt ngang) | điền `SES`, `akb close <SES-ID> "<tóm tắt>"`, `akb sync --project <slug>` |
| Học chéo | chọn mục `resolved/validated` + `confidence` cao; đọc "Khi nào KHÔNG áp dụng"; kiểm chứng ở repo hiện tại; ghi `applied_from`; thất bại cũng ghi |
| Bài học ≥ 2 dự án xác nhận | tạo `_global/lessons/GLS-*.md` (file mới, liệt kê `slug#LES-...`); muốn chỉnh ⇒ file mới `supersedes` |

Đưa AKB vào từng repo: mục "Kho tri thức (AKB)" trong `~/.claude/CLAUDE.md` của máy (áp cho mọi phiên ngay) +
[`AGENT_PROTOCOL.md`](AGENT_PROTOCOL.md) mục 2 và 5 (repo nhận qua lần sync quy ước kế tiếp). Repo con **không** cần
sửa `AGENTS.md` riêng.

## 8. CLI `akb`

| Lệnh | Chức năng |
| --- | --- |
| `akb scan [--refresh] [--dry-run]` | khởi tạo/làm mới hàng loạt mọi dự án trong `~/projects` (idempotent) |
| `akb init [slug] [--path P] [--refresh]` | một dự án; `--refresh` chỉ sinh lại khối tự động của `01_PROFILE.md` (giữ ghi chú tay) |
| `akb slug [--path P]` | slug của thư mục |
| `akb start "<mục tiêu>" [--project s]` | danh sách cần đọc + tạo SES |
| `akb new <issue|lesson|decision|session|feature> [slug] "<tiêu đề>" [--tags a,b] [--severity x]` | mục mới |
| `akb set <ID|slug#ID|đường dẫn> k=v ... [tags+=a,b] [related+=rel:ref] [--section "<mục>" "<nội dung>"]` | đổi trường, tự cập nhật `updated_at` |
| `akb close <SES> "<tóm tắt>"` | chốt phiên + dòng `CHANGELOG.md` + `_meta.json` |
| `akb search "<từ khoá>" [--tag] [--project] [--status] [--type]` | tìm toàn kho, xếp theo độ tin cậy |
| `akb reindex` | chạy L07 trước, rồi sinh `_index/*` + `counts` |
| `akb lint [slug|--all] [--strict] [--secrets-only]` | mục 9 |
| `akb link-project <slug> <đường dẫn>` | thêm ghi đè slug |
| `akb sync [--project s] [--no-push]` | lint → reindex → commit (trailer `AKB-Project`) → pull --rebase → push → mirror |
| `akb mirror` | sao lưu sang `AKB_MIRROR` |

Ghi file nguyên tử (tệp tạm + `rename`); thao tác chung (`_index`, git, `CHANGELOG`) khoá bằng `flock`.

## 9. Lint

| Mã | Kiểm tra | Mức |
| --- | --- | --- |
| L01 | front matter đọc được, đủ trường bắt buộc | Lỗi |
| L02 | ID đúng định dạng, khớp prefix/thư mục/tên file, duy nhất toàn kho | Lỗi |
| L03 | `status`, `severity`, `confidence`, `rel` thuộc enum | Lỗi |
| L04 | `project` = thư mục chứa | Lỗi |
| L05 | mọi `ref` trỏ tới mục tồn tại | Lỗi |
| L06 | issue `resolved` có đủ nguyên nhân gốc, cách khắc phục, cách kiểm chứng | Lỗi |
| L07 | chuỗi giống bí mật (khoá riêng, token GitHub/AWS/Google/Slack/Stripe, JWT, mật khẩu trong URL, gán `token=...` dài) | **Nghiêm trọng - chặn reindex/commit** |
| L08 | tag ngoài `_protocol/TAGS.md` | Cảnh báo |
| L09 | session `interrupted` > 7 ngày | Cảnh báo |
| L10 | `_meta.json` đúng schema, `counts` khớp | Cảnh báo |
| L11 | commit có trailer `AKB-Project: A` sửa file thư mục dự án khác (trừ `_global`, `_index`) | Cảnh báo |

## 10. Nghiệm thu (đạt 20/11/2026)

- [x] `~/agent-kb` đúng cấu trúc mục 3, ngoài `~/projects`, `chmod 700`, git + remote private + bản sao ổ E:.
- [x] 39/39 dự án trong `~/projects` có thư mục, `_meta.json` hợp lệ; `akb lint --all` 0 lỗi.
- [x] `tests/test_akb.py` 9/9: init chạy lại không mất dữ liệu; new/search/reindex/lint; L06; học chéo `applied_from`
      không sửa file dự án A + L05 với ref sai; 5 agent ghi song song 20 mục không hỏng chỉ mục; L07 chặn token giả
      và không báo nhầm `${VAR}` / `[REDACTED]` / SHA-256; start/close; slug theo remote và ghi đè.
- [x] Ví dụ đầy đủ ở `dieu-phoi/` (session, issue, 4 lesson validated, decision).
- [ ] Mỗi repo: phiên đầu tiên sau v4.1.0 backfill `02_FEATURES.md`, `03_RUNBOOK.md`, các DEC từ ADR, ISS/LES quan
      trọng từ phiếu bàn giao (`confidence: low|medium`, nguồn ghi rõ).

## 11. Bảo mật

- Kho là dữ liệu nhạy cảm cục bộ: chỉ remote private `tsudev-org/agent-kb`, không đồng bộ lên dịch vụ công khai khác.
- Không ghi dữ liệu thật của người dùng/công dân (đặc biệt repo UBND) - chỉ mô tả kỹ thuật.
- L07 chạy trước mọi `reindex`/`sync`; hook `pre-commit` chặn lần nữa bằng gitleaks.
