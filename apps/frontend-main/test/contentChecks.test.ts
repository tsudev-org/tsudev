/**
 * ED-12: bảng "Kiểm tra" của trình soạn. Hàm thuần - P7 (WF-05) chạy lại nó ở
 * service để CHẶN mục `error`, nên hợp đồng mức độ (ok/warn/error) phải ổn định.
 */
import { contentChecks } from '../lib/contentChecks';
import { readingMinutes } from '../lib/readingTime';

const level = (r: ReturnType<typeof contentChecks>, id: string) =>
  r.checks.find((c) => c.id === id)?.level;
const base = {
  title: 'Tiêu đề vừa đủ',
  metaDescription: 'Mô tả ngắn.',
  coverImageUrl: 'https://media.tsudev.com/a.webp',
};

describe('contentChecks', () => {
  test('tiêu đề trống = error, > 70 ký tự = warn', () => {
    expect(level(contentChecks({ ...base, title: ' ', contentMd: 'x' }), 'title')).toBe('error');
    expect(level(contentChecks({ ...base, title: 'a'.repeat(71), contentMd: 'x' }), 'title')).toBe(
      'warn'
    );
  });

  test('mô tả SEO > 160 = warn; trống nhưng có tóm tắt vẫn warn (nói rõ sẽ dùng tóm tắt)', () => {
    expect(
      level(contentChecks({ ...base, metaDescription: 'a'.repeat(161), contentMd: '' }), 'meta')
    ).toBe('warn');
    const r = contentChecks({ ...base, metaDescription: '', excerpt: 'tóm tắt', contentMd: '' });
    expect(r.checks.find((c) => c.id === 'meta')?.text).toMatch(/tóm tắt/);
  });

  test('ảnh thiếu alt = error; alt trong khối mã không bị tính', () => {
    expect(level(contentChecks({ ...base, contentMd: '![](/a.png)' }), 'alt')).toBe('error');
    expect(level(contentChecks({ ...base, contentMd: '```\n![](/a.png)\n```' }), 'alt')).toBe('ok');
  });

  test('tiêu đề nhảy cấp H2→H4 = warn; # trong khối mã không phải tiêu đề', () => {
    expect(level(contentChecks({ ...base, contentMd: '## A\n\n#### B' }), 'headings')).toBe('warn');
    expect(level(contentChecks({ ...base, contentMd: '## A\n\n### B' }), 'headings')).toBe('ok');
    expect(
      contentChecks({ ...base, contentMd: '```\n# chú thích bash\n```' }).checks.some(
        (c) => c.id === 'h1'
      )
    ).toBe(false);
  });

  test('liên kết hỏng: javascript:, neo không tồn tại = error; neo đúng = ok', () => {
    expect(level(contentChecks({ ...base, contentMd: '[x](javascript:alert(1))' }), 'links')).toBe(
      'error'
    );
    expect(level(contentChecks({ ...base, contentMd: '## Mở đầu\n\n[x](#khac)' }), 'links')).toBe(
      'error'
    );
    expect(level(contentChecks({ ...base, contentMd: '## Mở đầu\n\n[x](#mo-dau)' }), 'links')).toBe(
      'ok'
    );
  });

  test('liên kết http: = warn; đoạn > 120 từ = warn', () => {
    expect(level(contentChecks({ ...base, contentMd: '[x](http://a.vn)' }), 'http')).toBe('warn');
    const long = Array.from({ length: 130 }, () => 'chữ').join(' ');
    expect(level(contentChecks({ ...base, contentMd: long }), 'paragraphs')).toBe('warn');
  });

  test('thời gian đọc: 0 từ = 0, có chữ ít nhất 1 phút, 200 từ/phút', () => {
    expect(readingMinutes(0)).toBe(0);
    expect(readingMinutes(5)).toBe(1);
    expect(readingMinutes(1000)).toBe(5);
  });
});
