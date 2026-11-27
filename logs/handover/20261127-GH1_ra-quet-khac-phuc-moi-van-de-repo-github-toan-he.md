# PHIẾU ĐIỀU PHỐI GH1 - Rà quét + khắc phục MỌI vấn đề/lỗi đang tồn tại trên repo GitHub (mọi dự án trong `~/projects`)

- **Mã phiếu**: 20261127-GH1 - **Từ**: phiên `tsudev` CP4a (`mot-cong-dang-nhap-cp3`), 27/11/2026 - **Trạng thái**: MỞ
- **Yêu cầu chủ dự án (27/11/2026)**: phiên điều phối TsuDEV và agent của TẤT CẢ dự án đang có trên máy (`~/projects/*`)
  rà quét và khắc phục/xử lý tất cả vấn đề/lỗi đang tồn tại trên repo GitHub của mình.
- **Quan hệ với SEC3**: GH1 RỘNG hơn [`20261126-SEC3`](20261126-SEC3_ra-soat-an-toan-bao-mat-va-lam-sach-ma-toan-he.md):
  ngoài cảnh báo bảo mật còn gồm CI đỏ trên nhánh mặc định, PR/issue mở, Dependabot, cấu hình repo, VÀ các repo SEC3 để
  ngoài phạm vi (UBND/xanuicam, mieubathuong, b4djl1h-cmdb, sumy-wedding, quansu-xanuicam, TsuGameLabs). Repo đã làm SEC3
  thì GH1 chỉ làm phần còn lại; mục 2.2-2.4 của SEC3 vẫn là cách xử lý chuẩn cho cảnh báo bảo mật.
- **Uỷ quyền**: agent của repo tự sửa, tự commit/push/mở PR/gộp khi check bắt buộc xanh, tự dismiss cảnh báo ĐÃ KIỂM
  CHỨNG là dương tính giả (kèm bằng chứng file:dòng). Dừng hỏi chỉ khi gặp việc 👤 hoặc cổng **Bảo vệ bản quyền**.

## 0. Mọi agent MUST đọc

1. Chỉ sửa repo của mình. Repo đang có phiên khác ⇒ viết phiếu vào `logs/handover/` của repo đó + `SendMessage`
   (ListAgents trước).
2. `MUST NOT`: tắt check/cổng/workflow để cho xanh, hạ mức nghiêm trọng, dismiss hàng loạt không kiểm chứng, thêm tài
   khoản agent vào người duyệt, dùng quyền admin vượt ruleset, sửa `LICENSE`/`NOTICE`/`TRADEMARKS.md`/dòng bản quyền,
   tạo/fork/đổi tên repo thành tên cũ (`~/.claude/CLAUDE.md`), `push --force` lên nhánh mặc định, viết lại lịch sử,
   xoá repo, đổi visibility (private ↔ public), ghi bí mật vào repo/log/AKB/phiếu, ghi "do AI thực hiện" hay
   `Co-Authored-By` AI.
3. Bí mật lộ ⇒ báo chủ dự án + phiếu `XK` (mẫu `.standards/docs/templates/XOAY_KHOA.md`), xoay TRƯỚC rồi mới đóng cảnh báo.
4. Repo của tổ chức/khách hàng ngoài hệ TsuDEV (UBND/`xanuicam`, `dieuhanhcongviecxanuicam`, `lichsuhomnay`, `b4djl1h`,
   sumy-wedding): làm theo `AGENTS.md`/quy ước RIÊNG của repo đó; thay đổi chạm production của khách ⇒ hỏi 👤 trước khi gộp.
5. Đầu phiên: `akb start "GH1 <repo>"` + `akb search "codeql"`, `akb search "dependabot"`, `akb search "<tên workflow đỏ>"`.
   Lỗi tốn > 10 phút ⇒ `akb new issue`; mẹo ⇒ `akb new lesson`.

## 1. Số đo gốc 27/11/2026 (đo bằng `gh api`, phiên CP4a)

