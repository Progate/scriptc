import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { compile } from "@scriptc/compiler";

const fixture = join(import.meta.dirname, "../ffi");
const sanitize = process.env["SCRIPTC_SAN"] === "1";
// Node cannot run the native bindings, so the expected output is fixed here.
const expected = [
  "true 4096",
  "0,7,14,21,28,35,42,49 249",
  "3591 472066609 4193446884",
  "3 12586 32632",
  "824845084 4193446884",
  "-123456 16909060 6.25 1.5",
  "777 777",
  "5 5 8",
  "8 40",
  "not-equal",
  "worker 777 1040",
  "8192",
  "8192 4096 1024 56",
  "777 1040",
  "ok",
  "320017180 99",
  "exit 0",
  "",
].join("\n");

describe.each(["llvm"] as const)("native FFI shared memory, %s", (backend) => {
  test("views native memory as a SharedArrayBuffer that workers share and that grows in place", async () => {
    const outDir = mkdtempSync(join(tmpdir(), "scriptc-ffi-shared-"));
    const object = join(outDir, "shared.o");
    execFileSync("clang", [
      "-std=c11",
      "-O2",
      ...(sanitize ? ["-fsanitize=address"] : []),
      "-c",
      join(fixture, "shared.native.c"),
      "-o",
      object,
    ]);
    const profile = join(outDir, "ffi.json");
    writeFileSync(
      profile,
      JSON.stringify({
        ffi_format: 7,
        libraries: [object],
        functions: [
          { name: "smMemory", symbol: "sm_memory", params: [], returns: "pointer" },
          { name: "smLength", symbol: "sm_length", params: [], returns: "u32" },
          { name: "smGrow", symbol: "sm_grow", params: ["u32"], returns: "u32" },
          { name: "smReadI32", symbol: "sm_read_i32", params: ["u32"], returns: "i32" },
          { name: "smReadF64", symbol: "sm_read_f64", params: ["u32"], returns: "f64" },
          { name: "smWriteI32", symbol: "sm_write_i32", params: ["u32", "i32"], returns: "void" },
        ],
      }),
    );
    const result = await compile(join(fixture, "shared.ts"), {
      backend,
      sanitize,
      outDir,
      outPath: join(outDir, "program"),
      ffiProfilePath: profile,
    });
    if (!result.ok)
      throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
    const native = spawnSync(result.binaryPath, [], { encoding: "utf8", timeout: 20_000 });
    expect(native.error).toBeUndefined();
    expect(native.stderr).toBe("");
    expect(native.status).toBe(0);
    expect(native.stdout).toBe(expected);
  });
});
