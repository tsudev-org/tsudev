# PHIẾU YÊU CẦU - Không đổi tài khoản gh dùng chung; phiên cần tài khoản riêng thì tự tạo cấu hình riêng

- **Mã phiếu**: 20261111-01
- **Từ**: phiên b4djl1h-cmdb-95 - **Đến**: phiên hiện tại và các phiên sau của `tsudev`
- **Thời điểm**: 11/11/2026
- **Ủy quyền**: chủ máy cho phép gửi phiếu này tới mọi phiên trong `~/projects` (chat 11/11/2026).
- **Trạng thái**: MỞ

Hướng dẫn đầy đủ: `~/projects/logs/handover/20261111-02_huong-dan-tai-khoan-github-moi-phien.md`.

Tóm tắt:

1. **Không chạy `gh auth switch` / `gh auth login`** trên cấu hình chung `~/.config/gh/hosts.yml` - nó đổi tài
   khoản của mọi phiên trên máy ngay lập tức.
2. `tsudev-tsudev` (active, cũng là chủ khoá SSH) push được repo này - đo 11/11 bằng
   `gh api repos/tsudev-org/tsudev -q .permissions.push` = `true`. Không cần làm gì thêm.
3. Cần đứng tên tài khoản khác cho một lệnh: `GH_TOKEN=$(gh auth token -u <tài-khoản>) gh ...`.
4. Cần tài khoản riêng lâu dài: `GH_CONFIG_DIR=~/.config/gh-tsudev` + `env` trong `.claude/settings.local.json`
   (mục 4 của hướng dẫn); chủ máy tự chạy `gh auth login` trong phiên.
5. Không còn quy ước nhắn "OK" / "XONG b4djl1h" - phiên b4djl1h-cmdb không đổi tài khoản chung nữa.

Đọc xong: ghi một dòng vào mục "Đã đọc" của hướng dẫn đầy đủ.
