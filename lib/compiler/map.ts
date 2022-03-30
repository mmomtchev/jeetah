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
    code.params['_result'] = 'pointer';
    code.params['_map_data_end'] = 'pointer';

    code.text[0].label = '_map_loop';

    if (!code.return)
        throw new TypeError('Function does not have a return value');

    // instruction pointer is at the end of the loop (the single value body)

    // store what was the return value in the result pointer
    code.text.push({
        op: 'mov',
        output: '_result',
        input: [code.return?.ref]
    });
    // remove the return
    code.return = { ref: '0.0' };

    // increment the iterator pointer
    code.text.push({
        op: 'add',
        raw: true,
        output: iter,
        input: [iter, opSize[code.type].toString()]
    });

    // increment the result pointer
    code.text.push({
        op: 'add',
        raw: true,
        output: '_result',
        input: ['_result', opSize[code.type].toString()]
    });

    // end of the loop?
    code.text.push({
        op: 'ubgt',
        raw: true,
        output: '_map_loop_end',
        input: [iter, '_map_data_end']
    });

    // iterate
    code.text.push({
        op: 'jmp',
        raw: true,
        output: '_map_loop'
    });

    // exit
    code.text.push({
        label: '_map_loop_end',
        op: 'mov',
        raw: true,
        output: iter,
        input: ['0']
    });
}
