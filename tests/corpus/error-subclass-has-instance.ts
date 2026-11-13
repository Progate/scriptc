// A subclass of Error with a static `Symbol.hasInstance` hook: `instanceof`
// recognizes its instances by a branded property, so a copy of the class
// from another bundle would match as well.
const EXEC_REQUEST = Symbol.for("example/exec-request");

class ExecRequest extends Error {
  readonly [EXEC_REQUEST] = true;
  static override [Symbol.hasInstance](value: unknown): boolean {
    return (
      typeof value === "object" &&
      value !== null &&
      (value as { [EXEC_REQUEST]?: unknown })[EXEC_REQUEST] === true
    );
  }
  readonly path: string;
  readonly args: readonly string[];
  constructor(path: string, args: readonly string[]) {
    super(`exec ${path}`);
    this.name = "ExecRequest";
    this.path = path;
    this.args = args;
  }
}

const run = (fail: "exec" | "error" | "none"): string => {
  try {
    if (fail === "exec") throw new ExecRequest("/bin/sh", ["-c", "true"]);
    if (fail === "error") throw new Error("plain failure");
    return "ran";
  } catch (error) {
    if (error instanceof ExecRequest) return `exec ${error.path} ${error.args.join(" ")}`;
    if (error instanceof Error) return `error ${error.message}`;
    return "unknown";
  }
};
console.log(run("exec"));
console.log(run("error"));
console.log(run("none"));

const request = new ExecRequest("/usr/bin/env", []);
console.log(request instanceof Error, request.message, request.name, String(request));
console.log(new Error("x") instanceof ExecRequest, ({ [EXEC_REQUEST]: true }) instanceof ExecRequest);
