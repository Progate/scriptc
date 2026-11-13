// performance.timeOrigin in TypeScript: the wall clock at which
// performance.now() read zero, the same number on every read.
import { performance as hooks } from "node:perf_hooks";

const origin = performance.timeOrigin;
const wallMicros = (): number => Math.floor((performance.timeOrigin + performance.now()) * 1000);
console.log(typeof origin, origin === performance.timeOrigin, origin === hooks.timeOrigin);
console.log(origin > Date.UTC(2020, 0, 1), origin <= Date.now());
const drift = Math.abs(wallMicros() / 1000 - Date.now());
console.log(drift < 50);
const start = wallMicros();
const end = wallMicros();
console.log(end >= start, globalThis.performance.timeOrigin === origin);
