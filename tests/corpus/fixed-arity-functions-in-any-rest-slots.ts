// Fixed-arity functions stored in a `(...args: any[]) => R` slot: a
// dispatch table of handlers called with an argument array. Each parameter
// reads its argument from the array, converted to its declared type.
// (An `unknown[]` rest slot takes only functions of `unknown` parameters,
// which the checker requires.)
type Syscall = (...args: any[]) => number | void;
type Probe = (...args: any[]) => string;

const log: string[] = [];
const memory = new Map<number, bigint>();

const syscalls: Record<string, Syscall> = {
  fd_close: (fd: number): number => {
    log.push(`close ${fd}`);
    return fd < 3 ? 8 : 0;
  },
  clock_time_get: (id: number, precision: bigint, out: number): number => {
    memory.set(out, BigInt(id) * 1000n + precision);
    return 0;
  },
  fd_write: (fd: number, iovs: number, count: number, written?: number): number => {
    log.push(`write ${fd} ${iovs} ${count} ${written ?? "none"}`);
    return 0;
  },
  proc_exit: (code: number): void => {
    log.push(`exit ${code}`);
  },
  sched_yield: (): number => 0,
  fd_seek: (fd: number, offset: number | bigint, whence: number): number =>
    fd + Number(offset) + whence,
  path_open: (name: string, flags: number | undefined): number => name.length + (flags ?? -1),
};

const call = (name: string, args: (number | bigint | string)[]): string => {
  const handler = syscalls[name];
  if (handler === undefined) return `${name}: ENOSYS`;
  try {
    return `${name}: ${String(handler(...args))}`;
  } catch (error) {
    return `${name}: ${error instanceof TypeError ? "TypeError" : "error"}`;
  }
};

console.log(call("fd_close", [1]));
console.log(call("fd_close", [7, 99]));
console.log(call("clock_time_get", [2, 5n, 64]), memory.get(64));
console.log(call("fd_write", [1, 16, 2, 32]));
console.log(call("fd_write", [1, 16, 2]));
console.log(call("proc_exit", [3]));
console.log(call("sched_yield", []));
console.log(call("fd_seek", [3, 10n, 1]), call("fd_seek", [3, 10, 2]));
console.log(call("path_open", ["etc/hosts"]));
console.log(call("path_open", ["etc", 4]));
console.log(call("nope", []));
// Inherited Object.prototype members read through the table as values.
console.log(call("hasOwnProperty", ["x"]));
console.log(log.join(" | "));

const probes: Probe[] = [(a: number, b: number) => `${a + b}`, (s: string) => s.toUpperCase(), () => "none"];
console.log(probes[0]!(2, 3), probes[1]!("ok"), probes[2]!(1, 2, 3));

const unknownProbes: ((...args: unknown[]) => string)[] = [(a: unknown, b?: unknown) => `${typeof a} ${typeof b}`];
console.log(unknownProbes[0]!(1), unknownProbes[0]!("x", 2n, 3));
