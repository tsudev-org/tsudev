/**
 * So sánh theo DÒNG cho trang lịch sử bài (P2.3) - LCS cổ điển, không thư viện.
 * Bài blog vài trăm dòng: O(n·m) bộ nhớ vẫn nhỏ; trên trần thì trả "quá dài" thay
 * vì treo trình duyệt.
 */
export type DiffLine = { kind: 'same' | 'add' | 'del'; text: string };

export const MAX_DIFF_CELLS = 4_000_000;

export function lineDiff(before: string, after: string): DiffLine[] | null {
  const a = before.split('\n');
  const b = after.split('\n');
  if (a.length * b.length > MAX_DIFF_CELLS) return null;
  const n = a.length;
  const m = b.length;
  // dp[i][j] = độ dài LCS của a[i..] và b[j..]
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ kind: 'same', text: a[i]! });
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      out.push({ kind: 'del', text: a[i++]! });
    } else {
      out.push({ kind: 'add', text: b[j++]! });
    }
  }
  while (i < n) out.push({ kind: 'del', text: a[i++]! });
  while (j < m) out.push({ kind: 'add', text: b[j++]! });
  return out;
}
