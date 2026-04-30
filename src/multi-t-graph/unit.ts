export class Unit{
    constructor(public name: string, public formatter: (value: number) => string) {
    }
    static fromString(unit: string): Unit {
        return new Unit(unit, (value: number) => {
            return formatUnit(value, unit);
        });
    }
}
export function formatUnit(n: number, u: string): string {
    if (["", "bytes", "bits"].includes(u)) {
        let short = u;
        if (u == "bytes") {
            short = "B";
        }
        if (u == "bits") {
            short = "b";
        }
        let prefixes = [`n${short}`, `µ${short}`, `m${short}`, `${short}`, `k${short}`, `M${short}`, `G${short}`, `T${short}`, `E${short}`,];
        let zeroId = 3;
        let log = Math.floor(Math.log10(n) / 3);
        if (n == 0) {
            log = 0;
        }
        let id = log + zeroId;
        return `${formatNumber(n / Math.pow(1000, log), 3)} ${prefixes[id]}`
    }
    return `${formatNumber(n, 3)} ${u}`
}
function formatNumber(n: number, digits: number) {
    let pcd = (n + "").split(".")[0].length;
    let n2;
    if (pcd >= digits) {
        n2 = Math.round(n) + "";
    } else {
        n2 = n.toFixed(digits - pcd);
    }
    if (n2.includes(".")) {
        while (n2.endsWith("0")) {
            n2 = n2.substring(0, n2.length - 1);
        }
        if (n2.endsWith(".")) {
            n2 = n2.substring(0, n2.length - 1);
        }
    }
    return n2;
}
