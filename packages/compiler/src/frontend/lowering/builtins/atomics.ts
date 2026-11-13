import * as ts from "../../ts7/adapter.js";
import { type Lowerer } from "../lowerer.js";
import { locOf } from "../../program.js";
import {
  BIGINT_T,
  BOOL,
  DYN,
  F64,
  type IrExpr,
  type IrType,
  STRING,
  type SrcLoc,
  isBigIntBytesElem,
  typeKey,
} from "../../../ir/ir.js";
import { helperLoc, nodeThrowExpr, numLit, varRef } from "../../../ir/build.js";
import { lowerOptionalArgument } from "../optional-arguments.js";
import { keyedHelperName } from "../stable-names.js";

const OPERATIONS = [
  "load",
  "store",
  "exchange",
  "compareExchange",
  "add",
  "sub",
  "and",
  "or",
  "xor",
];

/** Familiar integer Atomics over fixed typed storage. Wait queues are keyed
 * by backing allocation and byte offset, so distinct views address one queue. */
export function lowerAtomicsCall(
  lowerer: Lowerer,
  call: ts.CallExpression,
  access: ts.PropertyAccessExpression,
): IrExpr | null {
  const member = lowerer.stdlibGlobalMember(access, "Atomics");
  if (member === null) return null;
  const loc = locOf(call);
  const operation = OPERATIONS.indexOf(member);
  if (operation < 0 && member !== "wait" && member !== "notify") {
    lowerer.noLowering(
      `Atomics.${member}`,
      call,
      "use integer load, store, exchange, compareExchange, add, sub, and, or, xor, wait or notify",
      lowerer.checker.getSymbolAtLocation(access.name),
    );
  }
  const minimum =
    member === "wait"
      ? 3
      : member === "notify" || member === "load"
        ? 2
        : member === "compareExchange"
          ? 4
          : 3;
  const maximum = member === "wait" ? 4 : member === "notify" ? 3 : minimum;
  if (
    call.arguments.nodes.length < minimum ||
    call.arguments.nodes.length > maximum ||
    call.arguments.nodes.some(ts.isSpreadElement)
  ) {
    lowerer.noLowering(
      `Atomics.${member} arguments`,
      call,
      `use ${minimum}${maximum > minimum ? `–${maximum}` : ""} arguments`,
    );
  }
  const source = call.arguments.nodes[0]!;
  // Generic constraints can remain unions in the checker while this body
  // has a concrete typed-array binding. Validate the actual lowered storage.
  const array = lowerer.lowerExpr(source);
  const type = array.type;
  // An untyped array (a JavaScript `workerData` or field): the runtime
  // checks its kind and throws Node's TypeError for any other value.
  const dynamic = type?.kind === "dyn";
  if (type?.kind === "bytes" && isBigIntBytesElem(type.elem)) {
    if (member === "wait" || member === "notify")
      lowerer.noLowering(`Atomics.${member} over this array`, source, "use an Int32Array");
    return lowerBigIntAtomicsCall(lowerer, call, array, member, operation);
  }
  if (
    !dynamic &&
    (type?.kind !== "bytes" ||
      !["i8", "u8", "i16", "u16", "i32", "u32"].includes(type.elem) ||
      ((member === "wait" || member === "notify") && type.elem !== "i32"))
  ) {
    lowerer.noLowering(
      `Atomics.${member} over this array`,
      source,
      member === "wait" || member === "notify"
        ? "use an Int32Array"
        : "use an 8-, 16-, or 32-bit integer typed array, a BigInt64Array or a BigUint64Array",
    );
  }
  const number = (value: number): IrExpr => ({ kind: "numLit", value, type: F64, loc });
  const arg = (index: number, fallback: number): IrExpr =>
    call.arguments.nodes[index]
      ? lowerOptionalArgument(lowerer, call.arguments.nodes[index]!, F64, number(fallback))
      : number(fallback);
  const index = arg(1, 0);
  if (member === "wait")
    return {
      kind: "libCall",
      fn: dynamic ? "atomics.waitDyn" : "atomics.wait",
      args: [array, index, arg(2, 0), arg(3, Infinity)],
      type: STRING,
      loc,
    };
  if (member === "notify")
    return {
      kind: "libCall",
      fn: dynamic ? "atomics.notifyDyn" : "atomics.notify",
      args: [array, index, arg(2, Infinity)],
      type: F64,
      loc,
    };
  return {
    kind: "libCall",
    fn: dynamic ? "atomics.opDyn" : "atomics.op",
    args: [array, index, arg(2, 0), arg(3, 0), number(operation)],
    type: F64,
    loc,
  };
}

