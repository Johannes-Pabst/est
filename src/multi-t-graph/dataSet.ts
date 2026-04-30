import { Unit } from "./unit";

export class DataSet {
    minV: number = Number.POSITIVE_INFINITY;
    maxV: number = Number.NEGATIVE_INFINITY;
    constructor(public name: string, public data: DataView, public length: number, public color: string, public unit: Unit, public minValue: number | undefined = undefined, public maxValue: number | undefined = undefined, public gid: number) {
        for (let i = 0; i < this.length; i++) {
            this.minV = Math.min(this.minV, this.gv(i));
            this.maxV = Math.max(this.maxV, this.gv(i));
        }
    }
    gt(id: number): number {
        return Number(this.data.getBigUint64(id * 16,true));
    }
    gv(id: number): number {
        return this.data.getFloat64(id * 16 + 8,true);
    }
    extend(buffer: ArrayBufferLike) {
        const newLength = this.data.byteLength + buffer.byteLength;
        const combined = new Uint8Array(newLength);
        combined.set(new Uint8Array(this.data.buffer, this.data.byteOffset, this.data.byteLength), 0);
        combined.set(new Uint8Array(buffer), this.data.byteLength);
        this.data = new DataView(combined.buffer);
    }
    updateMinMax(){
        this.minV=Number.POSITIVE_INFINITY;
        this.maxV=Number.NEGATIVE_INFINITY;
        for (let i = 0; i < this.length; i++) {
            this.minV = Math.min(this.minV, this.gv(i));
            this.maxV = Math.max(this.maxV, this.gv(i));
        }
    }
    addPoint(t:bigint, v:number){
        let buffer=new Uint8Array(16);
        let dv=new DataView(buffer.buffer);
        dv.setBigUint64(0, t, true);
        dv.setFloat64(8, v, true);
        const newLength = this.data.byteLength + buffer.byteLength;
        const combined = new Uint8Array(newLength);
        combined.set(new Uint8Array(this.data.buffer, this.data.byteOffset, this.data.byteLength), 0);
        combined.set(new Uint8Array(buffer), this.data.byteLength);
        this.data = new DataView(combined.buffer);
        this.length++;
    }
}