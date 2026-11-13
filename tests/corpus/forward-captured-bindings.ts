// Closures that capture a block-scoped binding declared after them: a name
// bound by a destructuring declaration, and a promise whose own reaction
// reads it. Each read before the declaration runs throws Node's
// ReferenceError; after it, the closure sees the value.
class Mounts {
  readonly #paths = new Map<string, number>();
  constructor(paths: string[]) {
    paths.forEach((path, index) => this.#paths.set(path, index + 1));
  }
  identityAt(path: string): number {
    return this.#paths.get(path) ?? 0;
  }
}

const createMounts = (paths: string[]): { mounts: Mounts; filesystems: string[] } => ({
  mounts: new Mounts(paths),
  filesystems: paths.map((path) => `fs:${path}`),
});

class Kernel {
  readonly identity: (path: string) => number;
  readonly names: { readonly mounted: string[]; tag: string };
  constructor(paths: string[]) {
    // Both closures run only after the destructuring below.
    this.identity = (path) => mounts.identityAt(path);
    this.names = {
      get mounted() {
        return filesystems;
      },
      tag: "kernel",
    };
    const { mounts, filesystems } = createMounts(paths);
    console.log("mounted", filesystems.length);
  }
}

const kernel = new Kernel(["/", "/proc", "/dev"]);
console.log(kernel.identity("/proc"), kernel.identity("/tmp"), kernel.names.mounted.join(" "));

// A read before the declaration is a temporal-dead-zone error.
const early = (): string => {
  const read = (): string => `${first}-${second}`;
  try {
    console.log(read());
  } catch (error) {
    console.log((error as Error).name, (error as Error).message);
  }
  const [first, second] = ["a", "b"];
  return read();
};
console.log(early());

// A promise whose reaction reads the promise itself.
class Waiter {
  #current: Promise<void> | null = null;
  #log: string[] = [];
  wait(label: string): Promise<void> {
    const native: Promise<void> = Promise.resolve().then((): void => this.#woken(native, label));
    this.#current = native;
    return native;
  }
  #woken(promise: Promise<void>, label: string): void {
    this.#log.push(`${label}:${promise === this.#current}`);
  }
  get log(): string {
    return this.#log.join(" ");
  }
}

const waiter = new Waiter();
const one = waiter.wait("one");
void one.then(() => {
  void waiter.wait("two").then(() => console.log(waiter.log));
});