/** An Atomics operation on a BigInt64Array or BigUint64Array: the
 * arguments evaluate in order, then a helper per element kind and operation
 * converts the index (NaN is 0, fractions truncate), throws Node's
 * RangeError for an index outside [0, length), and runs the 64-bit atomic
 * instruction. store answers its value argument, as in JavaScript; the
 * other operations answer the element's previous value. */
function lowerBigIntAtomicsCall(
  lowerer: Lowerer,
  call: ts.CallExpression,
  array: IrExpr,
  member: string,
  operation: number,
): IrExpr {
  const loc = locOf(call);
  const zero: IrExpr = {
    kind: "libCall",
    fn: "bigint.parse",
    args: [{ kind: "strLit", value: "0", type: STRING, loc }],
    type: BIGINT_T,
    loc,
  };
  const nodes = call.arguments.nodes;
  const index = lowerOptionalArgument(lowerer, nodes[1]!, F64, numLit(0, loc));
  const value = nodes[2] ? lowerer.lowerExprExpecting(nodes[2], BIGINT_T) : zero;
  const replacement = nodes[3] ? lowerer.lowerExprExpecting(nodes[3], BIGINT_T) : zero;
  const name = bigIntAtomicsHelper(lowerer, array.type, member, operation, loc);
  return {
    kind: "call",
    callee: name,
    args: [array, index, value, replacement],
    type: BIGINT_T,
    loc,
  };
}

function bigIntAtomicsHelper(
  lowerer: Lowerer,
  arrayT: IrType,
  member: string,
  operation: number,
  loc: SrcLoc,
): string {
  const key = `atomicsBig:${member}:${typeKey(arrayT)}`;
  const known = lowerer.arrHofHelpers.get(key);
  if (known) return known;
  const name = keyedHelperName(lowerer, `%atomics.big.${member}`, key);
  lowerer.arrHofHelpers.set(key, name);
  const at = helperLoc(loc);
  const a = varRef("a.0", arrayT, at);
  const i = varRef("i.0", F64, at);
  const v = varRef("v.0", BIGINT_T, at);
  const w = varRef("w.0", BIGINT_T, at);
  const j = varRef("j.0", F64, at);
  const op: IrExpr = {
    kind: "libCall",
    fn: "atomics.bigOp",
    args: [a, j, v, w, numLit(operation, at)],
    type: BIGINT_T,
    loc: at,
  };
  const inRange: IrExpr = {
    kind: "logical",
    op: "&&",
    left: { kind: "bin", op: ">=", left: j, right: numLit(0, at), type: BOOL, loc: at },
    right: {
      kind: "bin",
      op: "<",
      left: j,
      right: {
        kind: "bytesIntrinsic",
        method: "length",
        receiver: a,
        args: [],
        type: F64,
        loc: at,
      },
      type: BOOL,
      loc: at,
    },
    type: BOOL,
    loc: at,
  };
  lowerer.liftedFns.push({
    name,
    params: [
      { localId: "a.0", name: "a", type: arrayT },
      { localId: "i.0", name: "i", type: F64 },
      { localId: "v.0", name: "v", type: BIGINT_T },
      { localId: "w.0", name: "w", type: BIGINT_T },
    ],
    returnType: BIGINT_T,
    locals: [
      { id: "a.0", name: "a", type: arrayT, mutable: false },
      { id: "i.0", name: "i", type: F64, mutable: false },
      { id: "v.0", name: "v", type: BIGINT_T, mutable: false },
      { id: "w.0", name: "w", type: BIGINT_T, mutable: false },
      { id: "j.0", name: "j", type: F64, mutable: false },
    ],
    body: [
      {
        kind: "varDecl",
        localId: "j.0",
        init: {
          kind: "ternary",
          cond: { kind: "libCall", fn: "num.isNaN", args: [i], type: BOOL, loc: at },
          then: numLit(0, at),
          else_: { kind: "libCall", fn: "math.trunc", args: [i], type: F64, loc: at },
          type: F64,
          loc: at,
        },
        loc: at,
      },
      {
        kind: "if",
        cond: inRange,
        then:
          member === "store"
            ? [
                { kind: "exprStmt", expr: op, loc: at },
                { kind: "return", value: v, loc: at },
              ]
            : [{ kind: "return", value: op, loc: at }],
        else_: [],
        loc: at,
      },
      {
        kind: "return",
        value: nodeThrowExpr(2, "", "Invalid atomic access index", BIGINT_T, at),
        loc: at,
      },
    ],
    loc: at,
  });
  return name;
}

