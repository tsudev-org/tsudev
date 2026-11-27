# BẢN ĐỒ BỘ QUY ƯỚC TSUDEV (v3.0.0)

> Đọc theo nhu cầu, không cần đọc tuần tự. Bắt đầu từ
> [`../AGENTS.md`](../AGENTS.md) - đó là điểm vào bắt buộc của mọi phiên.

## Đọc theo vai trò

**Bạn vừa vào dự án, chưa biết gì:**
1. [`../AGENTS.md`](../AGENTS.md) - điểm vào, nguyên tắc chung
2. [`ONBOARDING.md`](ONBOARDING.md) - đưa quy ước vào repo, bộ câu lệnh cho agent
3. [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md) - file mới đặt ở đâu

**Bạn sắp khởi tạo một project mới:**
1. [`LANGUAGE_SELECTION.md`](LANGUAGE_SELECTION.md) - chọn ngôn ngữ và framework
2. [`FREE_TIER_STACK.md`](FREE_TIER_STACK.md) - chọn hạ tầng 0 đồng
3. [`SECURITY_BASELINE.md`](SECURITY_BASELINE.md) mục 10.1 - checklist khởi tạo
4. [`SYNC.md`](SYNC.md) mục 3 - đồng bộ bộ quy ước

**Bạn đang viết mã:**
1. [`SECURITY_BASELINE.md`](SECURITY_BASELINE.md) - bắt buộc trước khi đụng xác thực, tải tệp, truy vấn
2. [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) - token, không hard-code giao diện
3. [`TESTING_QUALITY.md`](TESTING_QUALITY.md) - ngưỡng chất lượng và kiểm thử
4. [`ACCESSIBILITY.md`](ACCESSIBILITY.md) - WCAG 2.1 AA
5. [`BRAND_ASSETS.md`](BRAND_ASSETS.md) - khi đụng logo, favicon, icon ứng dụng

**Bạn đang làm chức năng đăng nhập, đăng ký, tài khoản:**
1. [`AUTH_AND_ACCOUNT.md`](AUTH_AND_ACCOUNT.md) - kiến trúc, ba lối vào, xác minh, ma trận quyền, lối đăng nhập chủ động - không nhắc tự động (14.4)
2. [`CROSS_DEVICE_LOGIN.md`](CROSS_DEVICE_LOGIN.md) - "Quét để đăng nhập" bằng QR + mã khớp
3. [`SECURITY_BASELINE.md`](SECURITY_BASELINE.md) mục 6 - ngưỡng mật khẩu, phiên, phân quyền
4. [`ECOSYSTEM_IDENTITY.md`](ECOSYSTEM_IDENTITY.md) mục 6 và 7 - ảnh đại diện, trang hồ sơ

**Bạn đang làm bảng, danh sách, modal có bản ghi:**
1. [`DATA_TABLE.md`](DATA_TABLE.md) - bộ chọn số bản ghi, vị trí, hành vi
2. [`SEARCH_AND_FILTER.md`](SEARCH_AND_FILTER.md) mục 7 - tham số API và trần `page_size`
3. [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) mục 5 - kiểu dáng bảng và modal

**Bạn sắp phát hành một sản phẩm mới:**
1. [`ECOSYSTEM_IDENTITY.md`](ECOSYSTEM_IDENTITY.md) mục 2 - siêu dữ liệu bắt buộc
2. [`BRAND_ASSETS.md`](BRAND_ASSETS.md) mục 12 - bộ tài sản nhận diện bắt buộc
3. [`VERSIONING.md`](VERSIONING.md) - đặt tên bản phát hành
4. [`PACKAGING.md`](PACKAGING.md) - cài bằng lệnh: winget, Scoop, apt/rpm, Homebrew
5. [`DISTRIBUTION_TRUST.md`](DISTRIBUTION_TRUST.md) - cửa hàng, ký mã, chống báo nhầm antivirus, hồ sơ nền tảng
6. [`PRODUCT_POLICY.md`](PRODUCT_POLICY.md) - ngôn ngữ/giao diện theo hệ thống, không quảng cáo, Pro (gói tự nguyện ủng hộ tác giả, 3.7) + Ủng hộ, huy hiệu, iOS, ảnh/video website, dữ liệu chỉ ở thiết bị - đồng bộ trực tiếp giữa thiết bị (mục 7)
7. [`STORE_SUBMISSION.md`](STORE_SUBMISSION.md) - phiên agent tự điền biểu mẫu nộp duyệt cửa hàng/antivirus
8. [`EMAIL.md`](EMAIL.md) - địa chỉ `@tsudev.com` công bố trên README, cửa hàng, SECURITY/PRIVACY phải có trong danh mục
9. [`APPLE_CICD.md`](APPLE_CICD.md) - bản iOS/iPadOS/macOS: dựng, ký, TestFlight từ Ubuntu (không cần Mac)

