// The Great C++ Mathematical Expression Parser Benchmark (with 1 argument)
// by Arash Partow (author of ExprTk)
// https://github.com/ArashPartow/math-parser-benchmark-project

module.exports = [
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
