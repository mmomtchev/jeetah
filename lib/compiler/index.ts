import * as acorn from 'acorn';
import * as estree from 'estree';

import {
    processBinaryExpression,
    processUnaryExpression,
    processConditionalExpression,
    processIfStatement,
    processLogicalExpression,
    processUpdateExpression,
    processIdentifier,
    processAssignmentExpression
} from './expression';
import { processFunction, processCallExpression, processReturn } from './function';
import { processConstant, processGlobalConstant, processVariableDeclaration } from './variable';
import { genModule } from './mir';
import { generateMap } from './map';
export { genModule };

export type JeetahFn = (...args: number[]) => number;

export type OpCode = 'mov' | 'add' | 'mul' | 'sub' | 'div' | 'neg' |
    'dmov' | 'dadd' | 'dmul' | 'dsub' | 'ddiv' |
    'fmov' | 'fadd' | 'fmul' | 'fsub' | 'fdiv' |
    'ret' | 'jmp' | 'call' |
    'i2f' | 'i2d' |
    'beq' | 'bne' | 'ubgt' | 'ubge' | 'ublt' | 'ble' |
    'eq' | 'ne' | 'lt' | 'gt' | 'le' | 'ge' |
    'label';

export type VarType = 'Float64' | 'Float32' | 'Uint32' | 'Int32';

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
    constants: Record<string, number>;
    imports: Record<string, boolean>;
    text: Instruction[];
    mirText?: string;

    exprId?: number;
    tempId?: number;
}

export interface Value {
    ref: string;
}

export function processNode(code: Unit, node: estree.Node): Value | undefined {
    switch (node.type) {
        case 'BlockStatement':
            for (const leaf of node.body) {
                processNode(code, leaf);
            }
            return;
        case 'ExpressionStatement':
            processNode(code, node.expression);
            return;
        case 'VariableDeclaration':
            for (const v of node.declarations)
                processVariableDeclaration(code, v);
            return;
        case 'AssignmentExpression':
            processAssignmentExpression(code, node);
            return;
        case 'ReturnStatement':
            processReturn(code, node);
            return;
        case 'ArrowFunctionExpression':
            if (node.body) {
                const r = processNode(code, node.body);
                if (r) {
                    code.variables['_return_value'] = 'value';
                    code.text.push({
                        op: 'mov',
                        output: '_return_value',
                        input: [r.ref]
                    });
                }
            }
            return;
        case 'BinaryExpression':
            return processBinaryExpression(code, node);
        case 'UnaryExpression':
            return processUnaryExpression(code, node);
        case 'LogicalExpression':
            return processLogicalExpression(code, node);
        case 'UpdateExpression':
            return processUpdateExpression(code, node);
        case 'IfStatement':
            processIfStatement(code, node);
            return;
        case 'ConditionalExpression':
            return processConditionalExpression(code, node);
        case 'Identifier':
            return processIdentifier(code, node);
        case 'MemberExpression':
            return processGlobalConstant(code, node);
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
