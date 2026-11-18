# Contributing to TsuDEV - Đóng góp cho TsuDEV

_Tiếng Việt ở dưới. Issues and pull requests are welcome in English or Vietnamese._

## English

TsuDEV is the website `tsudev.com` (Next.js on Cloudflare Workers) and its backend services (Express + Prisma on
PostgreSQL). It is deployed continuously from `main`.

- **Bugs and feature requests**: open an issue with the _Bug report_ or _Feature request_ form:
  <https://github.com/tsudev-org/tsudev/issues/new/choose>.
- **Security vulnerabilities**: never in a public issue - report privately as described in
  [`.github/SECURITY.md`](.github/SECURITY.md).

### Pull requests

1. Open an issue first for anything larger than a typo, so we can agree on the approach.
2. One change per pull request. Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).
3. **Tests are required.** A change in behaviour comes with a test in the same pull request (unit tests next to the
   service or app in `services/*/test`, `apps/frontend-main/test`, `packages/*/test`; end-to-end tests in
   `e2e/tests`). A bug fix comes with a regression test that fails without the fix.
4. All CI checks on `main` must pass: formatting (`npm run format:check`), lint with zero warnings (`npm run lint`),
   type checking (`npm run typecheck`), unit and E2E tests, CodeQL, gitleaks and `npm audit`.
5. Pull requests that touch the license, attribution, brand or install scripts need approval from the code owners
   ([`.github/CODEOWNERS`](.github/CODEOWNERS), [`docs/ban-quyen.md`](docs/ban-quyen.md)).
6. By contributing you agree your work is licensed under the [Apache License 2.0](LICENSE).

### Running locally and testing

See [`docs/development.md`](docs/development.md) and [`docs/testing.md`](docs/testing.md). Tests run per workspace,
for example `npm --workspace services/auth-service test`.

### Versions

Every production deployment of `main` is tagged `vYYYY.MM.DD.N` (calendar versioning) by
[`scripts/release-tag.js`](scripts/release-tag.js); the tag message lists the pull requests it contains, and
[`CHANGELOG.md`](CHANGELOG.md) summarises each tagged deployment.

## Tiếng Việt

- Báo lỗi / đề xuất: mở issue theo mẫu. Lỗ hổng bảo mật: KHÔNG mở issue công khai - báo riêng theo
  [`.github/SECURITY.md`](.github/SECURITY.md).
- Mỗi PR một thay đổi, commit theo Conventional Commits. **Thay đổi hành vi phải kèm test trong cùng PR**; sửa lỗi
  kèm test hồi quy (đỏ khi chưa sửa). Mọi check CI của `main` phải xanh (định dạng, lint không cảnh báo, kiểm kiểu,
  test, CodeQL, gitleaks, `npm audit`).
- PR chạm giấy phép, ghi công, nhận diện hay script cài cần chủ sở hữu duyệt (`docs/ban-quyen.md`).
- Quy ước chi tiết cho người và agent: [`AGENTS.md`](AGENTS.md), [`docs/development.md`](docs/development.md).
