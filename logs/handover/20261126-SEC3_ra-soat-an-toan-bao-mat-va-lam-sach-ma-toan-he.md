# PHIẾU ĐIỀU PHỐI SEC3 - Rà soát an toàn bảo mật thông tin + làm sạch mã + dọn GitHub (toàn hệ)

- **Mã phiếu**: 20261126-SEC3 - **Từ**: phiên tsudev-CP0, 26/11/2026 - **Trạng thái**: MỞ
- **Yêu cầu chủ dự án (26/11/2026)**: agent của MỌI dự án hệ TsuDEV rà soát/kiểm tra an toàn bảo mật thông tin cho
  repo của mình, gồm xử lý cảnh báo CodeQL và PR/nhánh trên GitHub, để mọi repo có mã sạch.
- **Uỷ quyền**: agent của repo tự sửa, tự commit/push/mở PR/gộp khi CI xanh, tự đánh dấu cảnh báo đã KIỂM CHỨNG là
  dương tính giả (kèm lý do cụ thể). Dừng hỏi chỉ khi gặp việc 👤 hoặc cổng **Bảo vệ bản quyền**.
- **Chuẩn**: tsudev-standards **v7.2.0** - `SECURITY_BASELINE.md`, `GIT_WORKFLOW.md`, `TESTING_QUALITY.md`,
  `GITIGNORE_POLICY.md`, `CONTROL_PLANE.md` (mới), `APP_INTEGRITY.md`, `KNOWLEDGE_BASE.md`.
- **Cài đặt tham chiếu**: tsudev #409-#411 (dismiss có kiểm chứng, giới hạn tần suất, cổng `X-Tsu-App`).

## 0. Mọi agent MUST đọc

1. Chỉ sửa repo của mình. Repo đang có phiên khác ⇒ viết phiếu vào `logs/handover/` của repo đó + `SendMessage`.
2. `MUST NOT`: tắt check/cổng, hạ mức nghiêm trọng, thêm tài khoản agent vào người duyệt, dùng quyền admin vượt ruleset,
   sửa `LICENSE`/`NOTICE`/`TRADEMARKS.md`/dòng bản quyền, tạo/đổi tên repo thành tên cũ (`~/.claude/CLAUDE.md`), viết lại
   lịch sử git đã đẩy (`push --force` lên `main`), ghi bí mật vào repo/log/AKB, ghi "do AI thực hiện" hay `Co-Authored-By` AI.
3. Dismiss cảnh báo **chỉ sau khi kiểm chứng** trong mã (dẫn file:dòng của biện pháp bảo vệ thật) - lý do chung chung
   ("không áp dụng") không được chấp nhận. Lỗi thật ⇒ sửa + test hồi quy.
4. Bí mật lộ (gitleaks/GitGuardian/secret scanning) ⇒ **xoay bí mật TRƯỚC** (việc 👤 nếu cần dashboard), rồi mới đóng
   cảnh báo; không xoá lịch sử nếu chủ dự án chưa đồng ý.
5. Đầu phiên `akb start "SEC3 <repo>"` + `akb search "codeql"`, `akb search "scorecard"`; mỗi bẫy/mẹo ⇒ `akb new`.

## 1. Số đo gốc 26/11/2026 (cảnh báo code scanning MỞ / PR mở)

| Repo                                    |      Cảnh báo mở       | PR mở | Cảnh báo cần XỬ LÝ (ngoài tư thế Scorecard)                                                            |
| --------------------------------------- | :--------------------: | :---: | ------------------------------------------------------------------------------------------------------ |
| tsudev                                  |           1            |   5   | #107 BranchProtection (giữ - xem mục 2.4)                                                              |
| tsudev-standards                        |           4            |   1   | -                                                                                                      |
| tsufiles                                |           4            |   4   | -                                                                                                      |
| tsudev-ui-flutter                       |           4            |   0   | -                                                                                                      |
| .github (`tsudev-org-dotgithub`)        |           7            |   1   | #9 CITests, #2 SAST                                                                                    |
| tsutramon                               |           5            |   0   | #8 BinaryArtifacts `OpenHardwareMonitorApi/LibreHardwareMonitorLib.dll`                                |
| sound-db                                |           4            |   0   | -                                                                                                      |
| homebrew-tap                            |           6            |   1   | #3 SAST                                                                                                |
| qulythuchi                              |           4            |   0   | -                                                                                                      |
| tsucwico                                |           5            |   6   | #24 Vulnerabilities, #23 SAST                                                                          |
| tsudisk                                 |           9            |   0   | #3, #4 `js/file-access-to-http` (`packaging/tools/winget-submit.mjs`); #9, #14, #15 PinnedDependencies |
| tsucontact                              |           3            |   0   | -                                                                                                      |
| tsuswico                                |           3            |   0   | -                                                                                                      |
| tsuscan                                 |           6            |   0   | #34 Vulnerabilities, #35 SAST                                                                          |
| scoop-bucket                            |           6            |   1   | #4 SAST                                                                                                |
| linux-packages                          |           7            |   1   | #5 SAST, #3 PinnedDependencies (`xuat-ban.yml`)                                                        |
| lotus-share                             |           5            |   0   | #82 Vulnerabilities                                                                                    |
| tsulink                                 |           5            |   1   | -                                                                                                      |
| tsusync                                 | chưa bật code scanning |   -   | bật CodeQL (mục 2.2)                                                                                   |
| app-la-ban (`tsudev-tsudev/app-la-ban`) |           7            |   4   | #7 CITests, #2 SAST                                                                                    |
| TsuGameLabs (`tsudev-*`, PRIVATE)       |     không có GHAS      |   -   | quét thay thế mục 2.2                                                                                  |

