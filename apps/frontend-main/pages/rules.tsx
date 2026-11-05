import React from 'react';
import { LegalDoc } from '../components/LegalDoc';
import { OPERATOR, DOC_DATES } from '../lib/legal';

const SECTIONS = [
  {
    id: 'tinh-than',
    heading: 'Tinh thần chung',
    body: (
      <>
        <p>
          tsudev là website cá nhân để phát hành các ứng dụng tự phát triển, kèm tài liệu và bài
          viết kỹ thuật. Nội quy này giữ cho nội dung trên tsudev chính xác, hữu ích và đáng tin cậy
          - với người đọc bài viết cũng như người tải phần mềm về dùng.
        </p>
        <p>
          Bài viết và tài liệu chỉ được đăng bởi tài khoản <strong>tác giả</strong> do chủ dự án cấp
          quyền. Các mục dưới đây áp dụng cho tác giả khi đăng nội dung, và cho mọi người dùng khi
          sử dụng tài khoản, tải và phân phối phần mềm.
        </p>
        <p>
          Nội quy này bổ sung cho <a href="/terms">Điều khoản sử dụng</a>. Các hành vi vi phạm pháp
          luật đã nêu trong Điều khoản luôn bị xử lý ở mức nghiêm khắc nhất, bất kể nội quy quy định
          thế nào.
        </p>
      </>
    ),
  },
  {
    id: 'nen-lam',
    heading: 'Chuẩn mực khi đăng bài viết và tài liệu',
    body: (
      <ul>
        <li>
          <strong>Chính xác và kiểm chứng được.</strong> Nêu rõ phiên bản, hệ điều hành và môi
          trường mà hướng dẫn đã được thử.
        </li>
        <li>
          <strong>Đặt tiêu đề cụ thể.</strong> “Cài bản Windows khi SmartScreen chặn” hữu ích hơn
          nhiều so với “Hướng dẫn cài đặt”.
        </li>
        <li>
          <strong>Định dạng mã bằng khối code.</strong> Ảnh chụp màn hình mã nguồn khiến người đọc
          không thể sao chép và tìm kiếm.
        </li>
        <li>
          <strong>Dùng thẻ phù hợp</strong> để bài viết dễ tìm.
        </li>
        <li>
          <strong>Dẫn nguồn</strong> khi trích dẫn tài liệu, bài viết hoặc mã nguồn của người khác.
        </li>
        <li>
          <strong>Cập nhật khi lỗi thời.</strong> Hướng dẫn cài đặt phải khớp bản phát hành hiện
          hành; bài đã lỗi thời cần được sửa hoặc ghi chú rõ.
        </li>
      </ul>
    ),
  },
  {
    id: 'khong-lam',
    heading: 'Không được làm',
    body: (
      <ul>
        <li>
          <strong>Công kích cá nhân,</strong> mỉa mai, xúc phạm hoặc phân biệt đối xử theo giới
          tính, dân tộc, tôn giáo, vùng miền, tuổi tác hay trình độ.
        </li>
        <li>
          <strong>Công khai thông tin cá nhân</strong> của người khác khi chưa được họ đồng ý.
        </li>
        <li>
          <strong>Spam:</strong> quảng cáo trá hình, chèn liên kết tiếp thị liên kết mà không khai
          báo.
        </li>
        <li>
          <strong>Đăng lại nội dung của người khác</strong> như của mình, hoặc chia sẻ phần mềm bẻ
          khóa, tài liệu vi phạm bản quyền.
        </li>
        <li>
          <strong>Chia sẻ mã độc,</strong> công cụ tấn công, hoặc hướng dẫn khai thác nhắm vào hệ
          thống mà bạn không có quyền kiểm thử.
        </li>
        <li>
          <strong>Mạo danh bản phát hành chính thức:</strong> phân phối lại tệp cài đặt đã sửa đổi
          dưới tên tsudev, hoặc chỉnh sửa checksum, chữ ký đi kèm.
        </li>
        <li>
          <strong>Lạm dụng tài khoản:</strong> chia sẻ, mua bán tài khoản, hoặc dùng tài khoản của
          người khác.
        </li>
        <li>
          <strong>Đưa nội dung không liên quan</strong> về chính trị gây chia rẽ, tôn giáo hoặc nội
          dung người lớn.
        </li>
      </ul>
    ),
  },
  {
    id: 'ai',
    heading: 'Nội dung tạo bởi trí tuệ nhân tạo',
    body: (
      <>
        <p>
          Bạn được phép dùng công cụ AI để hỗ trợ soạn nội dung, nhưng phải tuân thủ hai điều kiện:
        </p>
        <ul>
          <li>
            <strong>Khai báo rõ</strong> khi phần lớn nội dung do AI tạo ra, nhất là với bài hướng
            dẫn kỹ thuật.
          </li>
          <li>
            <strong>Tự kiểm chứng trước khi đăng.</strong> Bạn chịu trách nhiệm về nội dung mình
            đăng, kể cả khi do AI viết. Thông tin sai do AI bịa ra sẽ bị xử lý như thông tin sai
            lệch thông thường.
          </li>
        </ul>
        <p>
          Nghiêm cấm dùng AI để giả mạo hình ảnh, giọng nói hoặc video của người khác - đây là hành
          vi bị cấm theo Luật An ninh mạng số 116/2025/QH15, không chỉ là vi phạm nội quy.
        </p>
      </>
    ),
  },
  {
    id: 'xu-ly',
    heading: 'Cách xử lý vi phạm',
    body: (
      <>
        <p>Chúng tôi xử lý theo mức độ tăng dần, tùy tính chất và mức độ lặp lại:</p>
        <ul>
          <li>
            <strong>Nhắc nhở và yêu cầu chỉnh sửa</strong> - với lỗi hình thức như thiếu định dạng
            mã, thông tin lỗi thời.
          </li>
          <li>
            <strong>Ẩn hoặc gỡ nội dung</strong> - với nội dung vi phạm, kèm lý do gửi tới người
            đăng.
          </li>
          <li>
            <strong>Thu hồi quyền tác giả</strong> - tạm thời hoặc vĩnh viễn khi tái phạm.
          </li>
          <li>
            <strong>Khóa tài khoản vĩnh viễn</strong> - với vi phạm nghiêm trọng: lừa đảo, phát tán
            mã độc, mạo danh bản phát hành, vi phạm pháp luật hình sự.
          </li>
        </ul>
        <p>
          Nội dung vi phạm pháp luật được gỡ bỏ ngay và có thể được chuyển tới cơ quan có thẩm quyền
          theo quy định.
        </p>
      </>
    ),
  },
  {
    id: 'bao-cao',
    heading: 'Báo cáo và khiếu nại',
    body: (
      <>
        <p>
          Gặp nội dung vi phạm, sai sót trong tài liệu, hoặc một tệp cài đặt mạo danh tsudev, hãy
          gửi thư tới <strong>{OPERATOR.abuseEmail}</strong>. Lỗ hổng bảo mật xin báo riêng qua địa
          chỉ này trước khi công khai, để chúng tôi kịp phát hành bản sửa.
        </p>
        <p>
          Khi báo cáo, hãy nêu đường dẫn và mô tả ngắn gọn vấn đề. Báo cáo sai sự thật với mục đích
          quấy rối người khác cũng là hành vi vi phạm nội quy.
        </p>
        <p>
          Nếu cho rằng quyết định kiểm duyệt là không đúng, bạn có quyền khiếu nại tới{' '}
          <strong>{OPERATOR.email}</strong> trong vòng 30 ngày. Chúng tôi sẽ xem xét lại và trả lời
          bằng văn bản.
        </p>
      </>
    ),
  },
];

export default function RulesPage() {
  return (
    <LegalDoc
      active="/rules"
      eyebrow="Pháp lý"
      title="Nội quy tsudev"
      lead="Chuẩn mực khi đăng nội dung, sử dụng tài khoản, tải và phân phối phần mềm của tsudev, cùng cách chúng tôi xử lý vi phạm."
      effective={DOC_DATES.effective}
      updated={DOC_DATES.updated}
      sections={SECTIONS}
      note={
        <>
          Nội quy này bổ sung cho <a href="/terms">Điều khoản sử dụng</a>. Khi có mâu thuẫn, Điều
          khoản sử dụng và pháp luật Việt Nam được ưu tiên áp dụng.
        </>
      }
    />
  );
}
