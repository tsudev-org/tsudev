/**
 * Trung tâm an ninh phát hành - phần máy chủ (docs/security-plan.md §3, B2).
 *
 * Bốn việc, mỗi việc đóng một khoảng trống:
 *   - `trangThaiAnNinh`: trạng thái hiển thị TÍNH Ở MÁY CHỦ từ hàng DB + vòng khoá.
 *     DB chỉ lưu SỰ CỐ đã xảy ra (`securityState`), trạng thái suy được (chưa niêm
 *     phong, khoá đã nghỉ, đã thu hồi) tính lại mỗi lần - lưu chúng là để hai
 *     nguồn sự thật lệch nhau.
 *   - `kiemToanVen` (G5): băm lại tệp trong kho, so với sha256 đã ký. Lệch ⇒
 *     `LECH_TOAN_VEN` + tự gỡ công bố + nhật ký.
 *   - `traVirusTotal` (G4): tra BĂM (không tải tệp lên). Thiếu khoá ⇒ `CHUA_QUET`
 *     và log rõ - KHÔNG giả vờ đã quét.
 *   - `ghiNhatKy`: mọi thao tác vào `TrustAuditLog` - bảng chỉ-thêm có chuỗi băm
 *     (migration 20261106120000_an_ninh_phat_hanh, G8).
 */
import type { Prisma, ProjectRelease } from '@prisma/client'
import { prisma } from '@tsudev/db'
import { store } from './objectStore'
import * as releaseSigning from './releaseSigning'

/** Điều kiện CÔNG KHAI duy nhất của một bản phát hành - mọi đường đọc công khai dùng chung. */
export const CONG_KHAI: Prisma.ProjectReleaseWhereInput = {
  deletedAt: null,
  publishedAt: { not: null },
  revokedAt: null,
  securityState: 'OK',
}

export type TrangThaiAnNinh =
  | 'OK'
  | 'CHUA_NIEM_PHONG'
  | 'KHOA_DA_NGHI'
  | 'LECH_TOAN_VEN'
  | 'NGHI_MA_DOC'
  | 'DA_THU_HOI'
  /** Có chữ ký nhưng không kiểm được bằng JWKS, hoặc ký một sha256 khác. */
  | 'CHU_KY_LOI'
  /** WEB/SOURCE trỏ ra ngoài và không khai sha256 - không có gì để kiểm. */
  | 'DUONG_DAN_NGOAI'

/** Lần kiểm toàn vẹn cũ hơn mốc này thì giao diện báo "quá hạn" (tiêu chí §4: < 24 giờ). */
export const TOAN_VEN_QUA_HAN_MS = 24 * 60 * 60 * 1000

type HangTinh = Pick<
  ProjectRelease,
  'storageKey' | 'sha256' | 'signature' | 'signingKid' | 'securityState' | 'revokedAt'
>

/** Trạng thái hiển thị + lý do ngắn. Thứ tự ưu tiên: sự cố nặng nhất thắng. */
export function trangThaiAnNinh(r: HangTinh): { state: TrangThaiAnNinh; detail: string | null } {
  if (r.revokedAt) return { state: 'DA_THU_HOI', detail: null }
  if (r.securityState === 'LECH_TOAN_VEN')
    return { state: 'LECH_TOAN_VEN', detail: 'tệp trong kho không khớp sha256 đã ký' }
  if (r.securityState === 'NGHI_MA_DOC')
    return { state: 'NGHI_MA_DOC', detail: 'VirusTotal có phát hiện' }
  if (r.storageKey && !r.sha256) return { state: 'CHUA_NIEM_PHONG', detail: null }
  if (!r.sha256) return { state: 'DUONG_DAN_NGOAI', detail: null }
  if (!r.signature) return { state: 'CHU_KY_LOI', detail: 'có sha256 nhưng không có chữ ký' }
  const v = releaseSigning.verify(r.signature)
  if (!v.valid) return { state: 'CHU_KY_LOI', detail: v.reason }
  const payload = (v.payload ?? {}) as { sha256?: unknown }
  if (payload.sha256 !== r.sha256)
    return { state: 'CHU_KY_LOI', detail: 'chữ ký phủ một sha256 khác' }
  if (v.keyId !== releaseSigning.kid)
    return { state: 'KHOA_DA_NGHI', detail: `ký bằng khoá đã nghỉ ${v.keyId}` }
  return { state: 'OK', detail: null }
}

// ---------------------------------------------------------------------------
// Nhật ký
// ---------------------------------------------------------------------------

export type TacNhan = { id: string; name: string }
/** Tác nhân của lượt kiểm theo lịch (Worker cron) - không phải một User. */
export const HE_THONG: TacNhan = { id: 'system', name: 'cron kiểm toàn vẹn' }

