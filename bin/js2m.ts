import { genModule, compileBody, Float64Expression } from '../lib';
import { generateMap } from '../lib/compiler/map';

if (!process.argv[2]) {
    console.error('Usage: js2m "jsFuncText"');
    process.exit(1);
}

const fn = eval(process.argv[2]);
const object = compileBody(fn, 'Float64');

if (process.argv[3] == 'map')
    generateMap(object, process.argv[4]);

const mir = genModule(object);
console.log(mir);

if (process.argv[3] == 'map') {
    const expr = new Float64Expression(fn);
    (expr as any).__mapPrint(undefined, process.argv[4]);
}
