# PHIẾU BÀN GIAO - Phiên 52: menu tài khoản, cột "Tài khoản" ở chân trang, rà quét giao diện, đề xuất bảo mật/CMS/cài bằng lệnh

- **Mã phiếu**: 20261113-08
- **Phiên**: phiên 52, 13/11/2026
- **Trạng thái**: MỞ - #252 chờ chủ sở hữu duyệt; phương án ba hạng mục lớn ĐÃ CHỐT 14/11 (mục 3.2) - phiên 53 làm theo kế hoạch

## 1. Đã làm

| Việc                                                                                                                                 | PR        | Production        |
| ------------------------------------------------------------------------------------------------------------------------------------ | --------- | ----------------- |
| Header: avatar bên trái tên; bấm avatar/tên mở menu "Hồ sơ tài khoản" + "Đăng xuất" (gỡ nút "Đăng xuất" trần)                        | #251      | Worker `8a1da656` |
| Rà quét Playwright: tiêu đề lặp "- tsudev - tsudev" ở /login, /signup, /forgot-password; thiếu h1 ở 404, _error, /author, /admin(+2) | #251      | Worker `8a1da656` |
| Chân trang cột "Tài khoản" theo phiên: đã đăng nhập ⇒ "Bảo mật tài khoản" + "Hồ sơ tài khoản"; di động lưới 2 cột                    | #252      | CHỜ DUYỆT         |
| Công cụ quét dùng chung `~/projects/logs/tools/quet-giao-dien.cjs` + phiếu 20261113-07 đặt ở 14 repo, nhắn 2 phiên đang chạy         | -         | -                 |
| Đề xuất thảo luận `docs/de-xuat-bao-mat-cms-cai-bang-lenh.md` (bảo mật 8 tầng theo ubnd, CMS "Viết bài", ma trận kênh cài)           | phiếu này | -                 |

### 1.1 Nghiệm thu

#251 merge `2daf8af`, deploy Worker `8a1da656` (lần 1 hỏng: Cloudflare API `edge-preview` trả 500 code 10013 ở bước
đẩy cache R2 - lỗi phía Cloudflare, tài khoản đúng `9541f44e…`; chạy lại là qua). Quét production lại bằng công cụ
dùng chung: `/`, `/apps`, `/blog`, `/docs`, `/login`, `/signup`, `/forgot-password` OK ở 390/1280 × Tối/Sáng; tiêu
đề hết lặp; `/khong-ton-tai` có h1 (chỉ còn báo chính mã 404 - đúng). `/api/auth/providers` như phiếu 20261113-06 mục 2.

## 2. Kỹ thuật đáng nhớ

- Port 8080 có thể bị backend ubnd chiếm; `scripts/dev-proxy.js` tự dời sang 8090 (đọc dòng `[dev-proxy] cổng` trong log).
  Trình duyệt Playwright cần `--host-resolver-rules=MAP *.localhost 127.0.0.1`.
- Tài khoản seed `tsudev` ở DB local đã bật TOTP - quét trang sau đăng nhập bằng `bob` (AUTHOR) hoặc `alice`.
- Ảnh full-page KHÔNG kích hoạt hiệu ứng hiện-khi-cuộn: trang chủ trông có khoảng trống ~800px nhưng không phải lỗi.
  Công cụ quét cuộn hết trang trước khi chụp.
- E2E `smoke.spec.js` / `upload.spec.js` nhận diện "đã đăng nhập" bằng `header button[aria-controls="tsu-user-menu"]`.
- 🪤 **E2E chập chờn ở TEST ĐẦU TIÊN của lượt chạy**: #253 (chỉ đổi markdown) đỏ 2 lần, mỗi lần một test KHÁC nhau
  nhưng luôn ở vị trí #1 (`release-security` rồi `react-hooks-7 accounts`), 21/22 còn lại xanh; lần chạy thứ ba xanh.
  Giống `0598c12` trên main. Nghi: trang admin biên dịch nguội trên `next dev` vượt timeout 5s của `expect`. Chưa sửa -
  việc của qa-test: thêm bước làm ấm (warm-up) các trang admin trong `globalSetup` hoặc tăng `expect.timeout` cho test
  đầu. Trước đó: `gh run rerun <id> --failed`, đừng sửa mã theo một lần đỏ.
- `SiteFooter.tsx` thuộc cổng Bảo vệ bản quyền ⇒ tách PR footer riêng để header ship trước.

## 3. Việc còn lại

1. #252: chủ sở hữu duyệt ⇒ `gh run rerun <id lượt cuối của Bảo vệ bản quyền>` ⇒ `gh pr update-branch 252` nếu cần ⇒
   merge ⇒ deploy ⇒ nghiệm thu bằng ảnh footer khi đã đăng nhập.
2. ✅ 14/11/2026 chủ dự án giao agent tự chọn phương án. ĐÃ CHỐT D1-D9 và chia giai đoạn P0-P5 trong
   `docs/de-xuat-bao-mat-cms-cai-bang-lenh.md` (OIDC bằng `oidc-provider`, Góp ý & báo lỗi có, Tiptap 3 giữ
   `contentMd`, install nhiều gói, SignPath, bộ đếm tần suất Postgres, Turnstile, HIBP fail-open). Phiên 53 bắt đầu
   ở **P0**, rồi P1. Kế hoạch tổng toàn hệ: `~/projects/logs/handover/20261114-01_ke-hoach-tong-he-sinh-thai.md`
   (đã đặt bản sao ở 16 repo); phiếu C5 `20261114-02` ở 6 repo app.
3. Thu kết quả phiếu 20261113-07 từ 14 repo.
4. Việc cũ phiếu 20261113-06 mục 3.3-3.5 vẫn mở.
5. qa-test: sửa E2E chập chờn ở test đầu tiên (mục 2).