Toàn hệ (cảnh báo mở theo luật): Scorecard BranchProtection 19, CodeReview 18, Fuzzing 16, Maintained 14,
CII-Best-Practices 9, SAST 7, PinnedDependencies 4, Vulnerabilities 3, CITests 2, BinaryArtifacts 1; CodeQL 2.
Ngoài phạm vi: repo UBND/xanuicam, mieubathuong, b4djl1h-cmdb, wedding-sumy (không thuộc hệ TsuDEV).

## 2. Việc của mỗi repo (thứ tự)

### 2.1. Kiểm kê (đo, không đoán)

```bash
R=tsudev-org/<repo>
gh api "repos/$R/code-scanning/alerts?state=open&per_page=100" --jq '.[]|"\(.number) \(.tool.name) \(.rule.id) \(.most_recent_instance.location.path):\(.most_recent_instance.location.start_line)"'
gh api "repos/$R/secret-scanning/alerts?state=open" --jq 'length'
gh api "repos/$R/dependabot/alerts?state=open" --jq '.[]|"\(.number) \(.security_advisory.severity) \(.dependency.package.name)"'
gh pr list -R $R --state open; git branch -r --merged origin/main
gh api repos/$R --jq '.security_and_analysis'   # secret scanning + push protection phải enabled
```

### 2.2. Xử lý theo loại

| Loại                                                                          | Cách xử lý                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CodeQL lỗi thật                                                               | sửa + test hồi quy; một PR một nhóm lỗi                                                                                                                                                                                                                   |
| CodeQL dương tính giả                                                         | dẫn biện pháp bảo vệ thật (file:dòng), `gh api -X PATCH repos/$R/code-scanning/alerts/N -f state=dismissed -f dismissed_reason="false positive" -f dismissed_comment="<bằng chứng>"`                                                                      |
| Scorecard `Vulnerabilities` / Dependabot                                      | nâng phụ thuộc (`npm audit --omit=dev`, `cargo audit`, `dotnet list package --vulnerable --include-transitive`, `flutter pub outdated`, `osv-scanner`) - đích 0 High/Critical ở phụ thuộc production                                                      |
| `PinnedDependencies`                                                          | ghim action theo SHA đầy đủ (kèm chú thích phiên bản), ghim tool tải về bằng sha256                                                                                                                                                                       |
| `SAST`                                                                        | repo public: workflow CodeQL cho ngôn ngữ có hỗ trợ (KHÔNG bật default setup song song - bẫy ở `~/.claude/CLAUDE.md`); repo không có ngôn ngữ CodeQL hỗ trợ hoặc private không GHAS: Semgrep CE + gitleaks (binary ghim sha256) trong CI                  |
| `BinaryArtifacts`                                                             | gỡ tệp nhị phân khỏi repo (tải lúc dựng + sha256) hoặc ghi ngoại lệ có lý do trong `exceptions/` của bộ quy ước                                                                                                                                           |
| `CITests`                                                                     | thêm job test chạy trên PR                                                                                                                                                                                                                                |
| `Fuzzing`, `CIIBestPractices`, `Maintained`, `CodeReview`, `BranchProtection` | tư thế repo, không phải lỗi mã: `MUST NOT` dismiss hàng loạt. `CIIBestPractices`: theo hồ sơ Best Practices trung thực (chỉ khai Met có bằng chứng). `BranchProtection`/`CodeReview`: quyết định của chủ dự án (một người duyệt) - ghi vào báo cáo, để mở |

