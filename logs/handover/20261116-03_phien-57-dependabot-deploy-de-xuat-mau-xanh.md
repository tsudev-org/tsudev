# PHIẾU BÀN GIAO - Phiên 57: Dependabot, deploy logo trò chơi, đề xuất bảng màu xanh logo

- **Mã phiếu**: 20261116-03
- **Phiên**: phiên 57 (nối tiếp phiên bị tắt đột ngột sau khi merge #288), 16/11/2026
- **Trạng thái**: MỞ (mục 2)

## 1. Đã xong

| Việc                                                                                                                                                                                                                           | PR                  | Số đo                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phiên trước merge #288 (logo 5 trò chơi từ website game) nhưng CHƯA deploy - phát hiện vì thẻ mới nhất là `.5`                                                                                                                 | #288                | sha256 `/eco/game-luyen-go-phim.webp`, `game-lat-manh-ghep.webp` trên production khớp tệp trong repo                                                                                                              |
| Dependabot: ảnh Docker node 22, 11 gói prod (Next 16.4.6, Tiptap 3.33.1, oidc-provider 9.14.0, simplewebauthn 14.1.0, aws-sdk), 11 gói dev (prettier 3.10.1, wrangler 4.161.0, opennext 1.20.17, storybook 10.6.7, vite 8.3.8) | #281 #283 #282      | 14/14 check bắt buộc xanh mỗi PR; #282 xung đột lock sau #283 ⇒ `@dependabot rebase`                                                                                                                              |
| Deploy `v2026.11.16.6`, Worker `9f683a4f`                                                                                                                                                                                      | -                   | `/` `/apps` `/blog` `/docs` `/ung-ho` 200 có nội dung (1 bài, 4 tài liệu); providers = credentials, passkey, github, google; Render `e5a3831` success, `/health` ok, `/oidc/.well-known/openid-configuration` 200 |
| Đóng phiếu 20261116-90 / C1 / S1 (mọi mục đã xong ở #275 #276 + CLAUDE.md)                                                                                                                                                     | phiếu này           | -                                                                                                                                                                                                                 |
| Gỡ khoá cũ `SiteFooter.tsx` trong `logs/LOCKS.md` (#252 đã merge)                                                                                                                                                              | phiếu này           | -                                                                                                                                                                                                                 |
| Bộ quy ước v3.6.0 vẫn ghi website hệ sinh thái "đen tuyền + tím" trong khi tsudev.com/trafficmonitor đã xanh logo ⇒ mở đề xuất `proposals/website-den-xanh-logo.md` (bảng token + số đo tương phản, ngoại lệ lotus giữ tím)    | tsudev-standards#55 | contrast thấp nhất: link 9.80/6.08, accent Sáng 4.50 (sát ngưỡng)                                                                                                                                                 |

## 2. Còn lại

- 🧭 Đo lượt gộp lượt xem đầu tiên (sau 01:23 UTC 17/11) rồi đưa số lên /author (phiếu 20261116-01 mục 2).
- 🧭 C6: catalog vẫn `tsudev-files 2.4.0-vn.1` (đo 13:56 UTC 16/11) ⇒ khi có 2.4.1-vn.1: `npm run pkg:catalog`.
- 🧭 tsudev-standards#55: khi được nhận và phát hành bản mới ⇒ `scripts/sync-standards.sh` ở repo này.
- ⛔ Tệp logo gốc trò chơi trong `packages/brand/source/eco/` không còn dùng (#288) - xoá cần chủ sở hữu duyệt.
- 👤 Thu hồi token Render/Cloudflare (phiếu 20261116-01); kiểm gõ tiếng Việt bằng bộ gõ thật.

## 3. Bẫy mới

- 🪤 `npm install` trên `main` sau Dependabot viết lại `package-lock.json` (-195 dòng) ⇒ trước deploy dùng `npm ci`
  (3 phút) để cây làm việc sạch; `release-tag.js` cần HEAD sạch.
- 🪤 Repo KHÔNG cho auto-merge (`enablePullRequestAutoMerge`) ⇒ chờ check bằng `gh pr checks <n> --watch --required`
  chạy nền rồi `gh pr merge --merge`.
