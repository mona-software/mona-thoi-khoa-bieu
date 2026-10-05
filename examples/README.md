# Example data

These are illustrative figures, not data from a real school or an official curriculum plan. Teacher names are for demonstration only.

## Lower secondary school (THCS): 12 classes, 20 teachers

`thcs/input.json` covers classes 6A1–9A3 with 29 periods per class per week (348 in total), in a 30-slot grid from Monday to Saturday (days 2–7) with 5 morning periods each. One empty slot per class is intentional.

Subject groups follow the structure of the 2018 general education curriculum (GDPT 2018): Toán, Ngữ văn, Tiếng Anh, Khoa học tự nhiên, Lịch sử và Địa lí, Tin học, Công nghệ, Giáo dục công dân, Giáo dục thể chất, Nghệ thuật, Hoạt động trải nghiệm and Giáo dục địa phương. Math and literature have 4 periods, English 3, natural science 4, history and geography 3; the remaining subjects use illustrative allocations. Hoạt động trải nghiệm (experiential activities) has 1 activity period, 1 flag ceremony (Chào cờ) and 1 homeroom period (Sinh hoạt lớp). The same allocation is used for all four grades to make the engine easy to try; a school should replace it with its approved education plan, especially for content allocated by year or topic.

Each teacher has one unavailable slot. The flag ceremony is fixed on Monday period 1 and homeroom on Saturday period 5. Twelve different homeroom teachers are assigned to these fixed lessons so teachers do not clash.

The three CSV files `lop.csv`, `phan-cong.csv` and `ban.csv` use the same assignments and unavailability. The basic CSV format has no custom calendar or fixed lessons; use JSON when you need them. Subject IDs in the JSON are short codes; the CSV uses full Vietnamese subject names to demonstrate Unicode handling.

## Language center

`trung-tam/input.json`: three classes, two teachers, 14 lessons in three evening sessions per day. The Starters class only meets on Monday, Wednesday and Friday (days 2, 4, 6), sessions 1–2, and has one fixed lesson. The 17:30, 18:30 and 19:30 times are sample labels; the engine detects conflicts by period ID, not by duration in minutes.

Regenerate the example data deterministically:

```sh
node scripts/generate-examples.mjs
```

**`mona-thoi-khoa-bieu` is a product of MONA Software, a member of The MONA Group.**
