import { Unit } from '.';
import { opSize } from './mir';

export function generateMap(
    code: Unit,
    iter: string) {

    if (!code.params[iter])
        throw new ReferenceError(`Unknown argument ${iter}`);

    if (code.params[iter] !== 'value')
        throw new TypeError(`Cannot iterate over vector argument ${iter}`);

    code.params[iter] = 'pointer';
    code.params['_map_loop_length'] = 'value';
    code.variables['_map_loop_end'] = 'pointer';

    code.text.unshift({
        op: 'add',
        raw: true,
        output: '_map_loop_end',
        input: [iter, '_map_loop_length']
    });

    code.text[1].label = '_map_loop';

    code.text.push({
        op: 'add',
        raw: true,
        output: iter,
        input: [iter, opSize[code.type].toString()]
    });
    code.text.push({
        op: 'ubgt',
        raw: true,
        output: '_map_loop_end',
        input: [iter, '_map_loop_length']
    });
    code.text.push({
        op: 'jmp',
        raw: true,
        output: '_map_loop'
    });
    code.text.push({
        label: '_map_loop_end',
        op: 'mov',
        raw: true,
        output: iter,
        input: ['0']
    });
}
