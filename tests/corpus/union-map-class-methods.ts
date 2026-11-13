// A class that stands in for a Map in some places: method calls on a union
// of the class and the Map dispatch on the value's runtime type.
class Targets {
  readonly #owners = new Map<string, number[]>();
  has(key: string): boolean {
    return this.#owners.has(key);
  }
  set(key: string, handle: number): this {
    const owners = this.#owners.get(key)?.filter((other) => other !== handle) ?? [];
    this.#owners.set(key, [handle, ...owners]);
    return this;
  }
  delete(key: string): boolean {
    return this.#owners.delete(key);
  }
  clear(): void {
    this.#owners.clear();
  }
  describe(): string {
    return [...this.#owners].map(([key, owners]) => `${key}=${owners.join("/")}`).join(" ");
  }
}

class LoggedTargets extends Targets {
  override has(key: string): boolean {
    console.log(`  checking ${key}`);
    return super.has(key);
  }
}

class Names {
  readonly seen: string[] = [];
  has(key: string): boolean {
    return this.seen.includes(key);
  }
  set(key: string, handle: number): Names {
    this.seen.push(`${key}:${handle}`);
    return this;
  }
  delete(key: string): boolean {
    return false;
  }
  clear(): void {
    this.seen.length = 0;
  }
}

const datagrams = new Targets();
const logged = new LoggedTargets();
const streams = new Map<string, number>();
const order: string[] = [];
const keyOf = (key: string): string => {
  order.push(key);
  return key;
};

const bind = (names: Targets | Map<string, number>, key: string, handle: number): number => {
  if (names.has(keyOf(key))) return -1;
  names.set(keyOf(key), handle);
  return 0;
};

for (const names of [datagrams, streams, logged]) {
  console.log(bind(names, "a", 1), bind(names, "a", 2), bind(names, "b", 3));
}
datagrams.set("a", 4);
console.log(datagrams.describe(), [...streams].map(([key, handle]) => `${key}=${handle}`).join(" "), logged.describe());
console.log(order.join(","));

const drop = (names: Targets | Map<string, number> | Names, key: string): boolean =>
  names.delete(key);
const names = new Names();
names.set("x", 9);
console.log(drop(datagrams, "a"), drop(streams, "b"), drop(streams, "zz"), drop(names, "x"));
console.log(datagrams.describe(), [...streams].map(([key, handle]) => `${key}=${handle}`).join(" "), names.seen.join(","));

for (const target of [datagrams, streams, names] as (Targets | Map<string, number> | Names)[]) {
  target.clear();
  console.log(target.has("a"), target.has("b"));
}
