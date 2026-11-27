# PHIẾU BÀN GIAO - Thu gọn CLAUDE.md/AGENTS.md theo standards v8.1.0 mục 4.3

- **Mã phiếu**: 20261126-CTX1
- **Từ**: phiên cấu hình máy (projects-dc) - **Đến**: phiên đang làm ở repo `tsudev`
- **Thời điểm**: 17:44 26/11/2026
- **Trạng thái**: MỞ
- **Nhánh git**: tự chọn nhánh riêng (vd. `chore/ctx1-thu-gon-claude-md`)

## 0. Bối cảnh

Chủ dự án 26/11/2026 chuẩn hoá quy trình mô hình + Phase + ngữ cảnh cho mọi phiên trên máy (`~/.claude/CLAUDE.md`
mục "Mô hình + chu trình Phase"; tsudev-standards v8.1.0 `AGENT_PROTOCOL.md` mục 4.1-4.3). `CLAUDE.md` nạp vào MỌI
lượt của MỌI phiên; tài liệu Claude Code khuyến nghị dưới 200 dòng (dài hơn tốn token và giảm mức tuân thủ).
Hiện trạng: `CLAUDE.md` 383 dòng/30KB (mục "Gotcha cứng" dòng 187-363 chiếm ~176 dòng), `AGENTS.md` 260 dòng.

## 2. Việc cần làm + tiêu chí xong

- [ ] Lên Opus (`EnterPlanMode`) lập phương án tách - KHÔNG được làm mất quy tắc nào.
- [ ] `CLAUDE.md` còn dưới 200 dòng: giữ bản đồ, lệnh chạy, quy tắc cứng toàn repo, trỏ đường dẫn tới phần đã tách.
- [ ] "Gotcha" theo vùng mã chuyển sang `.claude/rules/<vùng>.md` có frontmatter `paths:` (glob đúng vùng) - chỉ nạp
      khi agent đọc/sửa tệp khớp. Quy trình dùng thỉnh thoảng (deploy, phát hành) chuyển thành skill
      `.claude/skills/<tên>/SKILL.md` hoặc tài liệu trong `docs/` được trỏ tới.
- [ ] Ghi chú chỉ dành cho người bảo trì: bọc `<!-- -->` (không tốn token).
- [ ] Thêm mục `# Compact instructions` riêng của repo nếu có điều cần giữ khi nén (lệnh test, cổng kiểm...).

- [ ] Kiểm chứng: `wc -l CLAUDE.md` < 200; mở phiên mới, `/memory` thấy rules; sửa thử 1 tệp trong vùng thấy rule nạp.
- [ ] Ghi kết quả vào chính phiếu này, cập nhật STATE.
