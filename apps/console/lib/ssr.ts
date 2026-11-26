/** `getServerSideProps` chung của mọi trang điều hành: chỉ đọc người đang xem, không gọi backend. */
import type { GetServerSideProps } from 'next';

import { readSessionToken, viewerFrom, type Viewer } from './server';

export const getServerSideProps: GetServerSideProps<{ viewer: Viewer }> = async ({ req }) => ({
  props: { viewer: viewerFrom(await readSessionToken(req)) },
});
