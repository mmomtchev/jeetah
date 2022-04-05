import * as chai from 'chai';
const assert = chai.assert;

import * as jeetah from '../lib';

describe('types', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    afterEach((global as any).gc);

    for (const t of ['Float64', 'Float32']) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const expr = (jeetah as any)[`${t}Expression`];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const alloc = (global as any)[`${t}Array`];
        it(t, () => {
            const fn = function add(a: number, b: number) { return a / b; };
            const m = new expr(fn);
            assert.instanceOf(m, expr);
            assert.closeTo(m.eval(2, 3), fn(2, 3), 1e-6);
            assert.isNaN(m.eval(2, NaN));
            assert.equal(m.eval(2, 0), fn(2, 0));
            assert.equal(m.eval(2, Infinity), fn(2, Infinity));

            const fnArray = (x: number) => Math.cos(x);
            const array = new alloc([-1, 0, 1, 2, 3, 4]);
            const expected = array.map(fnArray);
            const e = new expr(fnArray);
            const actual = e.map(array, 'x');
            assert.deepEqual(actual, expected);
        });
    }
});
