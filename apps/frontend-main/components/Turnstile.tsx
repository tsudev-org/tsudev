import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useLoader } from '../lib/useLoader';

/**
 * Widget Cloudflare Turnstile (P1.7, D9) cho đăng ký, quên mật khẩu, đăng nhập
 * sau 3 lần sai. Token đi trong thân request (`turnstileToken`); auth-service kiểm
 * bằng siteverify. Widget CHỈ phát token - tự nó không chặn gì.
 *
 * Chưa cấu hình site key ⇒ không vẽ gì (auth-service khi đó cũng bỏ qua).
 * Script nạp từ challenges.cloudflare.com - đã có trong CSP (`proxy.ts`).
 */
type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptLoading: Promise<TurnstileApi> | null = null;

function loadScript(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptLoading) {
    scriptLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SCRIPT;
      s.async = true;
      s.onload = () =>
        window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile'));
      s.onerror = () => {
        scriptLoading = null;
        reject(new Error('turnstile'));
      };
      document.head.appendChild(s);
    });
  }
  return scriptLoading;
}

export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  // Giữ hàm mới nhất mà không phải vẽ lại widget mỗi lần trang dựng lại.
  const tokenCb = useRef(onToken);
  useEffect(() => {
    tokenCb.current = onToken;
  }, [onToken]);

  const loadKey = useCallback(async (signal?: AbortSignal) => {
    const r = await fetch('/api/turnstile-site-key', { signal }).catch(() => null);
    if (signal?.aborted || !r?.ok) return;
    const data = (await r.json().catch(() => ({}))) as { siteKey?: string | null };
    if (signal?.aborted) return;
    setSiteKey(data.siteKey || null);
  }, []);
  useLoader(loadKey, true);

  useEffect(() => {
    if (!siteKey || !box.current) return;
    let id: string | null = null;
    let gone = false;
    const el = box.current;
    loadScript()
      .then((api) => {
        if (gone) return;
        id = api.render(el, {
          sitekey: siteKey,
          language: 'vi',
          theme: 'auto',
          callback: (t: string) => tokenCb.current(t),
          'expired-callback': () => tokenCb.current(''),
          'error-callback': () => tokenCb.current(''),
        });
      })
      .catch(() => {
        // Không nạp được script (chặn quảng cáo, mạng): form vẫn gửi được, máy
        // chủ trả `turnstile_failed` và trang nói rõ lý do.
      });
    return () => {
      gone = true;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={box} className="min-h-[65px]" aria-label="Kiểm tra chống bot" />;
}
