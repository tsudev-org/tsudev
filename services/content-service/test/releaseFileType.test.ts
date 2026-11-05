// Loại tệp phát hành (§3.3 kế hoạch ATTT, G3) - phần KHÔNG cần DB.
//
// `projectRelease.test.ts` thay `store.hashObject` bằng hàm giả trả sẵn
// `head`/`tail`, nên nó canh luật của route nhưng KHÔNG canh việc `hashObject`
// thật gom đúng byte đầu/cuối từ một luồng chia khúc. Kho thật (R2/MinIO) trả
// thân theo khúc có kích thước tuỳ ý: dấu `PK\x03\x04` có thể rơi gãy đôi giữa
// hai khúc, và khối `koly` của `.dmg` có thể nằm trên ranh giới của khúc cuối.
// Gom sai ở đó thì niêm phong từ chối tệp HỢP LỆ (hoặc tệ hơn, nhận tệp sai) mà
// mọi test dùng hàm giả vẫn xanh.
//
// Ở đây `S3Client.prototype.send` bị thay để trả một luồng chia khúc do test
// dựng - không gọi mạng, không chạm DB.
export {}

process.env.S3_ACCESS_KEY = 'test-access-key'
process.env.S3_SECRET_KEY = 'test-secret-key'

const { createHash } = require('crypto')
const { S3Client } = require('@aws-sdk/client-s3')
const {
  store,
  HEAD_BYTES,
  TAIL_BYTES,
  MAX_RELEASE_BYTES,
  RELEASE_FILE_TYPES,
  loaiTepPhatHanh,
  tenTepTrongKho,
} = require('../src/objectStore')

/** Thân object giả: trả `tep` cắt theo các điểm `cat` (chỉ số byte). */
const thanChiaKhuc = (tep: Buffer, cat: number[]) => {
  const moc = [0, ...cat, tep.length]
  const khuc = moc.slice(1).map((den, i) => tep.subarray(moc[i], den))
  return {
    async *[Symbol.asyncIterator]() {
      for (const k of khuc) yield Buffer.from(k)
    },
  }
}

const docVoi = async (tep: Buffer, cat: number[]) => {
  const spy = jest
    .spyOn(S3Client.prototype, 'send')
    .mockImplementation(async () => ({ Body: thanChiaKhuc(tep, cat) }))
  try {
    return await store.hashObject('releases/x/tep')
  } finally {
    spy.mockRestore()
  }
}

const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex')

describe('hashObject: byte đầu/cuối gom đúng bất kể khúc chia thế nào', () => {
  // APK giả: 4 byte magic zip rồi 2000 byte rác.
  const apk = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(2000, 0x41)])

  test.each([
    ['một khúc', []],
    ['magic gãy đôi giữa hai khúc', [2]],
    ['từng byte một ở đầu', [1, 2, 3, 4, 5]],
    ['khúc đầu rỗng', [0, 0, 3]],
    ['ranh giới ngay sau HEAD_BYTES', [16, 1000]],
  ])('%s ⇒ sha256, size, head, tail như đọc liền', async (_ten, cat) => {
    const d = await docVoi(apk, cat as number[])
    expect(d.sha256).toBe(sha(apk))
    expect(d.size).toBe(apk.length)
    expect(d.head.equals(apk.subarray(0, HEAD_BYTES))).toBe(true)
    expect(d.tail.equals(apk.subarray(-TAIL_BYTES))).toBe(true)
    expect(loaiTepPhatHanh('ANDROID', 'a.apk').khop(d.head, d.tail)).toBe(true)
  })

  // UDIF: dấu `koly` ở đầu 512 byte CUỐI. Khúc cuối ngắn hơn 512 byte là chuyện
  // thường (khúc cuối của luồng chỉ là phần dư) - tail phải ghép từ khúc trước.
  const dmg = Buffer.concat([
    Buffer.from([0x78, 0xda]),
    Buffer.alloc(3000, 0x00),
    Buffer.from('koly'),
    Buffer.alloc(TAIL_BYTES - 4, 0x01),
  ])
  const koly = dmg.length - TAIL_BYTES

  test.each([
    ['khúc cuối 100 byte, koly ở khúc trước', [dmg.length - 100]],
    ['ranh giới cắt NGANG chữ koly', [koly + 2]],
    ['nhiều khúc nhỏ ở đuôi', [koly - 10, koly + 1, koly + 300, dmg.length - 1]],
    ['khúc cuối đúng 512 byte', [koly]],
  ])('.dmg %s ⇒ vẫn nhận ra UDIF', async (_ten, cat) => {
    const d = await docVoi(dmg, cat as number[])
    expect(d.sha256).toBe(sha(dmg))
    expect(d.tail.length).toBe(TAIL_BYTES)
    expect(loaiTepPhatHanh('MACOS', 'a.dmg').khop(d.head, d.tail)).toBe(true)
  })

  test('tệp ngắn hơn HEAD_BYTES: head là cả tệp, không đệm thêm byte', async () => {
    const tep = Buffer.from('MZ\x90', 'latin1')
    const d = await docVoi(tep, [1])
    expect(d.head.equals(tep)).toBe(true)
    expect(d.tail.equals(tep)).toBe(true)
    expect(loaiTepPhatHanh('WINDOWS', 'a.exe').khop(d.head, d.tail)).toBe(true)
  })

  test('.txt đổi đuôi .apk, dù chia khúc thế nào, vẫn KHÔNG khớp zip', async () => {
    const txt = Buffer.from('PK la viet tat thoi, day la van ban thuong.\n'.repeat(40))
    const d = await docVoi(txt, [1, 2, 3])
    expect(loaiTepPhatHanh('ANDROID', 'ghi-chu.apk').khop(d.head, d.tail)).toBe(false)
  })
})

