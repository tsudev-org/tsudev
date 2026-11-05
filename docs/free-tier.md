# Ngân sách miễn phí - hạn mức nào, van ở đâu, vượt thì sao

Toàn bộ tsudev chạy trên gói miễn phí của bảy dịch vụ. Quy tắc của repo này:
**mọi thứ có thể sinh ra hoá đơn phải có một cái van trong mã, hoặc không được
dùng.** File này ghi các van đó nằm ở đâu và con số nào làm chúng đóng lại.

Số liệu trong bảng dưới được đọc từ trang giá chính thức ngày **18/08/2026**.
Nhà cung cấp đổi hạn mức mà không báo ai, nên khi con số quan trọng cho một
quyết định thì kiểm lại nguồn thay vì tin bảng này.

## Năm dịch vụ đang dùng

| Dịch vụ                        | Hạn mức miễn phí                                            | Vượt thì sao                                        | Van trong repo                                  |
| ------------------------------ | ----------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------- |
| Cloudflare Workers (site+cron) | 100.000 request/ngày · 10ms CPU mỗi lượt                    | request bị từ chối, không tính tiền                 | -                                               |
| Cloudflare R2                  | 10 GB-tháng · 1tr Class A · 10tr Class B · egress 0đ        | -                                                   | ảnh và tệp tải lên của site                     |
| Neon (Postgres)                | 0,5 GB · **100 CU-giờ/tháng** · 5 GB egress · không cần thẻ | **treo compute** tới đầu tháng sau, không tính tiền | cổng hạn mức Neon trong Worker cron (§6.7)      |
| Render (backend)               | **750 giờ instance/tháng cho CẢ workspace**                 | **tạm dừng mọi service free** tới đầu tháng sau     | đúng MỘT service trong `render.yaml`            |
| Resend (thư giao dịch)         | 3.000 thư/tháng · 100 thư/ngày · 1 tên miền                 | -                                                   | chỉ dùng cho xác minh email và đặt lại mật khẩu |

**GitHub Actions**: repo Public từ 21/08/2026, nên runner chuẩn không còn trần
2.000 phút/tháng của repo private. Đổi repo về private là trần đó quay lại - và
triệu chứng khi cạn không phải hoá đơn mà là **"CI không chạy nữa" ngay giữa một
đợt phát hành**.

Một lượt chạy đầy đủ tốn ~18 phút tính phí (tổng năm job), nên hạn mức này chỉ
đủ cho khoảng 110 lượt/tháng. Hai van đã lắp trong `.github/workflows/ci.yml`:

- `on.push` **chỉ nghe `main`**. Trước 19/08/2026 nó nghe cả `feat/**` trong khi
  `on.pull_request` nghe mọi PR, nên mỗi lượt đẩy một nhánh đang có PR sinh HAI
  lần chạy y hệt nhau. Đo trong tháng 8: 49 lượt do push + 28 lượt do
  pull_request, khoảng 360 phút đốt vô ích (~18% hạn mức).
- `concurrency` huỷ lượt đang chạy dở khi có lượt mới trên cùng nhánh - trừ
  `main`, nơi mỗi commit là một trạng thái đã phát hành.

⚠️ Một job TREO là khoản đắt nhất ở đây: trần mặc định của GitHub là 360 phút,
tức một job treo tiêu 18% hạn mức tháng mà không sinh kết quả nào. Đã xảy ra một
lần (18/08, job E2E). Thấy một job chạy quá gấp đôi thời gian bình thường thì
huỷ tay, đừng chờ nó tự hết giờ.

Điểm chung đáng mừng của cả bảng: **không dịch vụ nào tự động tính tiền khi
vượt.** Tất cả đều chặn hoặc treo. Nghĩa là rủi ro thật của dự án này không phải
"bị trừ tiền" mà là **"site chết cho tới đầu tháng sau"** - và hai ngân sách
dưới đây là hai chỗ chật nhất.

