import { compileToMir } from '../lib';

if (!process.argv[2]) {
    console.error('Usage: js2m "jsFuncText"');
    process.exit(1);
}

const { text } = compileToMir(eval(process.argv[2]), 'Float64');

console.log(text);
