// Cấu hình ESLint dạng phẳng (flat config) - thay `.eslintrc.cjs` + `.eslintignore`
// từ phiên 41 (06/11/2026). ESLint 8 hết hỗ trợ; ESLint 10 bỏ hẳn định dạng cũ.
//
// Đích hiện tại là ESLint 9, CHƯA PHẢI 10: `eslint-plugin-react` 7.37 và
// `eslint-plugin-jsx-a11y` 6.10 khai peer tới `^9` là hết. Lên 10 khi hai gói đó
// nhận 10 - gỡ dòng `ignore` của `eslint` trong `.github/dependabot.yml` cùng lúc.
//
// Bản chuyển đổi giữ NGUYÊN tập luật của bản cũ - nghiệm thu: lint toàn repo ra
// 0 lỗi ở cả hai bản trên cùng tập tệp.
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  {
    // ESLint 8 tự bỏ qua mọi thư mục bắt đầu bằng dấu chấm; bản phẳng thì
    // KHÔNG. `.open-next/` và `.wrangler/` là đầu ra dựng của Workers - không
    // liệt kê ở đây là lint cả bundle hàng chục MB.
    ignores: [
      '**/node_modules/',
      '**/.next/',
      '**/.open-next/',
      '**/.wrangler/',
      '**/dist/',
      '**/build/',
      '**/coverage/',
      '**/verify-output/',
      '**/storybook-static/',
      // Sinh tự động bởi Next mỗi lần build; nội dung của nó không phải mã của repo.
      'apps/*/next-env.d.ts',
      // Bản sao chỉ-đọc của bộ quy ước trung tâm - không lint, không sửa.
      '.standards/',
    ],
  },
  {
    files: ['**/*.{js,jsx,cjs,mjs,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node, ...globals.es2021 },
    },
    linterOptions: {
      // ESLint 8 không báo chỉ thị `eslint-disable` thừa; 9 mặc định 'warn'.
      // Giữ hành vi cũ ở bước chuyển định dạng - dọn chúng là việc riêng.
      reportUnusedDisableDirectives: 'off',
    },
    settings: { react: { version: 'detect' } },
  },
  js.configs.recommended,
  react.configs.flat.recommended,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.flat['recommended-latest'].rules,
  },
  jsxA11y.flatConfigs.recommended,
  ...tsPlugin.configs['flat/recommended'],
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { parser: tsParser },
  },
  {
    rules: {
      'react/react-in-jsx-scope': 'off',

      // TẮT CÓ CHỦ ĐÍCH - đây là quyết định chính sách, không phải "đã sửa".
      //
      // Repo chưa bao giờ phụ thuộc `prop-types`: luật này kêu ở 271 chỗ khi
      // còn là JS thuần. Kiểu dữ liệu của props nay do TypeScript canh, không
      // phải PropTypes; bật luật chỉ khiến CI đỏ vĩnh viễn và che mất lỗi thật.
      'react/prop-types': 'off',

      // typescript-eslint 8 đổi mặc định `caughtErrors` từ 'none' sang 'all': mọi
      // `catch (e) { /* bỏ qua có chủ đích */ }` thành lỗi (32 chỗ). Giữ ngữ nghĩa
      // của v6 thay vì rải `catch {}` khắp repo chỉ vì một lần nâng phiên bản.
      '@typescript-eslint/no-unused-vars': ['error', { caughtErrors: 'none' }],

      // Mặc định luật này chỉ tha `role="tabpanel"`. Thêm `region` vì quy ước
      // DATA_TABLE.md mục 7 BUỘC vùng bảng cuộn ngang phải có `tabindex="0"` kèm
      // nhãn - không có nó thì người dùng bàn phím không cuộn ngang được để nhìn
      // các cột bên phải (WCAG 2.1.1). Ở đây `tabindex` trên phần tử không tương
      // tác là ĐÚNG, không phải sơ suất, nên nới đúng một vai trò thay vì tắt luật
      // hoặc rải `eslint-disable` ở từng bảng.
      'jsx-a11y/no-noninteractive-tabindex': [
        'error',
        { tags: [], roles: ['tabpanel', 'region'], allowExpressionValues: true },
      ],
    },
  },
  {
    // Các script là CommonJS thuần. Luật no-require-imports sinh ra để chặn
    // `require()` lọt vào mã TypeScript, nhưng ở đây nó kêu trên mọi tệp .js
    // đúng chuẩn - hơn 40 lỗi giả làm chìm mất lỗi thật.
    //
    // `services/**/*.ts` cũng được miễn, nhưng vì LÝ DO KHÁC: những require()
    // còn sót lại trong service đều là require CÓ ĐIỀU KIỆN, nằm trong
    // try/catch (observability, authMiddleware) hoặc chỉ chạy vì tác dụng phụ
    // (source-map-support, dotenv). Chuyển chúng thành `import` là đổi hành vi
    // - import bị nâng lên đầu và ném lỗi lúc nạp module, đúng thứ mà các
    // try/catch đó sinh ra để tránh.
    files: ['**/*.js', '**/*.cjs', 'services/**/*.ts'],
    languageOptions: {
      // `.js`/`.cjs` của repo là CommonJS; bản cũ khai 'module' cho mọi tệp,
      // giữ nguyên để không phát sinh lỗi phân tích ở tệp lẫn `import`.
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['**/test/**', '**/*.test.{js,ts,tsx}', '**/*.spec.{js,ts}'],
    languageOptions: { globals: { ...globals.jest } },
  },
];