export const nhanBanPhatHanh = (
  r: Pick<ProjectRelease, 'version' | 'platform' | 'arch' | 'channel'>,
  slug: string
): string => `${slug} ${r.version} ${r.platform}${r.arch ? `/${r.arch}` : ''} ${r.channel}`

export async function ghiNhatKy(
  tacNhan: TacNhan,
  action: string,
  r: { id: string; version: string; platform: string; arch: string; channel: string },
  slug: string,
  note?: string | null
): Promise<void> {
  await prisma.trustAuditLog.create({
    data: {
      actorId: tacNhan.id,
      actorName: tacNhan.name,
      action,
      targetType: 'ProjectRelease',
      targetId: r.id,
      targetLabel: nhanBanPhatHanh(r as ProjectRelease, slug).slice(0, 300),
      note: note ? note.slice(0, 1000) : null,
    },
  })
}

// ---------------------------------------------------------------------------
// Kiểm toàn vẹn (G5)
// ---------------------------------------------------------------------------

export type KetQuaToanVen =
  | { ketQua: 'KHOP'; id: string }
  | { ketQua: 'LECH'; id: string; nhan: string; lyDo: string }
  | { ketQua: 'BO_QUA'; id: string; lyDo: string }
  | { ketQua: 'LOI'; id: string; lyDo: string }

/** Object không tồn tại trong kho (khác với kho chập chờn). */
function laMatTep(e: unknown): boolean {
  const x = e as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } }
  return (
    x?.name === 'NoSuchKey' ||
    x?.Code === 'NoSuchKey' ||
    x?.name === 'NotFound' ||
    x?.$metadata?.httpStatusCode === 404
  )
}

/**
 * Đánh dấu LECH_TOAN_VEN và GỠ CÔNG BỐ (publishedAt = null). Gỡ công bố thay vì
 * chỉ dựa vào bộ lọc `CONG_KHAI`: sau khi sự cố được giải, công bố lại phải là
 * một quyết định có chủ đích của người, không tự xảy ra.
 * Ghi nhật ký CHỈ khi chuyển trạng thái - cron chạy 2 lần/ngày không được đẻ ra
 * một dòng báo động mới mỗi lượt cho cùng một sự cố.
 */
export async function danhDauLech(
  r: ProjectRelease & { project: { slug: string } },
  tacNhan: TacNhan,
  lyDo: string
): Promise<void> {
  const chuyen = r.securityState !== 'LECH_TOAN_VEN'
  await prisma.projectRelease.update({
    where: { id: r.id },
    data: { securityState: 'LECH_TOAN_VEN', publishedAt: null, lastIntegrityAt: new Date() },
  })
  if (chuyen) await ghiNhatKy(tacNhan, 'RELEASE_INTEGRITY_MISMATCH', r, r.project.slug, lyDo)
  console.error(`[release-security] LỆCH TOÀN VẸN ${r.id} (${r.storageKey}): ${lyDo}`)
}

/**
 * Băm lại tệp của MỘT bản phát hành và so với sha256 + dung lượng đã niêm phong.
 * Kho chập chờn ⇒ `LOI`, không đổi trạng thái (không báo động oan). Tệp biến mất
 * khỏi kho ⇒ LỆCH: link tải sẽ hỏng, và tệp bị xoá là một dạng bị thay.
 */
export async function kiemToanVen(id: string, tacNhan: TacNhan): Promise<KetQuaToanVen> {
  const r = await prisma.projectRelease.findUnique({
    where: { id },
    include: { project: { select: { slug: true } } },
  })
  if (!r) return { ketQua: 'BO_QUA', id, lyDo: 'không tìm thấy' }
  if (!r.storageKey || !r.sha256)
    return { ketQua: 'BO_QUA', id, lyDo: 'không có tệp đã niêm phong để kiểm' }

  let tinh: { sha256: string; size: number }
  try {
    tinh = await store.hashObject(r.storageKey)
  } catch (e) {
    if (laMatTep(e)) {
      const lyDo = 'tệp không còn trong kho'
      await danhDauLech(r, tacNhan, lyDo)
      return { ketQua: 'LECH', id, nhan: nhanBanPhatHanh(r, r.project.slug), lyDo }
    }
    const lyDo = e instanceof Error ? e.message : String(e)
    console.warn(`[release-security] không đọc được ${r.storageKey}: ${lyDo}`)
    return { ketQua: 'LOI', id, lyDo }
  }

  if (tinh.sha256 !== r.sha256 || (r.fileSize !== null && tinh.size !== r.fileSize)) {
    const lyDo = `sha256 trong kho ${tinh.sha256} (${tinh.size} B) ≠ đã ký ${r.sha256} (${r.fileSize} B)`
    await danhDauLech(r, tacNhan, lyDo)
    return { ketQua: 'LECH', id, nhan: nhanBanPhatHanh(r, r.project.slug), lyDo }
  }

  // Khớp. Nếu trước đó LỆCH (tệp đã được khôi phục đúng nguyên bản) thì gỡ cờ sự
  // cố - nhưng KHÔNG công bố lại: đó là quyết định của người.
  await prisma.projectRelease.update({
    where: { id: r.id },
    data: {
      lastIntegrityAt: new Date(),
      ...(r.securityState === 'LECH_TOAN_VEN' ? { securityState: 'OK' as const } : {}),
    },
  })
  if (r.securityState === 'LECH_TOAN_VEN')
    await ghiNhatKy(
      tacNhan,
      'RELEASE_INTEGRITY_RESTORED',
      r,
      r.project.slug,
      'tệp khớp lại sha256 đã ký; vẫn chưa công bố'
    )
  return { ketQua: 'KHOP', id }
}

