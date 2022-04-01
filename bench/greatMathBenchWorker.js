const path = require('path');
const b = require('benny');
const jeetah = require('../lib');
const fns = require('./greatMathBenchFns');
const { workerData } = require('worker_threads');

const { type, size, fnNum } = workerData;

const allocator = global[type + 'Array'];
const expr = jeetah[type + 'Expression'];

const array = new allocator(size);

// array goes from -5.0 to +5.0
for (let i = 0; i < array.length; i++)
  array[i] = -5 + 10 * (i / (array.length - 1));

const fn = fns[fnNum];
// target array allocation is not included
// benny takes care of precompiling the functions
const r = new allocator(size);
b.suite(
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
    file: `00greatMathBench-${fnNum}`,
    folder: path.resolve(__dirname, '..', 'gh-pages', 'bench', size.toString()),
    version: require('../package.json').version,
    details: false,
    format: 'chart.html',
  })
);
