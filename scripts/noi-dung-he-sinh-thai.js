/**
 * Nội dung THẬT của tsudev.com thay cho bài do Toà soạn Agent AI sinh (đã gỡ
 * 29/10/2026). Dùng bởi `scripts/don-noi-dung-lac-de.js --noi-dung`.
 *
 * KHÔNG dùng bảng Markdown: lib/md.ts không dựng bảng (hiện thành ký tự | thô) - dùng danh sách.
 *
 * Mọi dữ kiện dưới đây đã ĐO 10/11/2026 (6 trò chơi: 12/11/2026): website từng app trả 200 (danh sách ở
 * packages/ui/src/lib/ecosystem.ts), gói winget `tsudev.cwico`/`tsudev.SWICO` có
 * trong microsoft/winget-pkgs, JWKS phát hành ở /.well-known/tsudev-release-jwks.json
 * và /api/releases/jwks trả 200. Đổi sản phẩm thì sửa ở đây VÀ ở ecosystem.ts.
 *
 * Có tài liệu/bài viết thật cũng giữ cho cron `canh-site-cron` (demNoiDung.ts) không
 * kêu oan: nó coi /blog, /docs, feed.xml, tìm kiếm RỖNG là sự cố.
 */

const DOCS = [
  {
    slug: 'gioi-thieu-he-sinh-thai-tsudev',
    title: 'Giới thiệu hệ sinh thái tsudev',
    category: 'guide',
    position: 1,
    contentMd: `tsudev là hệ sinh thái sản phẩm và công cụ phần mềm tại tsudev.com. Mọi sản phẩm dùng chung một tài khoản, một bộ quy ước kỹ thuật và một bộ nhận diện.

## Các ứng dụng

- **TrafficMonitor-VN** - theo dõi tốc độ mạng, CPU, RAM trên thanh tác vụ (Windows): [trafficmonitor.tsudev.com](https://trafficmonitor.tsudev.com)
- **cwico** - rà quét sâu và gỡ phần mềm thừa, tạo điểm khôi phục trước mỗi lần chạy (Windows): [cwico.tsudev.com](https://cwico.tsudev.com)
- **tsudev SWICO** - kiểm tra bản quyền Windows, Office và cấu hình phần cứng (Windows): [swico.tsudev.com](https://swico.tsudev.com)
- **tsudev-files** - chuyển đổi tệp ngoại tuyến bằng kéo thả (Windows, macOS, Linux): [files.tsudev.com](https://files.tsudev.com)
- **tsudev-lotus** - gửi tệp, tin nhắn trong cùng mạng Wi-Fi, mã hoá đầu cuối (Windows, Android, macOS/iOS, Linux): [lotus.tsudev.com](https://lotus.tsudev.com)
- **La bàn** - la bàn, toạ độ, độ cao, thước thuỷ (Android): [compass.tsudev.com](https://compass.tsudev.com)
- **tsudev-contact** - chuyển danh bạ CSV sang vCard .vcf (Windows): [contact.tsudev.com](https://contact.tsudev.com)

## Trò chơi

Chơi ngay trên trình duyệt, không cần cài:

- **Xin Chào Núi Cấm** - trò chơi khám phá: [xin-chao-nui-cam.tsudev.com](https://xin-chao-nui-cam.tsudev.com)
- **Chú Chim Vỗ Cánh** - trò chơi hành động: [chu-chim-vo-canh.tsudev.com](https://chu-chim-vo-canh.tsudev.com)
- **Lật Mảnh Ghép** - trò chơi giải đố: [lat-manh-ghep.tsudev.com](https://lat-manh-ghep.tsudev.com)
- **Nối Hình Giống Nhau** - trò chơi trí tuệ: [noi-hinh-giong-nhau.tsudev.com](https://noi-hinh-giong-nhau.tsudev.com)
- **Luyện Gõ Phím** - công cụ luyện tập: [luyen-go-phim.tsudev.com](https://luyen-go-phim.tsudev.com)
- **Núi Cấm 3D** - trò chơi thế giới mở 3D: [nuicam3d.tsudev.com](https://nuicam3d.tsudev.com)

Danh bạ đầy đủ, có tìm kiếm và lọc theo nền tảng: [/apps](/apps). Muốn ủng hộ hệ sinh thái: [/ung-ho](/ung-ho).

## Tải ở đâu cho an toàn

- Từ website riêng của từng ứng dụng, trang phát hành GitHub của \`tsudev-org\`, hoặc bằng winget.
- Bản phát hành đăng trên tsudev.com có SHA-256 do máy chủ tính và chữ ký Ed25519 - xem [Kiểm tra tệp tải về](/docs/kiem-tra-tep-tai-ve-sha256-ed25519).`,
  },
  {
    slug: 'cai-ung-dung-bang-winget',
    title: 'Cài ứng dụng tsudev bằng winget',
    category: 'install',
    position: 1,
    contentMd: `winget là trình quản lý gói có sẵn trên Windows 10 (1809 trở lên) và Windows 11. Bạn có thể cài, cập nhật ứng dụng tsudev bằng một dòng lệnh trong PowerShell hoặc Terminal.

## Gói đang có

- **cwico**: \`winget install --id tsudev.cwico -e\`
- **tsudev SWICO**: \`winget install --id tsudev.SWICO -e\`

\`-e\` (khớp chính xác) đảm bảo winget cài đúng gói có mã đó, không phải một gói tên gần giống.

## Cài nhiều ứng dụng một lượt

Mở [/apps](/apps), đánh dấu các ứng dụng cần cài, rồi chép lệnh gộp ở khay phía dưới màn hình.

## Cập nhật

\`\`\`powershell
winget upgrade --id tsudev.cwico -e
\`\`\`

Ứng dụng chưa có gói winget thì tải từ website riêng hoặc trang phát hành GitHub của nó.`,
  },
  {
    slug: 'kiem-tra-tep-tai-ve-sha256-ed25519',
    title: 'Kiểm tra tệp tải về: SHA-256 và chữ ký Ed25519',
    category: 'security',
    position: 1,
    contentMd: `Mỗi bản phát hành đăng trên tsudev.com có hai thứ để bạn tự đối chiếu trước khi cài: mã băm SHA-256 do máy chủ tính, và chữ ký Ed25519.

## 1. Tính SHA-256 của tệp

Windows (PowerShell):

\`\`\`powershell
Get-FileHash .\\ten-tep.exe -Algorithm SHA256
\`\`\`

Hoặc \`certutil -hashfile ten-tep.exe SHA256\`. macOS/Linux: \`sha256sum ten-tep\`.

So kết quả với SHA-256 hiện trong hộp thoại tải về. Khác dù một ký tự thì KHÔNG cài.

## 2. Kiểm chữ ký (tuỳ chọn, dành cho người dùng kỹ thuật)

- Chữ ký là JWS dạng compact, thuật toán \`EdDSA\`, phần đầu có \`kid\` - mở mục "Xem chữ ký" trong hộp thoại tải về.
- Khoá công khai: [/.well-known/tsudev-release-jwks.json](/.well-known/tsudev-release-jwks.json) (cũng có ở [/api/releases/jwks](/api/releases/jwks)).
- Kiểm bằng bất kỳ thư viện JOSE nào với khoá có cùng \`kid\`, rồi so \`payload.sha256\` với mã băm bạn vừa tính.

Chữ ký hợp lệ nghĩa là tệp được chính tsudev.com niêm phong và không bị sửa sau đó.`,
  },
  {
    slug: 'canh-bao-smartscreen-android-khi-cai',
    title: 'Windows SmartScreen hoặc Android cảnh báo khi cài',
    category: 'troubleshooting',
    position: 1,
    contentMd: `Ứng dụng tsudev là dự án cá nhân, không có chứng chỉ ký mã thương mại. Vì vậy Windows SmartScreen hoặc Android có thể cảnh báo "ứng dụng không xác định" - cảnh báo này nói về NGUỒN GỐC chưa được hãng xác nhận, không phải về mã độc.

## Trước khi bỏ qua cảnh báo

1. Chỉ tải từ website \`*.tsudev.com\`, trang phát hành GitHub của \`tsudev-org\`, hoặc winget.
2. Đối chiếu SHA-256 theo [Kiểm tra tệp tải về](/docs/kiem-tra-tep-tai-ve-sha256-ed25519).

## Windows

Khi SmartScreen hiện "Windows đã bảo vệ PC của bạn": bấm **Thông tin thêm** → kiểm tên tệp và nhà phát hành → **Vẫn chạy**.

## Android

Cho phép trình duyệt hoặc trình quản lý tệp "cài ứng dụng không rõ nguồn gốc" chỉ trong lúc cài, rồi tắt lại quyền đó.

Mã băm không khớp, hoặc tệp đến từ nguồn khác: đừng cài.`,
  },
];

