import * as estree from 'estree';
import { Unit, processNode } from '.';

export function processVariableDeclaration(code: Unit, v: estree.VariableDeclarator) {
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

let constantUid = 0;
export function processConstant(code: Unit, v: estree.Literal) {
    const name = `_c_${constantUid++}`;

    if (typeof v.value !== 'number')
        throw new SyntaxError('Unsupported literal ' + v.value);

    code.variables[name] = 'value';
    code.text.unshift({
        op: 'mov',
        output: name,
        input: [v.value.toFixed(16)]
    });

    return { ref: name };
}
