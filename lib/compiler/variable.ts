import * as estree from 'estree';
import { Unit, Value, processNode } from '.';

export function getInitEnd(code: Unit): number {
    let initEnd = code.text.findIndex((op) => op.op === 'label' && op.output === '_func_start');
    if (initEnd === -1) {
        initEnd = 0;
        code.text.unshift({
            op: 'label',
            output: '_func_start'
        });
    }

    return initEnd;
}

export function addConstant(code: Unit, value: number): Value {
    const existing = Object.keys(code.constants).find((c) => code.constants[c] === value);
    if (existing !== undefined)
        return { ref: existing };

    if (!code.tempId)
        code.tempId = 0;
    const name = `_constant_${code.tempId++}`;

    code.constants[name] = value;
    code.text.unshift({
        op: 'mov',
        output: name,
        input: [value.toFixed(16)]
    });

    return { ref: name };
}

export function processVariableDeclaration(code: Unit, v: estree.VariableDeclarator): void {
    if (v.id.type != 'Identifier') throw new SyntaxError('Unsupported variable declarator ' + v.id.type);
    const name = v.id.name;
    code.variables[name] = 'value';
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

export function processConstant(code: Unit, v: estree.Literal): Value {
    if (typeof v.value !== 'number')
        throw new SyntaxError('Unsupported literal ' + v.value);

    return addConstant(code, v.value);
}

export function processGlobalConstant(code: Unit, v: estree.MemberExpression | estree.Identifier): Value {
    let obj: Record<string, unknown> | undefined;
    let name = '';

    if (v.type === 'MemberExpression') {
        if (v.object.type !== 'Identifier' || v.property.type !== 'Identifier')
            throw new SyntaxError('Indirect member expressions are not supported');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        obj = (global as unknown as Record<string, unknown>)[v.object.name] as Record<string, unknown>;
        if (obj === undefined)
            throw new ReferenceError(`Object ${v.object.name} is undefined`);
        name = v.property.name;
    } else {
        obj = global as unknown as Record<string, unknown>;
        name = v.name;
    }

    const val = obj[name];
    if (val === undefined || typeof val !== 'number')
        throw new TypeError(`${name} is not a number`);

    return addConstant(code, val);
}