const POSTS = [
  {
    slug: 'tsudev-com-giao-dien-moi-va-danh-ba-ung-dung',
    title: 'tsudev.com có giao diện mới và danh bạ ứng dụng',
    excerpt:
      'Giao diện đen + tím gọn hơn, chỉ còn Sáng / Tối / Hệ thống, và mọi ứng dụng của hệ sinh thái nay ở một chỗ.',
    tags: ['tsudev', 'thông báo'],
    contentMd: `tsudev.com vừa được làm lại để tập trung vào việc chính: giúp bạn tìm, tải và cài ứng dụng của hệ sinh thái tsudev.

## Có gì mới

- **Danh bạ ứng dụng** ở [/apps](/apps): bảy ứng dụng, tìm không cần gõ dấu, lọc theo nền tảng, mở website riêng của từng sản phẩm, chọn nhiều ứng dụng để lấy một lệnh winget.
- **Giao diện đen + tím**, một nền liền mạch, dễ đọc ở cả hai chế độ.
- **Ba lựa chọn giao diện: Sáng, Tối, Hệ thống** - nút ở cuối trang. Chọn "Hệ thống" thì trang đổi theo cài đặt máy bạn.
- Tài liệu được viết lại cho đúng việc bạn cần: [cài bằng winget](/docs/cai-ung-dung-bang-winget), [kiểm tra tệp tải về](/docs/kiem-tra-tep-tai-ve-sha256-ed25519), [xử lý cảnh báo khi cài](/docs/canh-bao-smartscreen-android-khi-cai).

Các website sản phẩm \`*.tsudev.com\` sẽ lần lượt đổi theo cùng giao diện để bạn có thể chuyển qua lại mà không thấy lạ.`,
  },
];

module.exports = { DOCS, POSTS };