## Ngân sách chật số 1: Render, 589 trên 750 giờ

Render free ngủ sau ~15 phút không có request, nên có bộ giữ ấm gõ cửa mỗi 5
phút. Giữ ấm 24/7 gần như tiêu hết hạn mức, nên **cả hai nhịp cron đều nghỉ
01:00-06:00 giờ Việt Nam** (chốt 19/08/2026):

| Hình giữ ấm        | Giờ instance/tháng (31 ngày) | Còn lại trên hạn mức 750 |
| ------------------ | ---------------------------- | ------------------------ |
| 24/7               | 744                          | **6 giờ**                |
| nghỉ 5 giờ mỗi đêm | **~589**                     | **~161 giờ**             |

Cái giá đã chấp nhận: người truy cập đầu tiên sau khung nghỉ chờ cold start ~50
giây. Đổi lại, biên đủ rộng để một lần dựng lại service hay một đợt gỡ lỗi không
làm vỡ hạn mức của cả workspace.

⚠️ **Mọi nhịp gọi Render phải nghỉ CÙNG khung.** Thời Toà soạn có một nhịp
thứ hai cũng gọi Render: để nó chạy 24/7 thì mỗi giờ đêm Render lại thức ~15 phút và khung nghỉ
chỉ tiết kiệm được khoảng một phần tư số giờ ở bảng trên.

⚠️ **Cron của Cloudflare không có múi giờ - `0-17,23` là giờ UTC.** Khung nghỉ
01:00-06:00 giờ VN (UTC+7) viết ngược lại thành "chạy ở giờ UTC 0-17 và 23". Đọc
nhầm nó thành giờ VN là đặt khung nghỉ vào đúng giờ cao điểm.

Hệ quả phải nhớ trước khi động vào Render:

- **Không được có service free thứ hai chạy liên tục.** Hạn mức tính cho cả
  workspace. Thêm một service chạy vài giờ trong tháng 31 ngày là vượt, và khi
  vượt thì Render tạm dừng **mọi** service free - kể cả `tsudev-backend`.
- `tsudev-backend-rqkz` (HANDOFF §1.10) chưa bao giờ khởi động nổi nên **không**
  tiêu giờ instance. Nó vẫn nên bị xoá, nhưng nó không phải nguồn rủi ro ở đây.
- Khung nghỉ đêm ở trên là **van duy nhất** còn lại cho ngân sách này. Muốn hẹp
  lại (nghỉ ít giờ hơn) thì phải trả bằng biên an toàn; muốn rộng ra thì trả
  bằng số giờ khách gặp cold start.

## Ngân sách chật số 2: Neon, 100 CU-giờ/tháng

Đây là hạn mức **dễ vỡ nhất và khó thấy nhất** của cả dự án, vì nó không tính
theo dung lượng hay số truy vấn mà theo **thời gian compute còn thức**.

Neon free tự ngủ sau ~5 phút không có truy vấn. Một compute 0,25 CU thức 24/7
tiêu `0,25 × 744 = 186` CU-giờ trong tháng 31 ngày - **gần gấp đôi hạn mức 100**.
Vượt là Neon treo compute tới đầu tháng sau, và lúc đó **cả site chết**, không
riêng phần nào.

Cái làm compute thức 24/7 không phải người dùng thật (site cá nhân, lưu lượng
thưa) mà là **cron gọi vào một endpoint có truy vấn database đúng mỗi 5 phút** -
tức là đánh thức lại ngay trước mỗi lần Neon định ngủ.

### 🔴 Nhịp thứ hai ĐÃ BỊ GỠ 29/10/2026

Worker cron nay có **hai nhịp, và điểm khác nhau là CHẠM DATABASE hay không**:

| Nhịp cron (UTC)     | Gọi gì            | Chạm DB?                     | Việc                  |
| ------------------- | ----------------- | ---------------------------- | --------------------- |
| `*/5 0-17,23 * * *` | `GET /health`     | Không (JSON tĩnh)            | giữ ấm Render         |
| `23 1,13 * * *`     | 6 trang công khai | **Có** - nên chỉ 2 lượt/ngày | **cổng đếm nội dung** |

Nhịp thứ hai thêm ngày 29/10/2026: nó đo xem người lạ mở tsudev.com lúc này thì
THẤY được mấy bài, và báo động Telegram khi rỗng. Đó là bản chạy tự động của
`npm run prod:dem-noi-dung` - cổng đã tồn tại nhưng **không có gì chạy nó**, và
một cổng không chạy tự động thì không phải cổng.

🔴 **HAI LƯỢT MỘT NGÀY, VÀ ĐỪNG DÀY HƠN.** Các trang nó đo là SSR: mỗi lượt fetch
đi Worker → Render → Neon và giữ Neon thức thêm ~5 phút. Cắm nó vào nhịp 5 phút =
288 lượt/ngày = Neon không bao giờ ngủ = ~186 CU-giờ/tháng trên hạn mức 100 ⇒
**đúng cái bẫy đã làm site trống hai tháng, chỉ lần này do chính cổng canh gây
ra.** Hai lượt/ngày ≈ 5 CU-giờ/tháng.

Dày lên được CHỈ KHI đường đọc đã cache ở biên (`docs/refactor-tsudev-2026-q4.md`
§6.2-6.3), lúc đó các trang này không còn chạm Neon.

Giờ 1 và 13 UTC đều nằm TRONG khung thức (0-17), nên lượt đo không đánh thức
Render khỏi khung nghỉ - nếu không thì mỗi lượt lại cộng ~15 phút giờ instance.

Nhịp `"7 0-17,23 * * *"` - nhịp đập của Toà soạn Agent AI, gọi
`POST /api/newsroom/tick` và **CÓ** truy vấn database - đã bị gỡ cùng toàn bộ cơ
chế Toà soạn (`docs/refactor-tsudev-2026-q4.md` §8).

**Hệ quả lớn hơn việc bớt một nhịp**: nó là **nguồn đánh thức Neon theo LỊCH duy
nhất** của cả hệ thống. Gỡ nó, cộng với bản vá vòng poll 3 giây của
`/admin/newsroom` (phát hành 29/10), thì **không còn gì đánh thức database theo
lịch nữa** - Neon chỉ thức khi có người thật dùng trang quản trị hoặc khi dựng
lại cache.

Đó là đòn trực tiếp vào ngân sách 100 CU-giờ của mục này, và nó làm con số dưới
đây gần như không còn ý nghĩa thực tế.

⚠️ **ĐỪNG đổi nhịp giữ ấm sang một endpoint chạm database** "cho chắc là backend
còn sống". `GET /health` của `backend-bundle` trả JSON TĨNH, không đụng Prisma -
đó là lý do nó được chọn. Đổi sang một đường dưới `/api/` là dựng lại đúng cái
bẫy vừa gỡ, ở dạng dày hơn 12 lần.