/** The Atomics members with untyped forms, as function values: each
 * argument converts with ToNumber, and a missing notify count or wait
 * timeout is Infinity, as in the call form. Null for isLockFree, waitAsync
 * and pause, which have no lowering. */
export function atomicsMemberValue(lowerer: Lowerer, member: string, loc: SrcLoc): IrExpr | null {
  const operation = OPERATIONS.indexOf(member);
  if (operation < 0 && member !== "wait" && member !== "notify") return null;
  // Node's length: the parameters each member declares.
  const count = member === "load" ? 2 : member === "wait" || member === "compareExchange" ? 4 : 3;
  const name = `%builtin.Atomics.${member}`;
  const params = Array.from({ length: count }, (_, index) => ({
    localId: `p.${index}`,
    name: `p${index}`,
    type: DYN,
  }));
  const ret = member === "wait" ? STRING : F64;
  if (lowerer.liftedFnNamed(name) === undefined) {
    const number = (index: number): IrExpr => ({
      kind: "libCall",
      fn: "dyn.toNumberCoerce",
      args: [{ kind: "varRef", localId: `p.${index}`, type: DYN, loc }],
      type: F64,
      loc,
    });
    const orInfinity = (index: number): IrExpr => ({
      kind: "ternary",
      cond: {
        kind: "dynTest",
        test: "undefined",
        value: { kind: "varRef", localId: `p.${index}`, type: DYN, loc },
        type: BOOL,
        loc,
      },
      then: { kind: "numLit", value: Infinity, type: F64, loc },
      else_: number(index),
      type: F64,
      loc,
    });
    const array: IrExpr = { kind: "varRef", localId: "p.0", type: DYN, loc };
    const value: IrExpr =
      member === "wait"
        ? {
            kind: "libCall",
            fn: "atomics.waitDyn",
            args: [array, number(1), number(2), orInfinity(3)],
            type: STRING,
            loc,
          }
        : member === "notify"
          ? {
              kind: "libCall",
              fn: "atomics.notifyDyn",
              args: [array, number(1), orInfinity(2)],
              type: F64,
              loc,
            }
          : {
              kind: "libCall",
              fn: "atomics.opDyn",
              args: [
                array,
                number(1),
                count > 2 ? number(2) : { kind: "numLit", value: 0, type: F64, loc },
                count > 3 ? number(3) : { kind: "numLit", value: 0, type: F64, loc },
                { kind: "numLit", value: operation, type: F64, loc },
              ],
              type: F64,
              loc,
            };
    lowerer.liftedFns.push({
      name,
      params,
      returnType: ret,
      locals: params.map((p) => ({ id: p.localId, name: p.name, type: p.type, mutable: false })),
      body: [{ kind: "return", value, loc }],
      loc,
    });
  }
  return {
    kind: "closure",
    fnName: name,
    captures: [],
    type: { kind: "func", params: params.map((p) => p.type), ret },
    loc,
  };
}
