# PHIẾU BÀN GIAO - Thêm Quly Thu Chi vào danh bạ tsudev.com/apps

- **Mã phiếu**: 20261118-QT3
- **Từ**: agent-qulythuchi (repo `tsudev-org/qulythuchi`) - **Đến**: phiên repo `tsudev`
- **Thời điểm**: 18/11/2026
- **Trạng thái**: ĐÓNG (19/11/2026, projects-d7 - PR thêm thẻ `qulythuchi` + ngoại lệ C4 tạm)
- **Nhánh git**: (phiên tsudev tự đặt)

## 1. Bối cảnh

Quly Thu Chi (app quản lý thu chi cá nhân, E2EE, AGPL-3.0) đã có website + bản web tại `https://qulythuchi.tsudev.com`
(P8, PR tsudev-org/qulythuchi#14). Đăng nhập bằng tài khoản tsudev qua OIDC (client `qulythuchi`, phiếu QT1 đã đóng).
Chưa có logo riêng được duyệt: website dùng logo tsudev chung (giống Sound Db).

## 2. Việc cần làm

- [ ] Thêm mục vào `packages/ui/src/lib/ecosystem.ts`. Gợi ý (phiên tsudev chỉnh theo quy ước của danh bạ):

```ts
{
  id: 'qulythuchi',
  // Sản phẩm mới 18/11/2026 (repo tsudev-org/qulythuchi, AGPL-3.0, phiếu 20261118-QT3). OIDC client `qulythuchi`.
  // Chưa có logo riêng (website dùng logo tsudev chung) ⇒ ô màu + glyph cho khỏi trùng thẻ. Chưa có bản cài:
  // bản web /app/ dùng được ngay; APK/desktop phát hành ở P10 của repo đó.
  name: 'Quly Thu Chi',
  tagline: 'Quản lý thu chi cá nhân mã hóa đầu-cuối: ghi nhanh bằng một câu, tự nhập từ ngân hàng, ngân sách, báo cáo.',
  category: 'utility', // danh bạ chưa có nhóm tài chính; thêm 'finance' nếu phiên tsudev thấy hợp
  platforms: ['android', 'windows', 'linux'], // bản web có ngay; bản cài ra ở P10
  website: 'https://qulythuchi.tsudev.com',
  openSource: true,
  tint: ['#7c3aed', '#4c1d95'],
  icon: 'M3 7h18v12H3zM3 7l3-3h12l3 3M16 13h2', // ví tiền
},
```

- [ ] Khi qulythuchi phát hành bản cài (P10): thêm `releases: 'https://github.com/tsudev-org/qulythuchi/releases/latest'`.

## 3. Kiểm chứng

- `curl -sI https://qulythuchi.tsudev.com/` ⇒ 200, có `og:site_name` = `tsudev`, `og-image.png` 1200x630.

## 7. Kết quả xử lý (phiên nhận điền)

-
