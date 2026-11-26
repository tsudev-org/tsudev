import React from 'react';
import Head from 'next/head';

/** Chỉ tiêu đề + noindex: trạm điều hành không có canonical hay Open Graph. */
export default function Seo({ title }: { title: string; path?: string; noindex?: boolean }) {
  return (
    <Head>
      <title>{`${title} · Trạm điều hành TsuDEV`}</title>
      <meta key="robots" name="robots" content="noindex, nofollow, noarchive" />
    </Head>
  );
}
