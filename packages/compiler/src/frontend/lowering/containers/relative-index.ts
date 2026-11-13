import { keyedHelperName } from "../stable-names.js";
import { numLit, varRef } from "../../../ir/build.js";
import {
  BOOL,
  F64,
  UNDEFINED_T,
  type IrExpr,
  type IrStmt,
  type IrType,
  type SrcLoc,
} from "../../../ir/ir.js";
import * as ts from "../../ts7/adapter.js";
import { locOf } from "../../program.js";
import { typeKey } from "../../type-mapper.js";
import type { Lowerer } from "../lowerer.js";
import { lowerPositionArgument, positionNumber } from "../optional-arguments.js";

/** `b.at(i)` on a typed array: the same relative-index read over the typed
 * array's length and its element load (an in-range index always holds a
 * number). */
export function lowerBytesAtCall(
  lowerer: Lowerer,
  call: ts.CallExpression,
  access: ts.PropertyAccessExpression,
  bytesT: IrType & { kind: "bytes" },
): IrExpr {
  return lowerRelativeIndexCall(
    lowerer,
    call,
    access,
    bytesT,
    `bytesAt:${typeKey(bytesT)}`,
    "%bytes.at",
    (loc) => ({
      kind: "varDecl",
      localId: "n.0",
      init: {
        kind: "bytesIntrinsic",
        method: "length",
        receiver: varRef("a.0", bytesT, loc),
        args: [],
        type: F64,
        loc,
      },
      loc,
    }),
    (t, loc) => ({
      kind: "bytesIntrinsic",
      method: "get",
      receiver: varRef("a.0", bytesT, loc),
      args: [t],
      type: F64,
      loc,
    }),
  );
}

/** The relative-index read helper shared by arrays and typed arrays: `n.0`
 * holds the receiver's length (`lengthDecl`), and `read` loads the element
 * at the normalized in-range position. */
export function lowerRelativeIndexCall(
  lowerer: Lowerer,
  call: ts.CallExpression,
  access: ts.PropertyAccessExpression,
  arrT: IrType,
  keyPrefix: string,
  helperPrefix: string,
  lengthDecl: (loc: SrcLoc) => IrStmt,
  read: (t: IrExpr, loc: SrcLoc) => IrExpr,
): IrExpr {
  const loc = locOf(call);
  if (call.arguments.nodes.some(ts.isSpreadElement))
    lowerer.noLowering(".at with spread arguments", call);
  const receiver =
    arrT.kind === "bytes"
      ? lowerer.lowerExprExpecting(access.expression, arrT)
      : lowerer.lowerExpr(access.expression);
  const indexNode = call.arguments.nodes[0];
  const index = lowerPositionArgument(lowerer, indexNode, numLit(0, loc));
  const resultT = lowerer.irTypeOf(call);
  if (resultT.kind !== "union") lowerer.badType(call, lowerer.typeOf(call)); // defensive: T | undefined always maps to a union
  const undefTag = lowerer.armTag(resultT.unionId, UNDEFINED_T);
  if (undefTag < 0) lowerer.badType(call, lowerer.typeOf(call));
  const key = `${keyPrefix}:${typeKey(resultT)}:${typeKey(index.type)}`;
  let name = lowerer.arrHofHelpers.get(key);
  if (!name) {
    name = keyedHelperName(lowerer, helperPrefix, key);
    lowerer.arrHofHelpers.set(key, name);

    const t = varRef("t.0", F64, loc);
    const i = varRef("i.0", index.type, loc);
    const number = varRef("number.0", F64, loc);
    const n = varRef("n.0", F64, loc);
    const found = lowerer.coerceToExpected(read(t, loc), resultT);
    const miss: IrExpr = {
      kind: "unionWrap",
      unionId: resultT.unionId,
      tag: undefTag,
      value: { kind: "unitLit", unit: "undefined", type: UNDEFINED_T, loc },
      type: resultT,
      loc,
    };
    const floorOf = (e: IrExpr): IrExpr => ({
      kind: "libCall",
      fn: "math.floor",
      args: [e],
      type: F64,
      loc,
    });
    const lt = (l: IrExpr, r: IrExpr): IrExpr => ({
      kind: "bin",
      op: "<",
      left: l,
      right: r,
      type: BOOL,
      loc,
    });
    const body: IrStmt[] = [
      lengthDecl(loc),
      {
        kind: "varDecl",
        localId: "number.0",
        init: positionNumber(lowerer, i, numLit(0, loc), indexNode ?? call, "array at position"),
        loc,
      },
      // ToIntegerOrInfinity: floor is trunc for i >= 0; negatives mirror
      // (trunc(i) = -floor(-i)); NaN becomes 0. ±Infinity floors to
      // itself and falls out of range below, exactly the spec.
      { kind: "varDecl", localId: "t.0", init: floorOf(number), loc },
      {
        kind: "if",
        cond: lt(number, numLit(0, loc)),
        then: [
          {
            kind: "assign",
            localId: "t.0",
            value: {
              kind: "bin",
              op: "-",
              left: numLit(0, loc),
              right: floorOf({
                kind: "bin",
                op: "-",
                left: numLit(0, loc),
                right: number,
                type: F64,
                loc,
              }),
              type: F64,
              loc,
            },
            loc,
          },
        ],
        else_: null,
        loc,
      },
      {
        kind: "if",
        cond: { kind: "libCall", fn: "num.isNaN", args: [number], type: BOOL, loc },
        then: [{ kind: "assign", localId: "t.0", value: numLit(0, loc), loc }],
        else_: null,
        loc,
      },
      {
        kind: "if",
        cond: lt(t, numLit(0, loc)),
        then: [
          {
            kind: "assign",
            localId: "t.0",
            value: { kind: "bin", op: "+", left: t, right: n, type: F64, loc },
            loc,
          },
        ],
        else_: null,
        loc,
      },
      {
        kind: "if",
        cond: lt(t, numLit(0, loc)),
        then: [{ kind: "return", value: miss, loc }],
        else_: null,
        loc,
      },
      {
        kind: "if",
        cond: { kind: "bin", op: ">=", left: t, right: n, type: BOOL, loc },
        then: [{ kind: "return", value: miss, loc }],
        else_: null,
        loc,
      },
      { kind: "return", value: found, loc },
    ];
    lowerer.liftedFns.push({
      name,
      params: [
        { localId: "a.0", name: "a", type: arrT },
        { localId: "i.0", name: "i", type: index.type },
      ],
      returnType: resultT,
      locals: [
        { id: "a.0", name: "a", type: arrT, mutable: true },
        { id: "i.0", name: "i", type: index.type, mutable: false },
        { id: "n.0", name: "n", type: F64, mutable: false },
        { id: "number.0", name: "number", type: F64, mutable: false },
        { id: "t.0", name: "t", type: F64, mutable: true },
      ],
      body,
      loc,
    });
  }
  return { kind: "call", callee: name, args: [receiver, index], type: resultT, loc };
}
