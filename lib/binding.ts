import * as path from 'path';
import * as binary from '@mapbox/node-pre-gyp';

const binding_path = binary.find(path.resolve(path.join(__dirname, '../package.json')));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const addon = require(binding_path);

type VarType = 'Float64' | 'Float32';

interface IMIRNative
{
    Run(...args: number[]): number;
}

export class MIR {
    constructor(mir: string, type: VarType, args: number) {
        this._addonInstance = new addon.MIR(mir, type, args);
    }

    Run(...args: number[]) {
        return this._addonInstance.Run(...args);
    }

    // private members
    private _addonInstance: IMIRNative;
}
