# RUN-LOG — 2026-09-25

Chạy tại root repo, Node v22.22.0, darwin/arm64. Không push, không publish. Các lệnh npm đặt NODE_USE_SYSTEM_CA=0 để tránh lỗi Keychain của sandbox; không tắt kiểm tra TLS.

## npm run build

Exit code: 0

```text

> mona-thoi-khoa-bieu@0.1.0 build
> node scripts/build.mjs

Build ESM + CJS + browser IIFE + CLI (offline Node TypeScript stripping; run npm install + npm run typecheck for type checking).
(node:12776) ExperimentalWarning: stripTypeScriptTypes is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
```

## npm test

Exit code: 0

```text

> mona-thoi-khoa-bieu@0.1.0 test
> node --test test/*.test.mjs

TAP version 13
# Subtest: THCS 12 lớp: hard constraints hold across 40 seeds, optimization never worsens score
ok 1 - THCS 12 lớp: hard constraints hold across 40 seeds, optimization never worsens score
  ---
  duration_ms: 646.652583
  type: 'test'
  ...
# Subtest: property: 60 generated feasible instances, sparse class availability and teacher bans
ok 2 - property: 60 generated feasible instances, sparse class availability and teacher bans
  ---
  duration_ms: 37.470542
  type: 'test'
  ...
# Subtest: target workload 30 classes × 45 teachers × 30 slots, five seeds below 5 seconds
ok 3 - target workload 30 classes × 45 teachers × 30 slots, five seeds below 5 seconds
  ---
  duration_ms: 419.568542
  type: 'test'
  ...
# Subtest: three evening periods; reproducible result, no mutation
ok 4 - three evening periods; reproducible result, no mutation
  ---
  duration_ms: 3.050541
  type: 'test'
  ...
# Subtest: 30 full classes with subject-specialist teachers and multi-period assignments
ok 5 - 30 full classes with subject-specialist teachers and multi-period assignments
  ---
  duration_ms: 204.663959
  type: 'test'
  ...
# Subtest: teacher overload reports demand and capacity
ok 6 - teacher overload reports demand and capacity
  ---
  duration_ms: 0.368709
  type: 'test'
  ...
# Subtest: class overload, empty availability, incompatible fixed lessons are infeasible
ok 7 - class overload, empty availability, incompatible fixed lessons are infeasible
  ---
  duration_ms: 0.287083
  type: 'test'
  ...
# Subtest: matching precheck proves shared teacher bottleneck despite individually sufficient domains
ok 8 - matching precheck proves shared teacher bottleneck despite individually sufficient domains
  ---
  duration_ms: 0.126542
  type: 'test'
  ...
# Subtest: timeout is never claimed as infeasibility and never returns a partial schedule
ok 9 - timeout is never claimed as infeasibility and never returns a partial schedule
  ---
  duration_ms: 1.059417
  type: 'test'
  ...
# Subtest: runtime rejects malformed inputs and invalid options
ok 10 - runtime rejects malformed inputs and invalid options
  ---
  duration_ms: 0.760375
  type: 'test'
  ...
# Subtest: all fixed schedule returns success; independent verifier detects tampering
ok 11 - all fixed schedule returns success; independent verifier detects tampering
  ---
  duration_ms: 0.362459
  type: 'test'
  ...
# Subtest: soft scores have auditable weights; gaps and doubles do not cross sessions
ok 12 - soft scores have auditable weights; gaps and doubles do not cross sessions
  ---
  duration_ms: 14.513458
  type: 'test'
  ...
# Subtest: CSV Vietnamese headers, BOM, quoted commas, escaped quotes and multiline records
ok 13 - CSV Vietnamese headers, BOM, quoted commas, escaped quotes and multiline records
  ---
  duration_ms: 22.485875
  type: 'test'
  ...
# Subtest: CSV rejects malformed rows, duplicate normalized headers, unknown teachers and inconsistent subject flags
ok 14 - CSV rejects malformed rows, duplicate normalized headers, unknown teachers and inconsistent subject flags
  ---
  duration_ms: 0.690542
  type: 'test'
  ...
# Subtest: sample CSV files produce 12 classes, 20 teachers and 348 valid periods
ok 15 - sample CSV files produce 12 classes, 20 teachers and 348 valid periods
  ---
  duration_ms: 35.237541
  type: 'test'
  ...
# Subtest: Excel exports contain BOM, CRLF, all classes/teachers and escape formulas
ok 16 - Excel exports contain BOM, CRLF, all classes/teachers and escape formulas
  ---
  duration_ms: 36.840791
  type: 'test'
  ...
# Subtest: HTML contains every class and teacher, escapes user text, A4 landscape print CSS
ok 17 - HTML contains every class and teacher, escapes user text, A4 landscape print CSS
  ---
  duration_ms: 33.066542
  type: 'test'
  ...
# Subtest: ESM, CJS and browser IIFE execute without Node globals in browser core
ok 18 - ESM, CJS and browser IIFE execute without Node globals in browser core
  ---
  duration_ms: 30.0695
  type: 'test'
  ...
# Subtest: CLI JSON + CSV, outputs, help, argument errors, infeasible exit and existing-dir protection
ok 19 - CLI JSON + CSV, outputs, help, argument errors, infeasible exit and existing-dir protection
  ---
  duration_ms: 770.132041
  type: 'test'
  ...
1..19
# tests 19
# suites 0
# pass 19
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1412.044916
```

