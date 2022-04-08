import { Instruction, Unit, VarType } from '.';
import { builtins } from './function';

export type OpPrefix = 'f' | 'd' | 'u' | '';
export type OpType = 'f' | 'd' | 'u32' | 'i32' | 'i64' | 'u64';
export type OpSuffix = 's' | '';

const opPrefix: Record<VarType, OpPrefix> = {
    'Uint32': 'u',
    'Int32': '',
    'Float32': 'f',
    'Float64': 'd'
};

const opSuffix: Record<VarType, OpSuffix> = {
    'Uint32': 's',
    'Int32': 's',
    'Float32': '',
    'Float64': ''
};


const opType: Record<VarType, OpType> = {
    'Uint32': 'u32',
    'Int32': 'i32',
    'Float32': 'f',
    'Float64': 'd'
};

const opLocal: Record<VarType, OpType> = {
    'Uint32': 'i64',
    'Int32': 'i64',
    'Float32': 'f',
    'Float64': 'd'
};

export const opSize: Record<VarType, number> = {
    'Uint32': 4,
    'Int32': 4,
    'Float32': 4,
    'Float64': 8
};

export function moduleHeader(code: Unit): string {
    if (!opPrefix[code.type] === undefined) throw new TypeError('Unsupported variable type');

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
    if (!opPrefix[code.type] === undefined) throw new TypeError('Unsupported variable type');

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
    if (Object.keys(code.constants).length) {
        mir += '\tlocal\t' + Object.keys(code.constants).map(v => `${opLocal[code.type]}:${v}`).join(', ') + '\n';
    }
    if (Object.keys(code.variables).length) {
        mir += '\tlocal\t' + Object.keys(code.variables).map(v => {
            const type = code.variables[v] === 'offset' ? 'i64' : opLocal[code.type];
            return type + ':' + v;
        }).join(', ') + '\n';
    }

    return mir;
}

export function functionEpilogue(code: Unit): string {
    let mir = '';

    if (code.variables['_return_value'])
        mir += `\t\tret\t_return_value\n`;
    else
        mir += '\t\tret\n';

    return mir;
}

function getSymbol(code: Unit, op: Instruction, symbol: string): string {
    const s = code.params[symbol] || code.variables[symbol];
    if (op.raw || !s) return symbol;
    if (s === 'pointer') return `${opType[code.type]}:(${symbol}, _iter, ${opSize[code.type].toString()})`;
    return symbol;
}

function getOpCode(code: Unit, op: Instruction): string {
    if (op.raw) return op.op;
    if (op.op === 'mov' && code.type != 'Float32' && code.type != 'Float64')
        return op.op;
    return opPrefix[code.type] + op.op + opSuffix[code.type];
}

export function functionText(code: Unit): string {
    if (!opPrefix[code.type] === undefined) throw new TypeError('Unsupported variable type');

    let mir = '';
    for (const op of code.text) {
        if (op.op === 'label') {
            mir += `${op.output}:\n`;
            continue;
        }
        mir += `\t\t${getOpCode(code, op)}`;
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
    if (!opPrefix[code.type] === undefined) throw new TypeError('Unsupported variable type');

    let mir = '';

    mir += moduleHeader(code);
    mir += functionPrologue(code);
    mir += functionText(code);
    mir += functionEpilogue(code);
    mir += moduleFooter();

    return mir;
}
