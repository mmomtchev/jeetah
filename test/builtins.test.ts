import * as chai from 'chai';
const assert = chai.assert;

import { Float64Expression } from '../lib';

function smartNumericalAssert(actual: number, expected: number): void {
    if (isNaN(expected))
        assert.isNaN(actual);
    else if (!isFinite(expected))
        assert.isFalse(isFinite(actual));
    else
        assert.closeTo(actual, expected, 1e-9);
}

describe('builtins', () => {
    it('Math.cos', () => {
        const fn = (x: number): number => Math.cos(x);
        const m = new Float64Expression(fn);
        assert.closeTo(m.eval(0), fn(0), 1e-9);
        assert.closeTo(m.eval(Math.PI / 2), fn(Math.PI / 2), 1e-9);
        assert.isNaN(m.eval(NaN));
    });
    it('Math.sin', () => {
        const fn = (x: number): number => Math.sin(x);
        const m = new Float64Expression(fn);
        assert.closeTo(m.eval(0), fn(0), 1e-9);
        assert.closeTo(m.eval(Math.PI / 2), fn(Math.PI / 2), 1e-9);
        assert.isNaN(m.eval(NaN));
    });
    it('Math.log', () => {
        const fn = (x: number): number => Math.log(x);
        const m = new Float64Expression(fn);
        assert.strictEqual(m.eval(0), -Infinity);
        assert.closeTo(m.eval(Math.E), fn(Math.E), 1e-9);
        assert.isNaN(m.eval(NaN));
    });
    it('Math.exp', () => {
        const fn = (x: number): number => Math.exp(x);
        const m = new Float64Expression(fn);
        assert.closeTo(m.eval(0), fn(0), 1e-9);
        assert.closeTo(m.eval(1), fn(1), 1e-9);
        assert.isNaN(m.eval(NaN));
    });
    it('Math.sqrt', () => {
        const fn = (x: number): number => Math.sqrt(x);
        const m = new Float64Expression(fn);
        assert.closeTo(m.eval(0), fn(0), 1e-9);
        assert.closeTo(m.eval(2), fn(2), 1e-9);
        assert.isNaN(m.eval(-1));
        assert.isNaN(m.eval(NaN));
    });
    it('Math.pow', () => {
        const fn = (x: number, y: number): number => Math.pow(x, y);
        const m = new Float64Expression(fn);
        assert.closeTo(m.eval(0, 2), fn(0, 2), 1e-9);
        assert.closeTo(m.eval(2, 0), fn(2, 0), 1e-9);
        assert.closeTo(m.eval(Math.PI, Math.E), fn(Math.PI, Math.E), 1e-9);
        assert.equal(m.eval(NaN, 0), 1);
        assert.isNaN(m.eval(0, NaN));
    });
    it('Math.abs', () => {
        const fn = (x: number): number => Math.abs(x);
        const m = new Float64Expression(fn);
        assert.closeTo(m.eval(0), fn(0), 1e-9);
        assert.closeTo(m.eval(-1), fn(-1), 1e-9);
        assert.closeTo(m.eval(1), fn(1), 1e-9);
        assert.isNaN(m.eval(NaN));
    });
    it('throw w/o mandatory arguments', () => {
        assert.throws(() => {
            const fn = (x: number): number => Math.sin(x);
            const m = new Float64Expression(fn);
            m.eval();
        }, /Missing mandatory number argument/);
        assert.throws(() => {
            const fn = (x: number, y: number): number => Math.pow(x, y);
            const m = new Float64Expression(fn);
            m.eval(10);
        }, /Missing mandatory number argument/);
    });
    for (const fnName of ['sinh', 'cosh', 'tan', 'tanh', 'log2', 'log10', 'abs', 'acos', 'acosh',
        'asin', 'asinh', 'atan', 'atanh', 'ceil', 'floor', 'round', 'trunc']) {
        it(`Math.${fnName}`, () => {
            const fn = new Function('x', `return Math.${fnName}(x)`) as (x: number) => number;
            const m = new Float64Expression(fn);
            
            smartNumericalAssert(m.eval(0), fn(0));
            smartNumericalAssert(m.eval(1), fn(1));
            smartNumericalAssert(m.eval(1.1), fn(1.1));
            assert.isNaN(m.eval(NaN));
        });
    }
    it('Math.atan2', () => {
        const fn = (x: number, y: number): number => Math.atan2(x, y);
        const m = new Float64Expression(fn);
        assert.closeTo(m.eval(0, 0), fn(0, 0), 1e-9);
        assert.closeTo(m.eval(1, 1), fn(1, 1), 1e-9);
        assert.closeTo(m.eval(1, 0), fn(1, 0), 1e-9);
    });
});
