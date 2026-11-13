# Đề xuất thảo luận - Bảo mật tài khoản toàn hệ, CMS "Viết bài", cài mọi app bằng lệnh

- **Phiên**: 52, 13/11/2026 - theo yêu cầu chủ dự án
- **Trạng thái**: CHỜ CHỦ DỰ ÁN CHỐT các quyết định đánh dấu 🎯. Chưa có mã nào cho ba hạng mục này.
- **Nguồn tham chiếu đã đọc (chỉ đọc)**: `~/projects/ubnd/20261027-SPEC-SEC-2026-V2-nen-tang-bao-mat-chong-xam-nhap-ubnd.md`
  (8 tầng bảo mật), `~/projects/ubnd/backend/src/modules/cms/` + `frontend-quantri/src/pages/cms/` (CMS quantri),
  `docs/security-plan.md` (G1-G12), `packages/ui/src/lib/ecosystem.ts` (kênh cài).

Vì sao là đề xuất mà chưa là mã: cả ba hạng mục đều đổi schema DB (migration lên Neon TRƯỚC khi merge), thêm biến môi
trường production, hoặc chạm vùng bảo vệ bản quyền (`public/install.*`). Làm sai thứ tự là site trống (sự cố 05/11).

---

## A. Bảo mật tài khoản - đối chiếu 8 tầng của SPEC-SEC-2026-V2 (ubnd)

| Tầng (ubnd)                 | tsudev.com hiện có                                                            | Khoảng trống → đề xuất                                                                                                                                                                                          |
| --------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 Edge: WAF, DDoS, bot    | Cloudflare Workers (DDoS mặc định)                                            | **A1** WAF Managed Rules (gói free) + 1 rate-limit rule cho `/api/auth/*`; **Turnstile** ở đăng ký / quên mật khẩu                                                                                              |
| 3.2 HTTP headers            | CSP có hash script, cookie `__Secure-` httpOnly                               | **A2** test quét nguồn cho HSTS preload, COOP/CORP, Permissions-Policy                                                                                                                                          |
| 3.3 Client                  | Không lưu token ở localStorage (authHint chỉ để vẽ)                           | Đạt                                                                                                                                                                                                             |
| 3.4 Gateway + tần suất      | Giới hạn theo IP `CF-Connecting-IP`; bộ đếm trong RAM (**G9**)                | **A3** chuyển bộ đếm vào Postgres (bảng có TTL) - không cần dịch vụ mới, 0đ                                                                                                                                     |
| 3.5 Danh tính + phân quyền  | Argon2id, TOTP + mã dự phòng, passkey, step-up, `sessionVersion`, RBAC đọc DB | **A4** ép 2FA từ AUTHOR (nay chỉ ADMIN); **A5** step-up khi đổi email / mật khẩu / tắt 2FA; **A6** kiểm mật khẩu lộ (HIBP k-anonymity, chỉ gửi 5 ký tự đầu SHA-1); **A7** email cảnh báo đăng nhập thiết bị mới |
| 3.6 Kiểm soát nội dung      | Markdown lọc, đường ghi `requireAdmin` / `requireAuthor`                      | Đi cùng CMS (mục B): duyệt bài, nhật ký sửa                                                                                                                                                                     |
| 3.7 Hạ tầng, chuỗi cung ứng | gitleaks, CodeQL, npm audit, zizmor, trivy, Dependabot, 13 check bắt buộc     | **G10** dev deps; SAST Semgrep (giai đoạn 3)                                                                                                                                                                    |
| 3.8 Dữ liệu + mã hoá        | TOTP mã hoá, nhật ký chỉ-thêm có `prevHash`                                   | **G11** sao lưu khoá ký ngoại tuyến; **G12** dump DB mã hoá bằng `age`                                                                                                                                          |

**A8 - Trung tâm bảo mật tài khoản** (`/settings/security`, lối vào: menu avatar + cột footer "Bảo mật tài khoản"):
hiện trang có Passkey / TOTP / Phiên / Hoạt động / Vùng nguy hiểm. Đề xuất thêm ở đầu trang một **thẻ "Mức an toàn"**
tính từ dữ liệu thật (đã xác minh email, có 2FA, có passkey, có mã dự phòng còn lại, mật khẩu không nằm trong danh
sách lộ) với từng việc còn thiếu là một nút làm ngay. Không phải điểm số trang trí: mỗi mục đọc từ DB qua auth-service.

