// `(handle as { unref?: () => void }).unref?.()`: code that also runs where
// timer handles are numbers asserts the optional member and calls it
// optionally. On a Timeout or Immediate handle the member is always there.
type Unrefable = { unref?: () => void };

class Sampler {
  #timer: ReturnType<typeof setInterval> | null = null;
  #ticks = 0;
  start(): void {
    if (this.#timer !== null) return;
    this.#timer = setInterval(() => {
      this.#ticks++;
    }, 5);
    (this.#timer as Unrefable).unref?.();
  }
  get ticks(): number {
    return this.#ticks;
  }
}

type Pending = { handle: ReturnType<typeof setTimeout> | null; fired: boolean };
const arm = (pending: Pending, ms: number): void => {
  pending.handle = setTimeout(() => {
    pending.fired = true;
    console.log("fired", ms);
  }, ms);
  (pending.handle as Unrefable).unref?.();
};

const sampler = new Sampler();
sampler.start();
sampler.start();

// Unreferenced timers do not keep the program alive...
const background: Pending = { handle: null, fired: false };
arm(background, 50);

let retry: ReturnType<typeof setTimeout> | undefined;
const poll = (ms: number): void => {
  retry = setTimeout(() => console.log("poll never runs"), ms);
  (retry as Unrefable).unref?.();
};
poll(60);

let immediateRan = false;
const immediate = setImmediate(() => {
  immediateRan = true;
});
(immediate as { unref?: () => Unrefable }).unref?.();

// ...but a referenced one does, and the unreferenced ones that come due
// before it still run.
const quick: Pending = { handle: null, fired: false };
arm(quick, 1);
const hasRef = (setTimeout(() => {}, 0) as { hasRef?: () => boolean }).hasRef?.();
console.log("hasRef", hasRef);
const keeper = setTimeout(() => {
  console.log("keeper", quick.fired, background.fired, immediateRan, sampler.ticks > 0);
}, 30);
(keeper as { ref?: () => void }).ref?.();
console.log("scheduled");
