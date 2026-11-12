/* The worker-scope globals scriptc's runtime implements, for a program
 * whose @types/node declares MessagePort only as a value (@types/node 22
 * leaves the global interface and the event handler properties to the DOM
 * library, which scriptc's own library set does not include). Added beside
 * those types (program.ts, nodeTypesSupplementRoots7). */
declare module "worker_threads" {
  interface MessagePort {
    onmessage: ((event: MessageEvent) => void) | null;
    onmessageerror: ((event: MessageEvent) => void) | null;
  }
}
type ScriptcWorkerThreadsMessagePort = import("worker_threads").MessagePort;
/** The global MessagePort is worker_threads' (a MessageChannel's ports). */
interface MessagePort extends ScriptcWorkerThreadsMessagePort {}
interface RequestInit {
  cache?: "default" | "force-cache" | "no-cache" | "no-store" | "only-if-cached" | "reload";
}
