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
            const fn = function add(a: number, b: number) { return (a / b) * 3 + 4 - a; };
            const m = new expr(fn);
            assert.instanceOf(m, expr);
            assert.closeTo(m.eval(2, 3), fn(2, 3), 1e-6);
            assert.isNaN(m.eval(2, NaN));
            assert.equal(m.eval(2, 0), fn(2, 0));
            assert.equal(m.eval(2, Infinity), fn(2, Infinity));

            const fnLogical = (a: number, b: number) => a && b;
            const l = new expr(fnLogical);
            assert.instanceOf(l, expr);
            assert.equal(l.eval(2, 3), fnLogical(2, 3));
            assert.equal(l.eval(0, 3), fnLogical(0, 3));
            assert.equal(l.eval(3, 0), fnLogical(3, 0));

            const fnArray = (x: number) => Math.cos(x);
            const array = new alloc([-1, 0, 1, 2, 3, 4]);
            const expected = array.map(fnArray);
            const e = new expr(fnArray);
            const actual = e.map(array, 'x');
            assert.deepEqual(actual, expected);
        });
    }

    for (const t of ['Uint32', 'Int32']) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const expr = (jeetah as any)[`${t}Expression`];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const alloc = (global as any)[`${t}Array`];
        it(t, () => {
            const fn = function add(a: number, b: number) { return (a * b) / 2 + 1 - b; };
            const m = new expr(fn);
            assert.instanceOf(m, expr);
            assert.equal(m.eval(2, 3), fn(2, 3));

            const fnLogical = (a: number, b: number) => a && b;
            const l = new expr(fnLogical);
            assert.instanceOf(l, expr);
            assert.equal(l.eval(2, 3), fnLogical(2, 3));
            assert.equal(l.eval(0, 3), fnLogical(0, 3));
            assert.equal(l.eval(3, 0), fnLogical(3, 0));

            const fnArray = (x: number) => x + 3;
            const array = new alloc([-1, 0, 1, 2, 3, 4]);
            const expected = array.map(fnArray);
            const e = new expr(fnArray);
            const actual = e.map(array, 'x');
            assert.deepEqual(actual, expected);

            const fnCos = (x: number) => Math.cos(x);
            assert.throws(() => {
                const e = new expr(fnCos);
                e.eval(2);
            }, /no Math builtins/);

            const minMax = (x: number) => x && x;
            const mm = new expr(minMax);
            assert.equal(mm.eval(0), 0);
            const size = +t.substring(t.length - 2);
            if (t.startsWith('U')) {
                assert.equal(mm.eval(2 ** size - 1), 2 ** size - 1);
            } else {
                assert.equal(mm.eval(2 ** (size - 1) - 1), 2 ** (size - 1) - 1);
                assert.equal(mm.eval((-2) ** (size - 1)), (-2) ** (size - 1));
            }
        });
    }
});
