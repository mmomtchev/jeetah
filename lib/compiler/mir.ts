import { Unit, Variable, VarType } from '.';
import { builtins } from './function';

export type OpPrefix = 'f' | 'd';
export type OpType = 'f' | 'd';

const opPrefix: Record<VarType, OpPrefix> = {
    'Float32': 'f',
    'Float64': 'd'
};

const opType: Record<VarType, OpType> = {
    'Float32': 'f',
    'Float64': 'd'
};

export const opSize: Record<VarType, number> = {
    'Float32': 4,
    'Float64': 8
};

export function moduleHeader(code: Unit): string {
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

    return mir;
}

export function moduleFooter(): string {
    let mir = '';

    mir += '\tendfunc\n';
    mir += 'endmodule\n';
    return mir;
}

export function functionPrologue(code: Unit): string {
    if (!opPrefix[code.type]) throw new TypeError('Unsupported variable type');

    let mir = '';

    mir += `export\t_f_${code.name}\n`;
    mir += `_f_${code.name}:\tfunc ${opType[code.type]}`;
    if (Object.keys(code.params).length) {
        mir += ', ' + Object.keys(code.params).map((p) => {
            if (code.params[p] === 'value')
                return opType[code.type] + ':' + p;
            else
                return 'p:' + p;
        }).join(', ');
    }
    mir += '\n';
    if (Object.keys(code.variables).length) {
        mir += '\tlocal\t' + Object.keys(code.variables).map(v => opType[code.type] + ':' + v).join(', ') + '\n';
    }

    return mir;
}

export function functionEpilogue(code: Unit): string {
    let mir = '';

    if (code.return)
        mir += `\t\tret\t${code.return.ref}\n`;

    return mir;
}

const getSymbol = (code: Unit, symbol:string): Variable => (code.params[symbol] || code.variables[symbol]);

export function functionText(code: Unit): string {
    if (!opPrefix[code.type]) throw new TypeError('Unsupported variable type');

    let mir = '';
    for (const op of code.text) {
        if (op.label)
            mir += `${op.label}:\n`;
        mir += `\t\t${(op.raw ? '' : opPrefix[code.type]) + op.op}`;
        if (op.output)
            mir += `\t${op.output}`;
        if (op.input && op.input.length)
            for (const i of op.input) {
                mir += ', ';
                if (op.raw || getSymbol(code, i) === 'value')
                    mir += i;
                else if (getSymbol(code, i) === 'pointer')
                    mir += `${opType[code.type]}:${i}`;
                else
                    mir += i;
            }
        mir += '\n';
    }

    return mir;
}

export function genModule(code: Unit) {
    if (!opPrefix[code.type]) throw new TypeError('Unsupported variable type');

    let mir = '';

    mir += moduleHeader(code);
    mir += functionPrologue(code);
    mir += functionText(code);
    mir += functionEpilogue(code);
    mir += moduleFooter();

    return mir;
}
