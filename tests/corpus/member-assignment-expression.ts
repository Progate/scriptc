// A member assignment in value position in a TypeScript source, when the
// value is a number, string, boolean or bigint: `(out[k] = v)` as an arrow
// body, inside a call argument, and chained.
type Format = { width: number; height: number; stride: number };
const FIELDS = ["width", "height", "stride"] as const;

const read = (words: number[]): Format => {
  const format = {} as Format;
  FIELDS.forEach((name, index) => (format[name] = words[index]! * 2));
  return format;
};
console.log(JSON.stringify(read([320, 240, 1280])));

class Meter {
  last = "";
  count = 0;
  hot = false;
  peak = 0n;
  record(sample: number): string {
    console.log("count is now", (this.count = this.count + sample));
    this.hot = (this.peak = BigInt(sample) * 3n) > 10n;
    return (this.last = `sample ${sample}`);
  }
}
const meter = new Meter();
console.log(
  meter.record(2),
  meter.record(5),
  meter.count,
  meter.hot,
  meter.peak,
);

const totals: Record<string, number> = {};
const names = ["a", "b", "a", "c", "a"];
const seen = names.map((name) => (totals[name] = (totals[name] ?? 0) + 1));
console.log(seen.join(","), JSON.stringify(totals));

// Chained: every target takes the value, which is computed once.
let evaluated = 0;
const next = (): number => ++evaluated * 10;
const a = { x: 0 };
const b = { y: 0 };
const v = (a.x = b.y = next());
console.log(v, a.x, b.y, evaluated);
