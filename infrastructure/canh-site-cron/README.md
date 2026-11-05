# Worker canh site (`canh-site-cron`)

Một Cloudflare Worker có lịch, **0đ**, **không có kết nối Postgres** - tức nó vẫn
chạy đúng lúc database chết. Hai việc:

| Nhịp cron (UTC)     | Gọi gì                                    | Chạm DB? | Vì sao                                              |
| ------------------- | ----------------------------------------- | -------- | --------------------------------------------------- |
| `*/5 0-17,23 * * *` | `GET {BACKEND_URL}/health`                | Không    | Render free ngủ sau ~15 phút không có request       |
| `23 1,13 * * *`     | đếm nội dung thật của `SITE_URL` (`/dem`) | Không    | "site trả 200 mà trống" - sự cố từng sống HAI THÁNG |
| `23 1,13 * * *`     | hạn mức compute Neon (API điều khiển)     | Không    | cảnh báo TRƯỚC khi cạn 100 CU-giờ (§6.7)            |

Cả hai nghỉ 01:00-06:00 giờ Việt Nam (`0-17,23` UTC) để giữ giờ instance Render
dưới 750/tháng. Chi tiết và các hạn mức: [`docs/free-tier.md`](../../docs/free-tier.md).

⚠️ **Đừng đổi nhịp giữ ấm sang endpoint CHẠM DATABASE.** Truy vấn mỗi 5 phút =
compute Neon không bao giờ ngủ ⇒ vượt 100 CU-giờ/tháng ⇒ Neon treo ⇒ cả site
trống. `/health` của backend trả JSON tĩnh, không đụng Prisma.

## Tên: thư mục đã đổi, Worker CHƯA

Thư mục từng là `infrastructure/newsroom-cron` (nhịp đập của Toà soạn Agent AI,
gỡ 29/10/2026), đổi tên 05/11/2026 (kế hoạch Q4/2026 §8.5). **Tên Worker trên
Cloudflare vẫn là `tsudev-newsroom-cron`** - xem chú thích ở `wrangler.jsonc`:
đổi `name` là tạo Worker mới trong khi Worker cũ vẫn chạy cùng lịch.

## Phát hành

Chạy từ **gốc repo**, sau `npx wrangler whoami` (tài khoản chủ zone `tsudev.com`):

```bash
npm run cron:deploy
npm run cron:secret-telegram   # báo động khi đo nội dung TRƯỢT - thiếu = chỉ log
npm run cron:secret-neon       # NEON_API_KEY + NEON_PROJECT_ID - thiếu = bỏ qua cổng hạn mức
npm run cron:tail              # xem log trực tiếp
```

## Nghiệm thu

```bash
curl -s https://tsudev-newsroom-cron.<subdomain>.workers.dev/dem
# → 200 + {"dat": true, ...} khi site có nội dung; 503 khi TRƯỢT
```

`/tick` nay chỉ trả 410 kèm lời giải thích - Toà soạn đã gỡ.

## Cổng hạn mức Neon (§6.7)

`src/hanMuc.ts` đọc `compute_time_seconds` của dự án qua
`GET console.neon.tech/api/v2/projects/{id}` (control plane - KHÔNG đánh thức
compute) và báo động khi **đã tiêu ≥ 80%** hoặc **dự báo cuối kỳ ≥ 100%** theo
tốc độ từ đầu kỳ. Ngưỡng thứ hai là cái quan trọng: sự cố tháng 10 tiêu ~6
CU-giờ/ngày, tức tới ngày 10 mới 54% - một ngưỡng 80% đơn thuần chỉ kêu khi còn
vài ngày.

- `NEON_API_KEY`: Neon Console → Account settings → API keys.
- `NEON_PROJECT_ID`: Neon Console → Project settings → General (dạng `xxx-yyy-12345678`).
- Lỗi đọc API cũng báo động: cổng mù mà im lặng là cổng chết.

Render giờ instance và Workers AI Neuron **không** theo dõi được ở đây - lý do ở
đầu `hanMuc.ts`.

## Vì sao tách khỏi `apps/frontend-main`

`frontend-main` dựng bằng `opennextjs-cloudflare`; `.open-next/worker.js` là mã
sinh tự động chỉ có `fetch` handler. Nhét `scheduled` vào đó phải bọc entry của
open-next - một điểm sẽ vỡ ở mỗi lần nâng cấp. Tách ra còn nghĩa là: cron hỏng
thì trang web vẫn chạy, và deploy trang web không đụng tới cron.

## Khi cron chết

Cron chết là **mất cả hai việc**: Render ngủ _và_ không ai đo nội dung. Cả hai
đều im lặng. Nên vẫn dựng một giám sát ngoài (UptimeRobot free) trỏ vào
`https://tsudev-backend.onrender.com/health` - lưới an toàn cho lưới an toàn.
