// Chạy trước MỖI tệp test (jest `setupFiles`). `.env` máy dev có `INTERNAL_IDENTITY_SECRET_CONSOLE` (CP3) - không
// ghim ở đây thì dotenv nạp nó lúc import src và mọi test cũ gọi route điều hành bằng khẳng định vùng main bị 403
// `console_required`, chỉ ở máy dev, CI vẫn xanh. Chuỗi rỗng = "đã đặt" nên dotenv không ghi đè, và `readSecret`
// coi rỗng là chưa cấu hình (chế độ chuyển tiếp). Test vùng (`consoleZone.test.ts`) tự đặt khoá giả của nó.
process.env.INTERNAL_IDENTITY_SECRET_CONSOLE = ''
