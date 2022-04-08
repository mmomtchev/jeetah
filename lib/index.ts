import { JeetahFn, compileBody, compile, compileMap, genModule } from './compiler';

export { JeetahFn, compileBody, compile, compileMap, genModule };
export type VarType = 'Float64' | 'Float32';

export type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array |
    Float32Array | Float64Array;
export type TypedArrayType = 'Int8' | 'Uint8' | 'Int16' | 'Uint16' | 'Int32' | 'Uint32' | 'Float32' | 'Float64';
export type TypedArrayConstructor = Int8ArrayConstructor | Uint8ArrayConstructor | Int16ArrayConstructor |
    Uint16ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor |
    Float32ArrayConstructor | Float64ArrayConstructor;

import * as path from 'path';
import * as binary from '@mapbox/node-pre-gyp';

const binding_path = binary.find(path.resolve(path.join(__dirname, '../package.json')));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const native = require(binding_path);

// https://stackoverflow.com/questions/44275172/typescript-declarations-file-for-node-c-addon
export interface JeetahExpression {
    eval(...args: number[]): number;
    map(array: TypedArray, iter: string): TypedArray;
}

export const Float64Expression: {
    new(fn: JeetahFn): JeetahExpression
} = native.Float64Expression;

export const Float32Expression: {
    new(fn: JeetahFn): JeetahExpression
} = native.Float32Expression;

export const Uint32Expression: {
    new(fn: JeetahFn): JeetahExpression
} = native.Uint32Expression;

export const Int32Expression: {
    new(fn: JeetahFn): JeetahExpression
} = native.Int32Expression;

export type JeetahConstructor = typeof Float32Expression | typeof Float64Expression |
    typeof Uint32Expression | typeof Int32Expression;
