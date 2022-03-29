import { compileToMir } from '../lib/compile';

const { text } = compileToMir(eval(process.argv[2]), 'Float64');

console.log(text);
