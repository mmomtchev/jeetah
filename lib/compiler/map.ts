import { Unit } from '.';
import { getInitEnd } from './variable';

export function generateMap(
    code: Unit,
    input: string) {

    if (!code.params[input])
        throw new ReferenceError(`Unknown argument ${input}`);

    if (code.params[input] !== 'value')
        throw new TypeError(`Cannot iterate over vector argument ${input}`);

    // SSA for the iterator
    // see https://github.com/vnmakarov/mir/issues/260
    //
    // replace the scalar iterator with a pointer
    // and create a new temporary that will hold
    // the current element
    code.variables[input] = 'value';
    delete code.params[input];
    code.params = { '_map_data': 'pointer', ...code.params };

    code.params['_result'] = 'pointer';
    code.params['_map_data_length'] = 'offset';
    code.variables['_iter'] = 'offset';

    const initEnd = getInitEnd(code);
    // the SSA temporary
    code.text.splice(initEnd + 1, 0, {
        op: 'mov',
        output: input,
        input: ['_map_data']
    });

    code.variables['_iter_inc'] = 'offset';

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
        input: ['_return_value']
    });

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
        output: '_func_start',
        input: ['_iter', '_map_data_length']
    });
}
