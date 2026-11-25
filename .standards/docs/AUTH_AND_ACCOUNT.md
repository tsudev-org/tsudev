# XÁC THỰC VÀ KIẾN TRÚC TÀI KHOẢN - mọi project/tool/phần mềm tsudev (v3.5.0)

> Đăng nhập, đăng ký, liên kết nhà cung cấp, trạng thái tài khoản, và cơ chế
> **Xác minh tài khoản**. Đây là chuẩn bắt buộc, không phải gợi ý.
>
> Phần mật mã học và ngưỡng bảo mật nền nằm ở
> [`SECURITY_BASELINE.md`](SECURITY_BASELINE.md) mục 6; tài liệu này **không lặp
> lại** mà chỉ tham chiếu. Giao diện lấy token từ
> [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md). Nhận diện và trang hồ sơ ở
> [`ECOSYSTEM_IDENTITY.md`](ECOSYSTEM_IDENTITY.md).
>
> **v3.5.0 (26/11/2026, phiếu `20261126-LG3`)**: mục 14.4 - nhắc đăng nhập bằng modal nổi khi thiết bị có internet mà
> chưa đăng nhập (không chặn chức năng lõi, không gọi mạng ngầm, nhịp chống làm phiền, thư viện chung).

## Mục lục

1. [Phạm vi và ba hạng sản phẩm](#1-phạm-vi-và-ba-hạng-sản-phẩm)
2. [Kiến trúc danh tính của hệ sinh thái](#2-kiến-trúc-danh-tính-của-hệ-sinh-thái)
3. [Ba lối vào bắt buộc](#3-ba-lối-vào-bắt-buộc) (+ Apple có điều kiện, mục 3.2)
4. [Luồng OIDC và OAuth](#4-luồng-oidc-và-oauth)
5. [Gộp và liên kết tài khoản](#5-gộp-và-liên-kết-tài-khoản)
6. [Đăng ký](#6-đăng-ký)
7. [Phiên đăng nhập](#7-phiên-đăng-nhập)
8. [Cơ chế Xác minh tài khoản](#8-cơ-chế-xác-minh-tài-khoản)
9. [Vòng đời và trạng thái tài khoản](#9-vòng-đời-và-trạng-thái-tài-khoản)
10. [Ma trận quyền theo trạng thái](#10-ma-trận-quyền-theo-trạng-thái)
11. [Xác thực hai lớp và khôi phục](#11-xác-thực-hai-lớp-và-khôi-phục)
12. [Đổi mật khẩu, đổi email, xóa tài khoản](#12-đổi-mật-khẩu-đổi-email-xóa-tài-khoản)
13. [Giao diện bắt buộc](#13-giao-diện-bắt-buộc)
14. [Sản phẩm chạy ngoại tuyến](#14-sản-phẩm-chạy-ngoại-tuyến) (+ nhắc đăng nhập, mục 14.4)
15. [Chuẩn API](#15-chuẩn-api)
16. [Kiểm thử bắt buộc](#16-kiểm-thử-bắt-buộc)
17. [Checklist nghiệm thu](#17-checklist-nghiệm-thu)

---

## 1. Phạm vi và ba hạng sản phẩm

Không phải sản phẩm nào cũng gánh cùng một khối lượng. Xác định hạng **trước
khi** viết dòng mã xác thực đầu tiên, rồi ghi hạng đó vào `README.md` của repo.

| Hạng | Mô tả | Xác thực |
| --- | --- | --- |
| **A - Web có tài khoản** | Website, ứng dụng web, bảng quản trị. Ví dụ: `tsudev` | `MUST` đủ mục 3 tới 13 |
| **B - Desktop/app có kết nối** | App cài đặt nhưng có tính năng cần máy chủ (tài khoản, quyền lợi, giấy phép) - KHÔNG gửi dữ liệu người dùng (`PRODUCT_POLICY` 7.1 N2) | `MUST` đủ mục 3 tới 13, thêm mục 14.1 |
| **C - Ngoại tuyến** | Chạy trọn vẹn không cần internet. Ví dụ: `tsuswico` rà quét máy tính, `tsucontact` chuyển CSV sang vCard | Đăng nhập là **tùy chọn**, theo mục 14 |

**Quy tắc cứng:** hạng C `MUST NOT` chặn bất kỳ chức năng lõi nào sau một màn
hình đăng nhập. Người dùng mở phần mềm ra là dùng được ngay. Đăng nhập ở hạng C
chỉ mở thêm phần cộng thêm (huy hiệu, quyền lợi Pro, ghi nhận ủng hộ - KHÔNG
đưa dữ liệu người dùng lên máy chủ, `PRODUCT_POLICY` mục 7), và `MUST` nêu rõ mở thêm cái gì ngay tại nút đăng nhập.

Sản phẩm hạng A và B `MUST NOT` tự dựng kho người dùng riêng. Danh tính của hệ
sinh thái là **một**, ở `tsudev.com` (mục 2).

---

## 2. Kiến trúc danh tính của hệ sinh thái

```
                    Google            GitHub
                       |                 |
                       +--------+--------+
                                |   (nhà cung cấp liên kết)
                                v
                     +----------------------+
                     |   tsudev.com (IdP)   |  <- nguồn chân lý về danh tính
                     |  OpenID Connect      |     mật khẩu, hồ sơ, xác minh, 2FA
                     +----------+-----------+
                                |   (OIDC Authorization Code + PKCE)
        +------------+----------+----------+-------------+
        v            v                     v             v
     tsudev     tsucontact             tsucwico      tsuswico
    (hạng A)      (hạng A)             (hạng B)        (hạng C)
```

- `tsudev.com` là **Nhà cung cấp danh tính** (IdP) duy nhất của hệ sinh thái.
  Mọi project khác là **bên tin cậy** (Relying Party, RP).
- Google, GitHub (và Apple, mục 3.2) là **nhà cung cấp liên kết**: chúng nối vào IdP, **không** nối
  thẳng vào từng project. Nhờ vậy một người dùng đăng nhập bằng Google ở
  `tsudev.com` và ở `tsucwico` là **cùng một tài khoản**, cùng một trạng thái
  xác minh, cùng một hồ sơ.
- `MUST NOT` khai báo OAuth app của Google/Apple/GitHub riêng cho từng project. Mỗi
  `client_id` thừa là một bề mặt tấn công thừa và một danh tính bị tách đôi.
- Điểm cuối chuẩn `MUST` công bố tại
  `https://tsudev.com/.well-known/openid-configuration`. RP `MUST` đọc cấu hình
  từ đó thay vì ghi cứng đường dẫn.
- Khóa ký `MUST` xoay vòng được qua JWKS (`/.well-known/jwks.json`); RP `MUST`
  cache theo `kid` và tự tải lại khi gặp `kid` lạ, `MUST NOT` cache vĩnh viễn.

### 2.1. Trường hợp chưa dựng xong IdP

Trong lúc IdP trung tâm chưa sẵn sàng, project mới `MAY` tạm dùng thư viện xác
thực cục bộ (`Auth.js`, `Supabase Auth`, ...) với **ba điều kiện bắt buộc**:

1. Lược đồ người dùng `MUST` đúng mục 9.1, để di trú sau này không mất dữ liệu.
2. `MUST` ghi một mục nợ kỹ thuật vào `logs/STATE.md` của repo đó.
3. `MUST NOT` phát hành ra người dùng ngoài trước khi có đường di trú, vì gộp hai
   kho người dùng sau khi đã có người thật là việc rất dễ làm hỏng.

---

## 3. Ba lối vào bắt buộc

Mọi màn hình đăng nhập của hạng A và B `MUST` có đủ và **đúng thứ tự** này:

| Thứ tự | Lối vào | Ghi chú |
| --- | --- | --- |
| 1 | **Tiếp tục với Google** | Nút có logo Google chính chủ, nền trắng, viền `border-strong` |
| (2) | **Tiếp tục với Apple** | Lối vào có điều kiện, mục 3.2. Nút theo Apple Human Interface Guidelines: logo Apple chính chủ, nền đen ở chế độ Sáng, nền trắng ở chế độ Tối, cùng cỡ với nút Google |
| 2 | **Tiếp tục với GitHub** | Nút có logo GitHub chính chủ, nền đen ở chế độ Sáng, nền `bg-surface` viền sáng ở chế độ Tối |
| 3 | **Tài khoản tsudev** | Email + mật khẩu; tài khoản đã đăng ký tại `tsudev.com` |

- Ba lối vào `MUST` cùng dẫn tới **một** không gian tài khoản. Cùng một email đã
  xác minh thì là cùng một người (mục 5).
- `MUST` ghi nhớ lối vào lần trước và đánh dấu "Lần trước bạn dùng cách này" -
  đây là biện pháp chống việc người dùng vô tình tạo tài khoản thứ hai, hiệu quả
  hơn mọi lời cảnh báo.
- `MUST NOT` bắt buộc liên kết Google/Apple/GitHub. Tài khoản tsudev thuần email luôn
  `MUST` là lối vào đủ dùng.
- `MUST NOT` thêm nhà cung cấp khác (Facebook, X, Zalo, ...) ngoài Google, Apple
  (mục 3.2), GitHub mà không có đề xuất được duyệt theo [`SYNC.md`](SYNC.md) và cập
  nhật chính tài liệu này.

### 3.0. Lối vào bổ sung (từ v3.3.0)

Ngoài ba lối vào bắt buộc, màn đăng nhập hạng A và B có thêm, dưới dải "Thêm tuỳ chọn đăng nhập":

| Lối vào | Mức | Điều kiện hiện nút |
| --- | --- | --- |
| **Tiếp tục với khoá truy cập** (passkey, WebAuthn) | `MUST` khi IdP bật passkey | IdP công bố `passkey` trong danh sách phương thức. Passkey là cách đăng nhập của **tài khoản tsudev**, không phải nhà cung cấp mới; chống lừa đảo tốt nhất, 0 đồng |
| **Tiếp tục bằng SSO** (tổ chức) | `MAY` | IdP có **ít nhất một** tổ chức đã cấu hình OIDC + xác minh tên miền bằng DNS TXT. Bấm ⇒ hỏi email công việc ⇒ IdP chuyển sang IdP của tổ chức. Chỉ OIDC (không SAML). Chưa có tổ chức ⇒ `MUST NOT` hiện nút |
| **Quét để đăng nhập** (QR) | `MUST` khi IdP bật API chéo thiết bị | Chuẩn riêng [`CROSS_DEVICE_LOGIN.md`](CROSS_DEVICE_LOGIN.md) |

Danh sách lối vào `MUST` lấy từ IdP (như nút Apple, mục 3.2); RP `MUST NOT` gõ cứng. Mục này chính là đề xuất được
duyệt (chủ dự án, 24/11/2026) cho câu "`MUST NOT` thêm nhà cung cấp khác" ở trên; Facebook, X, Zalo vẫn bị cấm.

### 3.1. Phạm vi quyền xin của nhà cung cấp liên kết

Xin **ít nhất có thể**. Mỗi quyền thừa là một lần người dùng do dự và một nghĩa
vụ bảo mật thừa.

| Nhà cung cấp | Phạm vi được phép | Cấm |
| --- | --- | --- |
| Google | `openid`, `email`, `profile` | `MUST NOT` xin Drive, Calendar, Contacts |
| Apple | `name`, `email` | Không có phạm vi rộng hơn; `MUST NOT` yêu cầu người dùng bỏ ẩn email |
| GitHub | `read:user`, `user:email` | `MUST NOT` xin `repo`, `admin:*`, `write:*` |

Cần quyền rộng hơn cho một tính năng cụ thể thì `MUST` xin **tăng dần** ngay tại
lúc dùng tính năng đó, không gộp vào lúc đăng nhập.

### 3.2. Đăng nhập với Apple - lối vào có điều kiện (từ v3.2.0)

Lý do: App Store Review Guideline 4.8 - app iOS có đăng nhập bên thứ ba (Google)
phải kèm "Sign in with Apple" hoặc một lối đăng nhập tương đương về quyền riêng
tư; người dùng iPhone/Mac quen Apple ID và được ẩn email thật.

| Sản phẩm | Mức |
| --- | --- |
| Có bản phát hành qua **App Store** (iOS, iPadOS, macOS) | `MUST` - trên mọi nền tảng của sản phẩm đó, kể cả web, để tài khoản tạo trên iPhone đăng nhập được ở nơi khác |
| Còn lại (web, Android, Windows, Linux) | `MAY` - bật khi IdP `tsudev.com` đã có Apple |

- Apple cần **Apple Developer Program (99 USD/năm)** cho Services ID và khóa `.p8`.
  Theo [`FREE_TIER_STACK.md`](FREE_TIER_STACK.md), chỉ trả khi chủ dự án quyết phát
  hành App Store (lúc đó phí này đã bắt buộc); `MUST NOT` mua riêng chỉ để có nút
  Apple trên web.
- IdP chưa cấu hình Apple thì `MUST NOT` hiện nút Apple (nút chết tệ hơn không có nút).
  Danh sách nhà cung cấp `MUST` lấy từ IdP, không gõ cứng ở RP.
- Một IdP duy nhất: Apple cấu hình **chỉ ở `tsudev.com`** (mục 2), RP gọi qua
  `idp_hint=apple`. `MUST NOT` mỗi sản phẩm tự đăng ký Services ID riêng.
- Bẫy kỹ thuật `MUST` xử lý:
  - Xin `name email` thì Apple trả về bằng `response_mode=form_post` - callback là
    **POST liên trang**. Cookie `SameSite=Lax` không đi kèm, nên `state`/`nonce`/PKCE
    `MUST` lưu phía máy chủ theo khóa `state`, hoặc cookie riêng `SameSite=None; Secure;
    HttpOnly` sống tối đa 10 phút.
  - Apple chỉ gửi **tên** ở lần ủy quyền đầu tiên (trong thân POST, không trong
    `id_token`) ⇒ `MUST` lưu ngay lần đó; thiếu tên thì hỏi người dùng, không chặn.
  - `client_secret` là JWT ký ES256 bằng khóa `.p8`, hạn tối đa 6 tháng ⇒ `MUST` tự
    sinh lại theo lịch (vd. mỗi 30 ngày); khóa `.p8` là secret theo
    [`SECURITY_BASELINE.md`](SECURITY_BASELINE.md).
  - `email_verified` / `is_private_email` có thể là chuỗi `"true"` hoặc boolean ⇒
    chuẩn hoá trước khi so.
  - Xoá tài khoản (mục 12) `MUST` gọi `https://appleid.apple.com/auth/revoke` thu
    hồi token Apple (Guideline 5.1.1(v)); `MUST` nhận thông báo máy chủ tới máy chủ
    của Apple (`consent-revoked`, `account-delete`, `email-disabled`/`email-enabled`)
    và gỡ liên kết / cập nhật email tương ứng.
  - Email ẩn `@privaterelay.appleid.com` chỉ nhận thư từ tên miền gửi **đã đăng ký**
    ở mục "Sign in with Apple for Email Communication" của Apple Developer, kèm SPF
    và DKIM. Chưa đăng ký thì thư xác minh, thư thông báo (mục 5, 8) bị trả lại im lặng.

---

## 4. Luồng OIDC và OAuth

- `MUST` dùng **Authorization Code Flow kèm PKCE** (`S256`) cho mọi loại client,
  kể cả web có máy chủ. `MUST NOT` dùng Implicit Flow hay Password Grant.
- `MUST` sinh `state` ngẫu nhiên tối thiểu 128 bit, gắn với phiên, và **đối chiếu
  khi quay về**. Đây là lớp chống CSRF của luồng đăng nhập.
- `MUST` sinh `nonce` và đối chiếu nó trong `id_token`. Bỏ `nonce` là mở cửa cho
  tấn công phát lại token.
- `MUST` đối chiếu `iss`, `aud`, `exp`, `iat` của `id_token` và kiểm chữ ký bằng
  JWKS. `MUST NOT` tin `id_token` chỉ vì nó đến từ đường dẫn quay về.
- `redirect_uri` `MUST` nằm trong danh sách cho phép **so khớp chuỗi tuyệt đối**.
  `MUST NOT` so khớp theo tiền tố, theo ký tự đại diện, hay theo tên miền phụ mở.
- Sau `redirect_uri`, đích đến nội bộ (`?next=`) `MUST` được kiểm là đường dẫn
  tương đối cùng gốc. Đây là lỗ hổng **open redirect** kinh điển, và nó biến trang
  đăng nhập thật thành bàn đạp cho trang lừa đảo.
- Mã ủy quyền `MUST` dùng một lần, sống tối đa **60 giây**.
- App desktop (hạng B, C) `MUST` mở trình duyệt hệ thống với vòng lặp quay về
  `http://127.0.0.1:<cổng ngẫu nhiên>/callback`. `MUST NOT` nhúng WebView để hứng
  mật khẩu - đó là chống chỉ định của chính OAuth, và người dùng không thể kiểm
  chứng thanh địa chỉ.

---

## 5. Gộp và liên kết tài khoản

Đây là chỗ dễ mắc lỗi bảo mật nghiêm trọng nhất của cả tài liệu này. Đọc kỹ.

**Quy tắc cứng:** chỉ được tự động gộp hai danh tính theo email khi nhà cung cấp
**khẳng định email đã được xác minh** (`email_verified: true` với Google; email
đã xác minh và ở trạng thái chính với GitHub).

- Nhà cung cấp trả email **chưa xác minh**: `MUST` coi như một danh tính mới,
  `MUST` bắt xác minh email trước khi được nối vào tài khoản đang có.
  Bỏ bước này là lỗ hổng **chiếm tài khoản trước khi nạn nhân đăng ký**: kẻ tấn
  công tạo tài khoản ở nhà cung cấp bên thứ ba bằng email của nạn nhân, đăng nhập
  vào hệ thống trước, rồi ngồi đợi.
- Apple: email thật trả về với `email_verified` đúng thì gộp như Google. Email ẩn
  `@privaterelay.appleid.com` coi là **đã xác minh** (Apple chuyển tiếp được thư)
  nhưng không bao giờ trùng email thật, nên `MUST NOT` đoán gộp theo tên hay thiết
  bị; người dùng muốn nối thì tự liên kết ở `/tai-khoan/bao-mat` khi đang đăng nhập.
- Tài khoản tsudev thuần email muốn nối thêm Google/Apple/GitHub: `MUST` yêu cầu người
  dùng **đang đăng nhập** rồi mới nối, ở trang Bảo mật của hồ sơ.
- `MUST` cho phép **gỡ liên kết**, nhưng `MUST NOT` cho gỡ lối vào cuối cùng. Còn
  đúng một cách vào tài khoản thì nút gỡ `MUST` bị vô hiệu kèm giải thích: "Đặt
  mật khẩu hoặc nối một nhà cung cấp khác trước đã".
- Mọi lần nối hoặc gỡ liên kết `MUST` gửi email thông báo tới địa chỉ chính và
  ghi vào nhật ký kiểm toán (mục 9.2).
- Đổi email chính `MUST` không kéo theo việc gộp ngầm với một tài khoản đang tồn
  tại. Trùng email thì `MUST` báo lỗi và dừng, để con người xử lý.

---

## 6. Đăng ký

- Trường bắt buộc lúc đăng ký: **email** và **mật khẩu**. Hết. Tên hiển thị, ảnh
  đại diện, ngày sinh `MUST` để lại cho trang hồ sơ, điền sau.
- Mật khẩu theo [`SECURITY_BASELINE.md`](SECURITY_BASELINE.md) mục 6.1: tối thiểu
  12 ký tự, đối chiếu danh sách đã lộ, `MUST NOT` ép quy tắc ký tự đặc biệt kèm
  giới hạn độ dài tối đa thấp.
- `MUST` có thanh đo độ mạnh mật khẩu theo `zxcvbn` hoặc tương đương, và `MUST` có
  nút hiện/ẩn mật khẩu.
- `MUST NOT` để lộ tài khoản có tồn tại hay không (**user enumeration**): thông
  báo ở đăng ký, đăng nhập và quên mật khẩu `MUST` giống nhau về nội dung và
  **gần nhau về thời gian trả lời**. Ví dụ đúng: "Nếu email này có tài khoản,
  chúng tôi đã gửi hướng dẫn tới đó".
- `MUST` có `Turnstile` (Cloudflare, miễn phí) hoặc tương đương ở đăng ký và quên
  mật khẩu. `MUST NOT` dùng reCAPTCHA v2 dạng chọn ảnh - nó là rào cản khả năng
  truy cập.
- `MUST` giới hạn tần suất theo IP **và** theo email đích, có độ trễ tăng dần.
- Người dùng `MUST` chủ động đồng ý Điều khoản và Chính sách riêng tư bằng một ô
  đánh dấu **không tick sẵn**, có liên kết mở được ra tab mới.

---

## 7. Phiên đăng nhập

Nền tảng ở [`SECURITY_BASELINE.md`](SECURITY_BASELINE.md) mục 6.2. Phần riêng của
hệ sinh thái:

- Access token sống tối đa **15 phút**; refresh token sống tối đa **30 ngày**,
  **xoay vòng mỗi lần dùng**, và `MUST` có phát hiện tái sử dụng: một refresh
  token đã dùng lại lần hai nghĩa là nó đã bị đánh cắp, `MUST` thu hồi **cả cây
  phiên** của tài khoản đó và gửi email cảnh báo.
- Cookie phiên `MUST` đặt trên `tsudev.com` với `Domain=.tsudev.com` để dùng chung
  giữa các tên miền phụ, kèm đủ `HttpOnly`, `Secure`, `SameSite=Lax`.
- `MUST` có trang **"Thiết bị và phiên đang đăng nhập"** trong hồ sơ, liệt kê:
  thiết bị, trình duyệt, vị trí gần đúng theo IP, lần hoạt động cuối
  (`HH:mm DD/MM/YYYY`), và nút **Đăng xuất khỏi thiết bị này** cùng **Đăng xuất
  khỏi mọi thiết bị khác**.
- "Ghi nhớ đăng nhập" `MUST` là lựa chọn của người dùng, mặc định **tắt** trên
  thiết bị dùng chung không nhận biết được, nghĩa là mặc định tắt.
- Đăng xuất `MUST` vô hiệu phiên ở phía máy chủ, không chỉ xóa cookie.

---

## 8. Cơ chế Xác minh tài khoản

Mục tiêu: người dùng luôn biết **tài khoản mình đang ở trạng thái nào** và
**cần làm gì tiếp theo**, không phải đoán.

### 8.1. Định nghĩa

**Xác minh tài khoản** = đã chứng minh quyền kiểm soát địa chỉ email chính.

| Trạng thái | Điều kiện đạt |
| --- | --- |
| **Chưa xác minh** | Mới đăng ký, hoặc vừa đổi email chính và chưa xác nhận địa chỉ mới |
| **Đã xác minh** | Đã bấm liên kết xác minh còn hạn, hoặc đăng nhập bằng Google/Apple/GitHub trả về `email_verified: true` |

Đăng nhập bằng Google, Apple hoặc GitHub với email đã xác minh phía nhà cung cấp thì
`MUST` đánh dấu **Đã xác minh** ngay, `MUST NOT` bắt xác minh lại. Bắt người dùng
làm lại việc đã làm là cách nhanh nhất khiến họ bỏ đi.

### 8.2. Liên kết xác minh

- Token xác minh `MUST` ngẫu nhiên tối thiểu **256 bit**, sinh bằng nguồn ngẫu
  nhiên mật mã, **lưu dạng băm** trong cơ sở dữ liệu - lộ bản sao lưu cơ sở dữ
  liệu thì token vẫn không dùng được.
- Hạn **24 giờ**, **dùng một lần**, gắn cứng với đúng một email đích.
- `MUST` có nút **Gửi lại** với đếm ngược, sớm nhất **60 giây** một lần, tối đa
  **5 lần trong 24 giờ**.
- Trang xác minh `MUST` xử lý được cả ba ca và nói rõ bước tiếp theo: token hợp
  lệ, token hết hạn, token đã dùng rồi.
- `MUST NOT` để việc bấm liên kết xác minh **tự đăng nhập** người dùng vào phiên.
  Hộp thư có thể đã bị xem trộm, và trình quét liên kết của máy chủ email hay tự
  bấm trước cả người thật.

### 8.3. Thời hạn 7 ngày và các mức hạn chế

Đồng hồ chạy từ **thời điểm tạo tài khoản**.

| Giai đoạn | Trạng thái | Người dùng làm được gì |
| --- | --- | --- |
| **Ngày 0 tới hết ngày 7** - ân hạn | Chưa xác minh | Đăng nhập, đọc, sửa hồ sơ của mình, xác minh. **Không** bình luận, **không** đăng nội dung, **không** tải tệp lên, **không** gọi API ghi công khai |
| **Từ ngày 8** - hạn chế | Chưa xác minh, quá hạn | Chỉ còn: xem hồ sơ của mình, đổi email chính, gửi lại thư xác minh, xuất dữ liệu, xóa tài khoản. Mọi trang khác dành cho tài khoản đăng nhập đều `MUST` chuyển hướng về trang Xác minh |
| Bất kỳ lúc nào sau khi xác minh | Đã xác minh | Đầy đủ quyền theo vai trò (mục 10) |

- Mốc 7 ngày `MUST` là một hằng số cấu hình được (`ACCOUNT_VERIFY_GRACE_DAYS`),
  `MUST NOT` rải số 7 khắp mã nguồn.
- `MUST` nhắc bằng email vào **ngày 3** và **ngày 6**, và **một lần nữa** khi hết
  hạn kèm hướng dẫn khôi phục quyền.
- Tài khoản chưa xác minh quá **90 ngày** và chưa từng có hoạt động nào `SHOULD`
  bị xóa tự động, sau một email báo trước 7 ngày. Đây là cách dọn tài khoản rác
  và giảm bề mặt dữ liệu cá nhân phải giữ.
- Việc chặn `MUST` được thi hành **ở tầng máy chủ, trên từng thao tác ghi**. Ẩn
  nút "Bình luận" trên giao diện không phải là hạn chế, đúng theo
  [`SECURITY_BASELINE.md`](SECURITY_BASELINE.md) mục 6.3.

### 8.4. Hiển thị trạng thái

Trang hồ sơ và trang quản lý tài khoản `MUST` hiển thị huy hiệu trạng thái ngay
cạnh email chính, dùng component **Badge status** của
[`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) mục 5:

| Trạng thái | Nền | Chữ | Icon 16px | Nhãn |
| --- | --- | --- | --- | --- |
| Đã xác minh | `success` nhạt 12% | `success` đậm | dấu kiểm trong vòng tròn | `Đã xác minh` |
| Chưa xác minh, còn ân hạn | `warning` nhạt 12% | `warning` đậm | dấu chấm than trong tam giác | `Chưa xác minh` |
| Chưa xác minh, quá hạn | `danger` nhạt 12% | `danger` đậm | dấu chấm than trong vòng tròn | `Chưa xác minh` |

- Huy hiệu `MUST NOT` chỉ dùng màu để phân biệt: luôn kèm **chữ và icon**, theo
  [`ACCESSIBILITY.md`](ACCESSIBILITY.md).
- Trạng thái "Chưa xác minh" `MUST` đi kèm **một dòng nói rõ hậu quả và một nút
  hành động duy nhất**. Đúng: `Chưa xác minh - còn 4 ngày trước khi tài khoản bị
  hạn chế.` kèm nút `Gửi lại thư xác minh`. Sai: một dấu chấm than không giải
  thích gì.
- `MUST` có dải thông báo (banner) cố định trên đầu mọi trang khi tài khoản chưa
  xác minh, đóng tạm được nhưng `MUST` hiện lại ở phiên sau.
- Số ngày còn lại `MUST` đếm theo ngày tròn và nói bằng tiếng Việt tự nhiên:
  `còn 4 ngày`, `còn 1 ngày`, `hết hạn hôm nay`.

### 8.5. Xác minh nâng cao (tùy sản phẩm)

Email là mức nền. Sản phẩm có thao tác rủi ro cao `MAY` yêu cầu thêm, và khi đó
`MUST` ghi rõ trong tài liệu của chính sản phẩm đó:

| Mức | Chứng minh cái gì | Dùng khi |
| --- | --- | --- |
| Mức 1 - Email | Kiểm soát hộp thư | Mặc định toàn hệ sinh thái |
| Mức 2 - 2FA (TOTP) | Giữ một thiết bị | Tài khoản quản trị (`MUST`), tài khoản thường (`SHOULD`) |
| Mức 3 - Xác thực lại | Còn đang ngồi trước máy | Đổi mật khẩu, đổi email, xóa tài khoản, xem mã dự phòng |

Mức 3 `MUST` áp cho mọi thao tác trong mục 12, kể cả khi phiên còn hạn.

---

## 9. Vòng đời và trạng thái tài khoản

### 9.1. Lược đồ tối thiểu

Mọi sản phẩm `MUST` giữ đủ các trường sau, đúng tên, để di trú và đồng bộ được:

| Trường | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | UUID v7 | `MUST NOT` dùng số tự tăng làm định danh công khai |
| `email` | text, duy nhất, thường hóa | Lưu bản thường hóa để so khớp; giữ bản gốc để hiển thị |
| `email_verified_at` | timestamp, cho phép rỗng | Rỗng nghĩa là chưa xác minh. `MUST NOT` dùng cờ boolean - mất mốc thời gian là mất khả năng tính hạn |
| `status` | enum | Theo bảng 9.2 |
| `display_name` | text | Điền sau, có thể rỗng |
| `avatar_url` | text | Theo [`ECOSYSTEM_IDENTITY.md`](ECOSYSTEM_IDENTITY.md) |
| `created_at` | timestamp | Mốc bắt đầu đếm 7 ngày |
| `last_seen_at` | timestamp | Phục vụ dọn tài khoản rác |
| `deletion_requested_at` | timestamp, cho phép rỗng | Mốc bắt đầu ân hạn 30 ngày |

Danh tính liên kết nằm ở bảng riêng `account_identities`
(`user_id`, `provider`, `provider_user_id`, `email`, `email_verified`,
`linked_at`), khóa duy nhất trên cặp (`provider`, `provider_user_id`).

### 9.2. Các trạng thái

| `status` | Nghĩa | Vào bằng cách nào | Ra bằng cách nào |
| --- | --- | --- | --- |
| `active` | Bình thường | Mặc định khi tạo | - |
| `restricted` | Quá hạn xác minh 7 ngày | Tự động | Xác minh xong thì tự về `active` |
| `suspended` | Tạm khóa do vi phạm hoặc dấu hiệu bất thường | Quản trị viên, hoặc tự động khi phát hiện tái dùng refresh token | Quản trị viên gỡ |
| `locked` | Khóa do đăng nhập sai quá nhiều | Tự động | Tự mở sau thời gian chờ, hoặc qua đặt lại mật khẩu |
| `pending_deletion` | Người dùng đã yêu cầu xóa | Người dùng | Hủy yêu cầu trong 30 ngày |
| `deleted` | Đã ẩn danh hóa | Hết 30 ngày | Không |

Mọi lần đổi `status` `MUST` ghi **nhật ký kiểm toán** không sửa được: ai đổi, từ
gì sang gì, lý do, thời điểm, IP. Nhật ký này `MUST` giữ tối thiểu **12 tháng**.

---

## 10. Ma trận quyền theo trạng thái

`MUST` cài đặt đúng bảng này ở tầng máy chủ. Cột trái là điều kiện, không phải
gợi ý giao diện.

| Thao tác | Khách | Chưa xác minh (ân hạn) | Chưa xác minh (quá hạn) | Đã xác minh | Quản trị |
| --- | --- | --- | --- | --- | --- |
| Xem nội dung công khai | có | có | có | có | có |
| Đăng nhập | có | có | có | có | có |
| Xem hồ sơ của mình | không | có | có | có | có |
| Sửa hồ sơ, đổi ảnh đại diện | không | có | không | có | có |
| Gửi lại thư xác minh, đổi email chính | không | có | có | có | có |
| Bình luận, đánh giá | không | **không** | không | có | có |
| Đăng nội dung, tải tệp lên | không | **không** | không | có | có |
| Truy cập trang chỉ dành cho tài khoản | không | có | **không** | có | có |
| Gọi API ghi công khai | không | **không** | không | có | có |
| Xuất dữ liệu, xóa tài khoản | không | có | có | có | có |
| Trang quản trị | không | không | không | không | có, kèm 2FA |

- Bị chặn `MUST` trả `HTTP 403` kèm thân phản hồi nêu **mã lý do máy đọc được**
  (`account_unverified`, `account_restricted`, `account_suspended`) để giao diện
  hiện đúng thông điệp. `MUST NOT` trả `404` hay lỗi chung chung.
- Giao diện `MUST NOT` chỉ ẩn nút. Nút vẫn hiện, ở trạng thái `Disabled` theo
  [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) mục 5, kèm tooltip nói vì sao và cách gỡ.
  Ẩn đi thì người dùng tưởng tính năng không tồn tại.

---

## 11. Xác thực hai lớp và khôi phục

- 2FA `MUST` dùng **TOTP** (RFC 6238, 30 giây, 6 chữ số), chấp nhận lệch một cửa
  sổ trước và sau. `MUST NOT` dùng SMS làm lớp thứ hai mặc định - SIM swap là rủi
  ro thật và SMS quốc tế còn tốn tiền.
- Bật 2FA `MUST` sinh **10 mã dự phòng** dùng một lần, hiển thị đúng một lần, có
  nút tải về và nút sao chép. Mã `MUST` lưu dạng băm.
- `MUST` bắt buộc 2FA cho mọi tài khoản có quyền quản trị.
- `SHOULD` hỗ trợ **Passkey** (WebAuthn) như lối vào không mật khẩu. Khi có
  passkey, nó `MUST` đủ tư cách thay cho cả mật khẩu lẫn TOTP.
- Tắt 2FA `MUST` yêu cầu xác thực lại (mức 3) và `MUST` gửi email thông báo.
- Khôi phục khi mất cả thiết bị lẫn mã dự phòng `MUST` là quy trình có con người
  duyệt, `MUST NOT` tự động hóa. Đây chính là cửa hậu mà kẻ tấn công nhắm vào.

---

## 12. Đổi mật khẩu, đổi email, xóa tài khoản

Cả ba `MUST` yêu cầu xác thực lại (mục 8.5 mức 3) và `MUST` gửi email thông báo
tới **địa chỉ cũ** kèm câu "Không phải bạn? Bấm vào đây" dẫn tới luồng khóa khẩn.

**Đổi mật khẩu**
- `MUST` hỏi mật khẩu hiện tại (trừ luồng đặt lại qua email).
- `MUST` thu hồi mọi phiên khác sau khi đổi, giữ lại phiên đang thao tác.

**Đặt lại mật khẩu (quên mật khẩu)**
- Token `MUST` ngẫu nhiên tối thiểu 256 bit, lưu dạng băm, hạn **60 phút**, dùng
  một lần, và `MUST` mất hiệu lực khi mật khẩu đổi bằng đường khác.
- Phản hồi `MUST` như nhau dù email có tồn tại hay không (mục 6).

**Đổi email chính**
- Địa chỉ mới `MUST` được xác minh **trước khi** thay thế địa chỉ cũ. Trong lúc
  chờ, địa chỉ cũ vẫn là địa chỉ chính.
- Sau khi đổi, `email_verified_at` `MUST` được đặt lại theo mốc xác minh của địa
  chỉ mới, `MUST NOT` giữ mốc cũ.

**Xóa tài khoản**
- `MUST` có ân hạn **30 ngày** ở trạng thái `pending_deletion`, hủy được bằng một
  lần đăng nhập kèm xác nhận.
- Hết hạn thì `MUST` **ẩn danh hóa**, không xóa cứng dòng dữ liệu nếu nó còn được
  tham chiếu: email và tên thay bằng giá trị vô danh, ảnh đại diện xóa hẳn khỏi
  kho lưu trữ, nội dung công khai xử lý theo chính sách của sản phẩm và `MUST`
  nói rõ trong hộp thoại xác nhận.
- `MUST` cho **xuất dữ liệu** (JSON) trước khi xóa, tải về ngay hoặc gửi liên kết
  có hạn qua email.

---

## 13. Giao diện bắt buộc

### 13.1. Đường dẫn chuẩn

Mọi sản phẩm web `MUST` dùng đúng bộ đường dẫn này. Đồng nhất đường dẫn là điều
kiện để chia sẻ liên kết giữa các sản phẩm mà không hỏng.

```
/dang-nhap                     đăng nhập
/dang-ky                       đăng ký
/quen-mat-khau                 yêu cầu đặt lại mật khẩu
/dat-lai-mat-khau              đặt mật khẩu mới (có token)
/xac-minh                      trang trạng thái xác minh, gửi lại thư
/xac-minh/xac-nhan             đích của liên kết trong email
/tai-khoan                     tổng quan tài khoản
/tai-khoan/ho-so               hồ sơ cá nhân, ảnh đại diện
/tai-khoan/bao-mat             mật khẩu, 2FA, liên kết Google/Apple/GitHub
/tai-khoan/phien               thiết bị và phiên đang đăng nhập
/tai-khoan/du-lieu             xuất dữ liệu, xóa tài khoản
```

- Đường dẫn `MUST` không dấu, chữ thường, nối bằng gạch ngang ngắn `-`.
- Sản phẩm tiếng Anh `MAY` dùng bản dịch tương ứng nhưng `MUST` giữ nguyên cấu
  trúc cây và `MUST` chuyển hướng `301` từ bản tiếng Việt.

### 13.2. Bố cục màn hình đăng nhập và đăng ký (v3.3.0, mẫu Quly Thu Chi + Lark)

```
+---------------------------------------------------+
|                                  (🌐 Tiếng Việt ▾)|  chọn ngôn ngữ, mặc định theo hệ thống
|  [ logo sản phẩm ]                                |  logo 48px (BRAND_ASSETS mục 2)
|  Chào mừng tới <Tên sản phẩm>                     |  24-28px / 700
|  Một câu giá trị (vd. "Dữ liệu được mã hoá ngay   |  14px, text-muted
|  trên thiết bị của bạn.")                         |
|                                                   |
|  [ (G)  Tiếp tục với Google              ]        |  cao 44px (app) / 40px (web)
|  [ (A)  Tiếp tục với Apple               ]        |  chỉ khi mục 3.2 áp dụng
|  [ (GH) Tiếp tục với GitHub              ]        |
|  [ (@)  Tài khoản tsudev (email)         ]        |  web IdP: ô email + "Tiếp" (định danh trước)
|           "Lần trước bạn dùng cách này"           |  nhãn trên đúng nút đã dùng
|                                                   |
|  ( ) Tôi đã đọc và chấp nhận Điều khoản dịch vụ   |  ô đồng ý, KHÔNG tích sẵn (mục 13.4)
|      và Chính sách quyền riêng tư.                |
|                                                   |
|  ---------- Thêm tuỳ chọn đăng nhập ----------    |  12px, text-muted
|  [ (🔑) Tiếp tục với khoá truy cập       ]        |  mục 3.0
|  [ (🏢) Tiếp tục bằng SSO                ]        |  mục 3.0, có điều kiện
|                                                   |
|              Quét để đăng nhập                    |  liên kết (app) / khung QR cột phải (web ≥ 960px)
|  ------------------ hoặc ------------------       |  chỉ hạng C / app có chế độ khách
|  [      Dùng ngay, không cần tài khoản     ]      |  mục 14; nói rõ dữ liệu chỉ lưu trên máy
+---------------------------------------------------+
```

- App di động/desktop: mọi nút đăng nhập mở **trình duyệt hệ thống** tới IdP (mục 4) kèm `idp_hint`/`login_hint`;
  ô mật khẩu chỉ có ở trang IdP. Bố cục trên là màn bản địa của app; trang IdP dùng cùng bố cục, thêm ô email/mật khẩu.
- Màn đăng nhập/đăng ký/**Ủng hộ** (Pro) của mọi sản phẩm dùng chung một khung này: cùng thứ tự, cùng khoảng cách,
  màu nhấn lấy từ lớp bản sắc sản phẩm ([`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) mục 1.2). Flutter: widget
  `TsuSignInScreen` của `tsudev_ui`; web: thành phần `SignIn` của `@tsudev/ui`.

- Khung `MUST` rộng tối đa **400px**, căn giữa, nền `bg-surface`, `radius-lg`,
  `shadow-md`, đệm trong 32px (24px ở màn hình dưới 480px).
- Nút nhà cung cấp `MUST` nằm **trên** biểu mẫu email. Đa số người dùng chọn
  đường đó; bắt họ cuộn qua biểu mẫu là ma sát vô ích.
- Lỗi `MUST` hiện ngay dưới ô sai, chữ 13px màu `danger`, kèm `aria-describedby`.
  Lỗi toàn biểu mẫu hiện ở một dải phía trên nút gửi, `role="alert"`.
- `MUST` có trạng thái đang xử lý cho nút gửi: vô hiệu nút, đổi nhãn thành
  `Đang đăng nhập...`, `MUST NOT` để bấm hai lần.
- Ô email `MUST` có `autocomplete="username"`, ô mật khẩu `autocomplete="current-password"`
  (đăng ký: `new-password`), `inputmode="email"`. Trình quản lý mật khẩu là đồng
  minh, không phải kẻ địch.
- Toàn bộ luồng `MUST` dùng được **chỉ bằng bàn phím**, thứ tự `Tab` đúng theo thứ
  tự nhìn thấy, vòng focus theo `DESIGN_SYSTEM.md` mục 5.
- `MUST` giữ hoạt động ở cả hai chế độ nền Sáng/Tối, logo theo
  [`BRAND_ASSETS.md`](BRAND_ASSETS.md) mục 4.

### 13.4. Ô đồng ý Điều khoản (từ v3.3.0)

- Màn đăng nhập/đăng ký `MUST` có ô *"Tôi đã đọc và chấp nhận Điều khoản dịch vụ và Chính sách quyền riêng tư."*,
  hai cụm là liên kết tới `/dieu-khoan` và `/quyen-rieng-tu` (mục 13.1). `MUST NOT` tích sẵn - Nghị định 13/2023/NĐ-CP
  đòi sự đồng ý rõ ràng, chủ động.
- Bấm một lối vào khi chưa tích ⇒ mở bảng dưới (bottom sheet) tóm tắt hai văn bản + nút **"Đồng ý và tiếp tục"** +
  "Huỷ". `MUST NOT` chỉ rung/đổi màu mà không nói lý do.
- IdP lưu `terms_version` + `privacy_version` + thời điểm đồng ý; văn bản đổi bản ⇒ hỏi lại ở lần đăng nhập kế tiếp.
- Chế độ khách (hạng C, mục 14) không bắt tích ô; dòng 12px dưới nút ghi "Dùng ngay nghĩa là bạn đồng ý Điều khoản".

### 13.3. Thông điệp

- `MUST` viết bằng tiếng Việt tự nhiên, nói người dùng **làm gì tiếp theo**.
- `MUST NOT` in mã lỗi kỹ thuật hay dấu vết ngăn xếp ra giao diện.
- Bảng thông điệp chuẩn, dùng nguyên văn:

| Tình huống | Nội dung |
| --- | --- |
| Sai email hoặc mật khẩu | `Email hoặc mật khẩu không đúng.` |
| Tài khoản bị khóa tạm | `Tài khoản tạm khóa do đăng nhập sai nhiều lần. Thử lại sau {n} phút.` |
| Chưa xác minh, còn hạn | `Tài khoản chưa xác minh. Còn {n} ngày trước khi bị hạn chế.` |
| Chưa xác minh, quá hạn | `Tài khoản đã bị hạn chế do chưa xác minh email. Xác minh để dùng lại đầy đủ.` |
| Gửi lại thư xác minh | `Đã gửi. Kiểm tra hộp thư của {email}, cả mục Spam.` |
| Quên mật khẩu | `Nếu email này có tài khoản, chúng tôi đã gửi hướng dẫn tới đó.` |

---

## 14. Sản phẩm chạy ngoại tuyến

Áp cho hạng C, và cho hạng B khi mất mạng.

### 14.1. Nguyên tắc

- Chức năng lõi `MUST` chạy đủ ở **chế độ khách**, không tài khoản, không mạng.
  Với `tsuswico`, rà quét và xuất báo cáo là chức năng lõi.
- Nút đăng nhập `MUST` nói rõ nó mở thêm gì. Ví dụ đúng: `Đăng nhập tài khoản
  tsudev để nhận huy hiệu và quyền lợi Pro`. Ví dụ sai: một nút `Đăng nhập`
  trống nghĩa.
- `MUST NOT` gọi mạng ngầm khi người dùng chưa đăng nhập. Phần mềm rà quét máy
  tính mà tự gọi ra ngoài là điều đầu tiên bị công cụ bảo mật gắn cờ, và đúng ra
  phải như vậy.
- `MUST` có công tắc **Chế độ ngoại tuyến hoàn toàn** trong Cài đặt, khi bật thì
  chặn mọi kết nối ra, kể cả kiểm tra bản cập nhật; khi đó mọi tính năng cần máy
  chủ tắt và bật lại chỉ sau khi qua cổng phiên bản ([`APP_INTEGRITY.md`](APP_INTEGRITY.md) mục 2.2).

### 14.2. Token khi ngoại tuyến

- Refresh token `MUST` lưu trong kho bí mật của hệ điều hành: Windows Credential
  Manager, macOS Keychain, Secret Service trên Linux. `MUST NOT` lưu vào tệp
  cấu hình, kể cả có mã hóa bằng khóa nằm cạnh nó.
- Ngoại tuyến, phiên `MAY` được coi là còn hiệu lực tối đa **7 ngày** kể từ lần
  xác thực trực tuyến gần nhất. Quá hạn thì `MUST` quay về chế độ khách, `MUST
  NOT` chặn chức năng lõi.
- Tài nguyên đã tải về `MUST` xóa được bằng một nút **Đăng xuất và xóa dữ liệu
  cục bộ**.

### 14.3. Mã cài đặt (từ v3.9.0)

Dùng để ghi nhận sản phẩm/thiết bị đã dùng và chống lạm dụng
([`PRODUCT_POLICY.md`](PRODUCT_POLICY.md) mục 7.7), không để định danh máy.

- `MUST` là chuỗi **ngẫu nhiên 128 bit** từ bộ sinh số ngẫu nhiên mật mã của nền
  tảng, mã hoá base64url không đệm, sinh ở **lần chạy đầu** và lưu cục bộ cùng
  chỗ với cài đặt của app. Gỡ cài đặt hoặc **Đăng xuất và xóa dữ liệu cục bộ**
  thì mất mã - lần sau sinh mã mới.
- `MUST NOT` suy ra từ IMEI, MAC, số sê-ri, Android ID, IDFV, mã quảng cáo, vân
  tay trình duyệt/phần cứng, hay bất kỳ giá trị nào sống lâu hơn bản cài.
- Chỉ gửi khi người dùng **đã đăng nhập**, trong header `X-Tsu-Installation` của
  các lượt gọi lấy quyền lợi (`/api/me/entitlements`, `/api/rp/entitlements/*`)
  và API của sản phẩm. Chưa đăng nhập ⇒ không gửi đi đâu (mục 14.1).
- Máy chủ chỉ lưu **HMAC-SHA-256** của mã với khoá bí mật phía máy chủ, trong
  bảng `AppInstallation {userId, clientId, installationIdHash, platform,
  lastSeenAt}`; JWS quyền lợi chỉ trả số đếm `devices_30d`, KHÔNG trả danh sách.
  Bản ghi không hoạt động quá 90 ngày `MUST` bị xóa.
- Header sai định dạng (không phải 22 ký tự base64url) ⇒ bỏ qua, không đếm,
  không làm hỏng lượt gọi.

### 14.4. Nhắc đăng nhập khi có internet (từ v3.5.0)

> Chủ dự án 26/11/2026, phiếu `20261126-LG3`. Áp cho **mọi** sản phẩm TsuDEV có giao diện người dùng (hạng A, B, C:
> web, app di động, desktop, trò chơi; CLI chỉ in một dòng gợi ý ở mục 14.4.6). Không áp cho thư viện và trang giới
> thiệu tĩnh.

**Mục đích** (khớp [`PRODUCT_POLICY.md`](PRODUCT_POLICY.md) mục 7.7): người dùng đã đăng nhập thì (1) khôi phục được
tài khoản và quyền lợi khi đổi máy/cài lại; (2) gửi báo cáo sự cố gắn với tài khoản, được hỗ trợ nhanh hơn; (3) máy chủ
đánh giá được trạng thái tài khoản (mục 9: vi phạm điều khoản/quy chế sử dụng ⇒ `suspended`) và chống lạm dụng. Nhắc
đăng nhập **không** biến đăng nhập thành bắt buộc: hạng C vẫn theo quy tắc cứng mục 1 (không chặn chức năng lõi), và
đăng nhập **không** đưa dữ liệu người dùng lên mạng (`PRODUCT_POLICY` 7.1 N2, [`LOCAL_SYNC.md`](LOCAL_SYNC.md)).

#### 14.4.1. Khi nào hiện (`MUST` đủ tất cả điều kiện)

| # | Điều kiện | Ghi chú kỹ thuật |
| :-: | --- | --- |
| R1 | Chưa đăng nhập, hoặc phiên ngoại tuyến đã quá 7 ngày (mục 14.2) | Đã đăng nhập ⇒ không bao giờ hiện |
| R2 | Thiết bị **đang có internet theo tín hiệu của hệ điều hành** | Android `ConnectivityManager` có `NET_CAPABILITY_VALIDATED`; iOS/macOS `NWPathMonitor` `.satisfied`; Windows `NetworkInformation.GetInternetConnectionProfile()` mức `InternetAccess`; Linux NetworkManager `Connectivity == FULL` (thiếu ⇒ coi như không mạng); web `navigator.onLine` + sự kiện `online`. `MUST NOT` tự gửi gói thăm dò tới tsudev.com hay bên thứ ba để biết có mạng (giữ mục 14.1 "không gọi mạng ngầm") |
| R3 | Không bật **Chế độ ngoại tuyến hoàn toàn** (mục 14.1) | Bật ⇒ không nhắc |
| R4 | Ở **điểm dừng tự nhiên**: không đang quét, ghi, nhập liệu dở, đồng bộ Tsu Link, phát/trình chiếu toàn màn hình, ván chơi đang diễn ra | Hàng đợi chờ tới điểm dừng kế tiếp; quá phiên chạy ⇒ bỏ lượt |
| R5 | Không phải ngay lần mở đầu: sớm nhất **30 giây** sau khi app sẵn sàng hoặc ngay sau tác vụ lõi đầu tiên hoàn tất | Người dùng phải thấy app dùng được trước |
| R6 | Đúng nhịp ở 14.4.2 và không có modal nào khác đang mở | Modal khoá cập nhật / "không chính thức" ([`APP_INTEGRITY.md`](APP_INTEGRITY.md)) luôn ưu tiên; không bao giờ chồng hai modal |

#### 14.4.2. Nhịp nhắc (chống làm phiền)

- Tối đa **một lần mỗi phiên chạy app** (web: mỗi tab, theo `sessionStorage`).
- Sau **Để sau**: lần 2 sau ≥ 24 giờ, lần 3 sau ≥ 3 ngày, từ lần 4 trở đi cách ≥ 7 ngày.
- **Không nhắc trong 30 ngày**: hoãn 30 ngày rồi quay lại nhịp 7 ngày.
- Đăng xuất chủ động ⇒ không nhắc trong 24 giờ.
- Trạng thái nhịp (`lastShownAt`, `dismissCount`, `snoozeUntil`) lưu **cục bộ** cùng cài đặt app; `MUST NOT` gửi số
  lần hiện/bỏ qua lên máy chủ hay công cụ phân tích nào. Xoá bởi **Đăng xuất và xóa dữ liệu cục bộ**.
- Hằng số nhịp `MUST` lấy từ thư viện chung (14.4.5), không tự đặt khác.

#### 14.4.3. Giao diện - modal nổi (nguyên văn)

| Thành phần | Tiếng Việt | English |
| --- | --- | --- |
| Tiêu đề | Đăng nhập để được hỗ trợ tốt hơn | Sign in for better support |
| Nội dung | Đăng nhập tài khoản TsuDEV, hoặc bằng Google, GitHub, Apple, giúp bạn khôi phục tài khoản và quyền lợi khi đổi máy, gửi báo cáo sự cố kèm tài khoản để được hỗ trợ nhanh hơn. Dữ liệu của bạn vẫn chỉ nằm trên thiết bị này - đăng nhập không tải dữ liệu lên mạng. | Sign in with your TsuDEV account, or with Google, GitHub or Apple, to restore your account and benefits on a new device and to send problem reports linked to your account for faster help. Your data stays on this device - signing in does not upload it. |
| Lối vào | Các nút ở mục 3 đúng thứ tự (Google, GitHub, Apple khi mục 3.2 áp dụng, Email TsuDEV, **Quét mã QR** theo [`CROSS_DEVICE_LOGIN.md`](CROSS_DEVICE_LOGIN.md)) | idem |
| Nút phụ | Để sau | Not now |
| Liên kết | Không nhắc trong 30 ngày · Vì sao nên đăng nhập? (mở `https://tsudev.com/privacy#dang-nhap`) | Don't remind me for 30 days · Why sign in? |
| Dòng nhận diện | Bạn sẽ đăng nhập tại **tsudev.com** | You will sign in at **tsudev.com** |

- `MUST` đóng được bằng nút X, phím Esc, nút Back (Android), chạm ra ngoài - đều tính là **Để sau**.
- `MUST NOT`: đếm ngược, khoá nền không cho dùng tiếp ở hạng C, ô tích sẵn, câu doạ/gây áp lực ("bạn sẽ mất dữ liệu"),
  nút "Để sau" mờ/nhỏ khó thấy, thưởng/phạt theo việc đăng nhập, quảng cáo trong modal (mẫu giao diện lừa dối).
- Trợ năng ([`ACCESSIBILITY.md`](ACCESSIBILITY.md)): `role="dialog"` + `aria-modal="true"` + `aria-labelledby`; bẫy
  tiêu điểm trong modal; tiêu điểm đầu vào nút **Đăng nhập** chính; đóng thì trả tiêu điểm về chỗ cũ; đi hết bằng bàn
  phím; tương phản theo token [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).
- Hạng A/B: chức năng **cần tài khoản** vẫn đi qua trang đăng nhập như cũ; modal này chỉ là lời nhắc, không thay thế.
- Ngoài modal, `MUST` luôn có lối đăng nhập cố định (Cài đặt › Tài khoản, hoặc ảnh đại diện góc trên) để người đã
  chọn "Không nhắc" vẫn tự đăng nhập được.

#### 14.4.4. Bảo mật của luồng đăng nhập mở từ modal

- Modal `MUST NOT` chứa ô nhập email/mật khẩu hay mã của bất kỳ nhà cung cấp nào. Bấm lối vào ⇒ mở luồng mục 4:
  Authorization Code + PKCE `S256`, `state` + `nonce`, qua **trình duyệt hệ thống** (Android Custom Tabs, iOS/macOS
  `ASWebAuthenticationSession`, desktop trình duyệt mặc định + vòng lặp `127.0.0.1`, RFC 8252). `MUST NOT` WebView nhúng.
  Mật khẩu chỉ gõ trên trang của IdP tsudev.com hoặc của Google/GitHub/Apple - chống trang giả mạo và đánh cắp mật khẩu.
- Phạm vi xin đúng mục 3.1 / `PRODUCT_POLICY` 7.7 (`openid email profile`; GitHub `read:user user:email`).
- Token cất trong kho bí mật hệ điều hành (mục 14.2), gắn khoá DPoP khi sản phẩm đã bật
  ([`SECURITY_BASELINE.md`](SECURITY_BASELINE.md) mục 6); mã cài đặt chỉ gửi sau khi đăng nhập (mục 14.3).
- **Trạng thái tài khoản do máy chủ quyết.** Sau đăng nhập và ở mỗi lần làm mới token, app đọc `status` (mục 9.2) từ
  IdP. `suspended`/`restricted` ⇒ hiện huy hiệu + lý do + đường khiếu nại (mục 8.4), áp hạn chế theo `403` + mã lý do của
  máy chủ (mục 10); app `MUST NOT` tự suy luận vi phạm ở máy khách. Hạng C bị `suspended` mất phần cộng thêm (huy hiệu,
  quyền lợi Pro, gửi báo cáo gắn tài khoản) nhưng vẫn dùng chức năng lõi và **Xuất dữ liệu**.
- Mọi lần đăng nhập ghi nhật ký an ninh phía máy chủ (`PRODUCT_POLICY` 7.7, IP rút gọn, ≤ 12 tháng); máy khách không
  ghi gì thêm.
- Luồng chưa đăng nhập vẫn tuân mục 14.1: trước khi người dùng bấm một lối vào, app `MUST NOT` gửi bất kỳ gói nào.

#### 14.4.5. Thư viện chung - không tự vẽ khác

| Nền tảng | Thành phần |
| --- | --- |
| Flutter | `tsudev_ui` `TsuSignInReminder` + `SignInReminderPolicy` (R1-R6, nhịp 14.4.2, nguyên văn 14.4.3) |
| Web (tsudev.com, PWA, website sản phẩm có tài khoản) | `@tsudev/ui` `<tsu-signin-reminder>` |
| .NET (WinUI/WPF), Tauri, C++ (MFC) | Dựng theo token + nguyên văn ở trên, dùng lại bộ test 14.4.7; khi có bản C ABI/TS chung ⇒ chuyển sang |

#### 14.4.6. Sản phẩm dòng lệnh (CLI)

Chế độ tương tác (TTY) và đủ R1-R3: in **một dòng** ra stderr, tối đa một lần mỗi 7 ngày:
`Gợi ý: chạy "<lệnh> login" để đăng nhập tài khoản TsuDEV (khôi phục quyền lợi, báo cáo sự cố).` Không in khi có
`--quiet`, `CI=true`, không phải TTY, hoặc biến `TSUDEV_NO_LOGIN_HINT=1`.

#### 14.4.7. Kiểm thử bắt buộc

Bổ sung ca 17 ở mục 16: không mạng / Chế độ ngoại tuyến hoàn toàn / đã đăng nhập ⇒ không hiện; đủ R1-R6 ⇒ hiện đúng một
lần mỗi phiên; nhịp 24 giờ → 3 ngày → 7 ngày và hoãn 30 ngày (đồng hồ giả lập); đang tác vụ ⇒ chờ điểm dừng; modal
khoá cập nhật đang mở ⇒ không chồng; Esc/Back/chạm ngoài = Để sau; không có lưu lượng mạng nào trước khi bấm lối vào
(đo bằng proxy hoặc mock HTTP); luồng mở bằng trình duyệt hệ thống có PKCE + `state`; tài khoản `suspended` ⇒ hạng C vẫn
dùng chức năng lõi và Xuất dữ liệu.

**Tuân thủ cửa hàng:** vì modal luôn bỏ qua được và chức năng không dựa trên tài khoản không bị chặn, cơ chế này khớp
App Store Review Guidelines 5.1.1(v) và chính sách Dữ liệu người dùng của Google Play; `STORE_SUBMISSION.md` không cần
khai thêm.

---

## 15. Chuẩn API

Mọi endpoint gắn phiên bản theo [`VERSIONING.md`](VERSIONING.md) mục 4.

```
POST   /api/v1/auth/register            đăng ký bằng email
POST   /api/v1/auth/login               đăng nhập bằng email
POST   /api/v1/auth/logout              thu hồi phiên hiện tại
POST   /api/v1/auth/refresh             xoay vòng token
GET    /api/v1/auth/providers           nhà cung cấp IdP đang bật (RP dựng nút từ đây)
GET    /api/v1/auth/providers/{p}       bắt đầu luồng OIDC (p = google|apple|github)
GET    /api/v1/auth/providers/{p}/callback
POST   /api/v1/auth/providers/apple/callback   Apple form_post (mục 3.2)
POST   /api/v1/auth/providers/apple/notifications   thông báo máy chủ tới máy chủ của Apple
POST   /api/v1/auth/verify/resend       gửi lại thư xác minh
POST   /api/v1/auth/verify/confirm      xác nhận token xác minh
POST   /api/v1/auth/password/forgot     yêu cầu đặt lại
POST   /api/v1/auth/password/reset      đặt mật khẩu mới
GET    /api/v1/me                       hồ sơ + trạng thái xác minh
PATCH  /api/v1/me                       sửa hồ sơ
GET    /api/v1/me/sessions              danh sách phiên
DELETE /api/v1/me/sessions/{id}         thu hồi một phiên
GET    /api/v1/me/identities            danh sách liên kết
DELETE /api/v1/me/identities/{id}       gỡ liên kết
POST   /api/v1/me/deletion              yêu cầu xóa tài khoản
DELETE /api/v1/me/deletion              hủy yêu cầu xóa
```

`GET /api/v1/me` `MUST` trả đủ khối trạng thái sau - giao diện dựa hoàn toàn vào
nó, `MUST NOT` để giao diện tự tính hạn:

```json
{
  "id": "018f...",
  "email": "nguoi.dung@vi.du",
  "display_name": "Người dùng",
  "avatar_url": "https://cdn.tsudev.com/avatars/018f....webp",
  "status": "active",
  "verification": {
    "state": "unverified",
    "verified_at": null,
    "grace_ends_at": "<ISO8601 UTC>",
    "days_remaining": 4,
    "restricted": false
  },
  "identities": ["google"],
  "two_factor_enabled": false
}
```

- `days_remaining` `MUST` do máy chủ tính. Đồng hồ máy khách sai là chuyện thường
  và nó sẽ sinh ra hai con số khác nhau ở hai chỗ.
- Mã lỗi `MUST` là chuỗi máy đọc được trong trường `code`, kèm `message` tiếng
  Việt để hiện thẳng ra giao diện.

---

## 16. Kiểm thử bắt buộc

Ngoài ngưỡng chung ở [`TESTING_QUALITY.md`](TESTING_QUALITY.md), luồng xác thực
`MUST` có test tự động cho đủ các ca sau. Đây là danh sách tối thiểu, không phải
danh sách đầy đủ.

1. Đăng ký, xác minh, đăng nhập - luồng thuận.
2. Token xác minh hết hạn, và token dùng lại lần hai.
3. Tài khoản chưa xác minh **trong** ân hạn: bị chặn đúng các thao tác ghi ở
   bảng mục 10.
4. Tài khoản chưa xác minh **quá** ân hạn: bị đẩy về trang xác minh.
5. Xác minh xong thì quyền khôi phục ngay, không cần đăng nhập lại.
6. Đăng nhập Google với `email_verified: false` **không** được gộp tự động.
7. Gỡ liên kết cuối cùng bị từ chối.
8. `state` sai hoặc thiếu ở đường quay về OIDC thì bị từ chối.
9. `?next=` trỏ ra ngoài tên miền bị từ chối.
10. Refresh token dùng lại lần hai thì cả cây phiên bị thu hồi.
11. Đăng nhập sai `n` lần thì bị khóa tạm và có độ trễ tăng dần.
12. Ít nhất một ca IDOR: người dùng A gọi `/api/v1/me/sessions/{id}` của B.
13. Thời gian phản hồi của `quên mật khẩu` không phân biệt email tồn tại hay
    không (chống dò tài khoản).
14. Toàn bộ luồng đăng nhập đi hết được chỉ bằng bàn phím.
15. Mã cài đặt (mục 14.3): sinh một lần, đủ 128 bit, không gửi khi chưa đăng
    nhập; máy chủ chỉ lưu HMAC; người dùng A không đọc được số thiết bị của B.
16. Apple (khi mục 3.2 áp dụng): callback `form_post` khớp `state` dù không có
    cookie `SameSite=Lax`; email `@privaterelay.appleid.com` không gộp tự động vào
    tài khoản có sẵn; thông báo `account-delete` gỡ liên kết; xoá tài khoản gọi
    `auth/revoke`.
17. Nhắc đăng nhập (mục 14.4.7): đủ các ca liệt kê ở đó, kể cả "không có lưu
    lượng mạng trước khi người dùng bấm lối vào".

---

## 17. Checklist nghiệm thu

- [ ] Đã ghi hạng sản phẩm (A/B/C) vào `README.md`.
- [ ] Ba lối vào đủ và đúng thứ tự (hạng A, B); có Apple nếu phát hành App Store (mục 3.2).
- [ ] Authorization Code + PKCE, có `state` và `nonce`, `redirect_uri` khớp tuyệt đối.
- [ ] Gộp tài khoản chỉ khi `email_verified` đúng.
- [ ] Không lộ tài khoản có tồn tại hay không, ở cả ba luồng.
- [ ] Huy hiệu trạng thái có đủ màu, chữ và icon; có dải thông báo khi chưa xác minh.
- [ ] Hạn 7 ngày là hằng số cấu hình được; có nhắc ngày 3, ngày 6 và khi hết hạn.
- [ ] Hạn chế được thi hành ở tầng máy chủ, trả `403` kèm mã lý do.
- [ ] Có trang phiên đăng nhập và nút đăng xuất khỏi mọi thiết bị khác.
- [ ] Đổi mật khẩu, đổi email, xóa tài khoản đều yêu cầu xác thực lại và gửi email.
- [ ] Có xuất dữ liệu và ân hạn xóa 30 ngày.
- [ ] Hạng C chạy đủ chức năng lõi ở chế độ khách, không gọi mạng ngầm.
- [ ] Token ngoại tuyến nằm trong kho bí mật của hệ điều hành.
- [ ] Mã cài đặt ngẫu nhiên 128 bit, không dùng định danh phần cứng (mục 14.3).
- [ ] Nhắc đăng nhập mục 14.4: dùng thành phần chung, đủ R1-R6, nhịp 14.4.2, nguyên văn 14.4.3, đóng được, không gọi
  mạng trước khi người dùng bấm lối vào; có lối đăng nhập cố định trong Cài đặt.
- [ ] Đủ các ca kiểm thử ở mục 16 (ca 16 khi bật Apple).
- [ ] Đường dẫn đúng mục 13.1.
- [ ] Bố cục mục 13.2 (v3.3.0), ô đồng ý mục 13.4 không tích sẵn, lối vào bổ sung mục 3.0 lấy từ IdP.
- [ ] Hạng A, B: "Quét để đăng nhập" đạt checklist [`CROSS_DEVICE_LOGIN.md`](CROSS_DEVICE_LOGIN.md) mục 9.
- [ ] `./scripts/check-standards.sh` đạt.

---

## 18. Tài liệu liên quan

- [`SECURITY_BASELINE.md`](SECURITY_BASELINE.md) mục 6 - mật khẩu, phiên, phân quyền
- [`ECOSYSTEM_IDENTITY.md`](ECOSYSTEM_IDENTITY.md) - trang hồ sơ, ảnh đại diện, tsudev.com
- [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) - token, component, trạng thái
- [`ACCESSIBILITY.md`](ACCESSIBILITY.md) - WCAG 2.1 AA
- [`DATA_TABLE.md`](DATA_TABLE.md) - bảng phiên đăng nhập, nhật ký kiểm toán
