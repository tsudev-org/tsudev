# R2 - cấu hình bucket `tsudev`

## CORS (`cors.tsudev.json`)

Trang quản trị tải tệp phát hành THẲNG từ trình duyệt vào R2 qua URL presign
(kế hoạch Q4/2026 §6.6) - không qua Worker (trần thân request 100 MB) hay Render
(512 MB RAM). Trình duyệt chỉ gửi được `PUT` chéo origin khi bucket khai CORS.

```
npm run r2:cors        # áp cors.tsudev.json lên bucket tsudev
npm run r2:cors:list   # xem quy tắc đang chạy
```

Vì sao cấu hình nằm ở đây chứ không trong mã:

- **Đo 05/11/2026: bucket production KHÔNG có quy tắc CORS nào** (`The CORS
configuration does not exist`). `ensureBucket()` của storage-service có gọi
  `PutBucketCors` lúc khởi động, nhưng khoá S3 của R2 không có quyền quản trị
  bucket nên lệnh đó thất bại và chỉ để lại một dòng `console.warn` - không gì
  đỏ lên. Đừng dựa vào nó cho production.
- Origin khai HẸP (`tsudev.com`, `www.tsudev.com`), không phải `*`: URL presign
  vốn đã là quyền ghi, nhưng không có lý do gì cho trang khác đọc được phản hồi.

Triệu chứng khi thiếu: nút "Tải lên và tạo" báo _"Không gửi được tệp tới kho
lưu trữ (mạng hoặc CORS của bucket)"_, tab Network thấy preflight `OPTIONS` bị
chặn.

⚠️ Chạy `wrangler whoami` trước: tài khoản phải là chủ zone `tsudev.com`. Và
nếu `wrangler` vẫn gọi tài khoản cũ sau khi đăng nhập lại, xoá
`node_modules/.cache/wrangler/wrangler-account.json` (bẫy đã gặp 05/11/2026).
