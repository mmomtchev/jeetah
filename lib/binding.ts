// eslint-disable-next-line @typescript-eslint/no-var-requires
const addon = require('../build/Debug/jeetah-native');

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
