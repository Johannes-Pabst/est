import { CanvasManager } from "./canvasManager";
import { DataSet } from "./dataSet";
import { MultiTGraphManager } from "./graphManager";

export class Drawer {
    canvasManager: CanvasManager;
    constructor(parent: JQuery<HTMLElement>, public manager: MultiTGraphManager, public startTimeStamp: number = manager.minTimeStamp, public endTimeStamp: number = manager.maxTimeStamp) {
        this.canvasManager = new CanvasManager(parent);
    }
    public async draw() {
        this.canvasManager.resizeCanvas();
        let ctx = this.canvasManager.ctx;
        let width = this.canvasManager.canvas.width;
        let height = this.canvasManager.canvas.height;
        ctx.clearRect(0, 0, width, height);
        for (let i = 0; i < this.manager.dataSets.length; i++) {
            let dataSet = this.manager.dataSets[i];
            let minV = Number.POSITIVE_INFINITY;
            let maxV = Number.NEGATIVE_INFINITY;
            let lx = Number.NaN;
            let ly = Number.NaN;
            ctx.strokeStyle = dataSet.color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            let start= binSearchTimeStmp(dataSet, this.startTimeStamp).minId;
            let end = binSearchTimeStmp(dataSet, this.endTimeStamp).maxId;
            for (let j = start; j < end+1; j++) {
                let pt=dataSet.gt(j);
                let pv=dataSet.gv(j);
                let nx = Math.floor((pt - this.startTimeStamp) / (this.endTimeStamp - this.startTimeStamp) * width);
                let ny = Math.floor(height - (pv - (dataSet.minValue??dataSet.minV)) / ((dataSet.maxValue??dataSet.maxV)- (dataSet.minValue??dataSet.minV)) * height);
                if (!(Number.isNaN(lx) || Number.isNaN(ly))) {
                    if (lx == nx && i < this.manager.dataSets.length - 1) {
                        minV = Math.min(minV, ny);
                        maxV = Math.max(maxV, ny);
                    } else {
                        ctx.moveTo(lx, ly);
                        ctx.lineTo(nx, ny);
                        ctx.moveTo(lx, minV);
                        ctx.lineTo(lx, maxV);
                        minV = ny;
                        maxV = ny;
                    }
                }
                lx = nx;
                ly = ny;
            }
            ctx.stroke();
            ctx.closePath();
            // await new Promise((e)=>{
            //     setTimeout(e,0);
            // });
        }
    }
}
export function binSearchTimeStmp(dataSet: DataSet, timeStamp: number) {
    let maxId = dataSet.length - 1;
    let minId = 0;
    while (maxId - minId > 1) {
        let midId = Math.floor((maxId + minId) / 2);
        if (dataSet.gt(midId) < timeStamp) {
            minId = midId;
        } else {
            maxId = midId;
        }
    }
    return { minId, maxId };
}