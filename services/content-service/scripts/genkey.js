#!/usr/bin/env node
'use strict'
// Sinh cặp khoá Ed25519 ký bản phát hành (ProjectRelease.signature).
//   node services/content-service/scripts/genkey.js
// In ra các dòng để dán vào .env (hoặc secret manager của nền tảng triển khai).
// Khoá riêng KHÔNG được commit; lộ nó là giả được chữ ký mọi bản phát hành.
//
// XOAY KHOÁ: chạy lại lệnh này, đặt khoá mới vào RELEASE_SIGNING_KEY, rồi CHUYỂN
// khoá cũ sang RELEASE_SIGNING_KEYS_RETIRED (chỉ cần phần công khai - xem dòng in
// ra ở cuối). Bỏ qua bước thứ hai thì mọi bản phát hành đã ký lập tức báo "không
// có khoá công khai".
const crypto = require('crypto')

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')
const privPem = privateKey.export({ format: 'pem', type: 'pkcs8' })
const pubPem = publicKey.export({ format: 'pem', type: 'spki' })
const kid = `tsu-${new Date().toISOString().slice(0, 7)}-${crypto.randomBytes(3).toString('hex')}`

console.log('# Khoá đang ký - dán vào .env (giá trị là PEM PKCS#8 đã base64 hoá)')
console.log(`RELEASE_SIGNING_KEY=${Buffer.from(privPem).toString('base64')}`)
console.log(`RELEASE_SIGNING_KEY_ID=${kid}`)
console.log('')
console.log('# Khi xoay sang khoá khác, thêm mục này vào RELEASE_SIGNING_KEYS_RETIRED')
console.log('# (nhiều mục ngăn nhau bằng dấu phẩy) để bản phát hành đã ký vẫn xác minh được:')
console.log(`#   ${kid}:${Buffer.from(pubPem).toString('base64')}`)
console.log('')
console.log('# Khoá công khai dạng JWK (chỉ để đối chiếu, service tự suy ra được):')
console.log(`#   ${JSON.stringify(publicKey.export({ format: 'jwk' }))}`)
