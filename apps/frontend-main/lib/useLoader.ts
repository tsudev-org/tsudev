import { useEffect } from 'react';

/**
 * Chạy hàm nạp dữ liệu mỗi khi định danh của nó đổi (tức là khi deps của
 * `useCallback` bọc nó đổi: trang, cỡ trang, bộ lọc...), và chỉ khi `enabled`.
 *
 * Thay cho mẫu cũ `useEffect(() => { load() }, [load])` mà
 * `eslint-plugin-react-hooks` 7 (`set-state-in-effect`) cấm, và sửa luôn lỗi mẫu
 * cũ mang theo: đổi trang nhanh hai lần thì phản hồi của lần đầu có thể về SAU
 * lần hai và ghi đè bảng bằng dữ liệu cũ. Ở đây mỗi lượt nạp nhận một
 * `AbortSignal`; lượt kế tiếp (hoặc rời trang) huỷ nó.
 *
 * Hợp đồng của `load`: truyền `signal` vào `fetch` khi gọi thẳng, và sau MỖI
 * `await` kiểm `signal?.aborted` trước khi ghi state. `signal` là tuỳ chọn để
 * cùng hàm đó dùng được cho nút "tải lại" sau một thao tác ghi.
 */
export function useLoader(load: (signal?: AbortSignal) => unknown, enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled) return;
    const ac = new AbortController();
    Promise.resolve()
      // Một nhịp microtask: lượt dựng kép của StrictMode huỷ ngay lượt đầu, và
      // khi đó không có gì được bắt đầu - kể cả setLoading(true) đầu hàm nạp.
      .then(() => (ac.signal.aborted ? undefined : load(ac.signal)))
      .catch((e: unknown) => {
        // Lỗi do chính lượt huỷ gây ra (fetch ném AbortError) là dự kiến.
        if (!ac.signal.aborted) throw e;
      });
    return () => ac.abort();
  }, [load, enabled]);
}

/** `true` khi lỗi là do yêu cầu bị huỷ - không phải lỗi để báo người dùng. */
export function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}
