import * as estree from 'estree';
import { Unit, Value, VarType, processNode } from '.';

let fnUid = 0;
export function processFunction(node: estree.FunctionExpression | estree.ArrowFunctionExpression, type: VarType): Unit {
    if (node.type !== 'FunctionExpression' && node.type !== 'ArrowFunctionExpression')
        throw new TypeError('Passed value is not a function expression');
    let body;
    if (node.type === 'ArrowFunctionExpression')
        body = node;
    else if (node.type === 'FunctionExpression' && node.body.type == 'BlockStatement')
        body = node.body;
    else
        throw new SyntaxError('No function body');
    let name;
    if (node.type === 'ArrowFunctionExpression' || !node.id || !node.id.name) {
        name = `_jeetah_fn_${fnUid++}`;
    } else {
        name = node.id.name;
    }
    const code: Unit = { name, text: [], params: {}, variables: {}, imports: {}, type };
    for (const p of node.params) {
        if (p.type !== 'Identifier')
            throw new SyntaxError('Function arguments must be identifiers');
        code.params[p.name] = true;
    }
    processNode(code, body);
    return code;
}

export const builtins: Record<string, { arg: number, c: string }> = {
    'Math.sin': { arg: 1, c: 'sin' },
    'Math.cos': { arg: 1, c: 'cos' },
    'Math.sqrt': { arg: 1, c: 'sqrt' },
    'Math.log': { arg: 1, c: 'log' },
    'Math.exp': { arg: 1, c: 'exp' },
    'Math.pow': { arg: 2, c: 'pow' }
};

let callReturnId = 0;
export function processCallExpression(code: Unit, expr: estree.CallExpression): Value {
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
        input: [fn.c, result, ...args.map((a) => a.ref)]
    });
    code.imports[name] = true;

    return { ref: result };
}