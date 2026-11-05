/**
 * Cổng theo dõi HẠN MỨC Neon (kế hoạch Q4/2026 §6.7) - cảnh báo TRƯỚC khi vỡ.
 *
 * Sự cố 28/10/2026: Neon free (100 CU-giờ/tháng) cạn, Neon treo compute, cả site
 * trống HAI THÁNG. Cổng đếm nội dung (`demNoiDung.ts`) bắt được triệu chứng SAU
 * khi vỡ; cổng này đọc con số TRƯỚC khi vỡ, từ chính API của Neon.
 *
 * Gọi API điều khiển của Neon (`console.neon.tech/api/v2`) KHÔNG đánh thức
 * compute - nó là control plane, không phải kết nối Postgres. Nên chạy nó trong
 * Worker này không phá nguyên tắc "Worker canh site không chạm database".
 *
 * Hai ngưỡng, vì một ngưỡng không đủ:
 *   - ĐÃ TIÊU ≥ 80% hạn mức: còn ít thời gian, phải làm gì đó ngay.
 *   - DỰ BÁO cuối kỳ ≥ 100% (theo tốc độ tiêu từ đầu kỳ): còn nhiều tuần nhưng
 *     đang đi đúng con đường của sự cố tháng 10 - đó là lúc rẻ nhất để sửa.
 *
 * KHÔNG theo dõi được (đã cân nhắc, ghi ra để khỏi ai đi tìm lại):
 *   - Render giờ instance: Render không có API công khai nào trả số giờ đã dùng.
 *     Con số được giữ dưới 750 bằng LỊCH giữ ấm (nghỉ 01:00-06:00 giờ VN), xem
 *     `docs/free-tier.md`.
 *   - Workers AI Neuron: không còn gì gọi Workers AI từ khi gỡ Toà soạn (29/10/2026).
 *
 * Tệp này THUẦN (không fetch) để test được ngoài Worker - phần gọi mạng ở index.ts.
 */

/** Phần dự án Neon mà cổng cần. Tên trường theo `GET /api/v2/projects/{id}`. */
export type NeonProject = {
  /** CU-giây đã tiêu trong kỳ hiện tại (compute units × giây). */
  compute_time_seconds?: number;
  consumption_period_start?: string;
  consumption_period_end?: string;
};

export type DanhGiaHanMuc = {
  cuGio: number;
  hanMuc: number;
  phanTram: number;
  duBaoCuoiKy: number | null;
  canhBao: string[];
};

export const NGUONG_DA_TIEU = 0.8;

export function danhGiaNeon(p: NeonProject, hanMucCuGio: number, now: Date): DanhGiaHanMuc {
  const cuGio = (p.compute_time_seconds ?? 0) / 3600;
  const phanTram = hanMucCuGio > 0 ? cuGio / hanMucCuGio : 0;

  let duBaoCuoiKy: number | null = null;
  const dau = p.consumption_period_start ? Date.parse(p.consumption_period_start) : NaN;
  const cuoi = p.consumption_period_end ? Date.parse(p.consumption_period_end) : NaN;
  const daQua = now.getTime() - dau;
  // Dự báo vô nghĩa trong vài giờ đầu kỳ: một lần đăng bài lúc 01:00 ngày 1 kéo
  // ra con số "vượt 30 lần". Đợi đủ một ngày dữ liệu.
  if (Number.isFinite(dau) && Number.isFinite(cuoi) && daQua >= 24 * 3600 * 1000 && cuoi > dau) {
    duBaoCuoiKy = (cuGio / daQua) * (cuoi - dau);
  }

  const canhBao: string[] = [];
  if (phanTram >= NGUONG_DA_TIEU)
    canhBao.push(
      `ĐÃ TIÊU ${cuGio.toFixed(1)}/${hanMucCuGio} CU-giờ (${Math.round(phanTram * 100)}%)`
    );
  if (duBaoCuoiKy !== null && duBaoCuoiKy >= hanMucCuGio)
    canhBao.push(
      `DỰ BÁO cuối kỳ ${duBaoCuoiKy.toFixed(0)}/${hanMucCuGio} CU-giờ theo tốc độ hiện tại`
    );

  return { cuGio, hanMuc: hanMucCuGio, phanTram, duBaoCuoiKy, canhBao };
}
