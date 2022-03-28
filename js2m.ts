import * as acorn from 'acorn';
import { processProgram, genMIR } from './lib/compile';

const ast = acorn.parse(process.argv[2], { ecmaVersion: 2015 });
const code = processProgram(ast, 'Float64');
const text = genMIR(code);
console.log(text);
