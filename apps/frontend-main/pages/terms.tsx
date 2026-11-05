import React from 'react';
import { LegalDoc } from '../components/LegalDoc';
import { OPERATOR, DOC_DATES, LEGAL_BASIS } from '../lib/legal';

const SECTIONS = [
  {
    id: 'chap-nhan',
    heading: 'Chấp nhận điều khoản',
    body: (
      <>
        <p>
          Điều khoản sử dụng này là thỏa thuận giữa bạn và <strong>{OPERATOR.legalName}</strong> (mã
          số {OPERATOR.taxCode}), địa chỉ {OPERATOR.address}, bên vận hành website tsudev - sau đây
          gọi là “chúng tôi”.
        </p>
        <p>
          Bằng việc truy cập hoặc sử dụng bất kỳ dịch vụ nào của tsudev, bạn xác nhận đã đọc, hiểu
          và đồng ý chịu ràng buộc bởi Điều khoản này cùng{' '}
          <a href="/privacy">Chính sách quyền riêng tư</a> và <a href="/rules">Nội quy</a>. Nếu
          không đồng ý, vui lòng ngừng sử dụng dịch vụ.
        </p>
        <p>
          Thỏa thuận được giao kết bằng phương tiện điện tử và có giá trị pháp lý theo Luật Giao
          dịch điện tử số 20/2023/QH15.
        </p>
      </>
    ),
  },
  {
    id: 'dich-vu',
    heading: 'Mô tả dịch vụ',
    body: (
      <>
        <p>
          tsudev là website cá nhân dùng để phát hành các ứng dụng, công cụ và thư viện do tsudev tự
          phát triển, bao gồm:
        </p>
        <ul>
          <li>
            <strong>Dự án và bản phát hành</strong> - trang giới thiệu từng dự án kèm giấy phép, và
            tệp cài đặt cho từng nền tảng. Mỗi tệp được công bố kèm mã SHA-256 và chữ ký Ed25519.
          </li>
          <li>
            <strong>Tài liệu</strong> - hướng dẫn cài đặt, nhật ký thay đổi và cách xử lý sự cố.
          </li>
          <li>
            <strong>Blog</strong> - bài viết kỹ thuật do tác giả của tsudev đăng.
          </li>
          <li>
            <strong>Tài khoản</strong> - đăng nhập, quản lý hồ sơ và bảo mật (xác thực hai lớp, khoá
            truy cập passkey).
          </li>
        </ul>
        <p>
          Chúng tôi có quyền bổ sung, thay đổi hoặc ngừng cung cấp một phần dịch vụ. Với thay đổi
          lớn ảnh hưởng đến quyền lợi của bạn, chúng tôi thông báo trước ít nhất 15 ngày.
        </p>
      </>
    ),
  },
  {
    id: 'tai-khoan',
    heading: 'Tài khoản và xác thực',
    body: (
      <>
        <p>
          Để sử dụng các tính năng tương tác, bạn cần đăng ký tài khoản. Khi đăng ký, bạn cam kết
          cung cấp thông tin chính xác, đầy đủ và cập nhật khi có thay đổi.
        </p>
        <p>
          Theo điểm e khoản 3 Điều 23 Nghị định số 147/2024/NĐ-CP, chúng tôi thực hiện xác thực tài
          khoản bằng số điện thoại di động tại Việt Nam; trường hợp bạn xác nhận không có số điện
          thoại di động tại Việt Nam thì xác thực bằng số định danh cá nhân theo pháp luật về định
          danh và xác thực điện tử. Tài khoản chưa xác thực có thể bị giới hạn tính năng đăng tải.
        </p>
        <p>
          Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và chịu trách nhiệm với mọi hoạt động
          diễn ra dưới tài khoản của mình. Hãy thông báo ngay cho chúng tôi khi phát hiện tài khoản
          bị truy cập trái phép.
        </p>
        <p>
          Dịch vụ không dành cho người dưới 16 tuổi. Người từ đủ 16 tuổi đến dưới 18 tuổi sử dụng
          dịch vụ phải có sự đồng ý của cha, mẹ hoặc người giám hộ.
        </p>
      </>
    ),
  },
  {
    id: 'quy-tac',
    heading: 'Quy tắc sử dụng và hành vi bị cấm',
    body: (
      <>
        <p>
          Bạn không được sử dụng tsudev để thực hiện các hành vi bị nghiêm cấm theo Luật An ninh
          mạng số 116/2025/QH15 và pháp luật có liên quan, bao gồm nhưng không giới hạn ở:
        </p>
        <ul>
          <li>
            Đăng tải thông tin chống Nhà nước, xuyên tạc lịch sử, phá hoại khối đại đoàn kết toàn
            dân tộc; kích động bạo lực, thù hận dân tộc, tôn giáo.
          </li>
          <li>
            Đưa thông tin sai sự thật, bịa đặt gây hoang mang trong nhân dân hoặc gây thiệt hại cho
            hoạt động kinh tế - xã hội.
          </li>
          <li>
            Xúc phạm danh dự, nhân phẩm, uy tín của tổ chức, cá nhân; làm nhục, vu khống người khác.
          </li>
          <li>
            Lừa đảo, chiếm đoạt tài sản trên không gian mạng; quảng cáo, mua bán hàng hóa, dịch vụ
            bị cấm.
          </li>
          <li>
            Thu thập, sử dụng, phát tán, kinh doanh trái phép thông tin và dữ liệu cá nhân của người
            khác; nghe lén, ghi âm, ghi hình trái phép.
          </li>
          <li>
            Sử dụng công nghệ để giả mạo hình ảnh, âm thanh, video (deepfake, giọng nói hoặc hình
            ảnh do trí tuệ nhân tạo tạo ra) nhằm lừa dối, bôi nhọ hoặc mạo danh.
          </li>
          <li>
            Tấn công, dò quét, khai thác lỗ hổng, phát tán mã độc hoặc gây cản trở hoạt động của hệ
            thống thông tin tsudev và của bên thứ ba.
          </li>
          <li>
            Đăng nội dung khiêu dâm, đồi trụy, tội ác, tệ nạn xã hội, mê tín dị đoan; nội dung xâm
            phạm quyền trẻ em.
          </li>
          <li>
            Xâm phạm quyền sở hữu trí tuệ; đăng lại nội dung của người khác mà không được phép và
            không dẫn nguồn.
          </li>
          <li>
            Gửi thư rác, quảng cáo trá hình, tạo nhiều tài khoản hoặc dò đoán mật khẩu tài khoản của
            người khác.
          </li>
          <li>
            Thu thập dữ liệu tự động (crawl, scrape) ở quy mô gây ảnh hưởng đến dịch vụ khi chưa
            được chúng tôi đồng ý bằng văn bản.
          </li>
        </ul>
        <p>
          Chuẩn mực với nội dung đăng trên tsudev được quy định chi tiết tại{' '}
          <a href="/rules">Nội quy</a>.
        </p>
      </>
    ),
  },
  {
    id: 'noi-dung',
    heading: 'Nội dung của bạn và quyền sở hữu trí tuệ',
    body: (
      <>
        <p>
          Bạn <strong>giữ nguyên quyền tác giả</strong> đối với nội dung do mình tạo ra và đăng lên
          tsudev. Chúng tôi không yêu cầu chuyển giao quyền sở hữu.
        </p>
        <p>
          Khi đăng nội dung công khai, bạn cấp cho chúng tôi một giấy phép không độc quyền, miễn phí
          bản quyền, có phạm vi toàn cầu để lưu trữ, sao chép, hiển thị, phân phối và trình bày nội
          dung đó trong khuôn khổ vận hành và quảng bá dịch vụ. Giấy phép này chấm dứt khi bạn gỡ
          nội dung, trừ các bản sao lưu kỹ thuật và các phần đã được người khác trích dẫn hợp pháp.
        </p>
        <p>
          Bạn cam kết có đầy đủ quyền đối với nội dung mình đăng và nội dung đó không xâm phạm quyền
          của bên thứ ba.
        </p>
        <p>
          Thương hiệu, logo, giao diện và mã nguồn của tsudev thuộc quyền sở hữu của chúng tôi, trừ
          các thành phần mã nguồn mở được nêu rõ giấy phép riêng.
        </p>
        <h3>Báo cáo xâm phạm quyền</h3>
        <p>
          Nếu cho rằng nội dung trên tsudev xâm phạm quyền của bạn, hãy gửi thông báo tới{' '}
          <strong>{OPERATOR.abuseEmail}</strong>, nêu rõ: nội dung bị khiếu nại và đường dẫn; căn cứ
          xác lập quyền; thông tin liên hệ; và cam kết về tính trung thực của thông báo. Chúng tôi
          sẽ xem xét và xử lý trong thời hạn pháp luật quy định.
        </p>
      </>
    ),
  },
  {
    id: 'kiem-duyet',
    heading: 'Kiểm duyệt, đình chỉ và chấm dứt',
    body: (
      <>
        <p>
          Chúng tôi có quyền gỡ bỏ nội dung, hạn chế tính năng, đình chỉ hoặc chấm dứt tài khoản vi
          phạm Điều khoản này, Nội quy hoặc pháp luật Việt Nam. Với nội dung vi phạm pháp luật,
          chúng tôi thực hiện gỡ bỏ theo yêu cầu của cơ quan có thẩm quyền trong thời hạn quy định
          tại Nghị định số 147/2024/NĐ-CP.
        </p>
        <p>
          Trừ trường hợp khẩn cấp hoặc vi phạm nghiêm trọng, chúng tôi sẽ thông báo lý do và cho bạn
          cơ hội giải trình. Bạn có quyền khiếu nại quyết định kiểm duyệt bằng cách gửi thư tới{' '}
          <strong>{OPERATOR.email}</strong> trong vòng 30 ngày.
        </p>
        <p>
          Bạn có thể ngừng sử dụng dịch vụ và yêu cầu xóa tài khoản bất cứ lúc nào. Việc xử lý dữ
          liệu sau khi chấm dứt được thực hiện theo <a href="/privacy">Chính sách quyền riêng tư</a>
          .
        </p>
      </>
    ),
  },
  {
    id: 'tai-ve',
    heading: 'Tải và sử dụng phần mềm do tsudev phát hành',
    body: (
      <>
        <p>
          Phần mềm phát hành trên tsudev được cung cấp <strong>miễn phí</strong>. Mỗi dự án ghi rõ
          giấy phép áp dụng; việc sử dụng, sửa đổi và phân phối lại phần mềm tuân theo giấy phép đó.
        </p>
        <p>
          Mã SHA-256 do máy chủ của chúng tôi tự tính khi niêm phong tệp, và chữ ký Ed25519 kiểm
          được bằng khoá công khai mà tsudev công bố. Hai thông tin này xác nhận tệp bạn tải về đúng
          là tệp tsudev đã phát hành và chưa bị thay đổi - chúng <strong>không phải</strong> cam kết
          rằng phần mềm phù hợp với mục đích cụ thể của bạn hay không có lỗi. Chúng tôi khuyến nghị
          bạn đối chiếu SHA-256 hoặc chữ ký trước khi cài, theo hướng dẫn trong{' '}
          <a href="/docs">Tài liệu</a>.
        </p>
        <p>
          tsudev là dự án cá nhân và không dùng chứng chỉ ký mã thương mại, nên hệ điều hành có thể
          hiện cảnh báo khi cài đặt. Bạn tự quyết định việc cài đặt sau khi đã đối chiếu.
        </p>
        <p>
          Khi phân phối lại bản đã sửa đổi, bạn không được trình bày nó như bản phát hành chính thức
          của tsudev. Phát hiện lỗ hổng bảo mật trong phần mềm hoặc website, vui lòng báo riêng tới{' '}
          <strong>{OPERATOR.abuseEmail}</strong> trước khi công khai để chúng tôi kịp khắc phục.
        </p>
      </>
    ),
  },
  {
    id: 'trach-nhiem',
    heading: 'Giới hạn trách nhiệm và bảo đảm',
    body: (
      <>
        <p>
          Dịch vụ được cung cấp trên cơ sở “nguyên trạng”. Chúng tôi nỗ lực duy trì dịch vụ ổn định
          nhưng không cam kết dịch vụ luôn sẵn sàng, không gián đoạn hay không có lỗi.
        </p>
        <p>
          Bài viết thể hiện quan điểm của tác giả tại thời điểm đăng. Chúng tôi nỗ lực giữ nội dung
          chính xác và cập nhật, nhưng thông tin kỹ thuật có thể lỗi thời theo thời gian; khi phát
          hiện sai sót, hãy báo cho chúng tôi để chỉnh sửa.
        </p>
        <p>
          Trong phạm vi pháp luật cho phép, chúng tôi không chịu trách nhiệm với thiệt hại gián
          tiếp, ngẫu nhiên hoặc mất lợi nhuận phát sinh từ việc sử dụng dịch vụ. Giới hạn này không
          áp dụng với thiệt hại do lỗi cố ý của chúng tôi hoặc trong các trường hợp mà pháp luật
          không cho phép loại trừ trách nhiệm.
        </p>
        <p>
          Bạn chịu trách nhiệm bồi thường cho chúng tôi các thiệt hại phát sinh từ việc bạn vi phạm
          Điều khoản này hoặc xâm phạm quyền của bên thứ ba.
        </p>
      </>
    ),
  },
  {
    id: 'chung',
    heading: 'Luật áp dụng, sửa đổi và liên hệ',
    body: (
      <>
        <p>
          Điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Tranh chấp phát sinh trước hết được
          giải quyết bằng thương lượng; nếu không đạt kết quả trong 30 ngày, tranh chấp được đưa ra
          Tòa án có thẩm quyền tại Việt Nam.
        </p>
        <p>
          Chúng tôi có thể sửa đổi Điều khoản và sẽ cập nhật ngày hiệu lực ở đầu trang. Việc bạn
          tiếp tục sử dụng dịch vụ sau ngày hiệu lực của bản sửa đổi được coi là chấp nhận nội dung
          sửa đổi. Nếu một điều khoản bị coi là vô hiệu, các điều khoản còn lại vẫn giữ nguyên hiệu
          lực.
        </p>
        <p>
          Liên hệ: <strong>{OPERATOR.email}</strong> - điện thoại {OPERATOR.phone} - địa chỉ{' '}
          {OPERATOR.address}. Người chịu trách nhiệm quản lý nội dung: {OPERATOR.owner}.
        </p>
        <h3>Cơ sở pháp lý</h3>
        <ul>
          {LEGAL_BASIS.map((l) => (
            <li key={l.title}>
              <strong>{l.title}</strong> - {l.note}
            </li>
          ))}
        </ul>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalDoc
      active="/terms"
      eyebrow="Pháp lý"
      title="Điều khoản sử dụng dịch vụ tsudev"
      lead="Các quy định ràng buộc giữa bạn và tsudev khi tải phần mềm, đọc tài liệu, blog và sử dụng tài khoản trên tsudev."
      effective={DOC_DATES.effective}
      updated={DOC_DATES.updated}
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
