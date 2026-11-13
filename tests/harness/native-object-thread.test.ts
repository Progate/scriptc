import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, test } from "vitest";

// An application that links a program object can call its `main` on a thread
// of its own. On Linux the stack guard of that thread must come from the
// thread library, not from the process's initial stack (whose top is far
// above the thread's): otherwise the first guarded call reports a stack
// overflow.
const repoRoot = join(import.meta.dirname, "../..");
const scratch = mkdtempSync(join(tmpdir(), "scriptc-native-object-thread-"));

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe.runIf(process.platform === "linux")("program object main on a thread", () => {
  test("runs recursive code on a thread the embedder started", () => {
    const entry = join(scratch, "main.ts");
    writeFileSync(
      entry,
      [
        "const depth = (n: number): number => (n === 0 ? 0 : 1 + depth(n - 1));",
        "console.log(depth(2000));",
        "",
      ].join("\n"),
    );
    const host = join(scratch, "host.c");
    writeFileSync(
      host,
      [
        "#include <pthread.h>",
        "extern int main(int, char**);",
        "static int code = 1;",
        'static void* run(void* arg) { char name[] = "program"; char* argv[] = {name, 0}; code = main(1, argv); return arg; }',
        "int host_main(void) {",
        "  pthread_attr_t attr; pthread_attr_init(&attr); pthread_attr_setstacksize(&attr, 16u << 20);",
        "  pthread_t thread; if (pthread_create(&thread, &attr, run, 0) != 0) return 2;",
        "  pthread_join(thread, 0); return code;",
        "}",
        "",
      ].join("\n"),
    );
    const programObject = join(scratch, "program.o");
    const info = JSON.parse(
      execFileSync(
        "node",
        [join(repoRoot, "packages/cli/dist/main.js"), "build", entry, "--print=native-link-info", "-o", programObject],
        { encoding: "utf8" },
      ),
    ) as { link: { input_order: string[]; system_libraries: string[] } };
    const library = join(scratch, "libprogram.so");
    execFileSync("cc", [
      "-shared",
      "-pthread",
      // The host's call binds to the program's own `main`, not the executable's
      "-Wl,-Bsymbolic",
      "-o",
      library,
      ...info.link.input_order,
      host,
      ...info.link.system_libraries.map((name) => `-l${name}`),
    ]);
    const executable = join(scratch, "app");
    const launcher = join(scratch, "launcher.c");
    writeFileSync(launcher, "int host_main(void);\nint main(void) { return host_main(); }\n");
    execFileSync("cc", ["-o", executable, launcher, library, `-Wl,-rpath,${scratch}`]);
    expect(execFileSync(executable, [], { encoding: "utf8" })).toBe("2000\n");
  }, 120_000);
});
