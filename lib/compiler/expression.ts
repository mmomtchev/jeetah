import * as estree from 'estree';
import { Unit, OpCode, Value, processNode } from '.';
import { addConstant } from './variable';

const arithmeticOps: Record<string, OpCode> = {
    '+': 'add',
    '-': 'sub',
    '*': 'mul',
    '/': 'div'
};

const comparisonOps: Record<string, OpCode> = {
    '>': 'gt',
    '<': 'lt',
    '==': 'eq',
    '!=': 'ne',
    '>=': 'ge',
    '<=': 'le'
};

function getExprId(code: Unit): number {
    if (!code.exprId) code.exprId = 0;
    return code.exprId++;
}

export function processIdentifier(code: Unit, v: estree.Identifier): Value {
    if (!code.variables[v.name] && !code.params[v.name]) {
        throw new ReferenceError(`Undefined variable ${v.name}`);
    }
    const id = getExprId(code);
    const temp = `_expr_${id}`;
    code.variables[temp] = 'value';

    code.text.push({
        op: 'mov',
        output: temp,
        input: [v.name]
    });

    return { ref: temp };
}

export function processBinaryExpression(code: Unit, expr: estree.BinaryExpression): Value {
    if (arithmeticOps[expr.operator]) return processArithmeticExpression(code, expr);
    if (comparisonOps[expr.operator]) return processComparisonExpression(code, expr);

    throw new SyntaxError('invalid binary operation: ' + expr.operator);
}

export function processArithmeticExpression(code: Unit, expr: estree.BinaryExpression): Value {
    if (!arithmeticOps[expr.operator])
        throw new SyntaxError('invalid arithmetic operation: ' + expr.operator);

    const id = getExprId(code);
    const temp = `_expr_${id}`;
    code.variables[temp] = 'value';

    const left = processNode(code, expr.left);
    if (!left) throw new SyntaxError('invalid left binary argument ' + expr.left);

    const right = processNode(code, expr.right);
    if (!right) throw new SyntaxError('invalid right binary argument ' + expr.right);

    code.text.push({
        op: arithmeticOps[expr.operator],
        output: temp,
        input: [left.ref, right.ref]
    });
    return { ref: temp };
}

export function processComparisonExpression(code: Unit, expr: estree.BinaryExpression): Value {
    if (!comparisonOps[expr.operator])
        throw new SyntaxError('invalid binary comparison: ' + expr.operator);

    const id = getExprId(code);
    const temp_i64 = `_expr_i64_${id}`;
    const temp = `_expr_${id}`;
    code.variables[temp_i64] = 'offset';
    code.variables[temp] = 'value';

    const left = processNode(code, expr.left);
    if (!left) throw new SyntaxError('invalid left comparison argument ' + expr.left);

    const right = processNode(code, expr.right);
    if (!right) throw new SyntaxError('invalid right comparison argument ' + expr.right);

    code.text.push({
        op: comparisonOps[expr.operator],
        output: temp_i64,
        input: [left.ref, right.ref]
    });
    switch (code.type) {
        case 'Float64':
            code.text.push({
                op: 'i2d',
                raw: true,
                output: temp,
                input: [temp_i64]
            });
            break;
        case 'Float32':
            code.text.push({
                op: 'i2f',
                raw: true,
                output: temp,
                input: [temp_i64]
            });
            break;
    }
    return { ref: temp };
}

export function processLogicalExpression(code: Unit, expr: estree.LogicalExpression): Value {

    const id = getExprId(code);
    const temp = `_expr_${id}`;
    code.variables[temp] = 'value';
    const end = `_expr_${id}_end`;

    const left = processNode(code, expr.left);
    if (!left) throw new SyntaxError('invalid left logical argument ' + expr.left);

    code.text.push({
        op: 'mov',
        output: temp,
        input: [left.ref]
    });

    if (expr.operator == '&&') {
        code.text.push({
            op: 'beq',
            output: end,
            input: [temp, addConstant(code, 0).ref]
        });
    } else if (expr.operator == '||') {
        code.text.push({
            op: 'bne',
            output: end,
            input: [temp, addConstant(code, 0).ref]
        });
    } else
        throw new SyntaxError('?? is not supported');

    const right = processNode(code, expr.right);
    if (!right) throw new SyntaxError('invalid right logical argument ' + expr.right);

    code.text.push({
        op: 'mov',
        output: temp,
        input: [right.ref]
    });

    code.text.push({
        op: 'label',
        output: end
    });

    return { ref: temp };
}

