// Locals of scalar unions read where the checker has narrowed them: after
// an early return in the other arm, and in updates guarded by a null test.
function parseMode(text: string): number | string {
  if (!/^[ugoa]*[-+=][rwx]*$/.test(text)) return `invalid mode: ${text}`;
  return text.includes("+") ? 0o755 : 0o644;
}

function umask(text: string): number {
  const parsed = parseMode(text);
  if (typeof parsed === "string") {
    console.log("error:", parsed);
    return -1;
  }
  return ~parsed & 0o777;
}

function shifted(text: string): number {
  const parsed = parseMode(text);
  if (typeof parsed !== "string") return -parsed + (parsed >> 2) * 2;
  return parsed.length;
}

function flags(value: number | boolean): number {
  const v = value;
  if (typeof v === "boolean") return v ? 1 : 0;
  return ~v;
}

function wrap(line: string, width: number): string[] {
  const out: string[] = [];
  let cp: number | null = 0;
  while (cp !== null && cp < line.length) {
    let ep: number | null = line.lastIndexOf(" ", cp + width);
    if (ep <= cp) ep = line.indexOf(" ", cp + width);
    if (ep === -1) ep = null;
    out.push(line.slice(cp, ep ?? line.length));
    cp = ep;
    if (cp !== null) {
      while (cp < line.length && line[cp] === " ") cp++;
    }
  }
  return out;
}

function counters(start: number | null): string {
  let n: number | null = start;
  const seen: number[] = [];
  if (n !== null) {
    seen.push(n++, ++n);
    for (; n < 8; ) n++;
    seen.push(n--, --n, n);
  }
  let s: number | string = start === null ? "none" : start;
  if (typeof s === "number") seen.push(s++, s);
  return `${seen.join(",")} ${n} ${s}`;
}

function chunkOf(n: number): Uint8Array | null | "sigint" {
  return n > 1 ? new Uint8Array(n) : n > 0 ? null : "sigint";
}

function describe(n: number): string {
  const chunk = chunkOf(n);
  if (chunk === "sigint") return "interrupted";
  return `${chunk?.length ?? "eof"} ${chunk?.subarray(1).length}`;
}

console.log(describe(0), describe(1), describe(4));
console.log(umask("u+x"), umask("go=r"), umask("bad"));
console.log(shifted("a+rwx"), shifted("nope"));
console.log(flags(true), flags(false), flags(5), flags(-1));
console.log(JSON.stringify(wrap("the quick  brown fox jumps over   the lazy dog", 9)));
console.log(JSON.stringify(wrap("unbroken", 3)));
console.log(counters(1), "|", counters(null), "|", counters(10));
