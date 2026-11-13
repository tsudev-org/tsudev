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

- **tsudev-trafficmonitor** - theo dõi tốc độ mạng, CPU, RAM trên thanh tác vụ (Windows): [trafficmonitor.tsudev.com](https://trafficmonitor.tsudev.com)
- **cwico** - rà quét sâu và gỡ phần mềm thừa, tạo điểm khôi phục trước mỗi lần chạy (Windows): [cwico.tsudev.com](https://cwico.tsudev.com)
- **tsudev SWICO** - kiểm tra bản quyền Windows, Office và cấu hình phần cứng (Windows): [swico.tsudev.com](https://swico.tsudev.com)
- **TsuFiles** - chuyển đổi tệp ngoại tuyến bằng kéo thả (Windows, macOS, Linux): [files.tsudev.com](https://files.tsudev.com)
- **Lotus Share** - gửi tệp, tin nhắn trong cùng mạng Wi-Fi, mã hoá đầu cuối (Windows, Android, macOS/iOS, Linux): [lotus.tsudev.com](https://lotus.tsudev.com)
- **La bàn** - la bàn, toạ độ, độ cao, thước thuỷ (Android): [compass.tsudev.com](https://compass.tsudev.com)
- **tsudev-contact** - chuyển danh bạ CSV sang vCard .vcf (Windows): [contact.tsudev.com](https://contact.tsudev.com)

## Trò chơi

Chơi ngay trên trình duyệt, không cần cài:

- **Xin Chào Núi Cấm** - trò chơi khám phá: [xin-chao-nui-cam.tsudev.com](https://xin-chao-nui-cam.tsudev.com)
- **Chú Chim Vỗ Cánh** - trò chơi hành động: [chu-chim-vo-canh.tsudev.com](https://chu-chim-vo-canh.tsudev.com)
- **Lật Mảnh Ghép** - trò chơi giải đố: [lat-manh-ghep.tsudev.com](https://lat-manh-ghep.tsudev.com)
- **Nối Hình Giống Nhau** - trò chơi trí tuệ: [noi-hinh-giong-nhau.tsudev.com](https://noi-hinh-giong-nhau.tsudev.com)
- **Luyện Gõ Phím** - công cụ luyện tập: [luyen-go-phim.tsudev.com](https://luyen-go-phim.tsudev.com) (có bản cài Linux: \`sudo apt install tsudev-luyen-go-phim\`)
- **Núi Cấm 3D** - trò chơi thế giới mở 3D: [nuicam3d.tsudev.com](https://nuicam3d.tsudev.com)

Danh bạ đầy đủ, có tìm kiếm và lọc theo nền tảng: [/apps](/apps). Muốn ủng hộ hệ sinh thái: [/ung-ho](/ung-ho).

## Tải ở đâu cho an toàn

- Bằng trình quản lý gói - winget, Scoop, Homebrew, APT/DNF: trình quản lý tự kiểm SHA-256 (và chữ ký GPG với APT/DNF). Xem [Cài bằng lệnh](/docs/cai-ung-dung-bang-winget).
- Từ website riêng của từng ứng dụng hoặc trang phát hành GitHub của \`tsudev-org\` - rồi đối chiếu SHA-256 theo [Kiểm tra tệp tải về](/docs/kiem-tra-tep-tai-ve-sha256-ed25519).`,
  },
  {
    // Slug giữ từ thời chỉ có winget - đã có link trỏ vào, đổi slug là gãy link.
    slug: 'cai-ung-dung-bang-winget',
    title: 'Cài ứng dụng tsudev bằng lệnh: winget, Scoop, Homebrew, APT/DNF',
    category: 'install',
    position: 1,
    contentMd: `Mọi ứng dụng tsudev đã đóng gói đều cài được bằng một dòng lệnh. Gói dựng từ đúng tệp đã phát hành trên GitHub của \`tsudev-org\`, kèm SHA-256; trình quản lý gói tự kiểm trước khi cài. Lệnh cụ thể của từng ứng dụng nằm trên thẻ của nó ở [/apps](/apps) - chỉ kênh đã có gói thật mới hiện.

## Một lệnh cho mọi máy

- Linux, macOS: \`curl -fsSL https://tsudev.com/install.sh | sh -s -- <tên-gói>\`
- Windows (PowerShell): \`& ([scriptblock]::Create((irm https://tsudev.com/install.ps1))) <tên-gói>\`

Thay \`<tên-gói>\` bằng \`--list\` (Windows: \`-List\`) để xem gói có thể cài. Script chỉ gọi trình quản lý gói bên dưới, kiểm khoá ký bằng mã băm ghim sẵn, và công bố SHA-256 của chính nó ở [/install.sh.sha256](/install.sh.sha256) và [/install.ps1.sha256](/install.ps1.sha256) - đọc script trước khi chạy.

## winget (Windows 10/11)

Có sẵn trong Windows, không cần thêm nguồn:

- **cwico**: \`winget install --id tsudev.cwico -e\`
- **tsudev SWICO**: \`winget install --id tsudev.SWICO -e\`

\`-e\` (khớp chính xác) đảm bảo winget cài đúng gói có mã đó. Cập nhật: \`winget upgrade --id tsudev.cwico -e\`. Ở [/apps](/apps) có thể đánh dấu nhiều ứng dụng rồi chép một lệnh gộp.

## Scoop (Windows, không cần quyền quản trị)

\`\`\`powershell
scoop bucket add tsudev https://github.com/tsudev-org/scoop-bucket
scoop install tsudev/tsudev-trafficmonitor
\`\`\`

Có trong bucket: tsudev-trafficmonitor, tsudev-swico, tsudev-files, lotus-share. Cập nhật: \`scoop update *\`.

## Homebrew (macOS)

\`\`\`bash
brew install --cask tsudev-org/tap/tsudev-files
\`\`\`

Có trong tap: tsudev-files, lotus-share.

## APT / DNF (Ubuntu, Debian, Fedora)

Kho \`pkg.tsudev.com\` ký GPG; apt và dnf tự kiểm chữ ký. Thêm kho một lần:

\`\`\`bash
curl -fsSL https://pkg.tsudev.com/tsudev-archive-keyring.gpg | sudo tee /usr/share/keyrings/tsudev.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/tsudev.gpg] https://pkg.tsudev.com/apt stable main" | sudo tee /etc/apt/sources.list.d/tsudev.list >/dev/null
sudo apt update && sudo apt install lotus-share
\`\`\`

Fedora: \`sudo curl -fsSLo /etc/yum.repos.d/tsudev.repo https://pkg.tsudev.com/rpm/tsudev.repo && sudo dnf install lotus-share\`.

Có trong kho: lotus-share, tsudev-luyen-go-phim (x86-64). Vân tay khoá ký: \`3883 10F4 7FA8 224D 76C0  A9C7 9745 B6AF 3EA3 3C74\`.

Ứng dụng chưa có gói ở kênh nào thì tải từ website riêng hoặc trang phát hành GitHub của nó.`,
  },
  {
    slug: 'kiem-tra-tep-tai-ve-sha256-ed25519',
    title: 'Kiểm tra tệp tải về: SHA-256 và chữ ký',
    category: 'security',
    position: 1,
    contentMd: `Cài qua winget, Scoop, Homebrew hoặc APT/DNF thì trình quản lý gói đã kiểm mã băm (và chữ ký GPG với APT/DNF) giúp bạn. Bài này dành cho khi bạn tải tệp cài bằng tay.

## 1. Tính SHA-256 của tệp

Windows (PowerShell):

\`\`\`powershell
Get-FileHash .\\ten-tep.exe -Algorithm SHA256
\`\`\`

Hoặc \`certutil -hashfile ten-tep.exe SHA256\`. macOS/Linux: \`sha256sum ten-tep\`.

## 2. So với mã băm công bố

- Tải từ trang phát hành GitHub của \`tsudev-org\`: so với tệp \`SHA256SUMS\` (hoặc \`SHA256SUMS.txt\`) đính kèm cùng bản phát hành.
- Tải bản phát hành đăng trên tsudev.com: so với SHA-256 trong hộp thoại tải về - mã do máy chủ tính, kèm chữ ký Ed25519 (khoá công khai: [/.well-known/tsudev-release-jwks.json](/.well-known/tsudev-release-jwks.json)).

Khác dù một ký tự thì KHÔNG cài.`,
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

- **Danh bạ ứng dụng** ở [/apps](/apps): các ứng dụng và trò chơi, tìm không cần gõ dấu, lọc theo nền tảng, mở website riêng của từng sản phẩm, chọn nhiều ứng dụng để lấy một lệnh winget.
- **Giao diện đen + tím**, một nền liền mạch, dễ đọc ở cả hai chế độ.
- **Ba lựa chọn giao diện: Sáng, Tối, Hệ thống** - nút ở cuối trang. Chọn "Hệ thống" thì trang đổi theo cài đặt máy bạn.
- Tài liệu được viết lại cho đúng việc bạn cần: [cài bằng lệnh](/docs/cai-ung-dung-bang-winget), [kiểm tra tệp tải về](/docs/kiem-tra-tep-tai-ve-sha256-ed25519), [xử lý cảnh báo khi cài](/docs/canh-bao-smartscreen-android-khi-cai).

Các website sản phẩm \`*.tsudev.com\` sẽ lần lượt đổi theo cùng giao diện để bạn có thể chuyển qua lại mà không thấy lạ.`,
  },
];

module.exports = { DOCS, POSTS };
