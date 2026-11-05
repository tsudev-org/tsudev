import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

/**
 * Trang ISR nhận `failed: true` CHỈ có thể là bản dựng lúc build: lúc chạy,
 * `keepStaleOnFailure` NÉM thay vì trả props lỗi (lib/isr.ts). Bản build rỗng vì
 * máy build không có token production, và nó được đẩy lên R2 ở mỗi lần deploy.
 *
 * Hook này nạp lại dữ liệu của trang (router.replace → /_next/data, không tải lại
 * cả trang) sau vài giây - lúc đó lượt xem đầu đã kích hoạt dựng lại bản thật.
 * Tối đa MAX_TRIES lần, nhớ qua sessionStorage để không vòng lặp vô hạn khi
 * backend chết thật. Trả về `true` khi đang thử - để trang nói "đang cập nhật"
 * thay vì "không tải được".
 */
const DELAY_MS = 2500;
const MAX_TRIES = 3;

export function useRecoverBuildPlaceholder(failed: boolean): boolean {
  const router = useRouter();
  const [trying, setTrying] = useState(false);

  useEffect(() => {
    if (!failed) return;
    const key = `tsu-isr-retry:${router.asPath}`;
    let tries = 0;
    try {
      tries = Number(sessionStorage.getItem(key) || 0);
    } catch {
      /* sessionStorage có thể bị chặn - vẫn thử một lần */
    }
    if (tries >= MAX_TRIES) return;
    setTrying(true);
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem(key, String(tries + 1));
      } catch {
        /* như trên */
      }
      router.replace(router.asPath, undefined, { scroll: false }).finally(() => setTrying(false));
    }, DELAY_MS * (tries + 1));
    return () => clearTimeout(t);
    // `router` cố ý không nằm trong deps: nó đổi định danh sau mỗi lần replace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failed]);

  return trying;
}
