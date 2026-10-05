# mona-thoi-khoa-bieu

A TypeScript engine and CLI that builds weekly timetables for Vietnamese schools and training centers, with exact teaching loads, no class or teacher clashes, teacher unavailability and fixed lessons.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

The tool targets Vietnamese schools: the default calendar follows the Vietnamese school week (Monday to Saturday, numbered 2–7), and the CLI, CSV column names and exports use Vietnamese. It has no runtime dependencies, runs on Node.js 18+ or in the browser, and exports JSON, Excel-friendly CSV and landscape A4 HTML. A web version is available at [mona.media/tao-thoi-khoa-bieu-online](https://mona.media/tao-thoi-khoa-bieu-online/).

![Timetable for classes 6A1 and 6A2, exported as landscape A4 HTML](docs/tkb-lop.png)

## Install

```sh
git clone https://github.com/mona-software/mona-thoi-khoa-bieu
cd mona-thoi-khoa-bieu
npm install
npm run build
```

With devDependencies installed, the build uses TypeScript and esbuild and type-checks the code; Node 18 and 20 need this path to build from source. Without network access, Node 22.13+ can run `npm run build` using built-in TypeScript type stripping; this produces the same ESM, CJS, IIFE and CLI outputs and declarations but does not type-check. The built files run on Node 18+.

## Quick start

```sh
node dist/cli.js xep --input examples/thcs/input.json --out ketqua/thcs --seed 42 --time 5000
```

```text
Đã xếp 348 tiết cho 12 lớp, 20 GV.
Điểm phạt mềm: 518; 113 mục còn lại.
Kết quả: …/ketqua/thcs
Thời gian: 52.6 ms (dựng lịch: 27.0 ms).
```

That is: 348 lessons placed for 12 classes and 20 teachers, soft penalty 518 across 113 remaining soft violations. The soft score can differ if the time budget cuts optimization short; timing varies by machine.

## CLI

```sh
# From three CSV files
node dist/cli.js xep --lop examples/thcs/lop.csv --phan-cong examples/thcs/phan-cong.csv --ban examples/thcs/ban.csv --out ketqua/csv --seed 42 --time 5000

# From JSON (language center with three evening sessions)
node dist/cli.js xep --input examples/trung-tam/input.json --out ketqua/trung-tam --seed 42 --time 5000
```

| Option | Description |
| --- | --- |
| `xep` | The only command (schedule) |
| `--input <file.json>` | JSON input; cannot be combined with the CSV options |
| `--lop <file.csv>` | Classes CSV |
| `--phan-cong <file.csv>` | Teaching assignments CSV |
| `--ban <file.csv>` | Optional teacher unavailability CSV |
| `--out <dir>` | Output directory; must not exist yet (parent directories are created) |
| `--seed <n>` | Integer 0–4294967295, default `42` |
| `--time <ms>` | Time budget in milliseconds, default `5000` |
| `--help`, `--version` | Help and version |

The CLI refuses to write into an existing directory so a failed run cannot be confused with an earlier report.

Output files:

| File | Contents |
| --- | --- |
| `ketqua.json` | `status`, `lessons`, `penalty`, `violations`, `reasons`, `stats`. Only this file is written when scheduling fails. |
| `theo-lop.csv` | One row per class/day/period with subject, teacher and fixed flag, including empty slots |
| `theo-giao-vien.csv` | One row per teacher/day/period with subject and class, including empty slots |
| `thoikhoabieu.html` | Tables per class and per teacher, landscape A4 print CSS, user content escaped |

CSV exports use a UTF-8 BOM and CRLF line endings for Excel; values starting with a formula character are prefixed with `'`. JSON keeps the original IDs; CSV and HTML use display names when provided.

Exit codes: `0` success, `1` no timetable found, `2` invalid input or file error.

## Library API

```ts
import {
  xepThoiKhoaBieu, checkHardConstraints, toCsv, toHtml,
  type TimetableInput,
} from 'mona-thoi-khoa-bieu';

const input: TimetableInput = {
  classes: [{ id: '6A1' }],
  teachers: [{ id: 'Lan', unavailable: [{ day: 3, period: 1 }] }],
  subjects: [{ id: 'Toan', name: 'Toán', double: true, heavy: true }],
  assignments: [{ classId: '6A1', subjectId: 'Toan', teacherId: 'Lan', periods: 4 }],
  fixed: [{ classId: '6A1', subjectId: 'Toan', teacherId: 'Lan', day: 2, period: 1 }],
};

const result = xepThoiKhoaBieu(input, {
  seed: 42,
  timeLimitMs: 5000,
  maxIterations: 2500,
  maxRestarts: 20,
  weights: { dailyLimit: 20, double: 8, gaps: 3, spread: 4, heavy: 2 },
});

if (result.status === 'success') {
  console.log(checkHardConstraints(input, result.lessons)); // []
  console.log(result.penalty, result.violations);
  const csvByClass = toCsv(input, result, 'class');
  const csvByTeacher = toCsv(input, result, 'teacher');
  const html = toHtml(input, result, 'Thời khóa biểu học kỳ I');
  // Write the strings to files in Node, or download them via a Blob in the browser.
} else {
  console.log(result.status, result.reasons);
}
```

Other exports: `inputFromCsv`, `parseCsv`, `encodeCsv`, `validateInput`, `scoreTimetable`, `InputError`, `DEFAULT_CALENDAR`, `DEFAULT_WEIGHTS`.

CommonJS: `const { xepThoiKhoaBieu } = require('mona-thoi-khoa-bieu')`.

Browser: import from `./dist/index.js` as ESM, or load `<script src="./dist/browser.js"></script>` and call `MonaThoiKhoaBieu.xepThoiKhoaBieu(input)`. The engine is synchronous, so run it in a Web Worker to keep the UI responsive. The core does not use `fs`, `process`, `Buffer` or other Node APIs.

## JSON input

Full schema: [`schema/input.schema.json`](schema/input.schema.json). Examples: [`examples/thcs/input.json`](examples/thcs/input.json), [`examples/trung-tam/input.json`](examples/trung-tam/input.json).

| Field | Contents |
| --- | --- |
| `calendar` | Optional `{ days, periods }`. Default: days 2–7 (Monday–Saturday), 5 morning periods. `days` uses 2–8, where 8 is Sunday. |
| `calendar.periods` | Each period is `{ id, session, label? }`. `id` is a unique positive integer; array order is teaching order. Periods of the same `session` must be contiguous. |
| `classes` | `{ id, name?, available?: [{ day, period }] }`. Without `available` the class can use every slot; `[]` means none. |
| `teachers` | `{ id, name?, unavailable?: [{ day, period }] }` |
| `subjects` | `{ id, name?, double?, heavy?, maxPerDay? }`. Defaults: `double=false`, `heavy=false`, `maxPerDay=2`. |
| `assignments` | `{ classId, subjectId, teacherId, periods }` with a positive integer `periods`. Each class/subject/teacher combination appears once. |
| `fixed` | `{ classId, subjectId, teacherId, day, period }`. Each fixed lesson must belong to an assignment and is counted within its `periods`. |

`classes`, `teachers`, `subjects` and `assignments` must be non-empty. IDs are non-empty strings, unique within each group, and may contain Vietnamese characters. Every slot must exist in the calendar. The engine validates structure and references at run time; the schema also rejects unknown properties to catch typos.

For afternoon sessions, add separate period IDs such as `{ "id": 6, "session": "chieu" }`. A double lesson must be two consecutive periods in the same session, with the same class, subject and teacher. Heavy subjects are declared with `heavy: true`.

## CSV input

`lop.csv` (classes):

```csv
lop,ten_lop
6A1,Lớp 6A1
6A2,Lớp 6A2
```

`phan-cong.csv` (assignments):

```csv
lop,mon,giao_vien,so_tiet,tiet_doi,mon_nang,toi_da_moi_ngay
6A1,Toán,Lan,4,true,true,2
6A2,Toán,Lan,4,true,true,2
```

`ban.csv` (teacher unavailability):

```csv
giao_vien,thu,tiet
Lan,3,1
Lan,3,2
```

Required assignment columns: `lop` (class), `mon` (subject), `giao_vien` (teacher), `so_tiet` (periods per week). Optional: `tiet_doi` (double lesson), `mon_nang` (heavy subject), `toi_da_moi_ngay` (max per day). Booleans accept `true/false`, `1/0`, `có/không`, `co/khong`. Settings for the same subject must match across rows. Teachers and subjects are created from the assignments; unavailability rows must reference existing teachers.

The parser accepts UTF-8 with or without BOM, comma or semicolon separators, CRLF or LF, quoted cells containing separators or newlines, and `""` escapes. Accented headers such as `Giáo viên`, `Số tiết`, `Tiết đôi` are normalized to the unaccented column names; cell values keep their Unicode. Rows with the wrong column count or broken quotes raise an error.

The library equivalent is `inputFromCsv({ lop, phanCong, ban })`. The CSV format uses the default calendar; for fixed lessons, afternoon/evening sessions or per-class availability, use JSON or add those fields after calling `inputFromCsv`.

## Algorithm

1. Feasibility checks: total periods against class and teacher capacity, each assignment's available slots, fixed lessons, and slot matching per class and teacher to detect over-subscribed groups.
2. Greedy construction: assignments with the fewest free slots relative to required periods go first, preferring slots with lower soft penalty. When stuck, a bounded search relocates chains of lessons and rolls back on failure. Fixed lessons never move.
3. Simulated annealing: swaps two lessons of the same class or moves a lesson into an empty slot. Every move keeps all hard constraints. The best timetable seen is returned and re-checked independently.

| `status` | Meaning |
| --- | --- |
| `success` | Complete and valid; soft penalties may remain. |
| `infeasible` | A necessary check proved a conflict, with a specific reason (e.g. teacher Lan is assigned 32 periods but has only 30 free slots). |
| `timeout` | Construction did not finish within the budget; this does not prove infeasibility. |
| `search_exhausted` | All restarts were used without a timetable; this does not prove infeasibility. |

Structurally invalid input throws `InputError`. On failure, `lessons` is `[]` and `penalty` is `null`; partial timetables are never returned. If construction succeeds but optimization runs out of time, the best valid timetable is returned with `status: "success"`.

Defaults: `seed=42` (integer 0–2³²−1), `timeLimitMs=5000`, `maxIterations=2500`, `maxRestarts=20` (including the first construction). The same input, seed and iteration counts produce the same timetable. The time budget can stop at different iterations on different machines; for reproducible comparisons, fix `maxIterations`/`maxRestarts` and allow enough time. `maxIterations=0` only constructs.

### Soft penalties

Penalty = sum of `units × weight`. Each violation reports `type`, the related class/teacher/subject/day, `units`, `penalty` and `message`.

| Type | Unit | Default weight |
| --- | --- | ---: |
| `dailyLimit` | Periods above the subject's `maxPerDay` for a class on a day | 20 |
| `double` | Pairs missing relative to `floor(total periods ÷ 2)` when `double=true` | 8 |
| `gaps` | Empty slots between two of a teacher's lessons in the same day and session | 3 |
| `spread` | Half the excess of the sum of squared daily counts over the most even distribution | 4 |
| `heavy` | Lessons of a `heavy=true` subject placed after the first three periods of a session | 2 |

Double lessons and even spread can compete; adjust weights to match the school's priorities. Weights must be non-negative; a weight of 0 removes the effect on the score but violations are still reported. Soft constraints never cause hard-constraint violations.

## Performance and limitations

- `npm run benchmark` runs a synthetic, known-feasible case with 30 classes, 45 teachers and 900 lessons per week; measurements are recorded in [RUN-LOG.md](RUN-LOG.md). This does not guarantee that every 900-lesson input is solvable within 5 seconds.
- The search is bounded; it cannot prove infeasibility or global optimality in every case. On `timeout` or `search_exhausted`, increase time or iterations, or change the seed.
- The deadline is checked between search steps, not enforced in real time. Validation, one search step and report generation can slightly exceed the budget. CLI file I/O is not counted in `timeLimitMs`.
- Not modeled: rooms, co-teaching, overlapping sessions measured in minutes, alternating A/B weeks, holidays and multi-week schedules. All classes share the same slot grid.
- A teacher gap includes slots the teacher marked as unavailable between two lessons in the same session. Double lessons are a soft preference; both lessons of a pair must have the same teacher.
- The lower-secondary (THCS) example uses illustrative figures based on the 2018 general education curriculum subject groups, not an official program plan. See the [example data notes](examples/README.md).

## Development

```sh
npm install
npm run build && npm test
npm run lint
npm run typecheck
npm run benchmark
```

Tests use `node --test` and cover many seeds on the sample school, generated feasible datasets and 900-lesson cases, with independent checks for clashes, exact loads, unavailability and fixed lessons, plus infeasible input, timeouts, accented CSV, HTML and the CLI. The browser bundle is tested in a JS context without Node globals. CI runs on Node 18, 20 and 22.

Issues and pull requests should include anonymized input, the seed, the time budget and the expected result. Engine changes need a test that demonstrates the bug or new constraint, and must pass build, test, lint and typecheck. The algorithm is implemented in this repository without an external solver.

## License

MIT, see [LICENSE](LICENSE).

**`mona-thoi-khoa-bieu` is a product of MONA Software, a member of The MONA Group.**
