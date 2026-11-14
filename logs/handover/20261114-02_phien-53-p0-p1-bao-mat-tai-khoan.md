# PHIẾU BÀN GIAO - Phiên 53: P0 dọn nền, P1 bảo mật tài khoản, mở đầu P3/P5

- **Mã phiếu**: 20261114-02
- **Phiên**: phiên 53, 14/11/2026
- **Trạng thái**: MỞ - P1 code xong, #257 CHỜ migration Neon (👤 mục 4.8 kế hoạch tổng); P2 chưa bắt đầu

## 1. Đã làm

| Việc                                                                                                                | PR                   | Production                             |
| ------------------------------------------------------------------------------------------------------------------- | -------------------- | -------------------------------------- |
| P0.2 E2E chập chờn ở test #1: `e2e/global-setup.js` làm ấm trang + route `pages/api/*`                              | #256 merge           | không đổi production (chỉ CI)          |
| P0.3 đối soát 21 phiếu tồn ⇒ ĐÓNG kèm lý do; T18/T20/T21 chuyển kế hoạch tổng mục 4.7                               | PR nhật ký này       | -                                      |
| P1.1-P1.6, P1.8 (Mức an toàn, 2FA từ AUTHOR, step-up, HIBP lưu kết quả, Không phải tôi, bộ đếm Postgres, COOP/CORP) | #257                 | CHỜ migration Neon - KHÔNG merge trước |
| P1.7 Turnstile (không khoá ⇒ không đổi hành vi)                                                                     | #258                 | xem mục 1.1                            |
| P1.9 sao lưu DB mã hoá `age` + hướng dẫn G11                                                                        | #259                 | chỉ script                             |
| C4 cổng kênh cài bằng lệnh                                                                                          | #260                 | chỉ test                               |
| C2 install.sh/ps1 nhiều gói ⛔                                                                                      | #261                 | CHỜ `nguyentrangtinhsu` duyệt          |
| Gốc `verifyCode.test.ts` chập chờn: trần ngày đếm dòng nhật ký ghi bắn-rồi-quên                                     | #262                 | sửa lỗi thật (gửi dồn vượt trần)       |
| P5 đề xuất mẫu menu tài khoản / chân trang / khối Cài bằng lệnh                                                     | tsudev-standards #52 | chờ duyệt nội dung                     |

### 1.1 Nghiệm thu

- #256: 3 lượt CI liên tiếp xanh không rerun (run 43551006296, 43551277152, 43552023766), 22/22 E2E.
- Quét production 14/11: tsudev.com OK 390/1280 × Tối/Sáng. Header đo được: HSTS preload, nosniff, DENY, Referrer,
  Permissions-Policy (COOP/CORP chờ #257).
- Test local: auth-service 236 (P1) / 222 (Turnstile), content-service 310, frontend 195+8, packages/ui C4 8.

## 2. Kỹ thuật đáng nhớ

- 🪤 **Làm ấm bằng `fetch` trần KHÔNG đủ** cho Turnstile/Next 16 dev: HTML trả trong ~150ms vì Turbopack chỉ dựng
  phần server; bundle trình duyệt chỉ biên dịch khi trình duyệt xin chunk. Làm ấm bằng Chromium thật.
- 🪤 Tệp test TS thiếu `export {}` ⇒ hằng toàn cục đụng tên với tệp test khác (TS6200) - CI đỏ dù chạy riêng xanh.
- 🪤 `prisma migrate dev` hỏng ở local: `template1` lệch collation 2.39/2.43. Sinh SQL bằng
  `prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script`.
- 🪤 Đổi nhánh giữa nhánh có/không có migration mới ⇒ `npm run db:generate` + `npx tsc -b tsconfig.services.json`,
  nếu không test báo lỗi kiểu/hồi quy ma (dist cũ của `@tsudev/ratelimit`).
- Cloudflare tự chèn script `challenge-platform` ở MỌI site trong zone; site có CSP nonce thì Cloudflare gắn nonce,
  site tĩnh `script-src 'self'` thì lỗi console - xem kế hoạch tổng 4.9.
- `logSecurity` nay trả Promise không reject - `await` nó ở nơi dùng sự kiện làm bộ đếm.

## 3. Việc còn lại (theo thứ tự)

1. 👤 Chủ dự án đưa migration P1 lên Neon (lệnh ở kế hoạch tổng 4.8) ⇒ agent: `gh pr update-branch 257`, merge, đợi
   Render deploy, deploy Worker (`XDG_CONFIG_HOME=$HOME/.config/wrangler-tsudev npm --workspace apps/frontend-main run deploy`),
   nghiệm thu: `curl -sI https://tsudev.com | grep -i cross-origin`, `/settings/security` có thẻ "Mức an toàn" (ảnh 390/1280),
   AUTHOR không TOTP ghi bài ⇒ 403 `MFA_REQUIRED`.
2. Merge #258, #259, #260, #262 khi CI xanh (không cần migration); deploy Worker sau #258; đo `/api/turnstile-site-key`
   = `{"siteKey":null}` và CSP có `frame-src https://challenges.cloudflare.com`.
3. P2 CMS (P2.1 schema ⇒ P2.5), xếp sau P1 (migration nối tiếp `20261114120000_bao_mat_tai_khoan_p1`).
4. P4 OIDC sau P1. C6 chờ tag `v2.4.1-vn.*` của tsufiles (đo 14/11: chưa có).
