// Promise.race over an array literal with conditional spreads: the elements
// before the spread evaluate first, then the condition, then the arm's
// elements and the ones after it.
const order: string[] = [];
const delay = <T>(label: string, ms: number, value: T): Promise<T> => {
  order.push(label);
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
};

interface Reader {
  read(max: number): Promise<Uint8Array | null>;
}
const reader: Reader = {
  read: (max) => delay("read", max, max > 50 ? null : new Uint8Array(max)),
};
const interrupt = (ms: number): Promise<void> => delay("interrupt", ms, undefined);

async function readWithTimeout(max: number, timeout: number): Promise<string> {
  order.length = 0;
  const chunk = await Promise.race([
    reader.read(max),
    interrupt(40).then(() => "sigint" as const),
    ...(timeout >= 0
      ? [new Promise<"timeout">((r) => setTimeout(() => r("timeout"), (order.push("timer"), timeout)))]
      : []),
  ]);
  const seen = order.join(">");
  if (chunk === "sigint") return `sigint ${seen}`;
  if (chunk === "timeout") return `timeout ${seen}`;
  if (chunk === null || chunk.length === 0) return `eof ${seen}`;
  return `${chunk.length} bytes ${seen}`;
}

async function pick(fast: boolean, extra: boolean): Promise<string> {
  order.length = 0;
  const winner = await Promise.race([
    ...(fast ? [delay("fast", 5, "fast")] : [delay("slow", 30, "slow")]),
    delay("middle", 20, "middle"),
    ...[delay("fixed", 25, "fixed")],
    ...(extra ? [delay("extra", 1, "extra")] : []),
  ]);
  return `${winner} ${order.join(">")}`;
}

// The same race over readers of an interface with two implementations, whose
// read() the program calls through the interface.
class MemoryReader implements Reader {
  async read(max: number): Promise<Uint8Array | null> {
    return max > 2 ? new Uint8Array(max) : null;
  }
}
class SlowReader implements Reader {
  read(max: number): Promise<Uint8Array | null> {
    return new Promise((resolve) => setTimeout(() => resolve(new Uint8Array(max + 1)), 5));
  }
}
const readers: Reader[] = [new MemoryReader(), new SlowReader(), new MemoryReader()];

async function raceReaders(): Promise<string[]> {
  const seen: string[] = [];
  for (const [i, reader] of readers.entries()) {
    const chunk = await Promise.race([reader.read(i === 2 ? 1 : 4), interrupt(30).then(() => "sigint" as const)]);
    seen.push(chunk === "sigint" ? "sigint" : String(chunk?.length ?? "eof"));
  }
  return seen;
}

async function main(): Promise<void> {
  console.log((await raceReaders()).join(","));
  console.log(await readWithTimeout(4, -1));
  console.log(await readWithTimeout(30, 10));
  console.log(await readWithTimeout(60, 100));
  console.log(await readWithTimeout(80, 1000));
  for (const fast of [true, false])
    for (const extra of [false, true]) console.log(await pick(fast, extra));
}

main();
