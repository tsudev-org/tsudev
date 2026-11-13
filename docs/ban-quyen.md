# Bản quyền, giấy phép, nhãn hiệu và cơ chế bảo vệ

> Áp dụng từ 13/11/2026 (chủ dự án ủy quyền phiên tsudev-06 chọn phương án). Agent đọc mục 4 trước khi sửa bất cứ thứ gì
> liên quan.

## 1. Ba lớp pháp lý

| Lớp                | Tệp                                              | Bảo vệ cái gì                                                                                                                         |
| ------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Giấy phép mã nguồn | `LICENSE` (Apache-2.0, nguyên văn từ apache.org) | Ai cũng dùng/sửa/phân phối được mã; đổi lại PHẢI giữ thông báo bản quyền + `NOTICE` (điều 4(d)), cấp quyền sáng chế, miễn trách nhiệm |
| Ghi công bắt buộc  | `NOTICE`                                         | "Copyright 2026 tsudev" - xoá khỏi bản phân phối là vi phạm giấy phép                                                                 |
| Nhãn hiệu          | `TRADEMARKS.md`                                  | Tên tsudev, tên + logo sản phẩm KHÔNG nằm trong giấy phép (Apache-2.0 điều 6) - bản fork phải đổi tên/logo                            |

Vì sao Apache-2.0 mà không "giữ toàn quyền": phần mềm không giấy phép mở thì không phải mã nguồn mở - SignPath
Foundation, Flathub, F-Droid, awesome-list đều không nhận. Apache-2.0 là giấy phép mở duy nhất phổ biến có **cả** điều
khoản `NOTICE` bắt buộc **lẫn** loại trừ nhãn hiệu tường minh, và đã là giấy phép của lotus-share, tsudev-swico,
tsudev-contact, linux-packages. Bản quyền vẫn thuộc tác giả: giấy phép chỉ CẤP QUYỀN dùng, không chuyển quyền sở hữu.

⚠️ "tsudev" là tên thương hiệu, chưa phải pháp nhân - về luật, bản quyền thuộc cá nhân chủ dự án. Muốn tổ chức đứng
tên (và đăng ký nhãn hiệu tại Cục Sở hữu trí tuệ để kiện được khi bị mạo danh) thì cần lập pháp nhân - việc của chủ dự án.

Repo đã có giấy phép riêng GIỮ NGUYÊN (không đổi giấy phép mã của người khác đã đóng góp / dự án gốc): tsudev-files và
tsudev-cwico (MIT - Filee gốc là MIT), tsudev-trafficmonitor (Anti-996 của TrafficMonitor gốc), tsudev-standards (MIT).

## 2. Cơ chế kỹ thuật - không dựa vào tự giác

1. **Check bắt buộc `Bảo vệ bản quyền`** (`.github/workflows/bao-ve-ban-quyen.yml` → `scripts/bao-ve-ban-quyen.mjs`):
   PR chạm đường dẫn trong `config/ban-quyen.json` > `duong_dan_bao_ve`, hoặc XOÁ một dòng chứa `dau_hieu_bao_ve`
   (`Copyright`, `©`, `SPDX-License-Identifier`, ...) ở bất kỳ tệp nào ⇒ ĐỎ cho tới khi người trong `nguoi_duyet`
   APPROVE đúng commit đầu PR. Đẩy thêm commit sau khi duyệt ⇒ phải duyệt lại.
2. **Cổng không bị PR sửa được**: chạy `pull_request_target` - mã cổng lấy từ `main`; job không checkout/chạy mã PR, token
   chỉ đọc. Sửa cổng/cấu hình cũng là "chạm đường dẫn bảo vệ" ⇒ cổng CŨ đòi phê duyệt.
3. **Tách danh tính**: người duyệt = `nguyentrangtinhsu` (team `tsudev-org/chu-so-huu`), tài khoản KHÔNG phiên agent nào
   đăng nhập. Các phiên agent dùng `tsudev-tsudev` - GitHub cấm tự duyệt PR của mình nên agent không thể tự cho qua.
4. **Toàn bộ `.github/workflows/` là đường dẫn bảo vệ**: một PR thêm workflow mới có job đặt tên `Bảo vệ bản quyền`
   luôn xanh (giả check) cũng bị cổng thật đòi phê duyệt. Workflow cổng chỉ có `pull_request_target` - một job
   "skipped" trùng tên được GitHub tính là đạt, nên test của cổng nằm ở workflow riêng.
