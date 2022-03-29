import * as chai from 'chai';
const assert = chai.assert;

import { MIR } from '../lib/binding';
import { compile } from '../lib/compile';

describe('compilation', () => {
    it('a+b', () => {
        const m = compile(function add(a: number, b: number) { return a + b; }, 'Float64');
        assert.instanceOf(m, MIR);
        const r = m.Run(2, 3);
        assert.equal(r, 5);
    });
    it('anonymous', () => {
        const m = compile(function (a: number, b: number) { return a + b; }, 'Float64');
        assert.instanceOf(m, MIR);
        const r = m.Run(2, 3);
        assert.equal(r, 5);
    });
    it('arrow', () => {
        const m = compile((a: number, b: number) => a + b, 'Float64');
        assert.instanceOf(m, MIR);
        const r = m.Run(2, 3);
        assert.equal(r, 5);
    });
    it('adiabatic lapse rate', () => {
        const m = compile(function lapseRate(temp: number, height: number) {
            const g = 9.81;
            const c = 1005;
            const Gamma = g / c;
            return temp - height * Gamma;
        }, 'Float64');
        assert.instanceOf(m, MIR);
        const r = m.Run(25, 100);
        assert.closeTo(r, 24.0239, 1e-3);
    });
    it('Math', () => {
        const m = compile(function sqrt(x: number) {
            return Math.sqrt(x);
        }, 'Float64');
        assert.instanceOf(m, MIR);
        const r = m.Run(2);
        assert.closeTo(r, Math.SQRT2, 1e-3);
    });
    it('Trigonometry', () => {
        const fn = function lapseRate(x: number) {
            return (2 * Math.cos(x) / (Math.sqrt(x) + 1));
        };
        const m = compile(fn, 'Float64');
        assert.instanceOf(m, MIR);
        const r = m.Run(Math.PI / 2);
        assert.closeTo(r, fn(Math.PI / 2), 1e-3);
    });
});
