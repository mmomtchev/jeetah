import * as acorn from 'acorn';
import { MIR } from './binding';

type OpCode = 'mov' | 'add' | 'mul' | 'sub' | 'div' | 'ret' | 'dble' | 'jmp';
type VarType = 'Float64' | 'Float32';

interface Instruction {
    label?: string;
    op: OpCode;
    output?: string;
    input?: (string | number)[];
}

interface Unit {
    name: string;
    type: VarType;
    params: Record<string, boolean>;
    variables: Record<string, boolean>;
    text: Instruction[];
    return?: Value;

    exprId?: number;
}

interface Value {
    ref: string;
}

function processVariableDeclaration(code: Unit, v: any) {
    const name = v.id.name;
    code.variables[name] = true;
    let init;
    if (v.init)
        init = processNode(code, v.init);
    if (init) {
        code.text.push({
            op: 'mov',
            output: name,
            input: [init.ref]
        });
    }
}

const binaryOps: Record<string, OpCode> = {
    '+': 'add',
    '-': 'sub',
    '*': 'mul',
    '/': 'div'
};

function processBinaryExpression(code: Unit, expr: any): Value {
    if (!binaryOps[expr.operator])
        throw new SyntaxError('invalid operation: ' + expr.operator);

    if (!code.exprId) code.exprId = 0;
    const temp = `_expr_${code.exprId}`;
    code.exprId++;
    code.variables[temp] = true;

    const left = processNode(code, expr.left);
    if (!left) throw new SyntaxError('invalid left binary operator ' + expr.operator);
    code.text.push({
        op: 'mov',
        output: temp,
        input: [left.ref]
    });
    const right = processNode(code, expr.right);
    if (!right) throw new SyntaxError('invalid right binary operator ' + expr.operator);

    code.text.push({
        op: binaryOps[expr.operator],
        output: temp,
        input: [left.ref, right.ref]
    });
    return { ref: temp };
}

function processNode(code: Unit, node: any): Value | undefined {
    switch (node.type) {
        case 'BlockStatement':
            for (const leaf of node.body) {
                const r = processNode(code, leaf);
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
        case 'BinaryExpression':
            return processBinaryExpression(code, node);
        case 'Identifier':
            return { ref: node.name };
        case 'Literal':
            return { ref: node.value };
        default:
            console.error(node);
            throw new SyntaxError('unsupported statement ' + node.type);
    }
}

export function processProgram(node: any, type: VarType): Unit {
    if (node.type != 'Program')
        throw new TypeError('Passed value is not a program');
    if (!node.body || !node.body[0] || node.body[0].type != 'FunctionDeclaration')
        throw new TypeError('No function body');
    const code: Unit = { name: node.body[0].id.name, text: [], params: {}, variables: {}, type };
    for (const p of node.body[0].params)
        code.params[p.name] = true;
    processNode(code, node.body[0].body);
    return code;
}

export function produceLoop(code: Unit, node: any, iter: string, start: string | number, end: string | number, increment: string | number) {
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
    const result = processNode(code, node);
    code.text[loopStart].label = '_main_loop';

    code.text.push({
        op: 'add',
        output: iter,
        input: [iter, '_main_loop_inc']
    });
    code.text.push({
        op: 'dble',
        output: '_main_loop',
        input: [iter, '_main_loop_end']
    });
}

const prefix: Record<VarType, string> = {
    'Float32': 'f',
    'Float64': 'd'
};

export function genMIR(code: Unit) {
    if (!prefix[code.type]) throw new TypeError('Unsupported variable type');

    let mir = `m_${code.name}:\tmodule\n`;
    mir += `export\t${code.name}\n`;
    mir += `${code.name}:\tfunc ${prefix[code.type]}`;
    if (Object.keys(code.params).length) {
        mir += ', ' + Object.keys(code.params).map(p => prefix[code.type] + ':' + p).join(', ');
    }
    mir += '\n';
    if (Object.keys(code.variables).length) {
        mir += '\tlocal\t' + Object.keys(code.variables).map(v => prefix[code.type] + ':' + v).join(', ') + '\n';
    }

    for (const op of code.text) {
        if (op.label)
            mir += `${op.label}:\n`;
        mir += `\t\t${prefix[code.type] + op.op}`;
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

export function compile(fn: Function, type: VarType): MIR {
    const ast = acorn.parse(fn.toString(), { ecmaVersion: 2015 });
    const code = processProgram(ast, type);
    const text = genMIR(code);
    return new MIR(text, type, Object.keys(code.params).length);
}
