# PHIẾU YÊU CẦU - TC1 (tsudev): danh bạ /apps và mô tả repo không nhắc tên dự án gốc

- **Mã phiếu**: 20261119-TC1 (phiếu con; phiếu tổng `~/projects/logs/handover/20261119-TC1_ten-goi-rieng-toan-he.md`)
- **Từ**: phiên tsufiles-3c, 19/11/2026, theo yêu cầu trực tiếp của chủ dự án
- **Đến**: phiên tsudev kế tiếp
- **Trạng thái**: MỞ

Chủ dự án 19/11: mọi sản phẩm hệ tsudev chỉ dùng tên gọi/nội dung/giao thức của chính nó; nội dung hiển thị không đề
cập tên gọi cũ (Filee/KnifeLemon, LocalSend/Tien Do Nam, TrafficMonitor). Ngoại lệ pháp lý (LICENSE/NOTICE giữ nguyên):
phiếu tổng mục 2.

## Việc (một PR, deploy sau khi gộp)

Đo bằng `python3 -I ~/projects/logs/tools/ra_ten_cu.py --dong tsudev ma-nguon build-ci-goi tai-lieu test` (19/11/2026):

| Chỗ                                                      | Hiện tại                                                                                                           | Hiển thị ở                                                                                                           |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `packages/ui/src/lib/ecosystem.ts:141,209,227` `basedOn` | `'TrafficMonitor'`, `'Filee'`, `'LocalSend'`                                                                       | thẻ app `/apps`: "Dựa trên …" (`apps/frontend-main/components/EcoAppCard.tsx:67`); ô tìm kiếm (`pages/apps.tsx:100`) |
| `packages/ui/src/lib/ecosystem.ts:135` tagline           | "… bản Việt hoá, gia cố bảo mật của TrafficMonitor."                                                               | `/apps`, chân trang                                                                                                  |
| `scripts/he-sinh-thai/metadata.json:23,27,37,51,58`      | "Fork of LocalSend", topic `localsend`, "Fork of Filee (MIT)", "edition of TrafficMonitor", topic `trafficmonitor` | mô tả + topic repo GitHub (script đồng bộ metadata)                                                                  |
| `docs/ban-quyen.md:23`                                   | "MIT - Filee gốc là MIT", "Anti-996 của TrafficMonitor gốc"                                                        | trang bản quyền nếu render                                                                                           |
| `scripts/he-sinh-thai/tin-hieu.mjs:63`                   | chú thích "Lotus Share từ LocalSend, tsudev-files từ Filee"                                                        | nội bộ - chú thích, sửa cho nhất quán                                                                                |

1. Bỏ trường `basedOn` khỏi kiểu `EcoApp` và ba app; bỏ dòng "Dựa trên" ở `EcoAppCard`, bỏ khỏi chuỗi tìm kiếm; cập nhật
   `packages/ui/test/ecosystem.test.ts`.
2. Tagline trafficmonitor: mô tả chức năng, không nhắc sản phẩm gốc (tên sản phẩm mới chờ phiếu con trafficmonitor -
   đừng tự đặt tên).
3. `metadata.json`: mô tả mới không có "Fork of …"; bỏ topic `localsend`, `trafficmonitor` (giữ topic chức năng như
   `file-sharing`, `network-monitor`); chạy script đồng bộ metadata cho 3 repo.
4. `docs/ban-quyen.md`: ghi giấy phép của từng sản phẩm (MIT, Apache-2.0, Anti-996) - không cần nêu tên dự án gốc; điều
   kiện giấy phép đã được giữ trong LICENSE của từng repo.
5. Nghiệm thu: chạy lại `ra_ten_cu.py` (0 dòng ngoài `logs/`); quét `/apps` sau deploy (`quet-giao-dien.cjs`).

## Trả lời

Ghi số PR + bảng `ra_ten_cu.py` trước/sau vào mục 6 phiếu tổng.
