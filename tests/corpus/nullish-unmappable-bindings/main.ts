// Bindings that hold `undefined` forever under a declared callable type
// whose parameters do not compile: reads, tests and calls through a
// namespace import and in a function.
import * as Engine from "./engine.ts";

const log: string[] = [];
const bytesOf = (size: number): Uint8Array => {
  log.push(`bytes ${size}`);
  return new Uint8Array(size);
};

const load = async (size: number): Promise<Engine.Module> => {
  if (typeof Engine.compileStreaming !== "function") return Engine.compile(bytesOf(size));
  return Engine.compileStreaming(Promise.resolve(bytesOf(size).length));
};

const main = async (): Promise<void> => {
  console.log(typeof Engine.compileStreaming, Engine.compileStreaming === undefined);
  console.log(Engine.promising === undefined ? "no promising" : "promising");
  console.log((await load(4)).size);
  try {
    Engine.compileStreaming!(Promise.resolve(bytesOf(2).length));
  } catch (error) {
    console.log(error instanceof TypeError, (error as Error).message);
  }
  const local: ((source: PromiseLike<string>) => number) | undefined = undefined;
  console.log(typeof local, local === undefined);
  try {
    local!(Promise.resolve(String(bytesOf(1).length)));
  } catch (error) {
    console.log(error instanceof TypeError, (error as Error).message);
  }
  console.log(log.join(", "));
};

main();
