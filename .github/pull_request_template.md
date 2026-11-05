## Tóm tắt

<!-- Đổi gì, vì sao. Đóng phiếu/việc nào trong logs/. -->

## Đã kiểm

- [ ] `npm run format:check` · `npm run lint` · `npm run typecheck`
- [ ] Test của workspace đã sửa (`npm --workspace <tên> test`)
- [ ] `npm run topology:check` · `npm run tokens:check` · `npm run icons:check` (nếu đụng vùng đó)

## Rà theo CLAUDE.md (đánh dấu mục ÁP DỤNG, xoá mục không liên quan)

- [ ] Đổi `schema.prisma` ⇒ đã chạy `npm run db:generate`; migration MỚI (không sửa file cũ)
- [ ] Có migration ⇒ `db:migrate` lên Neon TRƯỚC khi merge (có DROP ⇒ `pg_dump` trước)
- [ ] Thêm route backend ⇒ tiền tố có trong bảng của `services/backend-bundle/src/index.ts`
- [ ] Thêm endpoint trình duyệt gọi ⇒ đã mở rộng proxy `apps/*/pages/api/<domain>/[...path]`
- [ ] Route ghi mới tự gọi `requireAdmin()`/`requireRole()` (không dựa vào middleware)
- [ ] Sửa `packages/trust-crypto/src/lib.rs` ⇒ đã dựng lại và commit `.wasm`
- [ ] Đổi token màu ⇒ sửa `tokens/extensions.tsudev-web.json` rồi `npm run tokens:sync`
- [ ] Xoá service/thư mục ⇒ đã chuyển các test nằm trong nó mà canh thứ ở ngoài
- [ ] Không có em-dash (U+2014), không có secret thật trong file theo dõi
- [ ] Cần deploy/việc tay sau merge ⇒ ghi vào phiếu bàn giao

## Rủi ro và cách lùi

<!-- Cái gì có thể hỏng ở production, nhận ra bằng gì, lùi thế nào. -->
