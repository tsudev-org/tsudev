# PHIẾU BÀN GIAO - Phiên 43 (tiếp): xoá 13 nhánh remote, sửa mốc + cách ghim minimatch

- **Mã phiếu**: 20261109-02
- **Từ**: phiên 43 (09/11/2026) - **Đến**: phiên 44 + chủ dự án
- **Trạng thái**: MỞ - chỉ còn §2 (minimatch); việc khác chuyển sang [`20261109-03`](20261109-03_phien-44-chuyen-repo-vao-tsudev-org.md)
- **Thay phiếu**: [`20261109-01`](20261109-01_ket-phien-43-dependabot-197-199.md) - §2 xong; mọi việc còn lại chuyển sang đây.

## ⚡ Khởi động phiên 44

1. Đọc `AGENTS.md`, `logs/STATE.md`, phiếu này. `git fetch --prune && git status` trên `main` phải sạch.
2. Override minimatch theo §2 - **KHÔNG theo hướng dẫn `^11.0.1` của các phiếu cũ**.

## 1. Làm trong phiên

**Xoá 13 nhánh remote cũ** (chủ dự án cho phép 09/11). Đo lại trước khi xoá: cả 13 đều có PR (#40, #60, #62, #77, #81, #127, #129, #143, #150, #175, #176, #177, #181). Commit duy nhất không có trong `main` lẫn đầu PR: `2d21c07` trên `fix/phase-a-ssrf-ratelimit` - nhật ký phiên 18 (22/08). Đầu cả 13 nhánh được ghim vào `refs/archive/*` của repo local trên máy dev TRƯỚC khi xoá; khôi phục: `git push origin refs/archive/<nhánh>:refs/heads/<nhánh>`. Sau xoá `git branch -r` chỉ còn `origin/main`.

## 2. 🎯 Minimatch - mốc và cách ghim ĐÃ SỬA

Đo `npm view minimatch time` ngày 09/11:

| bản    | phát hành (UTC) | đủ 14 ngày lúc (giờ máy +07) |
| ------ | --------------- | ---------------------------- |
| 11.0.1 | 27/10 22:26     | 05:26 11/11                  |
| 11.0.2 | 28/10 01:08     | 08:08 11/11                  |
| 11.0.3 | 28/10 20:00     | 03:00 12/11                  |
| 11.0.5 | 05/11 23:30     | 06:30 20/11                  |

Hai lỗi trong hướng dẫn cũ ("từ 10/11", override `^11.0.1`):

- **Mốc 10/11 sớm hơn 14 ngày** - tính theo NGÀY, bỏ qua giờ phát hành 22:26 UTC.
- **`^11.0.1` giải ra bản MỚI NHẤT (11.0.5, 4 ngày tuổi)** - mục đích chờ 2 tuần mất trắng. Phải **ghim chính xác** bản mới nhất đã đủ 14 ngày (ví dụ `"minimatch@>=7 <11.0.1": "11.0.2"`).

Cảnh báo: GHSA-g3hv-75wg-m249 (medium, DoS qua globparts), dải `>=7.0.0 <11.0.1`. Hiện có 10.2.6 (×6) và 9.0.9 (×2) dính; 3.1.5 nằm ngoài dải.

Đã đặt lịch một lần (CronCreate, CHỈ sống trong phiên Claude đang mở) **08:17 11/11** làm trọn: chọn bản → override → lock bằng `npx -y npm@11.21.0` → build frontend + đếm 36 story → PR → merge → đóng Dependabot #40 / dismiss Scorecard #76 → nghiệm thu Render → phiếu mới. Phiên bị đóng trước giờ đó thì phiên 44 làm tay theo đúng các bước này.

## 3. Việc còn lại (đo 09/11)

| việc                                          | trạng thái                                                                   |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| Gỡ `fixupPluginRules` + overrides peer eslint | chờ `eslint-plugin-react` (7.37.5, peer `^9.7`) và `jsx-a11y` (6.10.2, `^9`) |
| Đổi hẳn sang TS 7                             | chờ `typescript-eslint` (`<6.1.0`) và `ts-jest` (`<7`)                       |
| Chuyển repo vào Org                           | chờ chủ dự án tạo Org (T19)                                                  |

Việc chủ dự án: T18-T21; (tuỳ chọn) OpenSSF Best Practices. Xoá nhánh: XONG.

Hiện trạng máy: không khoá, không tiến trình nền, không worktree; một lịch CronCreate trong phiên 43.
