import * as estree from 'estree';
import { Unit, processNode } from '.';

export function processVariableDeclaration(code: Unit, v: estree.VariableDeclarator) {
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
