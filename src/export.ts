import type { TimetableInput, TimetableResult } from './types';
import { calendarOf, InputError } from './validation';
import { encodeCsv } from './csv';

function requireSuccess(result: TimetableResult): void {
  if (result.status !== 'success') throw new InputError('Chỉ xuất bảng TKB khi status = success.');
}
export function toCsv(input: TimetableInput, result: TimetableResult, groupBy: 'class' | 'teacher' = 'class'): string {
  requireSuccess(result);
  if (groupBy !== 'class' && groupBy !== 'teacher') throw new InputError('groupBy phải là class hoặc teacher.');
  const calendar = calendarOf(input);
  const subjects = new Map(input.subjects.map(s => [s.id, s.name ?? s.id]));
  const groups = groupBy === 'class' ? input.classes : input.teachers;
  const names = new Map((groupBy === 'class' ? input.teachers : input.classes).map(x => [x.id, x.name ?? x.id]));
  const rows: (string | number)[][] = [[groupBy === 'class' ? 'lop' : 'giao_vien', 'thu', 'tiet', 'mon', groupBy === 'class' ? 'giao_vien' : 'lop', 'co_dinh']];
  for (const group of groups) for (const day of calendar.days) for (const period of calendar.periods) {
    const lesson = result.lessons.find(l => (groupBy === 'class' ? l.classId : l.teacherId) === group.id && l.day === day && l.period === period.id);
    rows.push([group.name ?? group.id, day, period.id, lesson ? subjects.get(lesson.subjectId)! : '', lesson ? names.get(groupBy === 'class' ? lesson.teacherId : lesson.classId)! : '', lesson ? (lesson.fixed ? '1' : '0') : '']);
  }
  return encodeCsv(rows);
}
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
export function toHtml(input: TimetableInput, result: TimetableResult, title = 'Thời khóa biểu'): string {
  requireSuccess(result);
  const calendar = calendarOf(input), subjects = new Map(input.subjects.map(s => [s.id, s.name ?? s.id]));
  const dayLabel = (day: number) => day === 8 ? 'Chủ nhật' : `Thứ ${day}`;
  let sections = '';
  for (const kind of ['class', 'teacher'] as const) {
    const groups = kind === 'class' ? input.classes : input.teachers;
    const names = new Map((kind === 'class' ? input.teachers : input.classes).map(x => [x.id, x.name ?? x.id]));
    for (const group of groups) {
      sections += `<section data-kind="${kind}" data-id="${escapeHtml(group.id)}"><h2>${kind === 'class' ? 'Lớp' : 'Giáo viên'} ${escapeHtml(group.name ?? group.id)}</h2><table><thead><tr><th scope="col">Tiết</th>${calendar.days.map(d => `<th scope="col">${dayLabel(d)}</th>`).join('')}</tr></thead><tbody>`;
      for (const period of calendar.periods) {
        sections += `<tr><th scope="row">${escapeHtml(period.label ?? String(period.id))}<small>${escapeHtml(period.session)}</small></th>`;
        for (const day of calendar.days) {
          const l = result.lessons.find(l => (kind === 'class' ? l.classId : l.teacherId) === group.id && l.day === day && l.period === period.id);
          sections += l ? `<td${l.fixed ? ' class="fixed"' : ''}><strong>${escapeHtml(subjects.get(l.subjectId)!)}</strong><small>${escapeHtml(names.get(kind === 'class' ? l.teacherId : l.classId)!)}</small>${l.fixed ? '<small>Cố định</small>' : ''}</td>` : '<td aria-label="Trống">—</td>';
        }
        sections += '</tr>';
      }
      sections += '</tbody></table></section>';
    }
  }
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title>
<style>
*{box-sizing:border-box}body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#17252c;margin:24px;background:#fff}main{max-width:1400px;margin:auto}h1{font-size:26px}h2{font-size:20px;margin:0 0 12px}p{line-height:1.5}section{margin:32px 0;break-before:page}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #aab5bb;padding:10px 6px;text-align:center;overflow-wrap:anywhere}th{background:#edf1f3}td{height:70px}small{display:block;font-size:11px;margin-top:4px}.fixed{border-bottom:3px solid #385c6e}a{color:#205572}.screen-note{font-size:13px}
@page{size:A4 landscape;margin:10mm}@media print{body{margin:0;font-size:11px}h1{font-size:18px}h2{font-size:16px}header,.screen-note{display:none}section{margin:0;break-inside:avoid;break-before:page}section:first-of-type{break-before:auto}th,td{padding:5px 3px}td{height:45px}small{font-size:9px}thead{display:table-header-group}}
</style></head><body><main><header><h1>${escapeHtml(title)}</h1><p>${input.classes.length} lớp · ${input.teachers.length} giáo viên · ${result.lessons.length} tiết · Điểm phạt mềm: ${result.penalty}</p><p class="screen-note">In khổ A4 ngang. Mỗi lớp/giáo viên bắt đầu trang mới; lịch nhiều tiết có thể dài hơn một trang.</p></header>${sections}<footer class="screen-note"><a href="https://mona.media/tao-thoi-khoa-bieu-online/">Dùng bản web miễn phí</a> · <a href="https://mona.software/phan-mem-quan-ly-thoi-khoa-bieu/">Phần mềm quản lý trường học MONA</a></footer></main></body></html>`;
}
