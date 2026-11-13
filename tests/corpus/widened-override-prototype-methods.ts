// An override that declares more parameters than the method it overrides,
// overridden again below with the same longer list, in a program that also
// reads the method off a prototype: a call with the extra arguments on the
// middle class reaches each class's own body with all of them, and a
// replaced method is called instead.
type Result = { errno: number; path: string };

class Fd {
  pathOpen(path: string, oflags: number, lookup?: number): Result {
    return { errno: 76, path: `base:${path}:${oflags}:${lookup ?? "-"}` };
  }
  describe(label: string): string {
    return `fd ${label}`;
  }
}

class DirectoryFd extends Fd {
  readonly name: string;
  constructor(name: string) {
    super();
    this.name = name;
  }
  override pathOpen(path: string, oflags: number, lookup = 1, mode?: number, access?: { read: boolean }): Result {
    return {
      errno: 0,
      path: `${this.name}:${path}:${oflags}:${lookup}:${mode ?? "-"}:${access?.read ?? "-"}`,
    };
  }
  override describe(label: string, depth = 0): string {
    return `dir ${this.name} ${label} ${depth}`;
  }
}

class DeviceDirectoryFd extends DirectoryFd {
  override pathOpen(path: string, oflags: number, lookup?: number, mode?: number, access?: { read: boolean }): Result {
    if (path === "/dev") return { errno: 0, path: `device:${mode ?? "-"}` };
    return super.pathOpen(path, oflags, lookup, mode, access);
  }
  override describe(label: string, depth?: number): string {
    return `device ${super.describe(label, depth)}`;
  }
}

class PreopenFd extends DirectoryFd {}

class ForwardingPreopenFd extends PreopenFd {
  readonly inner: DirectoryFd;
  constructor(inner: DirectoryFd) {
    super("forward");
    this.inner = inner;
  }
  override pathOpen(path: string, oflags: number, lookup?: number, mode?: number, access?: { read: boolean }): Result {
    const opened = this.inner.pathOpen(path, oflags, lookup, mode, access);
    return { errno: opened.errno, path: `fwd(${opened.path})` };
  }
}

const order: string[] = [];
const arg = <T>(label: string, value: T): T => {
  order.push(label);
  return value;
};
const roots: DirectoryFd[] = [
  new DirectoryFd("root"),
  new DeviceDirectoryFd("dev"),
  new PreopenFd("pre"),
  new ForwardingPreopenFd(new DeviceDirectoryFd("inner")),
];
for (const root of roots) {
  console.log(root.pathOpen(arg("path", "/dev"), arg("oflags", 2), arg("lookup", 0), arg("mode", 0o644), { read: true }).path);
  console.log(root.pathOpen("/etc", 1, undefined, 0o600).path, root.pathOpen("/tmp", 0).path);
  console.log(root.describe("x", 3), root.describe("y"));
}
const base: Fd = roots[1]!;
console.log(base.pathOpen("/dev", 9).path, base.describe("z"));
console.log(order.join(","));

const original = DirectoryFd.prototype.pathOpen;
console.log(original.call(roots[1]!, "/x", 1, 2, 3).path);
const replaced = new DeviceDirectoryFd("replaced");
replaced.pathOpen = (path: string, oflags: number, lookup?: number, mode?: number): Result => ({
  errno: 1,
  path: `own:${path}:${oflags}:${lookup}:${mode}`,
});
const asDirectory: DirectoryFd = replaced;
console.log(asDirectory.pathOpen("/dev", 1, 2, 3, { read: false }).path);