**Bạn sắp commit hoặc mở PR:**
1. [`GIT_WORKFLOW.md`](GIT_WORKFLOW.md) - nhánh, commit, PR
2. [`GITIGNORE_POLICY.md`](GITIGNORE_POLICY.md) - trước khi commit file mới
3. [`SECURITY_BASELINE.md`](SECURITY_BASELINE.md) mục 10.2 và 10.3 - checklist

**Bạn là agent AI:**
1. [`AGENT_PROTOCOL.md`](AGENT_PROTOCOL.md) - toàn bộ quy trình phiên làm việc
2. [`KNOWLEDGE_BASE.md`](KNOWLEDGE_BASE.md) - kho tri thức AKB: `akb start` đầu phiên, `akb search` trước khi tự mò, `akb sync` cuối phiên
3. [`SECURITY_BASELINE.md`](SECURITY_BASELINE.md) mục 12 - ranh giới của agent
4. [`LANGUAGE_SELECTION.md`](LANGUAGE_SELECTION.md) mục 8 - ràng buộc khi chọn stack

**Bạn đang đụng tới thư điện tử (`*@tsudev.com`, gửi thư từ mã, DNS thư):**
1. [`EMAIL.md`](EMAIL.md) - danh mục địa chỉ, gửi qua Resend, DNS chỉ phiên điều phối sửa, quy trình thêm địa chỉ, bảng lỗi

**Bạn đang làm chức năng nội dung:**
1. [`RICH_TEXT_EDITOR.md`](RICH_TEXT_EDITOR.md) - trình soạn thảo ngang Word
2. [`SEARCH_AND_FILTER.md`](SEARCH_AND_FILTER.md) - tìm kiếm và lọc tiếng Việt

## Danh mục đầy đủ

