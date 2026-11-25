import React from 'react';
import { LegalDoc } from '../components/LegalDoc';
import { OPERATOR, PAYMENT_DOC_DATES } from '../lib/legal';
import { PLAN_PRICE, vnd } from '../lib/pay';

// Chính sách thanh toán, hoàn tiền và giải quyết khiếu nại - PRODUCT_POLICY 3.6
// ("hoàn tiền, huỷ: ghi rõ ở tsudev.com") và hồ sơ thông báo website TMĐT với Bộ
// Công Thương (phiếu DK2). Giá vẽ từ `lib/pay.ts`; số tiền THẬT do máy chủ gán
// (`PLANS` ở auth-service/src/paymentRoutes.ts) - đổi giá thì sửa cả hai và
// cập nhật `PAYMENT_DOC_DATES`.
const PRO = vnd(PLAN_PRICE.pro_year);

const SECTIONS = [
  {
    id: 'nguoi-ban',
    heading: 'Người bán',
    body: (
      <>
        <p>
          Bên bán và nhận thanh toán: <strong>{OPERATOR.legalName}</strong> (cá nhân kinh doanh, mã
          số thuế {OPERATOR.taxCode}), địa chỉ {OPERATOR.address}. Liên hệ: {OPERATOR.email} · điện
          thoại {OPERATOR.phone}.
        </p>
        <p>
          Văn bản này bổ sung cho <a href="/terms">Điều khoản sử dụng</a> và áp dụng cho mọi khoản
          thanh toán trên tsudev.com.
        </p>
      </>
    ),
  },
  {
    id: 'san-pham',
    heading: 'Sản phẩm, giá và thời hạn',
    body: (
      <>
        <ul>
          <li>
            <strong>TsuDEV Pro - 1 năm</strong>: gói dịch vụ trả phí <strong>không bắt buộc</strong>
            , người dùng tự chọn để ủng hộ tác giả duy trì và phát triển dự án, đổi lại tài khoản
            nhận thêm quyền lợi. {PRO}, giá đã gồm thuế, trả trước một lần cho 12 tháng,{' '}
            <strong>không tự gia hạn</strong>. Gia hạn sớm cộng thêm 1 năm vào thời hạn còn lại.
            Quyền lợi chi tiết ở <a href="/pro">trang Pro</a>.
          </li>
          <li>
            <strong>Ủng hộ</strong> (20.000 ₫ - 200.000 ₫): khoản đóng góp tự nguyện cho nhà phát
            triển, không mở khoá tính năng nào; người ủng hộ có thể hiện huy hiệu Ủng hộ trên tài
            khoản.
          </li>
        </ul>
        <p>
          Ứng dụng TsuDEV miễn phí; dự án gắn nhãn OPEN công khai mã nguồn trên GitHub. Không mua
          Pro vẫn dùng được đầy đủ tính năng cốt lõi. Phần mềm miễn phí trên tsudev.com không thu
          phí và không bị giới hạn bởi văn bản này.
        </p>
      </>
    ),
  },
  {
    id: 'thanh-toan',
    heading: 'Phương thức thanh toán và kích hoạt',
    body: (
      <>
        <ul>
          <li>
            <strong>Chuyển khoản ngân hàng qua mã VietQR</strong> (NAPAS 247). Sau khi bấm mua, bạn
            nhận một mã thanh toán dạng <code>TSU xxxxxxxx</code> có hiệu lực 72 giờ; ghi đúng mã
            này ở nội dung chuyển khoản để chúng tôi đối chiếu.
          </li>
          <li>
            Pro được kích hoạt cho tài khoản sau khi khoản chuyển được đối chiếu, thường trong vòng
            24 giờ, tối đa 3 ngày làm việc. Tiền về sau khi mã hết hạn vẫn được ghi nhận.
          </li>
          <li>
            <strong>Mua trong ứng dụng Android</strong> (bản tải từ Google Play): thanh toán, huỷ và
            hoàn tiền do Google Play xử lý theo chính sách của Google Play.
          </li>
        </ul>
        <p>Chúng tôi không thu, không lưu số thẻ hay thông tin tài khoản ngân hàng của bạn.</p>
      </>
    ),
  },
  {
    id: 'hoan-tien',
    heading: 'Huỷ và hoàn tiền',
    body: (
      <>
        <ul>
          <li>
            <strong>Pro mua trên tsudev.com</strong>: hoàn <strong>toàn bộ</strong> nếu bạn yêu cầu
            trong vòng 7 ngày kể từ khi Pro được kích hoạt. Sau 7 ngày, hoàn tiền khi dịch vụ đồng
            bộ không hoạt động do lỗi của chúng tôi mà không khắc phục được trong 7 ngày kể từ khi
            nhận báo lỗi - số tiền hoàn tính theo số ngày còn lại.
          </li>
          <li>
            <strong>Chuyển nhầm, chuyển thừa, chuyển trùng</strong> (sai số tiền, sai mã, chuyển hai
            lần): hoàn phần không dùng tới, kể cả với khoản Ủng hộ.
          </li>
          <li>
            <strong>Ủng hộ</strong> là đóng góp tự nguyện nên không hoàn, trừ trường hợp chuyển nhầm
            nêu trên.
          </li>
          <li>
            Mua qua Google Play: yêu cầu hoàn tiền tại Google Play. Hoàn tiền ở Google Play không
            làm mất thời hạn Pro bạn đã mua trên tsudev.com.
          </li>
        </ul>
        <p>
          Cách yêu cầu: gửi thư tới <strong>{OPERATOR.email}</strong> từ địa chỉ email của tài
          khoản, kèm mã thanh toán <code>TSU xxxxxxxx</code> và số tài khoản nhận lại tiền. Tiền
          được chuyển khoản lại trong vòng 7 ngày làm việc kể từ khi yêu cầu hợp lệ; khi hoàn, thời
          hạn Pro tương ứng bị thu hồi. Dữ liệu trên thiết bị của bạn không bị xoá.
        </p>
      </>
    ),
  },
  {
    id: 'khieu-nai',
    heading: 'Giải quyết khiếu nại',
    body: (
      <>
        <ol>
          <li>
            Gửi khiếu nại tới <strong>{OPERATOR.email}</strong> hoặc gọi {OPERATOR.phone}, nêu mã
            thanh toán (nếu có), nội dung sự việc và yêu cầu của bạn.
          </li>
          <li>Chúng tôi xác nhận đã nhận trong vòng 2 ngày làm việc.</li>
          <li>
            Trả lời kết quả giải quyết trong vòng 7 ngày làm việc kể từ khi nhận đủ thông tin; vụ
            việc cần xác minh với ngân hàng có thể kéo dài, khi đó chúng tôi báo bạn thời hạn mới.
          </li>
          <li>
            Không đồng ý với kết quả, bạn có quyền yêu cầu cơ quan quản lý nhà nước về bảo vệ quyền
            lợi người tiêu dùng hỗ trợ, hoặc giải quyết tại Toà án có thẩm quyền theo Luật Bảo vệ
            quyền lợi người tiêu dùng số 19/2023/QH15.
          </li>
        </ol>
      </>
    ),
  },
  {
    id: 'thong-tin',
    heading: 'Thông tin cá nhân khi thanh toán',
    body: (
      <p>
        Khi thanh toán, chúng tôi chỉ lưu mã thanh toán, số tiền, thời điểm, trạng thái đối chiếu và
        tài khoản TsuDEV liên quan, để kích hoạt quyền lợi và giải quyết khiếu nại. Cách xử lý dữ
        liệu theo <a href="/privacy">Chính sách quyền riêng tư</a>.
      </p>
    ),
  },
];

export default function PaymentPolicyPage() {
  return (
    <LegalDoc
      active="/chinh-sach-thanh-toan"
      eyebrow="Pháp lý"
      title="Chính sách thanh toán, hoàn tiền và khiếu nại"
      lead="Giá, cách thanh toán, điều kiện hoàn tiền và quy trình giải quyết khiếu nại cho TsuDEV Pro và khoản Ủng hộ trên tsudev.com."
      effective={PAYMENT_DOC_DATES.effective}
      updated={PAYMENT_DOC_DATES.updated}
      sections={SECTIONS}
      note={
        <>
          Văn bản này được soạn theo pháp luật Việt Nam hiện hành tại thời điểm cập nhật. Bản tiếng
          Việt là bản có giá trị áp dụng.
        </>
      }
    />
  );
}
