import { lineDiff, MAX_DIFF_CELLS } from '../lib/lineDiff';

test('giống nhau ⇒ toàn same', () => {
  expect(lineDiff('a\nb', 'a\nb')?.every((l) => l.kind === 'same')).toBe(true);
});

test('thêm, xoá, sửa một dòng', () => {
  expect(lineDiff('a\nb\nc', 'a\nB\nc\nd')).toEqual([
    { kind: 'same', text: 'a' },
    { kind: 'del', text: 'b' },
    { kind: 'add', text: 'B' },
    { kind: 'same', text: 'c' },
    { kind: 'add', text: 'd' },
  ]);
});

test('ghép lại đúng hai phía', () => {
  const before = 'x\ny\nz\nw';
  const after = 'y\nz\nq\nw\nr';
  const d = lineDiff(before, after)!;
  expect(
    d
      .filter((l) => l.kind !== 'add')
      .map((l) => l.text)
      .join('\n')
  ).toBe(before);
  expect(
    d
      .filter((l) => l.kind !== 'del')
      .map((l) => l.text)
      .join('\n')
  ).toBe(after);
});

test('quá trần ⇒ null, không treo', () => {
  const big = Array.from(
    { length: Math.ceil(Math.sqrt(MAX_DIFF_CELLS)) + 10 },
    (_, i) => `d${i}`
  ).join('\n');
  expect(lineDiff(big, big + '\nx')).toBeNull();
});
