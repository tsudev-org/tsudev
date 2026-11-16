# ADR-0001: Trình soạn bài - Tiptap 3 xuất Markdown, `contentMd` là nguồn sự thật duy nhất

- **Ngày**: 14/11/2026 (phiên 53)
- **Trạng thái**: CHẤP NHẬN (quyết định D3, `docs/de-xuat-bao-mat-cms-cai-bang-lenh.md`)

## Bối cảnh

CMS "Viết bài" (P2) cần trình soạn trực quan theo `.standards/docs/RICH_TEXT_EDITOR.md`. Bài, tài liệu, render
công khai, ISR và chỉ mục tìm kiếm bỏ dấu (`searchBodyNorm`) đều dựa trên cột `Post.contentMd` (Markdown).

## Quyết định

- **Tiptap 3** (⭐ của RICH_TEXT_EDITOR.md) + extension **`@tiptap/markdown` chính thức**, ghim chính xác 3.32.2
  (bản mới nhất đủ 14 ngày tuổi lúc chọn). Vào/ra đều là Markdown: `contentType: 'markdown'` + `editor.getMarkdown()`.
- `contentMd` vẫn là nguồn sự thật DUY NHẤT. Không lưu JSON ProseMirror song song.
- Thanh công cụ CHỈ có định dạng Markdown biểu diễn được: đậm, nghiêng, gạch ngang, mã, H2-H4, danh sách, trích
  dẫn, khối mã, phân cách, liên kết, ảnh (bắt buộc văn bản thay thế), hoàn tác/làm lại, đếm từ tiếng Việt.

## Đã bác

| Phương án                                          | Vì sao bác                                                                                                                                                                                                                                                             |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lưu song song JSON + Markdown                      | Hai nguồn sự thật lệch nhau IM LẶNG (cùng loại lỗi bản sao token v1.0.0 đã trả giá - CLAUDE.md)                                                                                                                                                                        |
| Chuyển hẳn sang JSON/HTML                          | Phải chuyển dữ liệu cũ, viết lại render công khai + chỉ mục tìm kiếm + ISR                                                                                                                                                                                             |
| Bật màu chữ, căn lề, gạch chân (mức `M` của chuẩn) | Markdown không lưu được: nút bấm được mà lưu xong biến mất là lỗi im lặng tệ hơn không có nút. Đây là **ngoại lệ có chủ đích** với RICH_TEXT_EDITOR.md mục 3.1/3.3 - đề xuất ghi vào chuẩn: "nội dung lưu Markdown thì chỉ bắt buộc định dạng Markdown biểu diễn được" |

## Hệ quả

- Render công khai, ISR, tìm kiếm không đổi một dòng.
- Bảng (mục 4 của chuẩn) chờ extension bảng GFM của Tiptap; tới lúc đó bảng viết bằng cú pháp Markdown trong khối.
- **Gõ tiếng Việt** (tiêu chí mục 11 của chuẩn): 16/11/2026 có E2E `e2e/tests/vi-ime.spec.js` (chạy trong CI, PR #277)
  GIẢ LẬP hai cơ chế đưa chữ vào ô soạn: kiểu Unikey/EVKey (xoá lùi + chèn lại âm tiết có dấu, Telex
  `Tieesng Vieejt cos daaus` ⇒ `Tiếng Việt có dấu.`) và kiểu ibus-bamboo (composition/preedit qua CDP
  `Input.imeSetComposition` ⇒ `tiếng Việt được.`). Cả hai ĐẠT: không mất ký tự, không nhân đôi, gõ tiếp vào đúng
  cuối. Kiểm bằng bộ gõ THẬT trên máy người: CHƯA làm (máy agent và CI không có bộ gõ; cài binary bị chặn) - ghi kết
  quả vào đây khi làm.
