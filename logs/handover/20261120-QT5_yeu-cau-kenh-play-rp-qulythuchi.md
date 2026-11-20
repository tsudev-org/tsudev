# 20261120-QT5 - Yêu cầu từ qulythuchi: xác nhận hợp đồng `POST /api/rp/entitlements/play` (B2)

- **Người lập**: agent-qulythuchi (phiên `qulythuchi-df`), 20/11/2026
- **Gửi**: phiên tsudev - **Trạng thái**: MỞ
- **Liên quan**: tsudev `docs/adr/0002-may-chu-quyen-loi.md` mục B2; qulythuchi ADR-0019 mục 4, PR
  tsudev-org/qulythuchi#36; PRODUCT_POLICY 7.4 (bộ quy ước v4.0.0)

## 1. Bối cảnh

App qulythuchi (bản Play) đã có luồng mua `tsudev_pro` (gói trả trước `nam`) và `ung_ho_*`. Biên nhận đi
app ⇒ máy chủ qulythuchi (`POST /api/v1/me/purchases/play`) ⇒ tsudev.com. Ngày 20/11/2026,
`POST https://tsudev.com/api/rp/entitlements/play` trả **405**. Máy chủ qulythuchi đang trả `503 purchase_unavailable`, app
KHÔNG hoàn tất giao dịch nên Play tự hoàn tiền nếu quá 3 ngày. Vì vậy không ai mất tiền, nhưng chưa mua được.

## 2. Máy chủ qulythuchi đang gửi (cần tsudev xác nhận hoặc sửa)

```http
POST https://tsudev.com/api/rp/entitlements/play
Authorization: Bearer <client assertion ES256: iss = sub = "qulythuchi", aud = "https://tsudev.com/api/rp/entitlements/play", exp 120 giây, jti một lần>
Content-Type: application/json

{"client_id": "qulythuchi", "sub": "<sub tsudev của người đang đăng nhập>",
 "packageName": "com.tsudev.qulythuchi", "productId": "tsudev_pro" | "ung_ho_20k" | ... ,
 "purchaseToken": "<token Play>"}
```

- `obfuscatedAccountId` app đặt = base64url(SHA-256(`tsudev-pro|` + `sub`)), không đệm `=`.
- Cách đọc kết quả: **200** ⇒ đã xác minh + acknowledge (thuê bao) / ghi nhận (tiêu hao). Khi đó app gọi
  `completePurchase`/`consumePurchase`, rồi máy chủ làm mới quyền lợi qua `GET /api/rp/entitlements/{sub}`.
  **400/409/422** ⇒ biên nhận không hợp lệ (app không hoàn tất). Mã khác ⇒ thử lại sau.

## 3. Nhờ tsudev

1. Làm B2 với đúng hình dạng trên. Nếu muốn khác (tên trường, `aud`, mã trả về), ghi vào phiếu này: qulythuchi sẽ sửa
   `services/sync-api/src/pro/play.ts`, không cần tsudev sửa hộ.
2. Cho phép mua lại gói trả trước khi còn hạn (nạp thêm = gia hạn sớm), cộng dồn `max(pro_until, now) + 1 năm`.
3. Báo lại khi lên production để qulythuchi thử đầu-cuối (cần sản phẩm Play thật, P10).

## 4. Kết quả (phiên tsudev điền)

-
