import React, { useRef, useState } from 'react';
import { Button, Input, Modal } from '@tsudev/ui';

import { isStepUpRequired, requestStepUp } from '../lib/mfa';

/**
 * Xác thực lại (step-up) dùng chung cho các trang của CHÍNH tài khoản (P1.3):
 * đổi email, đổi mật khẩu, tắt TOTP, xoá passkey, tạo lại mã dự phòng.
 *
 * Cách dùng:
 *   const { run, dialog } = useStepUp();
 *   const r = await run('Tắt 2FA', (stepUp) => post('totp/disable', { password, stepUp }));
 *   if (!r) return; // người dùng huỷ hộp nhập mã
 *
 * `run` gọi thao tác NGAY (tài khoản chưa có TOTP thì máy chủ không đòi gì); chỉ
 * khi máy chủ trả 401 `STEP_UP_REQUIRED` mới mở hộp nhập mã, đổi mã lấy token
 * rồi chạy lại ĐÚNG thao tác đó. Token giữ trong bộ nhớ trang (KHÔNG
 * localStorage), vài thao tác liền nhau không phải gõ lại; máy chủ vẫn là nơi
 * quyết định hạn.
 */
type Res = { status: number; data: unknown };
type Cached = { token: string; expiresAt: number };

/** Còn dùng được (chừa 15 giây cho độ trễ mạng). Đọc đồng hồ chỉ trong handler. */
function stillValid(c: Cached | null): string | undefined {
  return c && c.expiresAt - 15_000 > Date.now() ? c.token : undefined;
}

export function useStepUp() {
  const cached = useRef<Cached | null>(null);
  const [prompt, setPrompt] = useState<{
    label: string;
    resolve: (token: string | null) => void;
  } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const askToken = (label: string) =>
    new Promise<string | null>((resolve) => {
      setCode('');
      setError('');
      setPrompt({ label, resolve });
    });

  async function run<T extends Res>(
    label: string,
    attempt: (stepUp?: string) => Promise<T>
  ): Promise<T | null> {
    const first = await attempt(stillValid(cached.current));
    if (!isStepUpRequired(first.status, first.data)) return first;
    cached.current = null;
    const token = await askToken(label);
    if (!token) return null;
    return attempt(token);
  }

  const cancel = () => {
    prompt?.resolve(null);
    setPrompt(null);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt) return;
    if (!/^\d{6}$/.test(code.trim())) return setError('Nhập mã TOTP 6 chữ số.');
    setBusy(true);
    setError('');
    const got = await requestStepUp(code.trim());
    setBusy(false);
    if (!got) return setError('Mã TOTP không đúng hoặc đã hết hạn.');
    const exp = Date.parse(got.expiresAt);
    cached.current = {
      token: got.token,
      expiresAt: Number.isFinite(exp) ? exp : Date.now() + 4 * 60_000,
    };
    prompt.resolve(got.token);
    setPrompt(null);
  }

  const dialog = (
    <Modal open={prompt !== null} onClose={cancel} title="Xác thực lại">
      {prompt && (
        <form className="space-y-4" onSubmit={submit}>
          <p className="text-sm text-fg-secondary">
            {prompt.label}. Tài khoản đã bật xác thực hai bước nên thao tác này cần mã TOTP từ ứng
            dụng xác thực; mã đổi lấy phiên xác thực lại 5 phút.
          </p>
          <Input
            id="stepup-code"
            label="Mã TOTP"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="6 chữ số"
          />
          {error && (
            <p className="text-sm text-danger-ink" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={cancel}>
              Huỷ
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Đang xử lý…' : 'Xác nhận'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );

  return { run, dialog };
}