// ---------------------------------------------------------------------------
// Tra băm VirusTotal (G4)
// ---------------------------------------------------------------------------

export type TrangThaiQuet = 'CHUA_QUET' | 'CHUA_CO_DU_LIEU' | 'SACH' | 'PHAT_HIEN' | 'LOI'
export type KetQuaQuet = {
  status: TrangThaiQuet
  malicious?: number
  suspicious?: number
  checkedAt: string
  note?: string
}

const VT_URL = 'https://www.virustotal.com/api/v3/files/'
/** Gói miễn phí: 4 lượt/phút. Lượt cron tra lại tối đa chừng này mỗi lần chạy. */
export const VT_MOI_LUOT = 4
/** Băm VirusTotal chưa có dữ liệu thì tra lại sau 24 giờ (kế hoạch §3.3). */
export const VT_TRA_LAI_SAU_MS = 24 * 60 * 60 * 1000

/**
 * Tra MỘT sha256. Chỉ gửi băm - tệp chưa công bố không bao giờ rời kho.
 * Chặn công bố khi `malicious >= 1`. `suspicious` được ghi lại nhưng không chặn:
 * tệp tự ký không có chứng chỉ (đúng loại tsudev phát hành) hay bị vài máy quét
 * heuristic gắn cờ "đáng ngờ", và chặn theo đó là chặn mọi bản phát hành.
 */
