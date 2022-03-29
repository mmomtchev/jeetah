import * as acorn from 'acorn';
import * as estree from 'estree';
import { MIR } from '../binding';

import { processBinaryExpression } from './expression';
import { processFunction, processCallExpression, builtins } from './function';
import { processVariableDeclaration } from './variable';

export type JeetahFn = (...args: number[]) => number;

export type OpCode = 'mov' | 'add' | 'mul' | 'sub' | 'div' |
    'dmov' | 'dadd' | 'dmul' | 'dsub' | 'ddiv' |
    'fmov' | 'fadd' | 'fmul' | 'fsub' | 'fdiv' |
    'ret' | 'ble' | 'jmp' | 'call';
export type OpPrefix = 'f' | 'd';
export type OpType = 'f' | 'd';
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

const opPrefix: Record<VarType, OpPrefix> = {
    'Float32': 'f',
    'Float64': 'd'
};

const opType: Record<VarType, OpType> = {
    'Float32': 'f',
    'Float64': 'd'
};

function genMIR(code: Unit) {
    if (!opPrefix[code.type]) throw new TypeError('Unsupported variable type');

    let mir = `m_${code.name}:\tmodule\n`;

    for (const imp of Object.keys(code.imports)) {
        mir += `_p_${builtins[imp].c}:\tproto ${opType[code.type]}`;
        if (builtins[imp].arg > 0) {
            for (let i = 0; i < builtins[imp].arg; i++)
                mir += `, ${opType[code.type]}:arg${i}`;
        }
        mir += '\n';
        mir += `import\t${builtins[imp].c}\n`;
    }

    mir += `export\t_f_${code.name}\n`;
    mir += `_f_${code.name}:\tfunc ${opType[code.type]}`;
    if (Object.keys(code.params).length) {
        mir += ', ' + Object.keys(code.params).map(p => opType[code.type] + ':' + p).join(', ');
    }
    mir += '\n';
    if (Object.keys(code.variables).length) {
        mir += '\tlocal\t' + Object.keys(code.variables).map(v => opType[code.type] + ':' + v).join(', ') + '\n';
    }

    for (const op of code.text) {
        if (op.label)
            mir += `${op.label}:\n`;
        mir += `\t\t${(op.raw ? '' : opPrefix[code.type]) + op.op}`;
        if (op.output)
            mir += `\t${op.output}`;
        if (op.input && op.input.length)
            for (const i of op.input) {
                mir += ', ';
                if (typeof i === 'number')
                    mir += i.toFixed(16);
                else
                    mir += i;
            }
        mir += '\n';
    }
    if (code.return)
        mir += `\t\tret\t${code.return.ref}\n`;
    mir += '\tendfunc\n';
    mir += 'endmodule\n';
    return mir;
}

export function compileToMir(fn: JeetahFn, type: VarType): { text: string, object: Unit } {
    const ast = acorn.parseExpressionAt(fn.toString(), 0,
        { ecmaVersion: 2015 }) as unknown as estree.FunctionExpression;
    const code = processFunction(ast, type);
    const text = genMIR(code);
    return { text, object: code };
}

export function assembleAndLink(code: Unit, text: string) {
    return new MIR(text, code.type, Object.keys(code.params).length);
}

export function compile(fn: JeetahFn, type: VarType): MIR {
    const { text, object } = compileToMir(fn, type);
    return assembleAndLink(object, text);
}