export function processUnaryExpression(code: Unit, expr: estree.UnaryExpression): Value {
    const id = getExprId(code);
    const temp = `_expr_${id}`;
    code.variables[temp] = 'value';

    const arg = processNode(code, expr.argument);
    if (!arg) throw new SyntaxError('invalid unary argument ' + expr.argument);

    if (expr.operator == '-') {
        code.text.push({
            op: 'neg',
            output: temp,
            input: [arg.ref]
        });
    } else if (expr.operator == '!') {
        // logical not in MIR is cumbersome
        const to0 = `_expr_${id}_to0`;
        const to1 = `_expr_${id}_to1`;
        code.text.push({
            op: 'beq',
            output: to1,
            input: [arg.ref, addConstant(code, 0).ref]
        });
        code.text.push({
            op: 'mov',
            output: temp,
            input: [addConstant(code, 0).ref]
        });
        code.text.push({
            op: 'jmp',
            raw: true,
            output: to0
        });
        code.text.push({
            op: 'label',
            output: to1
        });
        code.text.push({
            op: 'mov',
            output: temp,
            input: ['1.0']
        });
        code.text.push({
            op: 'label',
            output: to0
        });
    } else
        throw new SyntaxError('invalid unary operation: ' + expr.operator);

    return { ref: temp };
}

export function processIfStatement(code: Unit, expr: estree.IfStatement): void {
    const id = getExprId(code);

    const elseLabel = `_cond_${id}_else`;
    const endLabel = `_cond_${id}_end`;

    const test = processNode(code, expr.test);
    if (!test) throw new SyntaxError('invalid conditional test ' + expr.test);

    code.text.push({
        op: 'beq',
        output: expr.alternate ? elseLabel : endLabel,
        input: [test.ref, addConstant(code, 0).ref]
    });

    processNode(code, expr.consequent);

    if (expr.alternate) {
        code.text.push({
            op: 'jmp',
            raw: true,
            output: endLabel
        });

        code.text.push({
            op: 'label',
            raw: true,
            output: elseLabel
        });

        processNode(code, expr.alternate);
    }

    code.text.push({
        op: 'label',
        raw: true,
        output: endLabel
    });
}

export function processConditionalExpression(code: Unit, expr: estree.ConditionalExpression): Value {
    const id = getExprId(code);

    const temp = `_cond_${id}`;
    const elseLabel = `_cond_${id}_else`;
    const endLabel = `_cond_${id}_end`;
    code.variables[temp] = 'value';

    const test = processNode(code, expr.test);
    if (!test) throw new SyntaxError('invalid conditional test ' + expr.test);

    code.text.push({
        op: 'beq',
        output: elseLabel,
        input: [test.ref, addConstant(code, 0).ref]
    });

    const consequent = processNode(code, expr.consequent);
    if (!consequent) throw new SyntaxError('invalid conditional consequent ' + expr.consequent);

    code.text.push({
        op: 'mov',
        output: temp,
        input: [consequent.ref]
    });

    code.text.push({
        op: 'jmp',
        raw: true,
        output: endLabel
    });

    code.text.push({
        op: 'label',
        raw: true,
        output: elseLabel
    });

    const alternate = processNode(code, expr.alternate);
    if (!alternate) throw new SyntaxError('invalid conditional alternate ' + expr.alternate);

    code.text.push({
        op: 'mov',
        output: temp,
        input: [alternate.ref]
    });

    code.text.push({
        op: 'label',
        raw: true,
        output: endLabel
    });

    return { ref: temp };
}

export function processUpdateExpression(code: Unit, expr: estree.UpdateExpression): Value {
    const id = getExprId(code);
    const temp = `_expr_${id}`;

    if (expr.argument.type !== 'Identifier') throw new TypeError('Update expression argument is not a variable');
    const arg = expr.argument.name;
    if (!arg) throw new TypeError('Update expression argument is not a variable');

    if (!expr.prefix) {
        code.text.push({
            op: 'mov',
            output: temp,
            input: [arg]
        });
        code.variables[temp] = 'value';
    }

    code.text.push({
        op: expr.operator === '++' ? 'add' : 'sub',
        output: arg,
        input: [arg, '1.0']
    });

    return { ref: expr.prefix ? arg : temp };
}

export function processAssignmentExpression(code: Unit, expr: estree.AssignmentExpression): Value {
    const right = processNode(code, expr.right);
    if (!right) throw new TypeError('Invalid right side of assignment ' + expr.right);

    if (expr.left.type !== 'Identifier') throw new TypeError('Invalid left side of assignment');
    const variable = expr.left.name;

    let combOp: OpCode | null = null;
    if (expr.operator.length > 1) {
        if (!arithmeticOps[expr.operator[0]])
            throw new SyntaxError(`Operator ${expr.operator} not supported`);
        combOp = arithmeticOps[expr.operator[0]];
    }
    if (combOp) {
        code.text.push({
            op: combOp,
            output: variable,
            input: [variable, right.ref]
        });
    } else {
        code.text.push({
            op: 'mov',
            output: variable,
            input: [right.ref]
        });
    }

    return { ref: variable };
}