export async function traVirusTotal(sha256: string): Promise<KetQuaQuet> {
  const checkedAt = new Date().toISOString()
  const key = process.env.VIRUSTOTAL_API_KEY
  if (!key) {
    console.warn(`[release-security] CHƯA QUÉT ${sha256}: thiếu VIRUSTOTAL_API_KEY`)
    return { status: 'CHUA_QUET', checkedAt, note: 'thiếu VIRUSTOTAL_API_KEY' }
  }
  try {
    const res = await fetch(VT_URL + sha256, {
      headers: { 'x-apikey': key, accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })
    if (res.status === 404) return { status: 'CHUA_CO_DU_LIEU', checkedAt }
    if (!res.ok) return { status: 'LOI', checkedAt, note: `VirusTotal HTTP ${res.status}` }
    const body = (await res.json()) as {
      data?: { attributes?: { last_analysis_stats?: { malicious?: number; suspicious?: number } } }
    }
    const stats = body.data?.attributes?.last_analysis_stats ?? {}
    const malicious = Number(stats.malicious) || 0
    const suspicious = Number(stats.suspicious) || 0
    return { status: malicious > 0 ? 'PHAT_HIEN' : 'SACH', malicious, suspicious, checkedAt }
  } catch (e) {
    return { status: 'LOI', checkedAt, note: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * Ghi kết quả quét vào hàng và áp hậu quả: PHAT_HIEN ⇒ NGHI_MA_DOC + gỡ công bố;
 * bản đang NGHI_MA_DOC mà lần tra mới SACH ⇒ gỡ cờ (không công bố lại). Không
 * đụng tới bản đang LECH_TOAN_VEN - sự cố đó nặng hơn và có đường gỡ riêng.
 */
export async function apDungKetQuaQuet(
  r: ProjectRelease & { project: { slug: string } },
  scan: KetQuaQuet,
  tacNhan: TacNhan
): Promise<void> {
  const data: Prisma.ProjectReleaseUpdateInput = { scanResult: scan as Prisma.InputJsonValue }
  let action: string | null = null
  if (scan.status === 'PHAT_HIEN' && r.securityState === 'OK') {
    data.securityState = 'NGHI_MA_DOC'
    data.publishedAt = null
    action = 'RELEASE_MALWARE_FLAGGED'
  } else if (scan.status === 'SACH' && r.securityState === 'NGHI_MA_DOC') {
    data.securityState = 'OK'
    action = 'RELEASE_MALWARE_CLEARED'
  }
  await prisma.projectRelease.update({ where: { id: r.id }, data })
  if (action)
    await ghiNhatKy(
      tacNhan,
      action,
      r,
      r.project.slug,
      `VirusTotal: malicious=${scan.malicious ?? 0}, suspicious=${scan.suspicious ?? 0}`
    )
}

// ---------------------------------------------------------------------------
// Lượt kiểm theo lịch (Worker cron, B4)
// ---------------------------------------------------------------------------

export type BaoCaoLuotKiem = {
  checked: number
  khop: number
  lech: Array<{ id: string; nhan: string; lyDo: string }>
  loi: Array<{ id: string; lyDo: string }>
  conLai: number
  quetLai: number
  phatHien: string[]
}

/**
 * Băm lại mọi tệp đã niêm phong (cũ nhất trước, chưa từng kiểm đứng đầu) trong
 * `ngânSáchMs`, rồi tra lại VirusTotal cho tối đa `VT_MOI_LUOT` băm còn
 * "chưa có dữ liệu"/lỗi quá 24 giờ. Tuần tự, không song song: instance Render
 * free có 512 MB và mỗi lượt băm là một luồng đọc R2.
 */
export async function luotKiemTheoLich(nganSachMs: number): Promise<BaoCaoLuotKiem> {
  const batDau = Date.now()
  const ds = await prisma.projectRelease.findMany({
    where: { deletedAt: null, storageKey: { not: null }, sha256: { not: null } },
    select: { id: true },
    orderBy: [{ lastIntegrityAt: { sort: 'asc', nulls: 'first' } }, { id: 'asc' }],
  })
  const bc: BaoCaoLuotKiem = {
    checked: 0,
    khop: 0,
    lech: [],
    loi: [],
    conLai: 0,
    quetLai: 0,
    phatHien: [],
  }
  for (const { id } of ds) {
    if (Date.now() - batDau > nganSachMs) {
      bc.conLai = ds.length - bc.checked
      break
    }
    const kq = await kiemToanVen(id, HE_THONG)
    bc.checked++
    if (kq.ketQua === 'KHOP') bc.khop++
    else if (kq.ketQua === 'LECH') bc.lech.push({ id, nhan: kq.nhan, lyDo: kq.lyDo })
    else if (kq.ketQua === 'LOI') bc.loi.push({ id, lyDo: kq.lyDo })
  }

  if (process.env.VIRUSTOTAL_API_KEY) {
    const moc = new Date(Date.now() - VT_TRA_LAI_SAU_MS).toISOString()
    const canTra = await prisma.projectRelease.findMany({
      where: { deletedAt: null, sha256: { not: null }, securityState: { not: 'LECH_TOAN_VEN' } },
      include: { project: { select: { slug: true } } },
    })
    const hang = canTra.filter((r) => {
      const s = r.scanResult as KetQuaQuet | null
      if (!s) return true
      if (s.status === 'SACH') return false
      if (s.status === 'PHAT_HIEN') return r.securityState !== 'NGHI_MA_DOC'
      return s.checkedAt < moc
    })
    for (const r of hang.slice(0, VT_MOI_LUOT)) {
      const scan = await traVirusTotal(r.sha256 as string)
      await apDungKetQuaQuet(r, scan, HE_THONG)
      bc.quetLai++
      if (scan.status === 'PHAT_HIEN') bc.phatHien.push(nhanBanPhatHanh(r, r.project.slug))
    }
  }
  return bc
}

// ---------------------------------------------------------------------------
// Chuỗi băm của nhật ký (G8)
// ---------------------------------------------------------------------------

/**
 * Kiểm toàn bộ chuỗi `TrustAuditLog`: mỗi dòng phải mang `prevHash` = băm của
 * dòng ngay trước (hàm SQL `tsudev_trust_audit_hash`, cùng hàm trigger dùng lúc
 * chèn - không có bản cài thứ hai bằng TypeScript để lệch). Trả các dòng mà
 * chuỗi đứt NGAY TRƯỚC chúng.
 */
export async function kiemChuoiNhatKy(): Promise<{
  total: number
  breaks: Array<{ id: string; createdAt: Date; action: string }>
}> {
  const dem = await prisma.$queryRaw<Array<{ total: bigint }>>`
    SELECT count(*)::bigint AS total FROM "TrustAuditLog"`
  const total = dem[0]?.total ?? 0n
  const breaks = await prisma.$queryRaw<Array<{ id: string; createdAt: Date; action: string }>>`
    SELECT id, "createdAt", action FROM (
      SELECT id, "createdAt", action, "prevHash",
             lag(tsudev_trust_audit_hash(t)) OVER (ORDER BY "createdAt", id) AS ky_vong
      FROM "TrustAuditLog" t
    ) s
    WHERE "prevHash" IS DISTINCT FROM ky_vong
    ORDER BY "createdAt"
    LIMIT 50`
  return { total: Number(total), breaks }
}
