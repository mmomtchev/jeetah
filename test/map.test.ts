import * as chai from 'chai';
const assert = chai.assert;

import { Float64Expression } from '../lib';

describe('map', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    afterEach((global as any).gc);

    const array = new Float64Array(16);
    array.map((v, i) => array[i] = i);

    it('x*x + 2*x + 1', () => {
        const fn = (x: number): number => x * x + 2 * x + 1;
        const expected = new Float64Array(array.length);
        array.map((v, i) => expected[i] = fn(v));

        const m = new Float64Expression(fn);
        assert.instanceOf(m, Float64Expression);

        const r = m.map(array, 'x');
        assert.instanceOf(r, Float64Array);
        assert.deepEqual(r, expected);
    });

    it('if/else', () => {
        const fn = function(x: number): number {
            if (x > 10) return x * 2;
            else if (x < 5) return x / 2;
            return x;
        };
        const expected = new Float64Array(array.length);
        array.map((v, i) => expected[i] = fn(v));

        const m = new Float64Expression(fn);
        assert.instanceOf(m, Float64Expression);

        const r = m.map(array, 'x');
        assert.instanceOf(r, Float64Array);
        assert.deepEqual(r, expected);
    });
});
