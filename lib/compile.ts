import * as acorn from 'acorn';
import * as estree from 'estree';
import { MIR } from './binding';

type OpCode = 'mov' | 'add' | 'mul' | 'sub' | 'div' |
    'dmov' | 'dadd' | 'dmul' | 'dsub' | 'ddiv' |
    'fmov' | 'fadd' | 'fmul' | 'fsub' | 'fdiv' |
    'ret' | 'ble' | 'jmp' | 'call';
type OpPrefix = 'f' | 'd';
type OpType = 'f' | 'd';
type VarType = 'Float64' | 'Float32';

interface Instruction {
    label?: string;
    op: OpCode;
    output?: string;
    raw?: boolean;
    input?: (string | number)[];
}

interface Unit {
    name: string;
    type: VarType;
    params: Record<string, boolean>;
    variables: Record<string, boolean>;
    imports: Record<string, boolean>;
    text: Instruction[];
    return?: Value;

    exprId?: number;
}

interface Value {
    ref: string | number;
}

function processVariableDeclaration(code: Unit, v: estree.VariableDeclarator) {
    if (v.id.type != 'Identifier') throw new SyntaxError('Unsupported variable declarator ' + v.id.type);
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

function processBinaryExpression(code: Unit, expr: estree.BinaryExpression): Value {
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

const builtins: Record<string, {arg: number, c: string}> = {
    'Math.sin': { arg: 1, c: 'sin' },
    'Math.cos': { arg: 1, c: 'cos' },
    'Math.sqrt': { arg: 1, c: 'sqrt' },
    'Math.log': { arg: 1, c: 'log' },
    'Math.exp': { arg: 1, c: 'exp' },
    'Math.pow': { arg: 2, c: 'pow' }
};

let callReturnId = 0;
function processCallExpression(code: Unit, expr: estree.CallExpression): Value {
    let name;
    if (expr.callee.type === 'MemberExpression') {
        if (expr.callee.object.type !== 'Identifier' || expr.callee.property.type !== 'Identifier')
            throw new SyntaxError('Indirect call expressions are not yet supported');
        name = expr.callee.object.name + '.' + expr.callee.property.name;
    } else if (expr.callee.type === 'Identifier') {
        name = expr.callee.name;
    } else {
        throw new SyntaxError('Indirect call expressions are not yet supported');
    }
    if (builtins[name] === undefined)
        throw new ReferenceError('Undefined function ' + name);
    const fn = builtins[name];
    if (expr.arguments.length !== fn.arg)
        throw new TypeError(`${name} expects ${fn.arg} arguments`);
    
    const args: Value[] = [];
    for (const arg of expr.arguments) {
        const r = processNode(code, arg);
        if (!r) {
            throw new SyntaxError('Function argument evaluates to no value');
        }
        args.push(r);
    }

    const result = `_callret_${callReturnId++}`;
    code.variables[result] = true;
    code.text.push({
        op: 'call',
        raw: true,
        output: `_p_${fn.c}`,
        input: [fn.c, result, ...args.map((a) => a.ref) ]
    });
    code.imports[name] = true;

    return {ref: result};
}

function processNode(code: Unit, node: estree.Node): Value | undefined {
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

let fnUid = 0;
export function processFunction(node: estree.FunctionExpression, type: VarType): Unit {
    if (node.type != 'FunctionExpression')
        throw new TypeError('Passed value is not a function expression');
    if (!node.body || node.body.type !== 'BlockStatement')
        throw new SyntaxError('No function body');
    if (!node.id || !node.id.name) {
        node.id = {
            name: `_jeetah_fn_${fnUid++}`,
            type: 'Identifier'
        };
    }
    const code: Unit = { name: node.id.name, text: [], params: {}, variables: {}, imports: {}, type };
    for (const p of node.params) {
        if (p.type !== 'Identifier')
            throw new SyntaxError('Function arguments must be identifiers');
        code.params[p.name] = true;
    }
    processNode(code, node.body);
    return code;
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

export function genMIR(code: Unit) {
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

export function compile(fn: (...args: number[]) => number, type: VarType): MIR {
    const ast = acorn.parseExpressionAt(fn.toString(), 0,
        { ecmaVersion: 2015 }) as unknown as estree.FunctionExpression;
    const code = processFunction(ast, type);
    const text = genMIR(code);
    return new MIR(text, type, Object.keys(code.params).length);
}
