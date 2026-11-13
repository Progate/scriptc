// An engine that lacks an optional entry point exports it as `undefined`
// under the callable type the full engine declares.
export class Module {
  readonly size: number;
  constructor(size: number) {
    this.size = size;
  }
}

export const compileStreaming: ((source: PromiseLike<number>) => Promise<Module>) | undefined =
  undefined;
export const promising: ((fn: (...args: number[]) => unknown) => PromiseLike<unknown>) | undefined =
  undefined;
export const compile = (bytes: Uint8Array): Module => new Module(bytes.length);
