import * as acorn from 'acorn';
import * as estree from 'estree';

import { processBinaryExpression } from './expression';
import { processFunction, processCallExpression } from './function';
import { processConstant, processVariableDeclaration } from './variable';
import { genModule } from './mir';
import { generateMap } from './map';
export { genModule };

export type JeetahFn = (...args: number[]) => number;

export type OpCode = 'mov' | 'add' | 'mul' | 'sub' | 'div' |
    'dmov' | 'dadd' | 'dmul' | 'dsub' | 'ddiv' |
    'fmov' | 'fadd' | 'fmul' | 'fsub' | 'fdiv' |
    'ret' | 'jmp' | 'call' |
    'ubgt' | 'ubge' | 'ublt' | 'ble' |
    'label';

export type VarType = 'Float64' | 'Float32';

export interface Instruction {
    op: OpCode;
    output?: string;
    raw?: boolean;
    input?: string[];
}

export type Variable = 'value' | 'pointer' | 'offset';

export interface Unit {
    name: string;
    type: VarType;
    params: Record<string, Variable>;
    variables: Record<string, Variable>;
    imports: Record<string, boolean>;
    text: Instruction[];
    mirText?: string;
    return?: Value;

    exprId?: number;
}

export interface Value {
    ref: string;
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
            return processConstant(code, node);
        case 'CallExpression':
            return processCallExpression(code, node);
        default:
            console.error(node);
            throw new SyntaxError('unsupported statement ' + node.type);
    }
}

export function compileBody(fn: JeetahFn, type: VarType): Unit {
    const ast = acorn.parseExpressionAt(fn.toString(), 0,
        { ecmaVersion: 2015 }) as unknown as estree.FunctionExpression;
    const code = processFunction(ast, type);
    return code;
}

export function compile(fn: JeetahFn, type: VarType): Unit {
    const code = compileBody(fn, type);
    code.mirText = genModule(code);
    return code;
}

export function compileMap(fn: JeetahFn, type: VarType, iter: string): Unit {
    const code = compileBody(fn, type);
    generateMap(code, iter);
    code.mirText = genModule(code);
    return code;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any)['Jeetah'] = {
    compile,
    compileBody,
    compileMap
};
