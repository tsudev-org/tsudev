// Storybook 7 đòi `framework` là gói CÓ BUILDER (`@storybook/react-vite`,
// `@storybook/react-webpack5`...), không phải `@storybook/react` như bản 6 -
// khai kiểu cũ thì `storybook dev` chết ngay khi nạp cấu hình. Chọn Vite vì nó
// kéo về ít phụ thuộc hơn hẳn webpack5 và Storybook ở đây chỉ là công cụ rà
// bằng mắt, không nằm trong CI.
//
// Storybook 10 chỉ nạp cấu hình ESM - bản CommonJS cũ (`module.exports`) bị từ
// chối ngay khi khởi động, nên tệp này là `.mjs`. `addon-essentials` không còn:
// controls, actions, viewport, backgrounds đã nằm sẵn trong lõi từ bản 9.
import path from 'node:path';
import { mergeConfig } from 'vite';

const dirname = import.meta.dirname;

export default {
  // ⚠️ Extglob phân nhánh bằng `|`, KHÔNG bằng `,`. Mẫu cũ
  // `@(js,jsx,ts,tsx)` khớp ĐÚNG 0 file trong khi 9 story vẫn nằm đó, và
  // Storybook chỉ kêu một dòng WARN rồi mở giao diện rỗng - trông y hệt "chưa
  // ai viết story", chứ không giống một mẫu glob sai.
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [],

  // Logo trong SiteHeader trỏ tới `/brand/logo-mark.png` - đường tuyệt đối tính
  // từ `public/` của app. Storybook không có `public/` nào, nên thiếu dòng này
  // thì header vẫn dựng mà ô logo là ảnh vỡ, và 404 chỉ nằm im trong tab Network.
  staticDirs: [{ from: '../../../apps/frontend-main/public/brand', to: '/brand' }],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },

  // `@tsudev/types` xuất bản dạng CommonJS (`exports.hasAtLeastRole = ...`) và
  // là phụ thuộc LIÊN KẾT workspace, nên Vite phục vụ thẳng file qua /@fs -
  // nơi `import { hasAtLeastRole }` là lỗi cú pháp ESM. Hậu quả trông không
  // giống nguyên nhân chút nào: server lên, `index.json` có đủ story, mà MỌI
  // khung story đều RỖNG - đúng họ với "mã 200 không chứng minh trang có nội
  // dung". Trỏ thẳng vào NGUỒN TypeScript: Vite biên dịch được, và khỏi cần
  // lớp interop nào cả. (`optimizeDeps.include` không cứu được: cache dep của
  // Vite giữ nguyên bản CJS đã dò hỏng.)
  async viteFinal(config) {
    return mergeConfig(config, {
      resolve: {
        alias: {
          '@tsudev/types': path.resolve(dirname, '../../types/src/index.ts'),
        },
      },
    });
  },
};