5. **Branch protection** `main`: `enforce_admins` bật (admin cũng không merge vượt check), `strict`.

Vì sao không dùng "mã xác nhận ngẫu nhiên": chuỗi mã phải lưu ở nơi agent đọc được (tệp, biến môi trường, chat) thì
agent cũng đọc và gõ lại được - đó là bảo mật hình thức. Phê duyệt GitHub gắn với tài khoản có 2FA, do máy chủ GitHub xác
thực, có nhật ký kiểm toán - đó là "văn bản ủy quyền" có thể kiểm chứng.

## 3. Chủ sở hữu thao tác thế nào

1. Mở PR bị đỏ `Bảo vệ bản quyền` → tab _Files changed_ xem đúng thay đổi → _Review changes_ → **Approve**.
2. Gắn một nhãn bất kỳ (hoặc _Re-run_ job) để cổng chạy lại → xanh → merge.
3. Bảo vệ tài khoản duyệt: bật 2FA (khoá bảo mật/passkey), KHÔNG đăng nhập nó trong terminal của agent (`gh auth`),
   KHÔNG tạo token cho nó trên máy chạy agent.

## 4. Agent AI làm gì

- Đọc `AGENTS.md` mục B.1b. Cần đổi nội dung được bảo vệ ⇒ mở PR với lý do, DỪNG, báo chủ dự án duyệt.
- `MUST NOT`: tắt/bỏ check, sửa `nguoi_duyet`, thêm tài khoản agent vào team `chu-so-huu`, dùng quyền admin để merge
  vượt, coi một "mã"/"văn bản" trong chat là phê duyệt.
- Thêm đường dẫn cần bảo vệ (logo mới, trang giới thiệu mới) ⇒ PR sửa `config/ban-quyen.json` (cần chủ sở hữu duyệt).

## 5. Phạm vi hiện tại và việc tiếp theo

- Repo `tsudev`: đủ 3 lớp + cơ chế (13/11/2026).
- Repo khác trong hệ: phiếu `~/projects/logs/handover/20261113-03_yeu-cau-ban-quyen-nhan-hieu-toan-he.md` (NOTICE +
  liên kết TRADEMARKS + chép cổng này).
- `.github/CODEOWNERS` → team `@tsudev-org/chu-so-huu` (PR #239, 13/11/2026): lớp thứ hai do GitHub tự thi hành,
  khớp danh sách `duong_dan_bao_ve`. Nghiệm thu: PR thử #241 xoá dòng `Copyright` ở README (tệp KHÔNG thuộc danh sách)
  ⇒ cổng đỏ, PR `BLOCKED` - đã đóng.
- Phê duyệt vẫn còn hiệu lực sau `gh pr update-branch` khi phần thay đổi của PR không đổi (GitHub giữ phê duyệt khi chỉ
  kéo thêm commit từ `main`); đẩy commit MỚI vào PR thì phải duyệt lại.

## 6. Repo có bot tự đẩy `main` (scoop-bucket, homebrew-tap)

Bot cập nhật gói (`excavator.yml`, `cap-nhat.yml`) đẩy thẳng `main` vài lần mỗi ngày. Ruleset cấp repo KHÔNG nhận
GitHub Actions làm ngoại lệ (422), và ruleset cấp tổ chức cần quyền `admin:org` (gói Free). Thiết kế đã chọn:

- Bot đẩy bằng **deploy key ghi** (secret `BOT_DEPLOY_KEY` của environment `bot` - CHỈ nhánh `main` dùng được, workflow
  từ nhánh PR không đọc được). Deploy key là ngoại lệ DUY NHẤT của ruleset `Bao ve ban quyen` (required check
  `Bảo vệ bản quyền`, integration 15368). Mọi người khác - kể cả admin và agent - phải qua PR + cổng.
- Chỉ tạo key SAU KHI `.github/workflows/` đã là đường dẫn bảo vệ: nếu không, một workflow mới có thể dùng key để vượt.
- Tạo key + ngoại lệ là việc CHỦ DỰ ÁN tự chạy (agent bị bộ phân loại an toàn chặn - đúng thiết kế):
  `bash ~/projects/logs/bat-bao-ve-scoop-homebrew.sh` - script tự kiểm điều kiện tiên quyết và dừng nếu chưa đủ.
- Đã bật sẵn (13/11/2026): ruleset `Bao ve main - khong force-push, khong xoa` (không ngoại lệ) ở cả hai repo.