### 2.3. An toàn cấu hình + mã sạch

- Bí mật: `gitleaks detect --log-opts=--all` toàn lịch sử; `.env*`, khoá, chứng thư không trong git (`GITIGNORE_POLICY.md`).
- Workflow: `permissions:` tối thiểu ở cấp workflow, không `pull_request_target` với checkout mã PR, `actionlint` + `zizmor` sạch.
- Web: tiêu đề bảo mật (HSTS, CSP, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`), CORS không `*` cho
  đường có xác thực, cookie `Secure`/`HttpOnly`/`SameSite`; website sản phẩm KHÔNG có trang quản trị riêng (`CONTROL_PLANE.md`).
- App gọi API tsudev.com: gửi `X-Tsu-App: <sp>/<phiên bản>/<kênh>` ở mọi lượt gọi `/api/me/entitlements`, `/api/rp/*`,
  `/api/xd/*`, userinfo; xử lý `426` bằng modal khoá (`APP_INTEGRITY.md` 2.1-2.2) - tsudev.com sẽ bắt buộc header khi
  mọi app đã gửi.
- Mã sạch, cổng 0 cảnh báo: TS/JS (`eslint --max-warnings 0`, `tsc --noEmit`, `prettier --check`, `knip`), Rust
  (`cargo clippy -- -D warnings`, `cargo fmt --check`), .NET (`dotnet format --verify-no-changes`, analyzer
  `TreatWarningsAsErrors`), Flutter (`flutter analyze --fatal-infos`), C++ (cảnh báo trình dịch `/W4` hoặc `-Wall -Wextra`).
  Mã chết, tệp tạm, TODO quá hạn ⇒ gỡ.

### 2.4. Dọn GitHub

- PR mở: `gh pr update-branch`, CI xanh ⇒ gộp; PR Dependabot nâng bản vá/bản nhỏ xanh ⇒ gộp; PR lỗi thời ⇒ đóng kèm lý do.
- Nhánh đã gộp ⇒ xoá (`git push origin --delete <nhánh>`), giữ nhánh có PR mở.
- Secret scanning + push protection BẬT; tắt ⇒ bật lại (sau khi chuyển repo vào org hay bị tắt).

### 2.5. Báo cáo

- Phiếu này bản sao trong `logs/handover/` của repo: điền mục 4 (số trước/sau, PR, cảnh báo còn mở + lý do).
- AKB: `akb close` + `akb sync --project <slug>`; `SendMessage` cho phiên điều phối một dòng kết quả.

## 3. Việc 👤 chủ dự án

1. Xoay bí mật nếu có cảnh báo lộ cần dashboard.
2. Quyết định về Scorecard `BranchProtection`/`CodeReview` (yêu cầu người duyệt cho `main`) - hiện cố ý để agent tự gộp.

## 4. Kết quả (mỗi repo một dòng)

| Repo | Ngày | Cảnh báo trước → sau | PR  | Ghi chú |
| ---- | ---- | -------------------- | --- | ------- |

## 5. Prompt chuẩn cho phiên của từng repo

```text
Đọc AGENTS.md của repo, rồi phiếu logs/handover/20261126-SEC3_ra-soat-an-toan-bao-mat-va-lam-sach-ma-toan-he.md
(mục 0-2 và đúng dòng của repo này ở mục 1). Chạy akb start "SEC3 <repo>" + akb search "codeql" trước khi làm.

Làm mục 2.1 → 2.5 cho repo này: kiểm kê bằng gh api; sửa lỗi thật kèm test; dương tính giả chỉ dismiss khi đã kiểm
chứng và ghi bằng chứng file:dòng; nâng phụ thuộc tới 0 High/Critical; ghim action theo SHA; mã sạch 0 cảnh báo; dọn
PR/nhánh. Cảnh báo tư thế Scorecard (BranchProtection, CodeReview, Fuzzing, Maintained, CII) không dismiss hàng loạt.

Quyền: tự chọn phương án, tự commit/push/mở PR/gộp khi CI xanh, tự dismiss cảnh báo đã kiểm chứng. Chỉ dừng hỏi khi
gặp việc 👤 hoặc cổng Bảo vệ bản quyền. Commit không ghi đồng tác giả AI.

Tiết kiệm: grep rồi đọc đúng đoạn; gộp cổng một lần cuối cụm; chờ CI bằng tác vụ nền.

Cuối phiên: điền mục 4 của phiếu, cập nhật STATE/bàn giao của repo, akb close + akb sync, báo điều phối qua
SendMessage. Trả lời tôi bằng tiếng Việt, ngắn gọn.
```