## npm run lint

Exit code: 0

```text

> mona-thoi-khoa-bieu@0.1.0 lint
> node scripts/lint.mjs

Lint cơ bản và cú pháp 4 bản build: pass.
```

## npm run benchmark

Exit code: 0

```text

> mona-thoi-khoa-bieu@0.1.0 benchmark
> node scripts/benchmark.mjs

{
  "classes": 30,
  "teachers": 45,
  "periods": 900,
  "status": "success",
  "hardErrors": [],
  "seed": 42,
  "elapsedMs": 113.660833,
  "constructionMs": 90.33141699999999,
  "restarts": 0,
  "iterations": 2500,
  "initialPenalty": 1197,
  "penalty": 1135
}
```

## /opt/homebrew/Cellar/node@22/22.22.0_1/bin/node dist/cli.js xep --input examples/thcs/input.json --out ketqua/verify/thcs --seed 42 --time 5000

Exit code: 0

```text
Đã xếp 348 tiết cho 12 lớp, 20 GV.
Điểm phạt mềm: 518; 113 mục còn lại.
Kết quả: ./ketqua/verify/thcs
Thời gian: 41.2 ms (dựng lịch: 20.5 ms).
```

## /opt/homebrew/Cellar/node@22/22.22.0_1/bin/node dist/cli.js xep --lop examples/thcs/lop.csv --phan-cong examples/thcs/phan-cong.csv --ban examples/thcs/ban.csv --out ketqua/verify/csv --seed 42 --time 5000

Exit code: 0

```text
Đã xếp 348 tiết cho 12 lớp, 20 GV.
Điểm phạt mềm: 496; 109 mục còn lại.
Kết quả: ./ketqua/verify/csv
Thời gian: 44.9 ms (dựng lịch: 24.8 ms).
```

## /opt/homebrew/Cellar/node@22/22.22.0_1/bin/node dist/cli.js xep --input examples/trung-tam/input.json --out ketqua/verify/trung-tam --seed 42 --time 5000

Exit code: 0

```text
Đã xếp 14 tiết cho 3 lớp, 2 GV.
Điểm phạt mềm: 24; 3 mục còn lại.
Kết quả: ./ketqua/verify/trung-tam
Thời gian: 19.4 ms (dựng lịch: 1.3 ms).
```

## npm --cache=./.npm-cache pack --dry-run --ignore-scripts

Exit code: 0