**🎯 A9 - Tài khoản chung cho `*.tsudev.com`** (quyết định kiến trúc lớn nhất):

| Phương án                                              | Ưu                                                             | Nhược                                                                      |
| ------------------------------------------------------ | -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| (1) tsudev.com làm **nhà cung cấp OIDC** (khuyến nghị) | Chuẩn mở; mỗi site con chỉ giữ phiên của nó; thu hồi tập trung | Phải viết endpoint `/authorize`, `/token`, JWKS (đã có hạ tầng ký Ed25519) |
| (2) Cookie phiên `Domain=.tsudev.com`                  | Nhanh                                                          | MỘT site con bị XSS hay bị chiếm subdomain = lộ phiên của MỌI site. Bác    |
| (3) Mỗi site tự quản tài khoản                         | Độc lập                                                        | Trái `ECOSYSTEM_IDENTITY.md` ("dùng chung một tài khoản")                  |

Hiện các site `*.tsudev.com` là trang tĩnh, không đăng nhập ⇒ A9 chỉ cần khi một site con có tính năng cá nhân hoá.

## B. Tái cấu trúc "Viết bài" thành CMS - theo khuôn quantri (ubnd)

Hiện trạng `/author` (707 dòng, một trang): một form dài (tiêu đề, slug, tóm tắt, thẻ, giờ đăng, ảnh bìa, SEO,
Markdown, nguồn) ở TRÊN danh sách bài; trạng thái chỉ có `published` true/false (+ hẹn giờ). Không duyệt, không lịch sử
sửa, không chuyên mục, không thống kê.

Khuôn của ubnd (`/cms/*`): danh sách bài (`PostsPage`) tách khỏi trình soạn (`PostEditorPage`), chuyên mục
(`CategoriesPage`), từ khoá (`TuKhoaPage`), tác giả (`TacGiaPage`), thống kê (`ThongKePage`), phản ánh (`PhanAnhPage`);
API `PATCH /posts/:id/status`, `PATCH /posts/:id/ghim`, `public/lien-quan`, `public/luot-trang`.

Đề xuất cấu trúc cho tsudev (đường dẫn theo `docs/url-convention.md`):

