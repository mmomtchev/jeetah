const chai = require('chai');
const assert = chai.assert;

const { Float64Expression } = require('../lib');

describe('JS only tests', () => {
    afterEach(global.gc);

    it('w/o body', () => {
        const m = new Float64Expression((a, b) => a + b);
        assert.instanceOf(m, Float64Expression);
        const r = m.eval(2, 3);
        assert.equal(r, 5);
    });
    it('w/ body', () => {
        const m = new Float64Expression((a, b) => { return a + b; });
        assert.instanceOf(m, Float64Expression);
        const r = m.eval(2, 3);
        assert.equal(r, 5);
    });
    it('w/ unary expression', () => {
        const fn = (x) => -(Math.sin(3.141 + x) + 1);
        const m = new Float64Expression(fn);
        assert.instanceOf(m, Float64Expression);
        const r = m.eval(3);
        assert.equal(r, fn(3));
    });
    it('assignment', () => {
        function fn(x) {
            let a, b;
            a = 0;
            b = x;
            a += x * 2;
            return (a == b);
        }
        const m = new Float64Expression(fn);
        assert.instanceOf(m, Float64Expression);
        assert.closeTo(m.eval(0), +fn(0), 1e-9);
        assert.closeTo(m.eval(1), +fn(1), 1e-9);
    });
});