Cổng canh: `apps/frontend-main/test/cronContract.test.ts`, 9 khẳng định (bị mất
cùng `newsroom-service` ở PR #99, khôi phục 05/11/2026).
Ba cái quan trọng nhất đều đã được chứng minh ĐỎ bằng cách tái tạo lỗi thật:

| khẳng định                                   | tái tạo lỗi gì để chứng minh    |
| -------------------------------------------- | ------------------------------- |
| nhịp đếm chạy tối đa 4 lượt/ngày             | dày hoá nó thành `*/5`          |
| nhịp đếm chạy TRONG khung thức Render        | đặt nó vào `19,20` (khung nghỉ) |
| bảng ngưỡng không trôi lệch khỏi script Node | đổi một ngưỡng của Worker       |

Cộng với: nhịp GIỮ ẤM chỉ gọi `/health`, và `TICK_CRON` không còn tồn tại.

⚠️ **Báo động hiện CHƯA được cấu hình** (đo 05/11/2026). `TELEGRAM_BOT_TOKEN` và
`TELEGRAM_CHAT_ID` chưa đặt, nên cổng chỉ `console.error` - đọc được bằng
`npm run cron:tail`. Bật bằng `npm run cron:secret-telegram`.

**Cổng hạn mức Neon** (§6.7, `infrastructure/canh-site-cron/src/hanMuc.ts`) chạy
cùng nhịp đếm, đọc CU-giờ đã tiêu qua API điều khiển của Neon (không đánh thức
compute) và báo động khi đã tiêu ≥ 80% hoặc DỰ BÁO cuối kỳ ≥ 100%. Cần
`npm run cron:secret-neon`; thiếu thì Worker log rõ và bỏ qua.

<details>
<summary>Lập luận cũ về kiến trúc hai nhịp, giữ lại vì nó giải thích vì sao nhịp giữ ấm phải trỏ `/health`</summary>

Worker cron từng chạy **hai nhịp, gọi hai endpoint khác nhau**:

⚠️ **Đừng gộp hai nhịp lại làm một** vì thấy "cùng là gõ cửa backend". Đó đúng
là hình dạng ban đầu của Worker này, và nó sẽ làm site chết vào khoảng giữa
tháng thứ hai - đủ xa lần sửa để không ai nối được nhân quả.

</details>

### 🔴 Cron KHÔNG phải nguồn đánh thức duy nhất - TRÌNH DUYỆT cũng đánh thức

Bảng hai nhịp ở trên là một kiến trúc đúng, và nó bị vượt qua từ một hướng mà
chính tài liệu này không canh.

(Lịch sử - trang này đã gỡ cùng Toà soạn, nhưng bài học vẫn áp cho mọi trang
quản trị mới.) `apps/frontend-main/pages/admin/newsroom.tsx` poll `GET /api/newsroom/state` -
một endpoint **CHẠM DATABASE** - và bản đầu của nó là `setInterval(load, 3000)`
trần, không điều kiện dừng nào. Một tab trang đó bị bỏ quên là:

|          |                                                                                                    |
| -------- | -------------------------------------------------------------------------------------------------- |
| nhịp     | 3 giây                                                                                             |
| mỗi giờ  | 1.200 truy vấn                                                                                     |
| mỗi ngày | 28.800 truy vấn, **24/7**                                                                          |
| hệ quả   | Neon **không bao giờ** tự ngủ ⇒ `0,25 × 744 = 186` CU-giờ/tháng trên hạn mức 100 ⇒ vỡ sau ~17 ngày |

Và lúc vỡ thì hỏng im lặng: backend `/health` vẫn 200 (nó trả JSON tĩnh),
`lib/api.ts` nuốt lỗi database thành giá trị rỗng, nên **mọi trang công khai trả
200 với nội dung trống**. Đo ngày 28/10/2026: `/sitemap.xml` còn 7 URL tĩnh,
`/feed.xml` 0 item, `/blog` hiện "Chưa có bài viết." trong khi `logs/STATE.md`
ghi 50 bài ngày 27/08.

Vòng poll nay có **ba van**, và cả ba đều cần:

1. **Tab bị ẩn ⇒ dừng HẲN chuỗi.** Không phải "hẹn lại cho có" - trình duyệt tiết
   chế timer ở tab nền nhưng KHÔNG dừng `fetch`, nên hẹn-lại-cho-có vẫn đánh thức.
2. **Không có tương tác trong 10 phút ⇒ dừng hẳn**, hiện nút "Theo dõi lại". Đây
   là van duy nhất chặn được đúng tình huống đã xảy ra: tab MỞ, HIỆN, và không ai
   ngồi trước nó.
3. **Gọi lỗi ⇒ giãn ra 15 giây.** Backend chết thì đừng dồn thêm.

**Bài học chung**: khi kiểm "cái gì đang đánh thức Neon", đừng chỉ đọc
`wrangler.jsonc`. Ba nguồn đánh thức, chỉ một nằm trong cron:

| nguồn                                  | ở đâu                                          | canh bằng gì                                                                                   |
| -------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| cron theo lịch                         | `infrastructure/canh-site-cron/wrangler.jsonc` | `apps/frontend-main/test/cronContract.test.ts`                                                 |
| **vòng poll của trình duyệt**          | `pages/admin/*.tsx` - tìm `setInterval`        | **đọc mã, chưa có cổng tự động**                                                               |
| `setInterval` trong tiến trình backend | `services/*/src/*.ts`                          | đọc mã; `trust-service/src/recheck.ts` từng có một cái (360 phút) - gỡ cùng Con dấu 04/11/2026 |

Và cổng đo được hậu quả, không đo nguyên nhân: **`npm run prod:dem-noi-dung`**.
Nó gọi production từ bên ngoài, không cần `DATABASE_URL` - nên nó vẫn trả lời
được đúng lúc database chết, tức đúng lúc cần nhất. Có mã thoát 0/1/2.

Ba bảng phình nhất (`DraftRevision` · `NewsroomEvent` · `AgentRun`) đã DROP cùng
Toà soạn (04/11/2026), và lệnh dọn `db:don-toa-soan` gỡ theo. Nhớ: **dọn dữ liệu
KHÔNG chữa được hạn mức compute** - dung lượng và CU-giờ là hai hạn mức khác
nhau cần hai cách chữa trái ngược; đọc Neon console → Usage trước khi xoá gì.

## Danh sách cấm - làm là mất "0đ"

- **Thêm service free thứ hai trên Render** (xem ngân sách số 1).
- **Đặt cron trong GitHub Actions.** Nếu repo quay về private, mỗi lượt chạy
  tính tối thiểu 1 phút ⇒ ~8.600 phút/tháng trên hạn mức 2.000. Việc giữ ấm đã
  có Worker cron lo, miễn phí thật.
- **Thêm binding Cloudflare cần gói trả tiền** (Queues là ví dụ rõ nhất). Cả hai
  `wrangler.jsonc` của repo hiện chỉ khai `vars`, `routes`, `triggers`,
  `observability`, và (frontend, từ 05/11/2026) binding R2
  `NEXT_INC_CACHE_R2_BUCKET` + service binding `WORKER_SELF_REFERENCE` cho ISR -
  cả hai có trên gói Free. Hàng đợi ISR là `memoryQueue`, CỐ Ý không phải Queues.

## Tự kiểm mỗi tháng

Năm phút, làm vào đầu tháng:

```bash
# 1. Không có binding tính tiền nào mọc thêm trong hai wrangler.jsonc
grep -n "queues\|durable_objects\|hyperdrive\|d1_databases" \
  apps/frontend-main/wrangler.jsonc infrastructure/canh-site-cron/wrangler.jsonc
# → không ra dòng nào

# 2. Site còn nội dung thật (cũng là thứ Worker cron đo hai lần/ngày)
npm run prod:dem-noi-dung

# 3. Cron còn sống - nếu chết thì Render ngủ và không ai đo nội dung, cả hai im lặng
npm run cron:tail
```

Ba thứ phải nhìn bằng mắt trên trang quản trị của nhà cung cấp, không có lệnh
nào thay được:

- **Neon** - đồ thị CU-giờ đã tiêu trong tháng. Đây là con số cần nhìn trước
  tiên; mọi thứ khác còn xa hạn mức hơn nó.
- **Render** - giờ instance đã tiêu của workspace, và **số service đang tồn tại**.
- **Cloudflare** - dung lượng R2 (tệp phát hành tích luỹ; trần 10 GB-tháng) và
  Class A/B ops của bucket `tsudev-next-cache` (ISR).
