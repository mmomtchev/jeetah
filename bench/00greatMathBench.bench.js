const path = require('path');
const b = require('benny');
//const { assert } = require('chai');
const jeetah = require('../lib');

// The Great C++ Mathematical Expression Parser Benchmark (with 1 argument)
// by Arash Partow (author of ExprTk)
// https://github.com/ArashPartow/math-parser-benchmark-project

const fns = [
  (x) => x + 1.1,
  (x) => x * 2.2,
  (x) => 2.2 * x + 1.1,
  (x) => (2.2 * x + 1.1) * 3.3,
  (x) => Math.sin(2.2 * x) + Math.cos(3.141 / x),
  (x) => 1 - Math.sin(2.2 * x) + Math.cos(3.141 / x),
  (x) => Math.sqrt(1 - Math.sin(2.2 * x) + Math.cos(3.141 / x) / 3.3),
  (x) => (x * x / Math.sin(2 * 3.141 / x)) - x / 2.2,
  (x) => 1 - (x * x / 0.5),
  (x) => Math.exp(Math.log(7 * x)),
  (x) => Math.pow(10, Math.log(3 + x)),
  (x) => Math.cos(2.41) / x,
  (x) => -(Math.sin(3.141 + x) + 1),
  (x) => x - Math.exp(Math.log(7 + x))
];

module.exports = async function (type, size) {

  const allocator = global[type + 'Array'];
  const expr = jeetah[type + 'Expression'];

  const array = new allocator(size);

  // array goes from -5.0 to +5.0
  for (let i = 0; i < array.length; i++)
    array[i] = -5 + 10 * (i / (array.length - 1));

  for (const i in fns) {
    const fn = fns[i];
    // target array allocation is included
    await b.suite(
      `${fn.toString()}, map() ${type} arrays of ${size} elements`,
      b.add(`V8`, () => {
        let r;

        // give V8 a chance to compile
        fn(1);
        return () => {
          // This is the bench
          r = new allocator(size);
          for (let i = 0; i < size; i++)
            r[i] = fn(array[i]);

          /*const check = Math.round(Math.random() * (array.length - 1));
          if (!isNaN(r[check]) && !isNaN(array[check]))
            assert.closeTo(r[check], fn(array[check]), 1e-9);*/
        };
      }),
      b.add(`Jeetah`, () => {
        let r;

        const e = new expr(fn);
        // give Jeetah a chance to compile
        r = e.map(array, 'x');
        return () => {
          // This is the bench
          r = e.map(array, 'x');

          /*const check = Math.round(Math.random() * (array.length - 1));
          if (!isNaN(r[check]) && !isNaN(array[check]))
            assert.closeTo(r[check], fn(array[check]), 1e-9);*/

          return r;
        };
      }),
      b.cycle(),
      b.complete(),
      b.save({
        file: `00greatMathBench-${i}`,
        folder: path.resolve(__dirname, '..', 'gh-pages', 'bench'),
        version: require('../package.json').version,
        details: false,
        format: 'chart.html',
      })
    );
  }
};
