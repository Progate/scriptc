// Compound assignment to a field every arm of a union declares:
// `inode.refs += 1` on a discriminated union of records and classes.
type Counter = { kind: "counter"; refs: number; label: string; total: bigint };
type Poller = {
  kind: "poller";
  refs: number;
  label: string;
  total: bigint;
  watched: number[];
};
type Entry = Counter | Poller;

const entries = new Map<number, Entry>();
entries.set(1, { kind: "counter", refs: 1, label: "c", total: 0n });
entries.set(2, {
  kind: "poller",
  refs: 1,
  label: "p",
  total: 10n,
  watched: [3, 4],
});

const retain = (id: number): boolean => {
  const entry = entries.get(id);
  if (!entry) return false;
  entry.refs += 1;
  entry.label += `+${id}`;
  entry.total *= 3n;
  return true;
};
const release = (id: number): number => {
  const entry = entries.get(id);
  if (!entry) return -1;
  entry.refs -= 1;
  if (entry.refs <= 0) entries.delete(id);
  return entry.refs;
};

console.log(retain(1), retain(2), retain(2), retain(9));
for (const [id, entry] of entries)
  console.log(id, entry.kind, entry.refs, entry.label, entry.total);
console.log(release(1), release(1), release(2), release(1));
console.log([...entries.keys()].join(","));

// The objects are written in place: aliases see the update.
const shared: Entry = {
  kind: "poller",
  refs: 5,
  label: "s",
  total: 1n,
  watched: [],
};
const alias = shared;
const list: Entry[] = [
  shared,
  { kind: "counter", refs: 0, label: "", total: 2n },
];
for (const item of list) {
  item.refs *= 4;
  item.refs %= 7;
  item.refs <<= 2;
}
console.log(alias.refs, list[1]!.refs);

// The compound yields the new value, and the right side runs after the
// field is read.
const order: string[] = [];
const pick = (): Entry => {
  order.push("receiver");
  return list[0]!;
};
const amount = (): number => {
  order.push("amount");
  return 10;
};
const result = (pick().refs += amount());
console.log(result, order.join(" "));

// Class arms work the same way.
class Socket {
  open = 0;
  readonly name: string;
  constructor(name: string) {
    this.name = name;
  }
}
class Pipe {
  open = 100;
  readonly capacity = 4096;
}
const handles: (Socket | Pipe)[] = [
  new Socket("a"),
  new Pipe(),
  new Socket("b"),
];
for (const handle of handles) handle.open += handle instanceof Pipe ? 2 : 1;
console.log(handles.map((h) => h.open).join(" "));
