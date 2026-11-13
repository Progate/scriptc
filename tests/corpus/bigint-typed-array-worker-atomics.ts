// Two worker threads race on 64-bit counters in one SharedArrayBuffer with
// Atomics on a BigInt64Array and a BigUint64Array: adds that carry past 32
// bits, subtracts that go negative or wrap, and a compare-exchange loop.
// Each final value has one correct answer.
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

const ROUNDS = 20000;

type Job = { buffer: SharedArrayBuffer; id: number };

if (isMainThread) {
  const buffer = new SharedArrayBuffer(32);
  const signed = new BigInt64Array(buffer);
  const unsigned = new BigUint64Array(buffer, 16, 2);
  signed[0] = 2n ** 40n;
  let exited = 0;
  for (let id = 0; id < 2; id++) {
    const worker = new Worker(new URL(import.meta.url), { workerData: { buffer, id } });
    worker.on("exit", (code: number) => {
      if (code !== 0) console.log("worker exit", code);
      exited++;
      if (exited < 2) return;
      console.log("shared add", Atomics.load(signed, 0), signed[0]);
      console.log("down", signed[1]);
      console.log("wrap", unsigned[0], Atomics.load(unsigned, 1));
    });
  }
} else {
  const { buffer, id } = workerData as Job;
  const signed = new BigInt64Array(buffer, 0, 2);
  const unsigned = new BigUint64Array(buffer, 16);
  for (let i = 0; i < ROUNDS; i++) {
    Atomics.add(signed, 0, 2n ** 33n + 1n);
    Atomics.sub(signed, 1, 3n);
    Atomics.sub(unsigned, 0, 1n);
    for (;;) {
      const seen = Atomics.load(unsigned, 1);
      if (Atomics.compareExchange(unsigned, 1, seen, seen + BigInt(id + 1)) === seen) break;
    }
  }
  parentPort!.postMessage("done");
}
