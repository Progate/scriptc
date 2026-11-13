// Values read back as `unknown` (from an untyped table) and narrowed with
// `instanceof` serve as keys of collections typed with the class.
class Handle {
  readonly name: string;
  constructor(name: string) {
    this.name = name;
  }
}
class SharedHandle extends Handle {
  shared = true;
}

const first = new Handle("first");
const second = new SharedHandle("second");
const imports: Record<string, Record<string, unknown>> = {
  env: { first, count: 3, label: "x", again: first },
  extra: { second, none: null, list: [first] },
};

const seen = new Set<Handle>();
for (const space of Object.values(imports)) {
  for (const value of Object.values(space)) if (value instanceof Handle) seen.add(value);
}
console.log(seen.size, seen.has(first), seen.has(second));
console.log([...seen].map((handle) => handle.name).join(","));

const owners = new Map<Handle, string>();
const weak = new WeakSet<Handle>();
const sizes = new WeakMap<Handle, number>();
const exportsTable: { [key: string]: unknown } = { a: second, b: first, c: 7 };
for (const [key, value] of Object.entries(exportsTable)) {
  if (!(value instanceof Handle)) continue;
  owners.set(value, key);
  weak.add(value);
  sizes.set(value, key.length + value.name.length);
}
console.log(owners.get(first), owners.get(second), owners.size);
console.log(weak.has(first), weak.has(new Handle("first")), sizes.get(second));

const shared = new Set<SharedHandle>();
for (const value of Object.values(exportsTable)) if (value instanceof SharedHandle) shared.add(value);
console.log(shared.size, shared.has(second));
seen.delete(first);
console.log(seen.size, [...seen][0] === second);