| File | Nội dung | Mức ràng buộc |
| --- | --- | --- |
| [`../AGENTS.md`](../AGENTS.md) | Điểm vào bắt buộc, nguyên tắc chung | Bất khả xâm phạm |
| [`../SECURITY.md`](../SECURITY.md) | Chính sách và kênh báo lỗ hổng | Bất khả xâm phạm |
| [`AGENT_PROTOCOL.md`](AGENT_PROTOCOL.md) | Phiên làm việc, khóa file, bàn giao | Bất khả xâm phạm |
| [`KNOWLEDGE_BASE.md`](KNOWLEDGE_BASE.md) | Kho tri thức agent ngoài repo (AKB): cấu trúc, schema, CLI `akb`, lint | Bất khả xâm phạm |
| [`SECURITY_BASELINE.md`](SECURITY_BASELINE.md) | Chuẩn bảo mật kỹ thuật | Bất khả xâm phạm |
| [`GITIGNORE_POLICY.md`](GITIGNORE_POLICY.md) | Duy trì `.gitignore` | Bất khả xâm phạm |
| [`GIT_WORKFLOW.md`](GIT_WORKFLOW.md) | Nhánh, commit, PR, phát hành | Bất khả xâm phạm |
| [`VERSIONING.md`](VERSIONING.md) | Ba khuôn phiên bản, thẻ git, tên tệp phát hành | Bất khả xâm phạm |
| [`SYNC.md`](SYNC.md) | Đồng bộ quy ước xuống repo con | Bất khả xâm phạm |
| [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md) | Cây thư mục chuẩn | Bất khả xâm phạm |
| [`AUTH_AND_ACCOUNT.md`](AUTH_AND_ACCOUNT.md) | Đăng nhập, đăng ký, xác minh tài khoản | Bất khả xâm phạm |
| [`CROSS_DEVICE_LOGIN.md`](CROSS_DEVICE_LOGIN.md) | Đăng nhập chéo thiết bị bằng QR + mã khớp | Bất khả xâm phạm |
| [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) | Giao diện, token, component | Bất khả xâm phạm |
| [`DATA_TABLE.md`](DATA_TABLE.md) | Vùng bản ghi, bộ chọn số bản ghi | Bất khả xâm phạm |
| [`BRAND_ASSETS.md`](BRAND_ASSETS.md) | Logo, wordmark, favicon, icon ứng dụng | Bất khả xâm phạm |
| [`ECOSYSTEM_IDENTITY.md`](ECOSYSTEM_IDENTITY.md) | tsudev.com, ảnh đại diện, trang hồ sơ | Bất khả xâm phạm |
| [`ACCESSIBILITY.md`](ACCESSIBILITY.md) | WCAG 2.1 AA | Bất khả xâm phạm |
| [`TESTING_QUALITY.md`](TESTING_QUALITY.md) | Kiểm thử và chất lượng mã | Bất khả xâm phạm |
| [`LANGUAGE_SELECTION.md`](LANGUAGE_SELECTION.md) | Chọn ngôn ngữ theo loại project | Bất khả xâm phạm |
| [`FREE_TIER_STACK.md`](FREE_TIER_STACK.md) | Hạ tầng 0 đồng | Bất khả xâm phạm |
| [`PACKAGING.md`](PACKAGING.md) | Phân phối, cài bằng lệnh, ký gói | Bất khả xâm phạm |
| [`DISTRIBUTION_TRUST.md`](DISTRIBUTION_TRUST.md) | Cài không bị chặn: cửa hàng, ký mã, notarize, chống báo nhầm, hồ sơ nền tảng | Bất khả xâm phạm |
| [`PRODUCT_POLICY.md`](PRODUCT_POLICY.md) | Chính sách sản phẩm: mặc định theo hệ thống, không quảng cáo, Pro/Ủng hộ, huy hiệu, iOS, website có hình/video, dữ liệu chỉ ở thiết bị, mục đích đăng nhập | Bất khả xâm phạm |
| [`APP_INTEGRITY.md`](APP_INTEGRITY.md) | Toàn vẹn ứng dụng: máy chủ tự quyết, bắt buộc cập nhật (modal khoá), chứng thực app, làm rối mã PRIVATE an toàn với antivirus | Bất khả xâm phạm |
| [`CONTROL_PLANE.md`](CONTROL_PLANE.md) | Trạm điều hành `console.tsudev.com` (Cloudflare Access + 7 lớp khoá) và cổng xác thực tập trung `id.tsudev.com`; website công khai chỉ đọc; hợp đồng điều hành website sản phẩm | Bất khả xâm phạm |
| [`LOCAL_SYNC.md`](LOCAL_SYNC.md) | Tsu Link: đồng bộ trực tiếp giữa thiết bị qua Wi-Fi nội bộ/Bluetooth/QR, không internet; sao lưu `.tsubak` | Bất khả xâm phạm |
| [`STORE_SUBMISSION.md`](STORE_SUBMISSION.md) | Nộp duyệt cửa hàng/nền tảng: phiên agent điền biểu mẫu trên trình duyệt | Bất khả xâm phạm |
| [`APPLE_CICD.md`](APPLE_CICD.md) | Apple iOS/iPadOS/macOS: CI/CD từ Ubuntu, ký, TestFlight, bí mật `APPLE_*`, script `scripts/apple/` | Bất khả xâm phạm |
| [`RICH_TEXT_EDITOR.md`](RICH_TEXT_EDITOR.md) | Trình soạn thảo nội dung | Bất khả xâm phạm |
| [`SEARCH_AND_FILTER.md`](SEARCH_AND_FILTER.md) | Tìm kiếm và lọc tiếng Việt | Bất khả xâm phạm |
| [`templates/RA_SOAT_DANG_NHAP.md`](templates/RA_SOAT_DANG_NHAP.md) | Phiếu rà soát một cổng đăng nhập ở repo sản phẩm | Mẫu |
| [`ONBOARDING.md`](ONBOARDING.md) | Triển khai và bộ câu lệnh agent | Hướng dẫn |
| [`templates/HANDOVER.md`](templates/HANDOVER.md) | Mẫu phiếu bàn giao | Mẫu |
| [`templates/ADR.md`](templates/ADR.md) | Mẫu ghi quyết định kiến trúc | Mẫu |
| [`templates/SECURITY_REVIEW.md`](templates/SECURITY_REVIEW.md) | Mẫu phiếu rà soát bảo mật | Mẫu |
| [`templates/TRUST_TICKET.md`](templates/TRUST_TICKET.md) | Mẫu phiếu tin cậy phát hành `logs/trust/TRUST.md` (ký, kênh, hồ sơ nền tảng, pháp lý, nghiệm thu) | Mẫu |

## Ngoài thư mục docs

| Đường dẫn | Nội dung |
| --- | --- |
| `assets/brand/variants/` | Biến thể **không dùng cho sản phẩm** (`BRAND_ASSETS.md` mục 11) |
| `tokens/design-tokens.json` | Nguồn chân lý duy nhất của giao diện |
| `tokens/tokens.css` | Bản CSS sinh ra từ JSON, không sửa tay |
| `templates/gitignore/` | Bản `.gitignore` chuẩn theo nền tảng |
| `templates/logs/` | Mẫu `STATE.md`, `LOCKS.md`, `handover/` |
| `templates/AGENTS.downstream.md` | Mẫu `AGENTS.md` cho repo con |
| `scripts/sync-standards.sh` | Đồng bộ quy ước xuống repo con |
| `scripts/check-standards.sh` | Cổng kiểm quy ước |
| `scripts/build-tokens.mjs` | Sinh `tokens.css` từ JSON |
| `scripts/check-contrast.mjs` | Cổng canh tương phản WCAG |
| `proposals/` | Đề xuất đẩy ngược từ repo con |
| `exceptions/` | Ngoại lệ đã được duyệt |
