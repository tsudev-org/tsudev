import { tieuDeDayDu } from '../lib/seoTitle';

describe('tieuDeDayDu - tiêu đề tab không lặp tên site', () => {
  test('nối "- tsudev" cho tiêu đề thường', () => {
    expect(tieuDeDayDu('Blog')).toBe('Blog - tsudev');
  });
  test('không nối khi tiêu đề đã kết bằng tsudev', () => {
    expect(tieuDeDayDu('Nội quy tsudev')).toBe('Nội quy tsudev');
    expect(tieuDeDayDu('Điều khoản sử dụng dịch vụ tsudev')).toBe(
      'Điều khoản sử dụng dịch vụ tsudev'
    );
  });
  test('tsudev ở giữa câu hoặc dính chữ khác vẫn nối', () => {
    expect(tieuDeDayDu('tsudev.com có giao diện mới')).toBe('tsudev.com có giao diện mới - tsudev');
    expect(tieuDeDayDu('Cài tsudev-files')).toBe('Cài tsudev-files - tsudev');
  });
  test('không có tiêu đề -> tiêu đề trang chủ', () => {
    expect(tieuDeDayDu()).toBe('tsudev - Phát hành ứng dụng tự phát triển');
  });
});
