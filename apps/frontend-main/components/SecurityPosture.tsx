import React from 'react';
import { Badge, Button } from '@tsudev/ui';
import type { BadgeTone } from '@tsudev/ui';

import { postureItems, type Posture, type PostureState } from '../lib/securityPosture';

export type { Posture };

/**
 * Thẻ "Mức an toàn" (P1.1) ở đầu /settings/security. Logic ở lib/securityPosture.ts.
 */
const BADGE: Record<PostureState, { tone: BadgeTone; text: string }> = {
  ok: { tone: 'success', text: 'Đạt' },
  todo: { tone: 'warning', text: 'Nên làm' },
  unknown: { tone: 'neutral', text: 'Chưa rõ' },
};

export function SecurityPosture({
  posture,
  onEnableTotp,
  onRegenerateBackupCodes,
}: {
  posture: Posture | null;
  onEnableTotp: () => void;
  onRegenerateBackupCodes: () => void;
}) {
  if (!posture) return null;
  const items = postureItems(posture, {
    enableTotp: onEnableTotp,
    regenerateBackupCodes: onRegenerateBackupCodes,
  });
  const done = items.filter((i) => i.state === 'ok').length;

  return (
    <section
      aria-labelledby="posture-title"
      className="rounded-lg border border-line bg-surface p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="posture-title" className="text-base font-semibold text-fg">
          Mức an toàn
        </h2>
        <p className="text-sm text-fg-muted">
          Đạt {done}/{items.length} mục
        </p>
      </div>
      <ul className="mt-4 flex flex-col divide-y divide-line">
        {items.map((i) => (
          <li
            key={i.id}
            className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
                {i.label}
                <Badge tone={BADGE[i.state].tone}>{BADGE[i.state].text}</Badge>
              </p>
              <p className="mt-0.5 text-sm text-fg-muted">{i.detail}</p>
            </div>
            {i.action &&
              (i.action.href ? (
                <Button as="a" href={i.action.href} size="sm" variant="secondary">
                  {i.action.label}
                </Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={i.action.onClick}>
                  {i.action.label}
                </Button>
              ))}
          </li>
        ))}
      </ul>
    </section>
  );
}
