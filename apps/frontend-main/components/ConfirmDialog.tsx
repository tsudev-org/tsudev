import React from 'react';
import { Button, Modal } from '@tsudev/ui';

/**
 * Hộp xác nhận (TDD mục MD - ConfirmDialog) thay `window.confirm`: hộp của trình
 * duyệt không theo giao diện, không dịch được nút, và chặn cả luồng JavaScript.
 * Một hành động chính + Huỷ; Escape và bấm nền = Huỷ (qua `Modal`).
 */
type Props = {
  open: boolean;
  title: string;
  children?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Hành động phụ (vd. "Tải bản mới") đặt giữa Huỷ và hành động chính. */
  extra?: React.ReactNode;
};

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Huỷ',
  danger,
  busy,
  onConfirm,
  onCancel,
  extra,
}: Props) {
  return (
    <Modal open={open} onClose={onCancel} title={title} closeButton={false}>
      <div className="text-sm text-fg-secondary">{children}</div>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {cancelLabel}
        </Button>
        {extra}
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
