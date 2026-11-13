import { createRequire } from "node:module";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

declare function smMemory(): bigint;
declare function smLength(): number;
declare function smGrow(bytes: number): number;
declare function smReadI32(offset: number): number;
declare function smReadF64(offset: number): number;
declare function smWriteI32(offset: number, value: number): void;

interface NativeMemory {
  toSharedArrayBuffer(pointer: bigint, length: number): SharedArrayBuffer;
}
const ffi = createRequire(import.meta.url)("node:ffi") as NativeMemory;

if (isMainThread) {
  const pointer = smMemory();
  const buffer = ffi.toSharedArrayBuffer(pointer, smLength());
  console.log(buffer instanceof SharedArrayBuffer, buffer.byteLength);
  const bytes = new Uint8Array(buffer);
  console.log(Array.from(bytes.subarray(0, 8)).join(","), bytes[255]);
  const view = new DataView(buffer);
  console.log(view.getUint16(1, true), view.getInt32(4, false), view.getUint32(252, true));
  console.log(new Int8Array(buffer)[37], new Uint16Array(buffer)[3], new Int16Array(buffer)[100]);
  const words = new Int32Array(buffer);
  const units = new Uint32Array(buffer);
  console.log(words[1], units[63]);

  // TypeScript writes, native code reads.
  words[64] = -123456;
  view.setInt32(264, 0x01020304, true);
  new Float64Array(buffer)[34] = 6.25;
  new Float32Array(buffer)[70] = 1.5;
  console.log(smReadI32(256), smReadI32(264), smReadF64(272), view.getFloat32(280, true));
  // Native code writes, TypeScript reads through views made earlier.
  smWriteI32(288, 777);
  console.log(words[72], view.getInt32(288, true));

  console.log(Atomics.store(words, 512, 5), Atomics.add(words, 512, 3), Atomics.load(words, 512));
  console.log(Atomics.compareExchange(words, 512, 8, 40), smReadI32(2048));
  console.log(Atomics.wait(words, 512, 0, 0));

  const worker = new Worker(new URL(import.meta.url), { workerData: buffer });
  worker.on("message", (message: string) => {
    console.log(message, smReadI32(2048));
    // The native side grows the memory at the same address.
    console.log(smGrow(8192));
    const grown = ffi.toSharedArrayBuffer(pointer, smLength());
    console.log(grown.byteLength, buffer.byteLength, words.length, new Uint8Array(grown)[5000]);
    console.log(new Int32Array(grown)[72], new Int32Array(grown)[512]);
    worker.postMessage(grown);
    // The worker notifies through the grown buffer; this waits through the first one.
    console.log(Atomics.wait(words, 1, words[1]!, 10_000));
    console.log(smReadI32(4400), smReadI32(4));
  });
  worker.on("exit", (code: number) => console.log("exit", code));
} else {
  const port = parentPort!;
  const words = new Int32Array(workerData as SharedArrayBuffer);
  for (let i = 0; i < 1000; i++) Atomics.add(words, 512, 1);
  port.postMessage(`worker ${Atomics.load(words, 72)}`);
  port.once("message", (grown: SharedArrayBuffer) => {
    const wide = new Int32Array(grown);
    Atomics.add(wide, 1100, 9);
    while (Atomics.notify(wide, 1, 1) === 0) {
      // Wait until the main thread parks on the cell.
    }
    Atomics.store(wide, 1, 99);
    port.close();
  });
}
