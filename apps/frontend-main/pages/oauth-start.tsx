import { useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import { CONSOLE_URL, ID_URL, MAIN_URL } from '@tsudev/ui';

import { safeReturn } from '../lib/safeNext';

/**
 * Cầu OAuth (CP4a, lib/oauthBridge.ts). Nút Google/GitHub nằm ở cổng `id.`; callback đã đăng ký ở hai nhà cung cấp
 * vẫn là tsudev.com nên NextAuth của tsudev.com phải mở luồng. Trang này KHÔNG có ô nhập, nút hay hộp thoại nào -
 * chỉ gọi `signIn()` một lần rồi trình duyệt sang nhà cung cấp. Chuẩn "một cổng đăng nhập" giữ nguyên: giao diện
 * đăng nhập chỉ ở `id.`. Gỡ trang này ở CP4b khi callback trỏ về cổng.
 */
const PROVIDERS = new Set(['google', 'github']);

export default function OAuthStart() {
  const router = useRouter();
  const once = useRef(false);
  useEffect(() => {
    if (!router.isReady || once.current) return;
    once.current = true;
    const provider = typeof router.query.provider === 'string' ? router.query.provider : '';
    const back = safeReturn(
      router.query.callbackUrl,
      [MAIN_URL, CONSOLE_URL, ID_URL],
      `${ID_URL}/login`
    );
    if (!PROVIDERS.has(provider)) {
      window.location.replace(`${ID_URL}/login`);
      return;
    }
    void signIn(provider, { callbackUrl: back });
  }, [router.isReady, router.query.provider, router.query.callbackUrl]);

  return (
    <>
      <Head>
        <title>Đang chuyển tới nhà cung cấp đăng nhập - TsuDEV</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <main className="mx-auto max-w-md p-8 text-sm text-fg-secondary" aria-live="polite">
        Đang chuyển tới nhà cung cấp đăng nhập…
      </main>
    </>
  );
}
