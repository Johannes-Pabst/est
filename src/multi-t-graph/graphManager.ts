import { DataSet } from "./dataSet";
import { binSearchTimeStmp, Drawer } from "./drawer";
import $ from "jquery";
import { generateTicks } from "./tickManager";
import { Temporal } from "@js-temporal/polyfill";

export class MultiTGraphManager {
    mainDrawer: Drawer;
    minTimeStamp: number = Number.POSITIVE_INFINITY;
    maxTimeStamp: number = Number.NEGATIVE_INFINITY;
    lastWidth: number;
    lastHeight: number;
    drawing: boolean = false;
    bufferedDraw: boolean = false;
    drawPromise: Promise<void> | undefined;
    tooltip: JQuery<HTMLElement>;
    lines: JQuery<HTMLElement> = $();
    ticksBottom: JQuery<HTMLElement>;
    mainCanvasContainer = $("<div class='main-canvas-container'></div>");
    lineList: { e: JQuery<HTMLElement>, curPosX: number, goalPosX: number }[] = [];
    updatemm:()=>void|undefined;
    constructor(public dataSets: DataSet[], public parent: JQuery<HTMLElement>) {
        parent.addClass("multi-t-graph");
        parent.css("position", "relative");
        this.lastWidth = parent.width()!;
        this.lastHeight = parent.height()!;
        this.tooltip = $("<div class='tooltip'>test</div>");
        this.parent.append(this.tooltip);
        for (let i = 0; i < this.dataSets.length; i++) {
            this.minTimeStamp = Math.min(this.minTimeStamp, this.dataSets[i].gt(0));
            this.maxTimeStamp = Math.max(this.maxTimeStamp, this.dataSets[i].gt(this.dataSets[i].length - 1));
        }
        parent.append(this.mainCanvasContainer);
        this.mainDrawer = new Drawer(this.mainCanvasContainer, this);
        this.mainCanvasContainer.css("grid-area", "graph");
        this.mainCanvasContainer.css("overflow", "hidden");
        // $(this.mainDrawer.canvasManager.canvas).css("margin-bottom", "-100000px");
        this.ticksBottom = $("<div class='ticks-bottom'></div>");
        this.ticksBottom.css("grid-area", "ticks-bottom");
        this.parent.append(this.ticksBottom);
        this.updateTimeTicks();
        let goalPosX = 0;
        let goalPosY = 0;
        let curPosX = 0;
        let curPosY = 0;
        let lastEvent: JQuery.MouseMoveEvent<Document, undefined, Document, Document>;
        let tooltipVisivle = false;
        this.tooltip.css("opacity", "0");
        this.lines.css("opacity", "0");
        this.redrawLines();
        let mm = (e2: any) => {
            if(!Number.isFinite(this.mainDrawer.startTimeStamp)){
                return;
            }
            let e: JQuery.MouseMoveEvent<Document, undefined, Document, Document> = e2;
            const offset = $(this.mainDrawer.canvasManager.canvas).offset()!;
            let x = e.pageX - offset.left;
            let y = e.pageY - offset.top;
            const pxWidth = $(this.mainDrawer.canvasManager.canvas).width()!;
            const twidth = this.mainDrawer.endTimeStamp - this.mainDrawer.startTimeStamp;
            const timeStamp = this.mainDrawer.startTimeStamp + (x / pxWidth) * twidth;
            this.tooltip.empty();
            let timeText = Temporal.Instant.fromEpochMilliseconds(Math.round(timeStamp)).toLocaleString();
            let timeDiv = $("<div></div>");
            timeDiv.addClass("tooltip-time bloom");
            timeDiv.text(timeText);
            this.tooltip.append(timeDiv);
            for (let i = 0; i < this.dataSets.length; i++) {
                const dataSet = this.dataSets[i];
                let { minId, maxId } = binSearchTimeStmp(dataSet, timeStamp);
                let t1 = dataSet.gt(minId);
                let t2 = dataSet.gt(maxId);
                let closestt;
                let closestv;
                if (Math.abs(t1 - timeStamp) < Math.abs(t2 - timeStamp)) {
                    let v1 = dataSet.gv(minId);
                    closestt = t1;
                    closestv=v1;
                } else {
                    let v2=dataSet.gv(maxId);
                    closestt = t2;
                    closestv=v2;
                }
                this.lineList[i].goalPosX = (closestt - this.mainDrawer.startTimeStamp) / twidth * pxWidth;
                let value = closestv;
                let unit = dataSet.unit;
                let outer = $("<div></div>");
                outer.addClass("tooltip-outer");
                let legend = $("<div></div>");
                legend.css("color", dataSet.color);
                legend.addClass("tooltip-legend bloom");
                outer.append(legend);
                let valueText = unit.formatter(value);
                let valueDiv = $("<div></div>");
                valueDiv.addClass("tooltip-value bloom");
                valueDiv.text(`${dataSet.name}: ${valueText}`);
                outer.append(valueDiv);
                this.tooltip.append(outer);
            }
            let width = this.tooltip.width()!;
            let height = this.tooltip.height()!;
            if (width + 50 + x > this.parent.width()!) {
                x -= 100 + width;
            }
            if (height + 50 + y > this.parent.height()!) {
                y -= 100 + height;
            }
            goalPosX = x + 50;
            goalPosY = y + 50;
            if (!tooltipVisivle) {
                this.tooltip.css({ top: goalPosY + "px", left: goalPosX + "px" });
                curPosX = goalPosX;
                curPosY = goalPosY;
                this.tooltip.css("opacity", "1");
                this.lines.css("opacity", "1");
                tooltipVisivle = true;
            }
            e.stopPropagation();
            lastEvent = e;
        };
        this.updatemm=()=>{
            if (lastEvent!=undefined){
                mm(lastEvent);
            }
        }
        $(this.mainDrawer.canvasManager.canvas).on("mousemove", mm);
        $(document).on("mousemove", () => {
            this.tooltip.css("opacity", "0");
            this.lines.css("opacity", "0");
            tooltipVisivle = false;
        });
        setInterval(() => {
            if (tooltipVisivle) {
                let distance = Math.sqrt(Math.pow(goalPosX - curPosX, 2) + Math.pow(goalPosY - curPosY, 2));
                if (distance > 0.1) {
                    let speed = distance / 10;
                    speed = Math.max(speed, 0.1);
                    let unitVx = (goalPosX - curPosX) / distance;
                    let unitVy = (goalPosY - curPosY) / distance;
                    curPosX += unitVx * speed;
                    curPosY += unitVy * speed;
                    this.tooltip.css({ top: curPosY + "px", left: curPosX + "px" });
                }
                for (let i = 0; i < this.lineList.length; i++) {
                    const line = this.lineList[i];
                    let distance = Math.abs(line.goalPosX - line.curPosX);
                    if (distance > 0.1) {
                        let speed = distance / 5;
                        speed = Math.max(speed, 0.1);
                        if (line.goalPosX > line.curPosX) {
                            line.curPosX += speed;
                        } else {
                            line.curPosX -= speed;
                        }
                        line.e.css("left", line.curPosX + "px");
                    }
                }
            }
        }, 15);
        setInterval(() => {
            if (this.lastWidth != this.mainCanvasContainer.width() || this.lastHeight != this.mainCanvasContainer.height()) {
                this.lastWidth = this.mainCanvasContainer.width()!;
                this.lastHeight = this.mainCanvasContainer.height()!;
                this.bufferDraw();
            }
        }, 30);
        $(this.mainDrawer.canvasManager.canvas).on("wheel", (e) => {
            e.preventDefault();
            const we = <WheelEvent>e.originalEvent!;
            let dx = we.deltaX;
            let dy = we.deltaY;
            switch (we.deltaMode) { // damn browser inconsistency
                case WheelEvent.DOM_DELTA_LINE:
                    dx *= 16;
                    dy *= 16;
                    break;
                case WheelEvent.DOM_DELTA_PAGE:
                    dx *= window.innerWidth;
                    dy *= window.innerHeight;
                    break;
            }
            if (dx == 0 && dy == 0) {
                return;
            }
            let pxWidth = $(this.mainDrawer.canvasManager.canvas).width()!;
            let twidth = this.mainDrawer.endTimeStamp - this.mainDrawer.startTimeStamp;
            let ss=this.mainDrawer.startTimeStamp;
            let se=this.mainDrawer.endTimeStamp;
            if (Math.abs(dx) > Math.abs(dy)) {
                let dt = twidth * dx / pxWidth;
                dt = Math.max(dt, this.minTimeStamp - this.mainDrawer.startTimeStamp);
                dt = Math.min(dt, this.maxTimeStamp - this.mainDrawer.endTimeStamp);
                this.mainDrawer.startTimeStamp += dt;
                this.mainDrawer.endTimeStamp += dt;
                mm(lastEvent);
            } else {
                let px = we.offsetX;
                let pt = px / pxWidth * twidth + this.mainDrawer.startTimeStamp;
                let zoomFactor = Math.pow(2, dy / 200);
                let newStart = pt + (this.mainDrawer.startTimeStamp - pt) * zoomFactor;
                let newEnd = pt + (this.mainDrawer.endTimeStamp - pt) * zoomFactor;
                if (newStart < this.minTimeStamp) {
                    newEnd += this.minTimeStamp - newStart;
                    newStart = this.minTimeStamp;
                }
                if (newEnd > this.maxTimeStamp) {
                    newStart -= newEnd - this.maxTimeStamp;
                    newEnd = this.maxTimeStamp;
                }
                if (newStart < this.minTimeStamp) {
                    newStart = this.minTimeStamp;
                }
                this.mainDrawer.startTimeStamp = newStart;
                this.mainDrawer.endTimeStamp = newEnd;
                mm(lastEvent);
            }
            e.preventDefault();
            e.stopPropagation();
            if(ss!=this.mainDrawer.startTimeStamp||se!=this.mainDrawer.endTimeStamp){
                this.bufferDraw();
            }
        });
        let touches: { x: number, y: number }[] = [];
        $(this.mainDrawer.canvasManager.canvas).on("touchstart", (e) => {
            e.preventDefault();
            touches = [];
            for (let i = 0; i < e.originalEvent!.touches!.length; i++) {
                const touch = e.originalEvent!.touches![i];
                touches[touch.identifier] = { x: touch.pageX, y: touch.pageY };
            }
        });
        $(this.mainDrawer.canvasManager.canvas).on("touchmove", (e) => {
            e.preventDefault();
            let movedTouches: { x1: number, y1: number, x2: number, y2: number }[] = [];
            for (let i = 0; i < e.originalEvent!.touches!.length; i++) {
                const touch = e.originalEvent!.touches![i];
                let oldTouch = touches[touch.identifier];
                if (oldTouch) {
                    movedTouches.push({ x1: oldTouch.x, y1: oldTouch.y, x2: touch.pageX, y2: touch.pageY });
                    touches[touch.identifier] = { x: touch.pageX, y: touch.pageY };
                }
            }
            if (movedTouches.length == 1) {
                let touch = movedTouches[0];
                mm({ pageX: touch.x2, pageY: touch.y2, stopPropagation: () => { } });
            }
            if (movedTouches.length == 2) {
                let ss=this.mainDrawer.startTimeStamp;
                let se=this.mainDrawer.endTimeStamp;
                if (Math.abs(movedTouches[0].x2 - movedTouches[1].x2) < 1 || (movedTouches[0].x1 - movedTouches[1].x1 > 0) != (movedTouches[0].x2 - movedTouches[1].x2 > 0)) {
                    movedTouches[0].x2 = movedTouches[0].x1;
                    movedTouches[0].y2 = movedTouches[0].y1;
                    movedTouches[1].x2 = movedTouches[1].x1;
                    movedTouches[1].y2 = movedTouches[1].y1;
                    return;
                }
                let pxWidth = $(this.mainDrawer.canvasManager.canvas).width()!;
                let twidth = this.mainDrawer.endTimeStamp - this.mainDrawer.startTimeStamp;
                let time1 = movedTouches[0].x1 / pxWidth * twidth + this.mainDrawer.startTimeStamp;
                let time2 = movedTouches[1].x1 / pxWidth * twidth + this.mainDrawer.startTimeStamp;
                let newTimePerPx = (time2 - time1) / (movedTouches[1].x2 - movedTouches[0].x2);
                let newStart = time1 - movedTouches[0].x2 * newTimePerPx;
                let newEnd = time2 + (pxWidth - movedTouches[1].x2) * newTimePerPx;
                if (newStart < this.minTimeStamp) {
                    newEnd += this.minTimeStamp - newStart;
                    newStart = this.minTimeStamp;
                }
                if (newEnd > this.maxTimeStamp) {
                    newStart -= newEnd - this.maxTimeStamp;
                    newEnd = this.maxTimeStamp;
                }
                if (newStart < this.minTimeStamp) {
                    newStart = this.minTimeStamp;
                }
                this.mainDrawer.startTimeStamp = newStart;
                this.mainDrawer.endTimeStamp = newEnd;
                this.tooltip.css("opacity", "0");
                this.lines.css("opacity", "0");
                tooltipVisivle = false;
                if(ss!=this.mainDrawer.startTimeStamp||se!=this.mainDrawer.endTimeStamp){
                    this.bufferDraw();
                }
            }
        });
        $(this.mainDrawer.canvasManager.canvas).on("touchend", (e) => {
            e.preventDefault();
            for (let i = 0; i < e.originalEvent!.changedTouches!.length; i++) {
                const touch = e.originalEvent!.changedTouches![i];
                touches[touch.identifier] = undefined!;
            }
        });
        $(this.mainDrawer.canvasManager.canvas).on("touchcancel", (e) => {
            e.preventDefault();
            for (let i = 0; i < e.originalEvent!.changedTouches!.length; i++) {
                const touch = e.originalEvent!.changedTouches![i];
                touches[touch.identifier] = undefined!;
            }
        });
    }
    addDataSet(dataSet:DataSet){
        this.dataSets.push(dataSet);
        let min=this.minTimeStamp==this.mainDrawer.startTimeStamp;
        let max=this.maxTimeStamp==this.mainDrawer.endTimeStamp;
        if(dataSet.length>0){
            this.minTimeStamp=Math.min(this.minTimeStamp,dataSet.gt(0));
            this.maxTimeStamp=Math.max(this.maxTimeStamp,dataSet.gt(dataSet.length-1));
        }
        if(min){
            this.mainDrawer.startTimeStamp=this.minTimeStamp;
        }
        if(max){
            this.mainDrawer.endTimeStamp=this.maxTimeStamp;
        }
        this.redrawLines();
    }
    updateMinMax(){
        let min=this.minTimeStamp==this.mainDrawer.startTimeStamp;
        let max=this.maxTimeStamp==this.mainDrawer.endTimeStamp;
        this.minTimeStamp=Number.POSITIVE_INFINITY;
        this.maxTimeStamp=Number.NEGATIVE_INFINITY;
        for (let i = 0; i < this.dataSets.length; i++) {
            this.minTimeStamp = Math.min(this.minTimeStamp, this.dataSets[i].gt(0));
            this.maxTimeStamp = Math.max(this.maxTimeStamp, this.dataSets[i].gt(this.dataSets[i].length - 1));
        }
        if(min){
            this.mainDrawer.startTimeStamp=this.minTimeStamp;
        }
        if(max){
            this.mainDrawer.endTimeStamp=this.maxTimeStamp;
        }
        this.updatemm();
    }
    redrawLines() {
        this.lineList = [];
        this.lines.remove();
        this.lines = $();
        for (let i = 0; i < this.dataSets.length; i++) {
            const dataSet = this.dataSets[i];
            let line = $("<div></div>");
            line.addClass("tooltip-line");
            let nx = 0;
            line.css("left", nx + "px");
            line.css("--lines", this.dataSets.length);
            line.css("--color", dataSet.color);
            line.css("--id", i);
            this.parent.append(line);
            this.lines = this.lines.add(line);
            this.lineList.push({ e: line, curPosX: nx, goalPosX: nx });
        }
    }
    async updateTimeTicks() {
        if(!Number.isFinite(this.mainDrawer.startTimeStamp)){
            return;
        }
        this.ticksBottom.empty();
        const ticks = generateTicks("timestamp", this.mainDrawer.startTimeStamp, this.mainDrawer.endTimeStamp, $(this.mainDrawer.canvasManager.canvas).width()!)
        for (let i = 0; i < ticks.length; i++) {
            const tick = ticks[i];
            let tickDiv = $("<div></div>");
            tickDiv.addClass("tick-bottom");
            tickDiv.text(tick.text);
            let px = (tick.value - this.mainDrawer.startTimeStamp) / (this.mainDrawer.endTimeStamp - this.mainDrawer.startTimeStamp) * $(this.mainDrawer.canvasManager.canvas).width()!;
            tickDiv.css("left", px + "px");
            this.ticksBottom.append(tickDiv);
        }
    }
    async draw() {
        this.drawing = true;
        await Promise.all([
            this.mainDrawer.draw(),
            this.updateTimeTicks()
        ]);
        this.drawing = false;
    }
    bufferDraw() {
        if (this.bufferedDraw) {
            return;
        }
        if (this.drawing) {
            this.bufferedDraw = true;
            this.drawPromise?.then(() => {
                this.bufferedDraw = false;
                this.drawPromise = this.draw();
            });
            return;
        }
        this.drawPromise = this.draw();
    }
}