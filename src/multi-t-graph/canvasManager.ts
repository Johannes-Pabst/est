import $ from 'jquery';
export class CanvasManager {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    constructor(public parent: JQuery<HTMLElement>) {
        this.canvas = document.createElement('canvas');
        $(this.canvas).css({
            width: '100%',
            height: '100%'
        });
        this.ctx = this.canvas.getContext('2d')!;
        this.parent.append(this.canvas);
        this.resizeCanvas();
    }

    resizeCanvas() {
        this.canvas.width = this.parent.width()!;
        this.canvas.height = this.parent.height()!;
    }
}