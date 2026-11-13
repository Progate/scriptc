// A value is looked at through an asserted structural view to find an
// optional method. A class instance answers the method from its prototype,
// and the call runs with the instance as `this`.
interface Target {
  id: number;
}
class Pollable implements Target {
  id = 1;
  seq = 7;
  fdPollState(): { mask: number; seq: number } {
    return { mask: 3, seq: this.seq };
  }
}
class Plain implements Target {
  id = 2;
}
const seqOf = (target: Target): number =>
  (target as { fdPollState?: () => { mask: number; seq: number } | null }).fdPollState?.()?.seq ??
  -1;
const targets: Target[] = [new Pollable(), new Plain()];
console.log(targets.map(seqOf).join(" "));

class Timer {
  refs = 1;
  unref(): void {
    this.refs--;
    console.log("unref", this.refs);
  }
}
const unrefOf = (handle: object): void => {
  (handle as { unref?: () => void }).unref?.();
};
unrefOf(new Timer());
unrefOf({});

interface FileSystem {
  read(path: string): string;
}
class Memory implements FileSystem {
  readonly #listeners: ((path: string) => void)[] = [];
  name = "memory";
  read(path: string): string {
    return `${this.name}:${path}`;
  }
  watch(listener: (path: string) => void): () => void {
    this.#listeners.push(listener);
    return () => console.log("unwatch", this.name, this.#listeners.length);
  }
  change(path: string): void {
    for (const listener of this.#listeners) listener(path);
  }
}
class Fixed implements FileSystem {
  read(path: string): string {
    return path;
  }
}
const watchHost = (fs: object): (() => void) | null => {
  const watchable = fs as { watch?: (listener: (path: string) => void) => () => void };
  if (typeof watchable.watch !== "function") return null;
  return watchable.watch((path) => console.log("changed", path));
};
class Kernel {
  readonly #fs: FileSystem;
  constructor(fs?: FileSystem) {
    this.#fs = fs ?? new Fixed();
  }
  start(): (() => void) | null {
    console.log(this.#fs.read("/a"));
    return watchHost(this.#fs);
  }
}
const memory = new Memory();
const stop = new Kernel(memory).start();
memory.change("/b");
stop?.();
console.log(new Kernel().start());
