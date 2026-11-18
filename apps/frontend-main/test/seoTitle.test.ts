import { tieuDeDayDu } from '../lib/seoTitle';

describe('tieuDeDayDu - tiêu đề tab không lặp tên site', () => {
  test('nối "- TsuDEV" cho tiêu đề thường', () => {
    expect(tieuDeDayDu('Blog')).toBe('Blog - TsuDEV');
  });
  test('không nối khi tiêu đề đã kết bằng TsuDEV (không phân biệt hoa thường)', () => {
    expect(tieuDeDayDu('Nội quy TsuDEV')).toBe('Nội quy TsuDEV');
    expect(tieuDeDayDu('Điều khoản sử dụng dịch vụ TsuDEV')).toBe(
      'Điều khoản sử dụng dịch vụ TsuDEV'
    );
    expect(tieuDeDayDu('Nội quy tsudev')).toBe('Nội quy tsudev');
  });
  test('tên site ở giữa câu hoặc dính chữ khác vẫn nối', () => {
    expect(tieuDeDayDu('tsudev.com có giao diện mới')).toBe('tsudev.com có giao diện mới - TsuDEV');
    expect(tieuDeDayDu('Cài tsudev-files')).toBe('Cài tsudev-files - TsuDEV');
  });
  test('không có tiêu đề -> tiêu đề trang chủ', () => {
    expect(tieuDeDayDu()).toBe('TsuDEV - Phát hành ứng dụng tự phát triển');
  });
});