Cột: cảnh báo code scanning MỞ · Dependabot mở (High+Critical / tổng) · secret scanning mở · PR mở · issue mở ·
workflow ĐỎ ở lượt gần nhất trên nhánh mặc định. `-` = không có/không bật tính năng (repo private không GHAS).

| Repo                                                                                                    | Thư mục `~/projects`                                                 |        Code scanning         | Dependabot | Secret | PR  | Issue | Workflow đỏ trên nhánh mặc định                          |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | :--------------------------: | :--------: | :----: | :-: | :---: | -------------------------------------------------------- |
| tsudev-org/tsudev                                                                                       | tsudev                                                               | 2 (#139 log-injection, #107) |    0/0     |   0    |  6  |   0   | -                                                        |
| tsudev-org/tsufiles                                                                                     | tsufiles, tsufiles-g3a/g3b/ocr                                       |              4               |    0/0     |   0    |  6  |   4   | **CI**                                                   |
| tsudev-org/tsulink                                                                                      | tsulink                                                              |              5               |    0/0     |   0    |  0  |   0   | **CodeQL**                                               |
| tsudev-org/linux-packages                                                                               | linux-packages                                                       |              7               |    0/0     |   0    |  1  |   0   | **Doi chieu kenh goi**                                   |
| tsudev-org/lotus-share                                                                                  | lotus-share, tsudev-lotus                                            |              5               |    0/0     |   0    |  0  |   1   | **Bảo mật**                                              |
| tsudev-org/scoop-bucket                                                                                 | scoop-bucket                                                         |              6               |    0/0     |   0    |  1  |   0   | **excavator**                                            |
| tsudev-org/.github                                                                                      | tsudev-org-dotgithub                                                 |              7               |    0/0     |   0    |  1  |   0   | -                                                        |
| tsudev-org/homebrew-tap                                                                                 | homebrew-tap                                                         |              6               |    0/0     |   0    |  1  |   0   | -                                                        |
| tsudev-org/tsudev-standards                                                                             | tsudev-standards/tsudev-standards                                    |              4               |    0/0     |   0    |  1  |   0   | -                                                        |
| tsudev-org/tsutramon                                                                                    | tsutramon                                                            |              5               |    0/0     |   0    |  0  |   3   | -                                                        |
| tsudev-org/tsuswico                                                                                     | tsuswico                                                             |              3               |    0/0     |   0    |  0  |   2   | -                                                        |
| tsudev-org/tsuscan                                                                                      | tsuscan                                                              |              6               |    0/0     |   0    |  0  |   0   | -                                                        |
| tsudev-org/tsucwico                                                                                     | tsucwico                                                             |              5               |    0/0     |   0    |  0  |   0   | -                                                        |
| tsudev-org/tsudisk                                                                                      | tsudisk                                                              |              4               |    0/0     |   0    |  0  |   0   | -                                                        |
| tsudev-org/qulythuchi                                                                                   | qulythuchi                                                           |              4               |    0/0     |   0    |  0  |   0   | -                                                        |
| tsudev-org/sound-db                                                                                     | sound-db                                                             |              4               |    0/0     |   0    |  0  |   0   | -                                                        |
| tsudev-org/tsudev-ui-flutter                                                                            | tsudev-ui-flutter                                                    |              4               |    0/0     |   0    |  0  |   0   | -                                                        |
| tsudev-org/tsucontact                                                                                   | tsucontact                                                           |              3               |    0/0     |   0    |  0  |   0   | -                                                        |
| tsudev-org/tsusync                                                                                      | tsusync                                                              |           archive            |     -      |   0    |  0  |   0   | - (⚪ BỎ, chỉ đọc)                                       |
| tsudev-tsudev/app-la-ban                                                                                | app-la-ban, app-la-ban-a9                                            |              7               |    0/0     |   0    |  4  |   0   | -                                                        |
| tsudev-tsudev/sumy-wedding                                                                              | wedding-sumy                                                         |              -               |  **1/2**   |  tắt   |  5  |   0   | -                                                        |
| TsuGameLabs/tsudev-nuicam3d                                                                             | ban-do-3d, tsugamelabs/tsudev-ban-do-3d, tsugamelabs/tsudev-nuicam3d |              -               |  **8/28**  |  tắt   |  9  |   0   | -                                                        |
| TsuGameLabs/tsudev-luyen-go-phim                                                                        | tsugamelabs/tsudev-luyen-go-phim                                     |              -               |    0/0     |  tắt   |  6  |   0   | -                                                        |
| TsuGameLabs/tsudev-game-kit, -chu-chim-vo-canh, -lat-manh-ghep, -noi-hinh-giong-nhau, -xin-chao-nui-cam | tsugamelabs/*                                                        |              -               |    0/0     |  tắt   |  0  |   0   | -                                                        |
| xanuicam/ubnd-app                                                                                       | ubnd-app, ubnd-app-tong                                              |              -               |  **2/6**   |   0    |  0  |   0   | **Dependabot Updates**                                   |
| xanuicam/ubnd                                                                                           | ubnd, ubnd-wt-*                                                      |              -               |    0/0     |   -    |  0  |   0   | -                                                        |
| dieuhanhcongviecxanuicam/ubnd-ttpvhcc-qr                                                                | ubnd-ttpvhcc-qr                                                      |              0               |    0/1     |   -    |  4  |   0   | **Canh nội dung trên sản xuất, Triển khai GitHub Pages** |
| dieuhanhcongviecxanuicam/ubnd-ap-an-hoa                                                                 | ubnd-ap-an-hoa                                                       |              -               |  - (tắt)   |   -    |  7  |   0   | -                                                        |
| dieuhanhcongviecxanuicam/quansu-xanuicam                                                                | quansu-xanuicam                                                      |              -               |    0/2     |   -    |  9  |   0   | -                                                        |
| lichsuhomnay/mieubathuong                                                                               | mieubathuong                                                         |              -               |  **1/1**   |   -    |  6  |   0   | **Dependabot Updates, Quét bảo mật**                     |
| b4djl1h/b4djl1h-cmdb                                                                                    | b4djl1h-cmdb                                                         |              -               |    0/0     |   -    |  3  |   0   | -                                                        |

Không phải repo git: `reclip` (dự án cục bộ, không có remote - chỉ rà mã cục bộ nếu chủ dự án muốn đưa lên GitHub),
`luu-tru` (kho lưu trữ), `logs` (phiên điều phối).

## 2. Việc của mỗi repo (thứ tự ưu tiên)

### 2.1. Kiểm kê lại (đo, không đoán - số ở mục 1 có thể đã đổi)

```bash
R=<owner>/<repo>; BR=$(gh api repos/$R --jq .default_branch)
gh run list -R $R --branch $BR --limit 30 --json workflowName,conclusion,databaseId \
  --jq 'group_by(.workflowName)|map(.[0])|.[]|"\(.conclusion)\t\(.workflowName)\t\(.databaseId)"'
gh api "repos/$R/code-scanning/alerts?state=open&per_page=100" --jq '.[]|"\(.number) \(.tool.name) \(.rule.id) \(.most_recent_instance.location.path):\(.most_recent_instance.location.start_line)"'
gh api "repos/$R/dependabot/alerts?state=open&per_page=100" --jq '.[]|"\(.number) \(.security_advisory.severity) \(.dependency.package.name) \(.dependency.manifest_path)"'
gh api "repos/$R/secret-scanning/alerts?state=open" --jq 'length'     # KHÔNG in .secret
gh pr list -R $R --state open; gh issue list -R $R --state open
gh api repos/$R --jq '.security_and_analysis'
```

### 2.2. Xử lý theo loại (ưu tiên từ trên xuống)

| Ưu tiên | Loại                                                                | Cách xử lý                                                                                                                                                                                                        |
| :-----: | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    1    | Secret scanning mở / GitGuardian                                    | mục 0.3 - báo 👤, phiếu XK, xoay trước                                                                                                                                                                            |
|    2    | Dependabot High/Critical                                            | nâng phụ thuộc (bản vá) + build/test; không nâng được ⇒ ghi lý do + biện pháp giảm thiểu; dismiss chỉ khi mã không gọi tới phần lỗi (dẫn chứng)                                                                   |
|    3    | Workflow ĐỎ trên nhánh mặc định                                     | đọc log (`gh run view <id> --log-failed \| tail -80`), sửa nguyên nhân gốc; lỗi do dịch vụ ngoài/hạn mức ⇒ ghi rõ, thêm thử lại có giới hạn; `MUST NOT` tắt workflow hay thêm `continue-on-error` để che          |
|    4    | CodeQL lỗi thật / dương tính giả                                    | như SEC3 mục 2.2 (sửa + test hồi quy, hoặc dismiss kèm file:dòng)                                                                                                                                                 |
|    5    | Scorecard (Pinned, SAST, CITests, BinaryArtifacts, Vulnerabilities) | như SEC3 mục 2.2; tư thế (BranchProtection, CodeReview, Fuzzing, Maintained, CII) KHÔNG dismiss hàng loạt                                                                                                         |
|    6    | PR mở                                                               | `gh pr update-branch`, CI xanh ⇒ gộp; PR Dependabot bản vá/nhỏ xanh ⇒ gộp; bản lớn ⇒ thử build/test, đỏ ⇒ sửa hoặc đóng kèm lý do; PR lỗi thời/trùng ⇒ đóng kèm lý do                                             |
|    7    | Issue mở                                                            | lỗi thật ⇒ sửa + `Fixes #n`; đã xong ⇒ đóng kèm commit/PR; cần 👤 quyết ⇒ gắn nhãn + ghi mục 3                                                                                                                    |
|    8    | Cấu hình repo                                                       | secret scanning + push protection BẬT (repo public/có GHAS); Dependabot alerts + security updates BẬT; repo private không GHAS ⇒ quét thay thế gitleaks (binary ghim sha256) + `npm audit`/`osv-scanner` trong CI |
|    9    | Nhánh                                                               | nhánh đã gộp ⇒ xoá; giữ nhánh có PR mở; số lượng lớn ⇒ liệt kê, 👤 duyệt trước khi xoá                                                                                                                            |

### 2.3. Báo cáo

- Bản sao phiếu này trong `logs/handover/` của repo: điền mục 4 (số trước → sau, PR, việc còn lại + lý do).
- Cập nhật `logs/STATE.md` của repo; `akb close` + `akb sync --project <slug>`; `SendMessage` một dòng kết quả cho phiên
  điều phối (nếu đang chạy) hoặc ghi dòng vào mục 4 của bản gốc `~/projects/logs/handover/20261127-GH1_*.md`.

## 3. Việc 👤 chủ dự án

1. GitGuardian incident **41140300** (tsudev, dương tính giả đã nêu ở phiếu CP3/ACC1): dismiss trên dashboard
   GitGuardian - máy không có token API GitGuardian.
2. Xoay bí mật nếu có cảnh báo lộ (XK1, XK2 đang MỞ).
3. Repo private không GHAS (TsuGameLabs, UBND, mieubathuong, b4djl1h-cmdb, sumy-wedding): quyết có bật GHAS/đổi
   visibility không - agent KHÔNG tự đổi.
4. Duyệt danh sách nhánh cũ cần xoá (tsudisk 77 nhánh, …).

## 4. Kết quả (mỗi repo một dòng)

| Repo              | Ngày       | Phiên | Trước → sau (CS / Dependabot H+C / workflow đỏ / PR / issue)                                                                                      | PR   | Còn lại + lý do                                                            |
| ----------------- | ---------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------- |
| tsudev-org/tsudev | 27/11/2026 | CP4a  | CodeQL `js/missing-rate-limiting` 19 → 0 (dismiss có kiểm chứng: `@tsudev/ratelimit` `createRateLimit`, `services/auth-service/src/index.ts:885`) | #426 | #139 log-injection, #107 BranchProtection; 6 PR; GitGuardian 41140300 (👤) |

## 5. Bảng điều phối theo mức rủi ro (phiên điều phối giao việc)

| Mức           | Repo                                                                                                        | Lý do                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 🔴 Cao        | TsuGameLabs/tsudev-nuicam3d                                                                                 | 8 Dependabot High/Critical, 9 PR                                               |
| 🔴 Cao        | xanuicam/ubnd-app                                                                                           | 2 Dependabot High/Critical, workflow Dependabot đỏ                             |
| 🔴 Cao        | lichsuhomnay/mieubathuong                                                                                   | 1 High/Critical, workflow "Quét bảo mật" đỏ                                    |
| 🔴 Cao        | tsudev-tsudev/sumy-wedding                                                                                  | 1 High/Critical, secret scanning tắt                                           |
| 🔴 Cao        | tsudev-org/tsufiles                                                                                         | CI đỏ trên `main`, 6 PR, 4 issue                                               |
| 🟠 Trung bình | dieuhanhcongviecxanuicam/ubnd-ttpvhcc-qr                                                                    | "Canh nội dung trên sản xuất" + "Triển khai GitHub Pages" đỏ (site production) |
| 🟠 Trung bình | tsulink, linux-packages, lotus-share, scoop-bucket                                                          | workflow đỏ trên nhánh mặc định                                                |
| 🟠 Trung bình | quansu-xanuicam (9 PR), ubnd-ap-an-hoa (7 PR), luyen-go-phim (6 PR), app-la-ban (4 PR), b4djl1h-cmdb (3 PR) | dọn PR                                                                         |
| 🟢 Thấp       | các repo org còn lại                                                                                        | chỉ cảnh báo tư thế Scorecard + PR/issue lẻ (tiếp SEC3)                        |
| ⚪ Bỏ         | tsusync                                                                                                     | archive                                                                        |

## 6. Prompt chuẩn cho phiên của từng repo

```text
Đọc AGENTS.md của repo, rồi phiếu logs/handover/20261127-GH1_ra-quet-khac-phuc-moi-van-de-repo-github-toan-he.md
(mục 0-2 và đúng dòng của repo này ở mục 1; nếu repo có phiếu SEC3 MỞ thì làm gộp). Chạy akb start "GH1 <repo>" +
akb search "codeql" + akb search "dependabot" trước khi làm.

Rà quét và khắc phục MỌI vấn đề đang tồn tại trên repo GitHub này theo mục 2.2 (thứ tự ưu tiên): bí mật lộ (báo tôi),
Dependabot High/Critical, workflow đỏ trên nhánh mặc định, CodeQL/Scorecard, PR mở, issue mở, cấu hình repo, nhánh cũ.
Sửa lỗi thật kèm test; dương tính giả chỉ dismiss khi đã kiểm chứng và ghi bằng chứng file:dòng. Không tắt check để cho xanh.

Quyền: tự chọn phương án, tự commit/push/mở PR/gộp khi check bắt buộc xanh, tự dismiss cảnh báo đã kiểm chứng. Chỉ dừng
hỏi khi gặp việc 👤 hoặc cổng Bảo vệ bản quyền. Commit không ghi đồng tác giả AI.

Cuối phiên: điền mục 4 của phiếu (bản trong repo + dòng ở bản gốc ~/projects/logs/handover/), cập nhật STATE,
akb close + akb sync, báo điều phối qua SendMessage. Trả lời tôi bằng tiếng Việt, ngắn gọn.
```

## 7. Nhật ký

- 27/11/2026 - phiên tsudev CP4a: mở phiếu theo yêu cầu chủ dự án; đo mục 1; rải bản sao vào `logs/handover/` của mọi
  thư mục dự án có repo git; nhắn hai phiên đang chạy (`ubnd-c1`, `remove-hwp-hwpx-support`).
