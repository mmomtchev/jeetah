import * as acorn from 'acorn';
import * as estree from 'estree';
import { processFunction, genMIR } from '../lib/compile';

const ast = acorn.parse(process.argv[2], { ecmaVersion: 2015 }) as unknown as estree.FunctionExpression;
const code = processFunction(ast, 'Float64');
const text = genMIR(code);
console.log(text);
