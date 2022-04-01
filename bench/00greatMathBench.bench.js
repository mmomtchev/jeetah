const path = require('path');
const fns = require('./greatMathBenchFns');
const { Worker } = require('worker_threads');

function run(params) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(path.resolve(__dirname, 'greatMathBenchWorker.js'), {
            workerData: params
        });
        worker.on('exit', (code) => {
            if (code !== 0)
                reject('Worker error');
            resolve();
        });
    });
}

module.exports = async function (type, size, fnNum) {
    if (fnNum === undefined) {
        for (const i in fns) {
            await run({ type, size, fnNum: +i });
        }
    } else {
        await run({ type, size, fnNum: +fnNum });
    }
};
