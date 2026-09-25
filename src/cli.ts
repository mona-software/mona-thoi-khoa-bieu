import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { inputFromCsv, toCsv, toHtml, xepThoiKhoaBieu } from './index';
import type { TimetableInput } from './types';

const help = `mona-thoi-khoa-bieu v0.1.0
  xep --lop lop.csv --phan-cong phan-cong.csv [--ban ban.csv] --out ketqua/ [--seed 42] [--time 5000]
  xep --input truong.json --out ketqua/ [--seed 42] [--time 5000]
--time: số mili giây; --seed: số nguyên 0–4294967295.
JSON hỗ trợ tiết cố định, lịch chiều/tối và giờ học riêng từng lớp.
Exit: 0 thành công; 1 không xếp được; 2 đầu vào/thao tác file không hợp lệ.`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) { console.log(help); return; }
  if (args.length === 1 && args[0] === '--version') { console.log('0.1.0'); return; }
  if (args.shift() !== 'xep') throw new Error('Lệnh hợp lệ: xep. Dùng --help để xem cú pháp.');
  const flags = new Map<string, string>(), supported = new Set(['--lop', '--phan-cong', '--ban', '--input', '--out', '--seed', '--time']);
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i], value = args[i + 1];
    if (!supported.has(key) || !value || value.startsWith('--') || flags.has(key)) throw new Error(`Tham số không hợp lệ/trùng/thiếu giá trị: ${key}`);
    flags.set(key, value);
  }
  if (!flags.has('--out')) throw new Error('Cần --out chỉ thư mục kết quả.');
  let input: TimetableInput;
  if (flags.has('--input')) {
    if (['--lop', '--phan-cong', '--ban'].some(k => flags.has(k))) throw new Error('Dùng --input hoặc bộ CSV, không trộn hai cách.');
    input = JSON.parse(await readFile(flags.get('--input')!, 'utf8')) as TimetableInput;
  } else {
    if (!flags.has('--lop') || !flags.has('--phan-cong')) throw new Error('Cần --input hoặc cả --lop và --phan-cong.');
    const [lop, phanCong, ban] = await Promise.all([readFile(flags.get('--lop')!, 'utf8'), readFile(flags.get('--phan-cong')!, 'utf8'), flags.has('--ban') ? readFile(flags.get('--ban')!, 'utf8') : Promise.resolve('')]);
    input = inputFromCsv({ lop, phanCong, ban });
  }
  const result = xepThoiKhoaBieu(input, { seed: flags.has('--seed') ? Number(flags.get('--seed')) : undefined, timeLimitMs: flags.has('--time') ? Number(flags.get('--time')) : undefined });
  const out = resolve(flags.get('--out')!);
  // Refuse existing output directories so a failed run cannot leave stale successful exports.
  await mkdir(dirname(out), { recursive: true });
  await mkdir(out, { recursive: false });
  await writeFile(resolve(out, 'ketqua.json'), JSON.stringify(result, null, 2) + '\n');
  if (result.status === 'success') {
    await Promise.all([
      writeFile(resolve(out, 'theo-lop.csv'), toCsv(input, result, 'class')),
      writeFile(resolve(out, 'theo-giao-vien.csv'), toCsv(input, result, 'teacher')),
      writeFile(resolve(out, 'thoikhoabieu.html'), toHtml(input, result)),
    ]);
    console.log(`Đã xếp ${result.lessons.length} tiết cho ${input.classes.length} lớp, ${input.teachers.length} GV.\nĐiểm phạt mềm: ${result.penalty}; ${result.violations.length} mục còn lại.\nKết quả: ${out}\nThời gian: ${result.stats.elapsedMs.toFixed(1)} ms (dựng lịch: ${result.stats.constructionMs.toFixed(1)} ms).`);
  } else {
    console.error(`${result.status}: ${result.reasons.join('\n')}\nBáo cáo: ${resolve(out, 'ketqua.json')}`);
    process.exitCode = 1;
  }
}
main().catch((error: unknown) => { console.error(`Lỗi: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 2; });
