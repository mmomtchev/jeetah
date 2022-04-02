import * as chai from 'chai';
const assert = chai.assert;

import { Float64Expression } from '../lib';

describe('eval', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    afterEach((global as any).gc);

    it('a+b', () => {
        const m = new Float64Expression(function add(a: number, b: number) { return a + b; });
        assert.instanceOf(m, Float64Expression);
        const r = m.eval(2, 3);
        assert.equal(r, 5);
    });
    it('anonymous', () => {
        const m = new Float64Expression(function (a: number, b: number) { return a + b; });
        assert.instanceOf(m, Float64Expression);
        const r = m.eval(2, 3);
        assert.equal(r, 5);
    });
    it('arrow', () => {
        const m = new Float64Expression((a: number, b: number) => a + b);
        assert.instanceOf(m, Float64Expression);
        const r = m.eval(2, 3);
        assert.equal(r, 5);
    });
    it('adiabatic lapse rate', () => {
        const m = new Float64Expression(function lapseRate(temp: number, height: number) {
            const g = 9.81;
            const c = 1005;
            const Gamma = g / c;
            return temp - height * Gamma;
        });
        assert.instanceOf(m, Float64Expression);
        const r = m.eval(25, 100);
        assert.closeTo(r, 24.02388059701, 1e-9);
    });
    it('Math', () => {
        const m = new Float64Expression(function sqrt(x: number) {
            return Math.sqrt(x);
        });
        assert.instanceOf(m, Float64Expression);
        const r = m.eval(2);
        assert.closeTo(r, Math.SQRT2, 1e-6);
    });
    it('Functions with temporaries', () => {
        const fn = function trig(x: number) {
            return (2 * Math.cos(x) / (Math.sqrt(x) + 1));
        };
        const m = new Float64Expression(fn);
        assert.instanceOf(m, Float64Expression);
        const r = m.eval(Math.PI / 2);
        assert.closeTo(r, fn(Math.PI / 2), 1e-9);
    });
    it('Nested functions with temporary arguments', () => {
        const fn = function (x: number) {
           return Math.pow(Math.sqrt(x) / 2, 2);
        };
        const m = new Float64Expression(fn);
        assert.instanceOf(m, Float64Expression);
        const r = m.eval(4);
        assert.closeTo(r, 1, 1e-6);
    });
    it('Ternary operator', () => {
        const fn = (x: number) => x > 0 ? x : -x;
        const m = new Float64Expression(fn);
        assert.instanceOf(m, Float64Expression);
        assert.closeTo(m.eval(4), 4, 1e-9);
        assert.closeTo(m.eval(-4), 4, 1e-9);
    });
    it('if/else', () => {
        const fn = (x: number) => {
            if (x - 1 > 0) return x / 2;
            else return -x;
        };
        const m = new Float64Expression(fn);
        assert.instanceOf(m, Float64Expression);
        assert.closeTo(m.eval(2), fn(2), 1e-9);
        assert.closeTo(m.eval(1), fn(1), 1e-9);
        assert.closeTo(m.eval(0), fn(0), 1e-9);
        assert.closeTo(m.eval(-1), fn(-1), 1e-9);
    });
    it('more if/else', () => {
        function fn(x: number): number {
            if (x > 1)
                return x * 2;
            else
                if (x < -1)
                    return x / 2;
            return x;
        }
        const m = new Float64Expression(fn);
        assert.instanceOf(m, Float64Expression);
        assert.closeTo(m.eval(2), fn(2), 1e-9);
        assert.closeTo(m.eval(1), fn(1), 1e-9);
        assert.closeTo(m.eval(0), fn(0), 1e-9);
        assert.closeTo(m.eval(-1), fn(-1), 1e-9);
        assert.closeTo(m.eval(-2), fn(-2), 1e-9);
    });
    it('prefix increment', () => {
        const fn = (x: number) => ++x;
        const m = new Float64Expression(fn);
        assert.instanceOf(m, Float64Expression);
        assert.closeTo(m.eval(2), fn(2), 1e-9);
    });
    it('postfix increment', () => {
        const fn = (x: number) => {
            const c = x + x++;
            return c + x;
        };
        const m = new Float64Expression(fn);
        assert.instanceOf(m, Float64Expression);
        assert.closeTo(m.eval(2), fn(2), 1e-9);
    });    it('logical not', () => {
        const fn = (x: number) => {
            if (!(x == 0)) return x + 2;
            return x;
        };
        const m = new Float64Expression(fn);
        assert.instanceOf(m, Float64Expression);
        assert.closeTo(m.eval(2), fn(2), 1e-9);
        assert.closeTo(m.eval(0), fn(0), 1e-9);
    });
    it('logical and', () => {
        const fn = (x: number) => {
            if (x >= 1 && x <= 2) return x + 10;
            return x;
        };
        const m = new Float64Expression(fn);
        assert.instanceOf(m, Float64Expression);
        assert.closeTo(m.eval(0), fn(0), 1e-9);
        assert.closeTo(m.eval(1), fn(1), 1e-9);
        assert.closeTo(m.eval(1.5), fn(1.5), 1e-9);
        assert.closeTo(m.eval(2), fn(2), 1e-9);
        assert.closeTo(m.eval(3), fn(3), 1e-9);
    });
    it('logical and - do not evaluate the second argument', () => {
        const fn = (x: number) => {
            return x && ++x;
        };
        const m = new Float64Expression(fn);
        assert.instanceOf(m, Float64Expression);
        assert.closeTo(m.eval(0), fn(0), 1e-9);
        assert.closeTo(m.eval(1), fn(1), 1e-9);
    });
    it('logical or', () => {
        const fn = (x: number) => {
            if (x <= 1 || x >= 2) return x + 10;
            return x;
        };
        const m = new Float64Expression(fn);
        assert.instanceOf(m, Float64Expression);
        assert.closeTo(m.eval(0), fn(0), 1e-9);
        assert.closeTo(m.eval(1), fn(1), 1e-9);
        assert.closeTo(m.eval(1.5), fn(1.5), 1e-9);
        assert.closeTo(m.eval(2), fn(2), 1e-9);
        assert.closeTo(m.eval(3), fn(3), 1e-9);
    });
    it('logical or - do not evaluate the second argument', () => {
        const fn = (x: number) => {
            return x || ++x;
        };
        const m = new Float64Expression(fn);
        assert.instanceOf(m, Float64Expression);
        assert.closeTo(m.eval(0), fn(0), 1e-9);
        assert.closeTo(m.eval(1), fn(1), 1e-9);
    });
    it('assignment', () => {
        function fn(x: number): number {
            let a;
            a = 0;
            a += x * 2;
            return a;
        }
        const m = new Float64Expression(fn);
        assert.instanceOf(m, Float64Expression);
        assert.closeTo(m.eval(0), fn(0), 1e-9);
        assert.closeTo(m.eval(1), fn(1), 1e-9);
    });
    it('access global objects', () => {
        const fn = (x: number): number => Math.cos(Math.PI + x);
        const m = new Float64Expression(fn);
        assert.instanceOf(m, Float64Expression);
        assert.equal(m.eval(Math.PI / 2), fn(Math.PI / 2));
    });
});
