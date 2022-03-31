import { Instruction, Unit, VarType } from '.';
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
            else if (code.params[p] === 'pointer')
                return 'p:' + p;
            else if (code.params[p] === 'offset')
                return 'i64:' + p;
        }).join(', ');
    }
    mir += '\n';
    if (Object.keys(code.variables).length) {
        mir += '\tlocal\t' + Object.keys(code.variables).map(v => {
            const type = code.variables[v] === 'offset' ? 'i64' : opType[code.type];
            return type + ':' + v;
        }).join(', ') + '\n';
    }

    return mir;
}

export function functionEpilogue(code: Unit): string {
    let mir = '';

    if (code.return)
        mir += `\t\tret\t${code.return.ref}\n`;
    else
        mir += '\t\tret\n';

    return mir;
}

const getSymbol = (code: Unit, op: Instruction, symbol: string): string => {
    const s = code.params[symbol] || code.variables[symbol];
    if (op.raw || !s) return symbol;
    if (s === 'pointer') return `${opType[code.type]}:(${symbol}, _iter, ${opSize[code.type].toString()})`;
    return symbol;
};

export function functionText(code: Unit): string {
    if (!opPrefix[code.type]) throw new TypeError('Unsupported variable type');

    let mir = '';
    for (const op of code.text) {
        if (op.op === 'label') {
            mir += `${op.output}:\n`;
            continue;
        }
        mir += `\t\t${(op.raw ? '' : opPrefix[code.type]) + op.op}`;
        if (op.output)
            mir += `\t${getSymbol(code, op, op.output)}`;
        if (op.input && op.input.length)
            for (const i of op.input) {
                mir += `, ${getSymbol(code, op, i)}`;
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
