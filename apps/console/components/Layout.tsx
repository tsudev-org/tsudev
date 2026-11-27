import React from 'react';
import { Container } from '@tsudev/ui';

import { ConsoleLayout } from './ConsoleLayout';

/** Khung trang điều hành. `bare` = trang tự lo bề rộng/lề. Tiêu đề do `Seo` của từng trang đặt. */
export function Layout({ bare, children }: { bare?: boolean; children: React.ReactNode }) {
  return (
    <ConsoleLayout>
      {bare ? children : <Container className="py-8">{children}</Container>}
    </ConsoleLayout>
  );
}
