import Document, { Head, Html, Main, NextScript } from 'next/document';
import type { DocumentContext, DocumentInitialProps } from 'next/document';

/**
 * Nonce CSP do `proxy.ts` sinh cho từng request (header `x-nonce`) được gắn vào MỌI script của Next và script chọn
 * chế độ hiển thị - CSP của console không có `'unsafe-inline'` cho script và không có băm cố định.
 *
 * Script chế độ: đọc cùng khoá `tsudev-theme` với tsudev.com (Sáng · Tối · Hệ thống; `warm` cũ ⇒ Sáng); không đọc gợi
 * ý phiên hay chủ đề Pro - console không cần.
 */
const THEME_SCRIPT = `(function(){var m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';try{var s=localStorage.getItem('tsudev-theme');if(s==='dark'||s==='light'){m=s}else if(s==='warm'){m='light'}}catch(e){}document.documentElement.setAttribute('data-theme',m)})();`;

/**
 * Trusted Types - chính sách `default`, định nghĩa TRƯỚC mọi script khác:
 *  - `createScriptURL`: bộ nạp trang của Next (pages router, `route-loader.js`) nối chuỗi vào TrustedScriptURL nên
 *    giá trị thành chuỗi thường (đo 26/11/2026: trang không chuyển được). Chỉ nhận URL CÙNG ORIGIN dưới
 *    `/_next/static/`;
 *  - `createHTML`: chuyển cho DOMPurify (`lib/sanitize.ts`, gắn ở `_app`). Bộ lọc chưa gắn ⇒ NÉM, không thả qua.
 * Không khai `createScript` ⇒ eval và script nội tuyến dạng chuỗi vẫn bị chặn.
 */
const TT_SCRIPT = `(function(){var t=window.trustedTypes;if(!t||!t.createPolicy)return;try{t.createPolicy('default',{createScriptURL:function(u){var x=new URL(u,location.href);if(x.origin===location.origin&&x.pathname.indexOf('/_next/static/')===0)return x.href;throw new TypeError('Trusted Types: chặn script '+x.origin+x.pathname)},createHTML:function(h){var f=window.tsuSanitizeHtml;if(typeof f==='function')return f(h);throw new TypeError('Trusted Types: bộ lọc HTML chưa sẵn sàng')}})}catch(e){}})();`;

type Props = DocumentInitialProps & { nonce?: string };

export default class ConsoleDocument extends Document<Props> {
  static override async getInitialProps(ctx: DocumentContext): Promise<Props> {
    const initial = await Document.getInitialProps(ctx);
    const raw = ctx.req?.headers['x-nonce'];
    const nonce = typeof raw === 'string' && /^[A-Za-z0-9+/=]{16,64}$/.test(raw) ? raw : undefined;
    return { ...initial, nonce };
  }

  override render() {
    const { nonce } = this.props;
    return (
      <Html lang="vi" data-theme="dark" data-product="tsudev">
        <Head nonce={nonce}>
          <script nonce={nonce} dangerouslySetInnerHTML={{ __html: TT_SCRIPT }} />
          <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
          <meta name="referrer" content="no-referrer" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <body data-platform="web">
          <Main />
          <NextScript nonce={nonce} />
        </body>
      </Html>
    );
  }
}
