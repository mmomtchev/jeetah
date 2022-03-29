import * as acorn from 'acorn';
import * as estree from 'estree';
import { MIR } from '../binding';

import { processBinaryExpression } from './expression';
import { processFunction, processCallExpression } from './function';
import { processVariableDeclaration } from './variable';
import { genModule } from './mir';

export type JeetahFn = (...args: number[]) => number;

export type OpCode = 'mov' | 'add' | 'mul' | 'sub' | 'div' |
    'dmov' | 'dadd' | 'dmul' | 'dsub' | 'ddiv' |
    'fmov' | 'fadd' | 'fmul' | 'fsub' | 'fdiv' |
    'ret' | 'ble' | 'jmp' | 'call';

export type VarType = 'Float64' | 'Float32';

export interface Instruction {
    label?: string;
    op: OpCode;
    output?: string;
    raw?: boolean;
    input?: (string | number)[];
}

export interface Unit {
    name: string;
    type: VarType;
    params: Record<string, boolean>;
    variables: Record<string, boolean>;
    imports: Record<string, boolean>;
    text: Instruction[];
    return?: Value;

    exprId?: number;
}

export interface Value {
    ref: string | number;
}

export function processNode(code: Unit, node: estree.Node): Value | undefined {
    switch (node.type) {
        case 'BlockStatement':
            for (const leaf of node.body) {
                processNode(code, leaf);
                if (code.return) return code.return;
            }
            return;
        case 'VariableDeclaration':
            for (const v of node.declarations)
                processVariableDeclaration(code, v);
            return;
        case 'ReturnStatement':
            if (node.argument) {
                const r = processNode(code, node.argument);
                if (r) {
                    code.return = r;
                    return r;
                }
            }
            return;
        case 'ArrowFunctionExpression':
            if (node.body) {
                const r = processNode(code, node.body);
                if (r) {
                    code.return = r;
                    return r;
                }
            }
            return;
        case 'BinaryExpression':
            return processBinaryExpression(code, node);
        case 'Identifier':
            return { ref: node.name };
        case 'Literal':
            if (typeof node.value !== 'number')
                throw new SyntaxError('Unsupported literal ' + node.value);
            return { ref: node.value };
        case 'CallExpression':
            return processCallExpression(code, node);
        default:
            console.error(node);
            throw new SyntaxError('unsupported statement ' + node.type);
    }
}

export function produceLoop(
    code: Unit,
    node: estree.Node,
    iter: string,
    start: string | number,
    end: string | number,
    increment: string | number) {

    code.variables['_main_loop_end'] = true;
    code.variables['_main_loop_inc'] = true;

    code.text.push({
        op: 'mov',
        output: '_main_loop_inc',
        input: [increment]
    });
    code.text.push({
        op: 'mov',
        output: '_main_loop_end',
        input: [end]
    });

    const loopStart = code.text.length;
    processNode(code, node);
    code.text[loopStart].label = '_main_loop';

    code.text.push({
        op: 'add',
        output: iter,
        input: [iter, '_main_loop_inc']
    });
    code.text.push({
        op: 'ble',
        output: '_main_loop',
        input: [iter, '_main_loop_end']
    });
}

export function compileToMir(fn: JeetahFn, type: VarType): { text: string, object: Unit } {
    const ast = acorn.parseExpressionAt(fn.toString(), 0,
        { ecmaVersion: 2015 }) as unknown as estree.FunctionExpression;
    const code = processFunction(ast, type);
    const text = genModule(code);
    return { text, object: code };
}

export function assembleAndLink(code: Unit, text: string) {
    return new MIR(text, code.type, Object.keys(code.params).length);
}

export function compile(fn: JeetahFn, type: VarType): MIR {
    const { text, object } = compileToMir(fn, type);
    return assembleAndLink(object, text);
}
