import * as estree from 'estree';
import { Unit, OpCode, Value, processNode } from '.';

const binaryOps: Record<string, OpCode> = {
    '+': 'add',
    '-': 'sub',
    '*': 'mul',
    '/': 'div'
};

export function processBinaryExpression(code: Unit, expr: estree.BinaryExpression): Value {
    if (!binaryOps[expr.operator])
        throw new SyntaxError('invalid binary operation: ' + expr.operator);

    if (!code.exprId) code.exprId = 0;
    const temp = `_expr_${code.exprId}`;
    code.exprId++;
    code.variables[temp] = 'value';

    const left = processNode(code, expr.left);
    if (!left) throw new SyntaxError('invalid left binary argument ' + expr.left);

    const right = processNode(code, expr.right);
    if (!right) throw new SyntaxError('invalid right binary argument ' + expr.right);

    code.text.push({
        op: binaryOps[expr.operator],
        output: temp,
        input: [left.ref, right.ref]
    });
    return { ref: temp };
}

export function processUnaryExpression(code: Unit, expr: estree.UnaryExpression): Value {
    if (expr.operator !== '-')
        throw new SyntaxError('invalid unary operation: ' + expr.operator);

    if (!code.exprId) code.exprId = 0;
    const temp = `_expr_${code.exprId}`;
    code.exprId++;
    code.variables[temp] = 'value';

    const arg = processNode(code, expr.argument);
    if (!arg) throw new SyntaxError('invalid unary argument ' + expr.argument);

    code.text.push({
        op: 'neg',
        output: temp,
        input: [arg.ref]
    });
    return { ref: temp };
}