```text
mona-thoi-khoa-bieu-0.1.0.tgz
npm notice
npm notice 📦  mona-thoi-khoa-bieu@0.1.0
npm notice Tarball Contents
npm notice 769B CHANGELOG.md
npm notice 1.1kB LICENSE
npm notice 15.5kB README.md
npm notice 41.0kB dist/browser.js
npm notice 3.8kB dist/cli.js
npm notice 40.9kB dist/index.cjs
npm notice 40.9kB dist/index.js
npm notice 1.3kB dist/types/index.d.ts
npm notice 1.8kB dist/types/types.d.ts
npm notice 2.1kB examples/README.md
npm notice 199B examples/thcs/ban.csv
npm notice 26.2kB examples/thcs/input.json
npm notice 180B examples/thcs/lop.csv
npm notice 7.2kB examples/thcs/phan-cong.csv
npm notice 2.0kB examples/trung-tam/input.json
npm notice 1.5kB package.json
npm notice 4.2kB schema/input.schema.json
npm notice Tarball Details
npm notice name: mona-thoi-khoa-bieu
npm notice version: 0.1.0
npm notice filename: mona-thoi-khoa-bieu-0.1.0.tgz
npm notice package size: 48.5 kB
npm notice unpacked size: 190.7 kB
npm notice shasum: 33a2ec911b56d4c0dba8ca3049a5cd53f8992086
npm notice integrity: sha512-716YXEA4jNsvt[...]d6HSaKCFsFP9w==
npm notice total files: 17
npm notice
```

## npm run typecheck

Exit code: 127

```text

> mona-thoi-khoa-bieu@0.1.0 typecheck
> tsc --noEmit

sh: tsc: command not found
```

## Giới hạn môi trường

- Build/test/lint cơ bản/benchmark/CLI/pack dry-run đã chạy trên Node 22.22.0. CI Node 18/20/22 mới được cấu hình, chưa chạy trên GitHub.
- npm install thất bại: `ENOTFOUND registry.npmjs.org`. Đã build bằng TypeScript stripping tích hợp Node 22; chưa chạy được tsc/esbuild và chưa kiểm tra kiểu đầy đủ. Không có package-lock do chưa cài được devDependencies.
- `git init -b feat/engine-xep-thoi-khoa-bieu` thất bại: `.git: Operation not permitted`. Sandbox bảo vệ `.git`; chưa tạo nhánh/commit local.
- Repo không có Beads riêng. `bd prime`/`bd ready` tự tìm database cha và bị chặn quyền; không tiếp tục truy cập repo cha. Chưa tạo/đóng được issue.

## File đã tạo

- `.github/workflows/ci.yml`
- `.gitignore`
- `.npmrc`
- `CHANGELOG.md`
- `LICENSE`
- `README.md`
- `RUN-LOG.md`
- `STATE.md`
- `examples/README.md`
- `examples/thcs/ban.csv`
- `examples/thcs/input.json`
- `examples/thcs/lop.csv`
- `examples/thcs/phan-cong.csv`
- `examples/trung-tam/input.json`
- `package.json`
- `schema/input.schema.json`
- `scripts/benchmark.mjs`
- `scripts/build.mjs`
- `scripts/generate-examples.mjs`
- `scripts/lint.mjs`
- `src/cli.ts`
- `src/csv.ts`
- `src/engine.ts`
- `src/export.ts`
- `src/index.ts`
- `src/offline-api.d.ts`
- `src/score.ts`
- `src/types.ts`
- `src/validation.ts`
- `test/engine.test.mjs`
- `test/io.test.mjs`
- `tsconfig.json`

Build sinh `dist/index.js`, `dist/index.cjs`, `dist/browser.js`, `dist/cli.js`, `dist/types/index.d.ts`, `dist/types/types.d.ts`. Mỗi thư mục `ketqua/verify/{thcs,csv,trung-tam}/` có JSON, hai CSV và HTML. `dist/`, `ketqua/`, cache và log được gitignore.