| Trang                         | Nội dung                                                                                                                                                                                                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/author` → **Tổng quan**     | Bài của tôi theo trạng thái (Nháp · Chờ duyệt · Đã lên lịch · Đã đăng · Lưu trữ), lượt xem 7/30 ngày                                                                                                                                                                       |
| `/author/posts`               | Bảng bản ghi chuẩn `DATA_TABLE.md`: tìm tiếng Việt bỏ dấu, lọc trạng thái/chuyên mục/thẻ, chọn số dòng, URL giữ bộ lọc                                                                                                                                                     |
| `/author/posts/new`, `/:id`   | Hai cột: TRÁI trình soạn (theo `.standards/docs/RICH_TEXT_EDITOR.md`) + xem trước; PHẢI hộp **Xuất bản** (trạng thái, hẹn giờ, nút Gửi duyệt/Đăng), Chuyên mục, Thẻ, Ảnh bìa, SEO + xem trước thẻ chia sẻ, Nguồn. Tự lưu nháp mỗi 10 giây; cảnh báo rời trang khi chưa lưu |
| `/author/posts/:id/history`   | Lịch sử phiên bản, so sánh, khôi phục                                                                                                                                                                                                                                      |
| `/admin/content` (đã có)      | Hàng chờ duyệt cho MODERATOR+: duyệt / trả về kèm lý do / ghim                                                                                                                                                                                                             |
| `/author/categories`, `/tags` | Quản lý chuyên mục, gộp thẻ trùng (ADMIN)                                                                                                                                                                                                                                  |

Dữ liệu (data-schema, migration MỚI, `db:migrate` lên Neon trước merge):
`Post.status` enum `DRAFT | PENDING | SCHEDULED | PUBLISHED | ARCHIVED` (giữ `published` để đọc ngược trong một bản phát
hành rồi gỡ), bảng `PostRevision` (chỉ-thêm), `Category`, `Post.pinnedAt`, `Post.reviewNote`, đếm lượt xem gộp theo ngày.
Quy tắc quyền: AUTHOR chỉ gửi duyệt; MODERATOR+ mới đăng thẳng / duyệt; mọi chuyển trạng thái ghi nhật ký.

**🎯 B-phản ánh**: "phản ánh kiến nghị" của ubnd là kênh công dân gửi vấn đề cho chính quyền. Bản tương ứng cho tsudev là
**"Góp ý & báo lỗi ứng dụng"** (người dùng gửi lỗi/đề xuất cho từng app, có trạng thái tiếp nhận → đang xử lý → xong,
trả lời công khai). Cần chốt: có làm không, và ẩn danh hay bắt đăng nhập (khuyến nghị: bắt đăng nhập + Turnstile).

## C. Mọi phần mềm cài được bằng lệnh

Ma trận kênh hiện tại (production /apps, 13/11/2026):

| App                   | winget         | Scoop | Homebrew | APT/DNF | Ghi chú                                 |
| --------------------- | -------------- | ----- | -------- | ------- | --------------------------------------- |
| tsudev-trafficmonitor | chờ PR #477193 | ✅    | -        | -       | Windows                                 |
| cwico                 | ✅             | -     | -        | -       | Windows                                 |
| tsudev SWICO          | ✅             | ✅    | -        | -       | Windows                                 |
| TsuFiles              | -              | ✅    | ✅       | ✅      | tên gói giữ `tsudev-files`              |
| Lotus Share           | -              | ✅    | ✅       | ✅      | Android không có kênh lệnh              |
| tsudev-contact        | -              | ✅    | -        | -       | Windows                                 |
| La bàn                | -              | -     | -        | -       | Android, độc quyền                      |
| 6 trò chơi            | -              | -     | -        | -       | chơi trên web; tệp cài: phương án A chờ |

Đề xuất theo thứ tự giá trị:

1. **C1** winget cho TsuFiles, Lotus Share, tsudev-contact, trafficmonitor - mỗi repo thêm bước `komac` trong workflow
   phát hành (phiếu toàn hệ 20261113-01 đã gửi).
2. **🎯 C2** `install.sh` / `install.ps1` nhận NHIỀU gói một lượt: `irm tsudev.com/install.ps1 | iex; tsudev-install
cwico swico` - tệp nằm ở vùng bảo vệ, cần chủ dự án duyệt PR. Kèm sha256 công bố (đã có).
3. **🎯 C3** Ký mã Windows (SignPath Foundation, miễn phí cho mã nguồn mở) - chủ dự án đăng ký; hết cảnh báo SmartScreen.
4. **C4** Cổng CI "mọi app có ít nhất một kênh lệnh trên hệ điều hành chính của nó" chạy trên `ecosystem.ts` + catalog -
   app mới thiếu kênh thì đỏ, không phải nhớ.
5. **C5** Mọi website `*.tsudev.com` hiện khối "Cài bằng lệnh" đọc cùng `pkg.tsudev.com/catalog.json` (không chép tay).
6. **🎯 C6** La bàn (Android, độc quyền): không có kênh lệnh hợp lý; đề xuất chỉ phát APK có chữ ký + (tuỳ) F-Droid
   không nhận vì độc quyền ⇒ giữ nguyên.

## Thứ tự làm đề xuất (sau khi chốt 🎯)

1. A4-A6 + A8 (không đổi schema lớn, rủi ro thấp, giá trị bảo mật cao nhất) - 1 phiên.
2. B giai đoạn 1: schema + `/author/posts` + trình soạn hai cột + trạng thái/duyệt - 2 phiên.
3. C1 + C4 (phiếu cho từng repo) song song; C2 khi chủ dự án duyệt.
4. A1 (cấu hình Cloudflare - chủ dự án hoặc agent có token Zone), A3, G11-G12.
5. B giai đoạn 2 (lịch sử, thống kê, góp ý) và A9 khi có site con cần đăng nhập.
