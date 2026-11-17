/** IPv4 bọc trong IPv6 (`::ffff:1.2.3.4`, cách Node ghi IPv4 trên socket hai ngăn xếp) hiện về dạng IPv4. */
export const hienIp = (ip: string): string =>
  ip.replace(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i, '$1');
