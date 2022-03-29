const chai = require('chai');
const assert = chai.assert;

const { MIR } = require('../lib/binding');
const { compile } = require('../lib/compile');

describe('JS arrow functions', () => {
    afterEach(global.gc);

    it('w/o body', () => {
        const m = compile((a, b) => a + b, 'Float64');
        assert.instanceOf(m, MIR);
        const r = m.Run(2, 3);
        assert.equal(r, 5);
    });
    it('w body', () => {
        const m = compile((a, b) => { return a + b; }, 'Float64');
        assert.instanceOf(m, MIR);
        const r = m.Run(2, 3);
        assert.equal(r, 5);
    });
});
