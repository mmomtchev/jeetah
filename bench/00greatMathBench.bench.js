const path = require('path');
const b = require('benny');
global.assert = require('chai').assert;
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

module.exports = async function (type, size, onlyFn) {

  const allocator = global[type + 'Array'];
  const expr = jeetah[type + 'Expression'];

  const array = new allocator(size);

  // array goes from -5.0 to +5.0
  for (let i = 0; i < array.length; i++)
    array[i] = -5 + 10 * (i / (array.length - 1));

  for (const i in fns) {
    if (!isNaN(onlyFn) && i != onlyFn)
      continue;
    const fn = fns[i];
    // target array allocation is not included
    // benny takes care of precompiling the functions
    const r = new allocator(size);
    await b.suite(
      `${fn.toString()}, map() ${type} arrays of ${size} elements`,
      b.add(`V8 for loop w/precompilation`, () => {

        // this is a workaround for a major V8 deficiency:
        // recompilation of mutable functions
        // once V8 inlines a function, it cannot recompile it

        const params = { fn, size, array, r };
        const bench = new Function('params', `{
          // This is the bench
          const { fn, size, array, r } = params;
          for (let j = 0; j < size; j++)
            r[j] = fn(array[j]);
        }`).bind(null, params);

        // run the test
        return bench;
      }),
      b.add(`V8 naive for loop`, () => {
        // run the test
        return () => {
          // This is the bench
          for (let j = 0; j < size; j++)
            r[j] = fn(array[j]);
        };
      }),
      b.add(`V8 map()`, () => {
        // run the test
        return () => {
          // This is the bench
          array.map((v, j) => r[j] = fn(array[j]));
        };
      }),
      b.add(`V8 forEach()`, () => {
        // run the test
        return () => {
          // This is the bench
          array.forEach((v, j) => r[j] = fn(array[j]));
        };
      }),
      b.add(`jeetah map()`, () => {
        const e = new expr(fn);
        return () => {
          // This is the bench
          e.map(array, 'x', r);
        };
      }),
      b.cycle(),
      b.complete(),
      b.save({
        file: `00greatMathBench-${i}`,
        folder: path.resolve(__dirname, '..', 'gh-pages', 'bench', size.toString()),
        version: require('../package.json').version,
        details: false,
        format: 'chart.html',
      })
    );
  }
};
