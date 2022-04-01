const fs = require('fs');
const process = require('process');

const bench = fs.readdirSync(__dirname).filter((file) => file.match(/\.bench\.js$/));

// Launch with `node bench/bench.js [00-09] [size] [Float64] [fn]

(async () => {
  const sizes = process.argv[3] ? [+process.argv[3]] : [16, 1024, 1024 * 1024];
  for (const size of sizes)
    for (const b of bench) {
      if (process.argv[2] && !b.match(process.argv[2]))
        continue;
      if (process.argv[3] && !size.toString().match(process.argv[3]))
        continue;
      for (const t of ['Float64']) {
        if (process.argv[4] && !t.match(process.argv[4]))
          continue;
        if (require('../lib')[t + 'Expression'] === undefined) {
          console.log(`${t} not built`);
          continue;
        }
        console.log(`${b}`);
        // eslint-disable-next-line no-await-in-loop
        await require(`${__dirname}/${b}`)(t, size, +process.argv[5]);
        console.log(`\n\n`);
      }
    }
})();
