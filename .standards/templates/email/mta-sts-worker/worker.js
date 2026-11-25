// MTA-STS policy (RFC 8461) cho tên miền nhận thư qua Cloudflare Email Routing.
// Chuẩn: tsudev-standards docs/EMAIL.md mục 5. Đổi MODE testing -> enforce sau khi
// báo cáo TLS-RPT sạch >= 14 ngày, đồng thời TĂNG `id` trong TXT _mta-sts.
const MODE = 'testing';
const MAX_AGE = 604800; // 7 ngày; enforce nên đặt 1209600-31557600
const POLICY = `version: STSv1\nmode: ${MODE}\nmx: *.mx.cloudflare.net\nmax_age: ${MAX_AGE}\n`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/.well-known/mta-sts.txt') {
      return new Response(POLICY, {
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'public, max-age=3600',
          'x-content-type-options': 'nosniff',
        },
      });
    }
    return new Response('Not found\n', { status: 404 });
  },
};
