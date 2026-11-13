import React, { useMemo, useState } from 'react';
import { Icon, INSTALL_TARGETS, installPlan, guessInstallTarget } from '@tsudev/ui';
import type { Installable, InstallTarget } from '@tsudev/ui';

/**
 * Khay "Đã chọn N" ở đáy /apps - kiểu "pack" của winstall, mở rộng cho NHIỀU hệ điều hành.
 *
 * Vì sao có bộ chọn hệ điều hành: trước 13/11/2026 khay chỉ có MỘT dòng winget; người
 * chọn cả app Linux/macOS dễ chép lệnh sai terminal. Nay mỗi hệ điều hành một lệnh GỘP
 * riêng (`installPlan`), viết đúng cú pháp shell của nó - không bao giờ trộn winget với
 * apt/brew trên cùng một dòng. Tab chọn sẵn theo User-Agent (chỉ là gợi ý), tab không có
 * sản phẩm nào cài được thì bị vô hiệu và ghi rõ số lượng.
 *
 * Khay chỉ vẽ sau khi người dùng bấm chọn (trạng thái phía trình duyệt), nên đọc
 * `navigator` ở đây không lệch hydrat.
 */
type Item = Installable & { id: string; name: string };

export default function InstallTray({ items, onClear }: { items: Item[]; onClear: () => void }) {
  const [chosen, setChosen] = useState<InstallTarget | null>(null);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const plans = useMemo(
    () => Object.fromEntries(INSTALL_TARGETS.map((t) => [t.id, installPlan(items, t.id)])),
    [items]
  ) as Record<InstallTarget, ReturnType<typeof installPlan>>;

  const guessed =
    typeof navigator !== 'undefined' ? guessInstallTarget(navigator.userAgent) : 'windows';
  const firstUsable = INSTALL_TARGETS.find((t) => plans[t.id].cmd)?.id ?? guessed;
  // Lựa chọn của người dùng thắng; không thì đoán theo máy - miễn tab đó có lệnh.
  const target: InstallTarget = chosen ?? (plans[guessed].cmd ? guessed : firstUsable);
  const plan = plans[target];
  const meta = INSTALL_TARGETS.find((t) => t.id === target)!;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plan.cmd);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard bị chặn: lệnh vẫn hiện nguyên văn để chép tay.
    }
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface shadow-lg"
      role="region"
      aria-label="Ứng dụng đã chọn"
    >
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="text-sm font-semibold text-fg">Đã chọn {items.length}</div>
          <div
            role="tablist"
            aria-label="Hệ điều hành chạy lệnh"
            className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1"
          >
            {INSTALL_TARGETS.map((t) => {
              const n = plans[t.id].covered.length;
              const on = t.id === target;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  disabled={n === 0}
                  onClick={() => {
                    setChosen(t.id);
                    setCopied(false);
                  }}
                  title={n === 0 ? `Chưa sản phẩm nào đã chọn cài được trên ${t.label}` : undefined}
                  className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                    on
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-line bg-surface text-fg-secondary hover:border-line-strong hover:text-fg'
                  }`}
                >
                  <Icon name={t.icon} size={14} />
                  {t.label}
                  <span
                    className={`rounded-full px-1.5 text-[11px] tabular-nums ${on ? 'bg-current/20' : 'bg-subtle'}`}
                  >
                    {n}/{items.length}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-3 text-sm text-fg-secondary hover:bg-subtle hover:text-fg"
          >
            <Icon name="close" size={14} />
            Bỏ chọn
          </button>
        </div>

        {plan.cmd ? (
          <div className="mt-2 rounded-md border border-line bg-base" role="tabpanel">
            <div className="flex items-center justify-between gap-2 border-b border-line py-1 pl-3 pr-1">
              <span className="min-w-0 truncate text-xs text-fg-muted">
                {meta.shell} · {plan.covered.map((c) => `${c.name} (${c.channel})`).join(', ')}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                {plan.steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={expanded}
                    className="hidden h-7 items-center rounded px-2 text-xs text-fg-secondary hover:bg-subtle hover:text-fg sm:inline-flex"
                  >
                    {expanded ? 'Thu gọn' : 'Xem từng bước'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={copy}
                  className="inline-flex h-7 items-center gap-1.5 rounded bg-primary px-3 text-xs font-semibold text-on-primary hover:bg-primary-hover"
                >
                  <Icon name={copied ? 'check' : 'copy'} size={14} />
                  <span aria-live="polite">{copied ? 'Đã chép' : `Chép lệnh ${meta.label}`}</span>
                </button>
              </div>
            </div>
            {expanded ? (
              <ol className="max-h-40 list-decimal overflow-auto py-2 pl-8 pr-3 font-mono text-xs text-fg-secondary marker:text-fg-muted">
                {plan.steps.map((s) => (
                  <li key={s} className="break-all">
                    {s}
                  </li>
                ))}
              </ol>
            ) : (
              <code className="block max-h-24 overflow-auto break-all px-3 py-2 font-mono text-xs text-fg-secondary">
                {plan.cmd}
              </code>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-fg-secondary">
            Các sản phẩm đã chọn chưa có gói cài bằng lệnh - tải từ trang sản phẩm trên thẻ.
          </p>
        )}
        {plan.cmd && plan.missing.length > 0 && (
          <p className="mt-1.5 text-xs text-fg-muted">
            Không có trên {meta.label}: {plan.missing.join(', ')} - xem tab hệ điều hành khác hoặc
            tải từ thẻ của sản phẩm.
          </p>
        )}
      </div>
    </div>
  );
}
