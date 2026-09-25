import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';
import { inputFromCsv, parseCsv, encodeCsv, xepThoiKhoaBieu, toCsv, toHtml, checkHardConstraints } from '../dist/index.js';

const school = JSON.parse(readFileSync('examples/thcs/input.json', 'utf8'));
const centre = JSON.parse(readFileSync('examples/trung-tam/input.json', 'utf8'));
test('CSV Vietnamese headers, BOM, quoted commas, escaped quotes and multiline records', () => {
  const text = '\uFEFFLớp,Môn,Giáo viên,Số tiết,Tiết đôi\r\n6A1,"Văn, đọc","Lan ""A""",2,có\r\n6A2,"Khoa học\ntự nhiên",Nam,1,không\r\n';
  const rows = parseCsv(text); assert.equal(rows[0].giao_vien, 'Lan "A"'); assert.equal(rows[1].mon, 'Khoa học\ntự nhiên');
  const input = inputFromCsv({ lop: 'Lớp\n6A1\n6A2', phanCong: text, ban: 'Giáo viên;Thứ;Tiết\nNam;3;2' });
  assert.equal(input.subjects[0].double, true); assert.equal(input.subjects[1].double, false);
  assert.equal(input.teachers[1].unavailable[0].day, 3);
  const result = xepThoiKhoaBieu(input); assert.equal(result.status, 'success'); assert.deepEqual(checkHardConstraints(input, result.lessons), []);
});
test('CSV rejects malformed rows, duplicate normalized headers, unknown teachers and inconsistent subject flags', () => {
  for (const text of ['lop,lop\na,b', 'Lớp,lop\na,b', 'a,b\nx', 'a\n"missing', 'a\n"x"bad', 'a\na"b']) assert.throws(() => parseCsv(text));
  const files = { lop: 'lop\nA', phanCong: 'lop,mon,giao_vien,so_tiet,tiet_doi\nA,Toán,Lan,2,true' };
  assert.throws(() => inputFromCsv({ ...files, ban: 'giao_vien,thu,tiet\nKhác,2,1' }), /chưa có/);
  assert.throws(() => inputFromCsv({ ...files, phanCong: files.phanCong + '\nA,Toán,Nam,1,false' }), /không nhất quán/);
  assert.throws(() => inputFromCsv({ ...files, phanCong: files.phanCong.replace('2,true', '2.5,true') }), /số nguyên/);
  assert.throws(() => inputFromCsv({ ...files, phanCong: files.phanCong.replace('2,true', '2,maybe') }), /true\/false/);
});
test('sample CSV files produce 12 classes, 20 teachers and 348 valid periods', () => {
  const input = inputFromCsv({ lop: readFileSync('examples/thcs/lop.csv', 'utf8'), phanCong: readFileSync('examples/thcs/phan-cong.csv', 'utf8'), ban: readFileSync('examples/thcs/ban.csv', 'utf8') });
  const r = xepThoiKhoaBieu(input); assert.equal(r.status, 'success'); assert.equal(r.lessons.length, 348); assert.equal(input.teachers.length, 20); assert.deepEqual(checkHardConstraints(input, r.lessons), []);
});
test('Excel exports contain BOM, CRLF, all classes/teachers and escape formulas', () => {
  const r = xepThoiKhoaBieu(school);
  const classes = toCsv(school, r), teachers = toCsv(school, r, 'teacher');
  assert.ok(classes.startsWith('\uFEFF')); assert.ok(classes.includes('\r\n'));
  assert.equal(parseCsv(classes).length, 12 * 30); assert.equal(parseCsv(teachers).length, 20 * 30);
  assert.equal(new Set(parseCsv(classes).map(r => r.lop)).size, 12);
  assert.equal(new Set(parseCsv(teachers).map(r => r.giao_vien)).size, 20);
  assert.match(encodeCsv([['=HYPERLINK("bad")', '+SUM(1)', '-2', '@bad']]), /'=HYPERLINK/);
  assert.throws(() => toCsv(school, { status: 'timeout' }), /success/);
});
test('HTML contains every class and teacher, escapes user text, A4 landscape print CSS', () => {
  const input = structuredClone(school); input.classes[0].name = '<script>alert("x")</script>';
  const html = toHtml(input, xepThoiKhoaBieu(input), '<img src=x onerror=alert(1)>');
  assert.equal((html.match(/data-kind="class"/g) ?? []).length, 12); assert.equal((html.match(/data-kind="teacher"/g) ?? []).length, 20);
  for (const c of school.classes) assert.ok(html.includes(`data-id="${c.id}"`));
  assert.ok(!html.includes('<script>')); assert.ok(html.includes('&lt;script&gt;')); assert.ok(html.includes('&lt;img')); assert.match(html, /size:A4 landscape/);
});
test('ESM, CJS and browser IIFE execute without Node globals in browser core', () => {
  const require = createRequire(import.meta.url); const cjs = require('../dist/index.cjs');
  assert.equal(cjs.xepThoiKhoaBieu(centre).status, 'success');
  const context = vm.createContext({ performance });
  vm.runInContext(readFileSync('dist/browser.js', 'utf8'), context);
  const browserResult = context.MonaThoiKhoaBieu.xepThoiKhoaBieu(centre, { seed: 42 });
  assert.equal(browserResult.status, 'success'); assert.deepEqual(checkHardConstraints(centre, browserResult.lessons), []);
});
test('CLI JSON + CSV, outputs, help, argument errors, infeasible exit and existing-dir protection', () => {
  const temp = mkdtempSync(resolve('test/.cli-'));
  const run = args => spawnSync(process.execPath, ['dist/cli.js', ...args], { encoding: 'utf8' });
  try {
    const jsonOut = join(temp, 'json');
    const success = run(['xep', '--input', 'examples/trung-tam/input.json', '--out', jsonOut]);
    assert.equal(success.status, 0, success.stderr); assert.match(success.stdout, /Đã xếp 14 tiết/);
    assert.equal(JSON.parse(readFileSync(join(jsonOut, 'ketqua.json'), 'utf8')).status, 'success');
    for (const file of ['theo-lop.csv', 'theo-giao-vien.csv', 'thoikhoabieu.html']) assert.ok(readFileSync(join(jsonOut, file)).length);
    assert.equal(run(['xep', '--input', 'examples/trung-tam/input.json', '--out', jsonOut]).status, 2);
    assert.equal(run(['xep', '--lop', 'examples/thcs/lop.csv', '--phan-cong', 'examples/thcs/phan-cong.csv', '--ban', 'examples/thcs/ban.csv', '--out', join(temp, 'csv')]).status, 0);
    for (const args of [['xep'], ['xep', '--seed'], ['xep', '--typo', '1'], ['oops'], ['xep', '--input', 'a', '--lop', 'b', '--out', 'c']]) assert.equal(run(args).status, 2);
    assert.equal(run(['--help']).status, 0); assert.equal(run(['--version']).stdout.trim(), '0.1.0');
    const impossible = structuredClone(centre); impossible.assignments[0].periods = 100;
    writeFileSync(join(temp, 'bad.json'), JSON.stringify(impossible));
    const failure = run(['xep', '--input', join(temp, 'bad.json'), '--out', join(temp, 'failure')]);
    assert.equal(failure.status, 1); assert.match(failure.stderr, /infeasible/);
    assert.equal(JSON.parse(readFileSync(join(temp, 'failure/ketqua.json'), 'utf8')).lessons.length, 0);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
