import * as chai from 'chai';
const assert = chai.assert;

import { Float64Expression } from '../lib';

describe('compilation', () => {
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
        assert.closeTo(r, 24.02388, 1e-6);
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
        assert.closeTo(r, fn(Math.PI / 2), 1e-6);
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
});
