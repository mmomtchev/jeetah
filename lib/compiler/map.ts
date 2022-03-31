import { Unit } from '.';
import { opSize } from './mir';
import { getInitEnd } from './variable';

export function generateMap(
    code: Unit,
    input: string) {

    if (!code.params[input])
        throw new ReferenceError(`Unknown argument ${input}`);

    if (code.params[input] !== 'value')
        throw new TypeError(`Cannot iterate over vector argument ${input}`);

    code.params[input] = 'pointer';
    code.params['_result'] = 'pointer';
    code.params['_map_data_length'] = 'offset';
    code.variables['_iter'] = 'offset';

    getInitEnd(code);

    code.variables['_iter_inc'] = 'offset';

    if (!code.return)
        throw new TypeError('Function does not have a return value');

    // initialize the iterator
    code.text.unshift({
        op: 'mov',
        raw: true,
        output: '_iter',
        input: ['0']
    });

    // instruction pointer is at the end of the loop (the single value body)

    // store what was the return value in the result pointer
    code.text.push({
        op: 'mov',
        output: '_result',
        input: [code.return?.ref]
    });
    // remove the return
    code.return = { ref: '0.0' };

    // increment the iterator
    code.text.push({
        op: 'add',
        raw: true,
        output: '_iter',
        input: ['_iter', '1']
    });

    // end of the loop?
    code.text.push({
        op: 'ublt',
        raw: true,
        output: '_init_end',
        input: ['_iter', '_map_data_length']
    });
}
