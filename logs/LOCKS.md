# LOCKS.md - File đang bị khóa (kiểm tra TRƯỚC khi sửa bất kỳ file nào)

# Định dạng: <đường dẫn> | <agent/nhiệm vụ> | <HH:mm DD/MM/YYYY>

# Sửa xong file → XÓA dòng khóa của mình.

apps/id/, apps/frontend-main/{pages/login,signup,forgot-password,reset-password,verify-email,confirm-email-change,revoke-sessions,settings/security,oidc,api/versions,api/auth,api/oidc-consent}*, apps/console/next.config.js, services/auth-service/src/{oidc,passkey,index}.ts, services/content-service/src/index.ts (versions), packages/identity-token/, packages/auth/src/{index,edge}.ts, config/topology.json, scripts/{run-dev,deploy-frontend,check-public-bundle,write-env-local,typecheck-ts7}.js, .github/workflows/ci.yml, infrastructure/canh-site-cron/ | tsudev-CP4 | 11:05 27/11/2026
