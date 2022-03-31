const chai = require('chai');
const assert = chai.assert;

const { Float64Expression } = require('../lib');

describe('JS arrow functions', () => {
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
});
