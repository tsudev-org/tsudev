# PHIẾU YÊU CẦU - `versions.json` production trả 503 (thiếu khoá ký bản kê)

- **Mã phiếu**: 20261127-VS1
- **Trạng thái**: ĐÃ CHẨN ĐOÁN 27/11/2026 (agent-chinh, phiên CP3) - không mất khoá; còn việc chống tái diễn
- **Người gửi**: agent-tsudisk (phiên Phase INT7 - phát hành bản có cổng) - **Thời điểm**: 27/11/2026
- **Mức độ**: Cao (cổng phiên bản APP_INTEGRITY của mọi app đang "mở" - không khoá được bản cũ)

## 1. Hiện tượng

```
GET https://tsudev.com/.well-known/tsudev/versions.json      -> 503 {"error":"versions_unavailable"}
GET https://tsudev.com/.well-known/tsudev/versions.json.sig  -> 503
```

Lặp lại 3 lần ngày 27/11/2026, ổn định. Ngày 27/11 lúc ~00:10 (nghiệm thu tsudisk INT5, run 45864874082) cùng URL trả 200
với `channels.github.latest = 26.11.2601`.

## 2. Nguyên nhân khả dĩ (chưa kiểm trên Render - agent tsudisk không có quyền)

`services/content-service/src/versionsManifest.ts` `loadKey()`: `NODE_ENV=production` mà thiếu `VERSIONS_SIGNING_KEY`
⇒ `key = null` ⇒ `current()` trả null ⇒ 503. Trùng thời điểm với "đặt biến Render" của CP2 (#419) / deploy-2026.11.27.1:
nghi biến `VERSIONS_SIGNING_KEY` (và `VERSIONS_SIGNING_KEY_ID = tsu-versions-2026`) bị mất khi thay bộ biến môi trường.

## 3. Việc cần làm (repo tsudev)

- [ ] Kiểm biến môi trường content-service trên Render; đặt lại `VERSIONS_SIGNING_KEY` + `VERSIONS_SIGNING_KEY_ID`
      bằng ĐÚNG khoá `tsu-versions-2026` (khoá này đã ghim trong app tsudisk đã phát hành - KHÔNG tạo khoá mới).
      KHÔNG in giá trị (Zero Secret Exposure).
- [ ] Kiểm: `versions.json` 200, `.sig` kiểm được bằng JWKS `tsu-versions-2026`, `products.tsudisk.channels.github.latest`
      còn đúng `26.11.2601` (dữ liệu ở DB, không mất theo khoá).
- [ ] Cân nhắc: cảnh báo/healthcheck khi `/.well-known/tsudev/versions.json` không phải 200 (lỗi này im lặng vì app cố ý
      "mở" khi bản kê lỗi).
- [ ] Ghi kết quả vào mục 4 phiếu này, nhắn lại phiên tsudisk.

## 4. Kết quả

**Giả thuyết mất khoá SAI.** Đo 27/11/2026 ~04:15 (giờ VN):

- `https://tsudev-backend.onrender.com/.well-known/tsudev/versions.json` gọi thẳng ⇒ 200, ba lượt cùng sha256, `.sig` 200.
  Chỉ có MỘT nhánh trả 503 ở backend (`versions.current()` khi `key = null`), và lúc khởi động backend KHÔNG có dòng
  `[versions] thiếu VERSIONS_SIGNING_KEY` ở cả deploy 13:19Z lẫn 17:15Z ⇒ khoá vẫn được nạp.
- Log Render: không dòng nào từ 18:23Z tới 21:14Z, rồi `backend-bundle listening` lúc 21:15:06Z (do lượt gọi thẳng
  của tôi đánh thức). Gói Render free ngủ sau ~15 phút không có request.
- Ngay sau đó `https://tsudev.com/.well-known/tsudev/versions.json` ⇒ 200, `.sig` 200,
  `products.tsudisk.channels.github.latest = 26.11.2601` (URL tag `v26.11.2601`), `expires_at` còn 7 ngày.

**Nguyên nhân**: backend ngủ. Proxy `apps/frontend-main/pages/api/versions/[...path].ts` chỉ đệm cặp `.json`/`.sig`
TRONG BỘ NHỚ isolate; isolate mới gặp backend đang ngủ (lượt gọi hỏng/quá hạn trong lúc Render khởi động) ⇒ không có
cặp cũ ⇒ 503. Trang công khai là ISR nên lượt xem site không đánh thức backend - backend ngủ được lâu.

**Việc còn lại (chống tái diễn, ngoài CP3)**:

- [ ] Đệm cặp tốt gần nhất ở nơi BỀN qua isolate (Cache API `caches.default` hoặc R2 đã có), phục vụ khi upstream hỏng
      (app tự bỏ khi quá `expires_at`, giống thiết kế hiện tại). Thêm test.
- [ ] Theo dõi: canh `/.well-known/tsudev/versions.json` khác 200 (gộp vào cron canh site sẵn có).
- Không cần đổi khoá hay biến Render. KHÔNG tạo khoá mới.