describe('danh sách trắng đuôi tệp', () => {
  test('mọi nền tảng có tệp đều có trần kích thước - thiếu trần là fail closed thành 413 mọi tệp', () => {
    for (const p of Object.keys(RELEASE_FILE_TYPES)) expect(MAX_RELEASE_BYTES[p]).toBeGreaterThan(0)
  })

  test('WEB không có tệp tải lên', () => {
    expect(RELEASE_FILE_TYPES.WEB).toBeUndefined()
    expect(loaiTepPhatHanh('WEB', 'x.zip')).toBeNull()
  })

  test.each([
    ['LINUX', 'tool-1.0.tar.gz', '.tar.gz'],
    ['LINUX', 'TOOL.TAR.GZ', '.tar.gz'],
    ['LINUX', 'x.APPIMAGE', '.AppImage'],
    ['ANDROID', 'App.Apk', '.apk'],
    ['WINDOWS', 'SETUP.EXE', '.exe'],
  ])('%s %s ⇒ %s (không phân biệt hoa thường)', (platform, ten, duoi) => {
    expect(loaiTepPhatHanh(platform, ten)?.duoi).toBe(duoi)
  })

  test.each([
    ['ANDROID', '.apk', 'chỉ có đuôi, không có tên'],
    ['LINUX', 'x.gz', '.gz trần không phải .tar.gz'],
    ['WINDOWS', 'x.tar.gz', 'đuôi của nền tảng khác'],
    ['ANDROID', 'app.apk.txt', 'đuôi kép, đuôi thật là .txt'],
    ['ANDROID', 'app.apk ', 'khoảng trắng sau đuôi'],
  ])('%s %j ⇒ null (%s)', (platform, ten) => {
    expect(loaiTepPhatHanh(platform, ten)).toBeNull()
  })

  test('mỗi loại có contentType cụ thể; chỉ .aab được là octet-stream', () => {
    for (const ds of Object.values(RELEASE_FILE_TYPES) as { duoi: string; contentType: string }[][])
      for (const l of ds)
        if (l.duoi !== '.aab') expect(l.contentType).not.toBe('application/octet-stream')
  })
})

describe('tenTepTrongKho: khoá object luôn mang đuôi CHÍNH TẮC', () => {
  test.each([
    ['ANDROID', 'APP.APK', /\.apk$/],
    ['LINUX', 'Tool.APPIMAGE', /\.AppImage$/],
    ['LINUX', 'tool.TAR.GZ', /\.tar\.gz$/],
  ])('%s %s ⇒ đuôi chuẩn hoá', (platform, ten, re) => {
    expect(tenTepTrongKho(ten, loaiTepPhatHanh(platform, ten))).toMatch(re)
  })

  test('tên dài + đường dẫn: tối đa 120 ký tự, giữ đuôi, và vẫn qua lại được danh sách trắng', () => {
    const ten = `C:\\Users\\x\\${'Bản cài '.repeat(40)}.msix`
    const l = loaiTepPhatHanh('WINDOWS', ten)
    const k = tenTepTrongKho(ten, l)
    expect(k.length).toBeLessThanOrEqual(120)
    expect(k).not.toMatch(/[\\/]/)
    expect(loaiTepPhatHanh('WINDOWS', k)?.duoi).toBe('.msix')
  })

  test('tên chỉ toàn ký tự bị lọc vẫn ra khoá có tên + đuôi', () => {
    const k = tenTepTrongKho('???.apk', loaiTepPhatHanh('ANDROID', '???.apk'))
    expect(loaiTepPhatHanh('ANDROID', k)?.duoi).toBe('.apk')
  })
})
