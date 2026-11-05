# PHIẾU BÀN GIAO - Phiên 35: thực hiện kế hoạch an toàn thông tin (giai đoạn 1 → 2)

- **Mã phiếu**: 20261105-04
- **Từ**: phiên 34 - **Đến**: phiên 35 (các agent ở `.claude/agents/`) + chủ dự án
- **Thời điểm**: 05/11/2026, cuối phiên 34
- **Trạng thái**: MỞ
- **Thay phiếu**: [`20261105-03`](20261105-03_ket-phien-34.md) - ĐÃ ĐÓNG (mục còn mở chuyển sang đây)
- **Tài liệu gốc của mọi việc dưới đây**: [`docs/security-plan.md`](../../docs/security-plan.md) - đọc §2.3 (khoảng trống G1-G12), §3 (thiết kế Trung tâm an ninh phát hành), §4 (lộ trình + tiêu chí nghiệm thu)

## 0. Trạng thái khi bàn giao (đo, không suy)

- `main` = `94e8495` (merge #125). Không có PR mở. Working tree sạch.
- Production: frontend `3ba3f46a` (Next 16.4.5, OpenNext 1.20.16); backend Render tự deploy từ `main`, `/health` 200.
- `npm audit --omit=dev` = **0 lỗ hổng**. `npm audit` kể cả dev = 38 (G10, giai đoạn 3).
- `prod:dem-noi-dung` ĐẠT; trình duyệt thật trên HTTPS: CSP không lỗi, chế độ Tối áp trước khi vẽ.
- Không còn tiến trình dev nào chạy; `logs/LOCKS.md` trống. Cluster Postgres user-space :5433 vẫn để nguyên (DB dev).

Phiên 34 đã LIVE (chi tiết ở phiếu 03 §1, §1b): CORS R2 · 503 cho slug chưa cache ·
404 tĩnh · `/api/releases` hết 404 (#117, `prefixCoverage.test.ts`) · tông chàm +
trang chủ + wordmark SVG (#118) · pháp lý sạch (#120, #122) · giao diện đợt 2 +
`/admin/content` + hết trang rỗng sau deploy (#123) · vá 7 lỗ hổng phụ thuộc + IP
thật `CF-Connecting-IP` + kế hoạch ATTT (#124).

## 1. 🔴 Việc TAY của chủ dự án - làm TRƯỚC hoặc song song

| #   | việc                                                                                                                                                                                   | mở khoá cho                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| T1  | **Bật 2FA cho tài khoản `tsudev` trên site** (TOTP hoặc passkey ở `/settings/security`)                                                                                                | A2 - nếu chưa bật mà A2 lên prod thì OWNER tự khoá mình khỏi khu quản trị |
| T2  | Bật 2FA cho GitHub, Cloudflare, Render, Neon                                                                                                                                           | §5 kế hoạch                                                               |
| T3  | Đồng ý bật **branch protection** `main` (từ đó không push thẳng `main`)                                                                                                                | A1                                                                        |
| T4  | Ẩn nội dung rác: `/admin/content` → Tài liệu → nguồn "Toà soạn AI (đã gỡ)" → chọn cả trang → Ẩn (lặp tới hết); rồi Bài viết                                                            | nội dung sạch                                                             |
| T5  | Đổi mật khẩu Neon (lộ trong ảnh phiên 33) → cập nhật `DATABASE_URL` trên Render                                                                                                        | -                                                                         |
| T6  | Tạo khoá API VirusTotal (miễn phí) → secret `VIRUSTOTAL_API_KEY` trên Render                                                                                                           | B2                                                                        |
| T7  | Sửa dữ liệu cũ ở `/admin/projects`: mô tả `tsudev Platform` (còn "con dấu tín nhiệm, SSO"), `@tsudev/ui` ("chỉ-chế-độ-tối"), dự án `tsudev-trust-seal`; bài "Chào mừng đến với tsudev" | -                                                                         |
| T8  | `TELEGRAM_*` trên Render; xoá Worker + bucket rác ở tài khoản Cloudflare `dieuhanhcongviecxanuicam`                                                                                    | (tồn từ phiếu 02)                                                         |

## 2. GIAI ĐOẠN 1 - Chặn cửa (làm trước, mỗi dòng một PR)

| #   | agent                         | việc                                                                                                                                                                                                                                                                                                                                                                                                                                                     | điều kiện                                            | nghiệm thu                                                                                                                                        |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | `infra-deploy`                | CI: job `gitleaks` (lần đầu quét toàn lịch sử) + job `npm audit --omit=dev --audit-level=high` + `.github/dependabot.yml` (npm, github-actions, nhịp tuần). Sau T3: bật branch protection bằng `gh api` (bắt buộc các job CI hiện có, cấm force-push)                                                                                                                                                                                                    | A1-CI bất kỳ lúc nào; branch protection CHỜ T3       | job đỏ khi commit cố ý một khoá giả (rồi bỏ); `gh api repos/tsudev-tsudev/tsudev/branches/main/protection` trả cấu hình                           |
| A2  | `backend-api` → `qa-test`     | **Ép 2FA cho ADMIN/OWNER**: `requireAdmin` (content-service) và `requireOwner` (auth-service) trả 403 `{error, code:'MFA_REQUIRED'}` khi tài khoản chưa có TOTP đã xác nhận hoặc passkey. Ngoại lệ BẮT BUỘC: các route bật 2FA/passkey của chính tài khoản đó, nếu không OWNER bị khoá ngoài. Frontend `/admin/*` hiện hướng dẫn tới `/settings/security` khi gặp mã đó                                                                                  | CHỜ T1 trước khi deploy (code + test làm trước được) | test: ADMIN không 2FA ⇒ 403 MFA_REQUIRED; có TOTP ⇒ 200; có passkey ⇒ 200; route bật 2FA vẫn mở                                                   |
| A3  | `release-signing` → `qa-test` | **Siết tải lên** (`/api/admin/projects/:slug/releases/upload-url` + `/seal`): nhận `fileSize`, ký `ContentLength` vào presign PUT; trần theo nền tảng (đề xuất 2 GB); đuôi tệp theo danh sách trắng từng nền tảng (§3.3 kế hoạch); `contentType` do máy chủ suy từ đuôi; lúc niêm phong kiểm **magic bytes** (`MZ`, `PK\x03\x04`, `\x7fELF`, `xar!`...) trong CHÍNH lượt đọc đang băm. Sửa `components/ReleaseManager.tsx` (frontend-web) gửi `fileSize` | bất kỳ lúc nào                                       | đầu-cuối trên MinIO: `.txt` đổi đuôi `.apk` bị từ chối niêm phong; PUT lệch kích thước bị MinIO/R2 từ chối; tệp hợp lệ vẫn niêm phong + ký như cũ |

Thứ tự xuyên vùng của A3: `release-signing` (route) → `frontend-web` (ReleaseManager) → `qa-test`.

## 3. GIAI ĐOẠN 2 - Trung tâm an ninh phát hành `/admin/release-security`

Làm SAU giai đoạn 1 (cần A2 cho xác thực lại). Một nhánh git cho cả chuỗi, đúng thứ tự:

| #   | agent             | việc                                                                                                                                                                                                                                                                                                | nghiệm thu                                                                           |
| --- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| B1  | `data-schema`     | Migration MỚI: cột `securityState`, `lastIntegrityAt`, `revokedAt`, `revokeReason`, `scanResult` cho `ProjectRelease`; trigger chặn `UPDATE`/`DELETE` trên `TrustAuditLog` + `SecurityEvent`; cột `prevHash` (chuỗi băm). `db:generate`. **Nhớ: `db:migrate` lên Neon TRƯỚC khi merge** (CLAUDE.md) | `prisma migrate dev` sạch; xoá một dòng nhật ký ⇒ lỗi trigger                        |
| B2  | `release-signing` | Route nội bộ băm lại tệp đã công bố + so sha256 đã ký ⇒ `LECH_TOAN_VEN` tự gỡ công bố; tra băm VirusTotal lúc niêm phong (thiếu khoá ⇒ log "chưa quét", KHÔNG giả vờ đã quét)                                                                                                                       | sửa tay 1 byte tệp trong MinIO ⇒ lần kiểm kế tiếp `LECH_TOAN_VEN`, link tải biến mất |
| B3  | `backend-api`     | `GET /api/admin/release-security` (bảng kê + trạng thái tính ở máy chủ), thu hồi/khôi phục có lý do bắt buộc + **step-up token** (TOTP/passkey < 5 phút)                                                                                                                                            | test từng trạng thái; thu hồi không có step-up ⇒ 401                                 |
| B4  | `infra-deploy`    | Thêm lượt kiểm toàn vẹn vào Worker cron `canh-site-cron` (nhịp `23 1,13`), báo động Telegram khi lệch                                                                                                                                                                                               | log Worker có dòng kiểm toàn vẹn                                                     |
| B5  | `frontend-web`    | Trang `/admin/release-security` (thẻ trong `/admin`): bảng kê, lọc, nút kiểm lại, thu hồi (modal + mã TOTP), lịch sử                                                                                                                                                                                | ảnh Playwright 3 chế độ + 390px                                                      |
| B6  | `qa-test`         | E2E: tệp sai loại bị từ chối; lệch toàn vẹn tự gỡ công bố; nhật ký không xoá được                                                                                                                                                                                                                   | CI xanh                                                                              |
| B7  | `docs-curator`    | Cập nhật `docs/release-signing.md`, `docs/security-plan.md` (đánh dấu G3-G8 đã đóng), `docs/alerting.md`                                                                                                                                                                                            | `grep` không còn mô tả cũ                                                            |

## 4. Việc phụ (khi có thời gian, không chặn gì)

| agent           | việc                                                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend-web`  | Giao diện đợt 3: `/settings/profile`, `/settings/security`, `/author`, các trang `/admin/*` dùng `PageHeader` và nhịp thẻ mới (đợt 2 chưa chạm) |
| `design-system` | Cân nhắc đưa `PageHeader` (đang ở `apps/frontend-main/components/`) vào `@tsudev/ui` nếu có app thứ hai; hiện KHÔNG cần                         |
| `infra-deploy`  | G10: nâng phụ thuộc dev theo nhóm (Storybook, công cụ dựng), KHÔNG `--force`; chạy lại Storybook và ĐẾM story vẽ được                           |

## 5. Bẫy gặp trong phiên 34 (đọc trước khi làm)

- **`pkill -f` / `pgrep -f` với chuỗi có trong chính lệnh shell ⇒ tự giết shell (exit 144)** - gặp 2 lần trong phiên dù đã ghi ở phiếu trước. Dừng tiến trình bằng PID: `ss -ltnp | grep :<cổng>` rồi `kill <pid>`; liệt kê bằng `ps -eo pid,args | grep '[n]odemon'` (mẹo ngoặc vuông).
- **`npm audit fix --omit=dev` GỠ devDependencies khỏi node_modules** (kể cả OpenNext) - chạy lại `npm install` sau đó.
- **`topology:check` quét cả thư mục tạm** - đã thêm `.wrangler` vào `SKIP_DIR` (#124); nếu pre-push đỏ vì thư mục build tạm khác, thêm vào đó, đừng tắt cổng.
- **`wrangler dev` của frontend gọi backend PRODUCTION thật** (`wrangler.jsonc` vars) không kèm token ⇒ 401 ⇒ trang 503. Muốn đo ISR thì: `npm run dev:local` (backend local) + `npx wrangler dev --port 8799 --var CONTENT_SERVICE_URL:http://localhost:4001`, nạp cache, rồi tắt :4001.
- `next dev` (16.4.5) tự ghi `apps/frontend-main/AGENTS.md` + sửa `next-env.d.ts`: hoàn lại `next-env.d.ts` trước commit (`git checkout`), đừng commit nó cùng việc khác.
- Ngay sau deploy frontend vài giây đầu có thể là bản dựng lúc build; nay tự hồi phục sau ~1-3 giây - vẫn đo lại sau 1 phút trước khi kết luận.
