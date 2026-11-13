// Typed arrays as Set elements and Map keys compare by identity, as every
// object does: equal contents are different keys, and the same view read
// back from anywhere is the same key.
type Channel = Int32Array;

const channels = new Set<Channel>();
const listen = (channel: Channel): (() => void) => {
  channels.add(channel);
  return () => channels.delete(channel);
};
const announce = (): number => {
  let woken = 0;
  for (const channel of channels) {
    Atomics.add(channel, 0, 1);
    woken += Atomics.load(channel, 0);
  }
  return woken;
};

const first = new Int32Array(new SharedArrayBuffer(16));
const second = new Int32Array(new SharedArrayBuffer(16));
const stopFirst = listen(first);
listen(second);
listen(first);
console.log(channels.size, announce(), announce());
stopFirst();
stopFirst();
console.log(channels.size, channels.has(first), channels.has(second));
console.log(channels.has(new Int32Array(second.buffer)), channels.has(new Int32Array(16)));

class Waiters {
  private retrying = new Set<Int32Array>();
  mark(cell: Int32Array, on: boolean): void {
    if (on) this.retrying.add(cell);
    else this.retrying.delete(cell);
  }
  others(own: Int32Array, all: Int32Array[]): number[] {
    return all.filter((cell) => cell !== own && !this.retrying.has(cell)).map((cell) => cell[0]!);
  }
}
const cells = [0, 1, 2, 3].map((n) => Int32Array.of(n * 10));
const waiters = new Waiters();
waiters.mark(cells[1]!, true);
waiters.mark(cells[3]!, true);
waiters.mark(cells[3]!, false);
console.log(waiters.others(cells[0]!, cells).join(","));

const names = new Map<Uint8Array, string>();
const key = new TextEncoder().encode("key");
names.set(key, "first");
names.set(new TextEncoder().encode("key"), "second");
names.set(key, "replaced");
console.log(names.size, names.get(key), [...names.values()].join(","));
const held = [key][0]!;
console.log(names.has(held), names.get(key.subarray(0)) ?? "absent");

const views = new Map<Float64Array | null, number>();
const samples = new Float64Array([1.5, 2.5]);
views.set(samples, samples.length);
views.set(null, 0);
console.log(views.get(samples), views.get(null), views.size);
for (const [view, length] of views) console.log(view === null ? "null" : view.join("/"), length);
