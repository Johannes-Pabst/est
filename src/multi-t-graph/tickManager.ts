import { Temporal } from "@js-temporal/polyfill";
import { Unit } from "./unit";

export function generateTicks(unit: string, minValue: number, maxValue: number, width: number): { value: number, text: string }[] {
    let ticks: { value: number, text: string }[] = [];
    if (unit != "timestamp") {
        ticks.push({ value: minValue, text: Unit.fromString(unit).formatter(minValue) });
        ticks.push({ value: maxValue, text: Unit.fromString(unit).formatter(maxValue) });
    }
    let posTimeSteps:Temporal.DurationLike[] = [
        {milliseconds:1},
        {milliseconds:2},
        {milliseconds:5},
        {milliseconds:10},
        {milliseconds:20},
        {milliseconds:50},
        {milliseconds:100},
        {milliseconds:200},
        {milliseconds:500},
        {seconds:1},
        {seconds:2},
        {seconds:5},
        {seconds:10},
        {seconds:15},
        {seconds:20},
        {seconds:30},
        {minutes:1},
        {minutes:2},
        {minutes:5},
        {minutes:10},
        {minutes:15},
        {minutes:20},
        {minutes:30},
        {hours:1},
        {hours:2},
        {hours:3},
        {hours:4},
        {hours:6},
        {hours:12},
        {days:1},
        // damn variable length months!
        {months:1},
        {months:2},
        {months:3},
        {months:4},
        {months:6},
        {years:1},
        {years:2},
        {years:5},
        {years:10},
        {years:20},
    ];
    let minStepSize = unit == "timestamp" ? 100 : 50;
    minStepSize*=(maxValue-minValue)/width;
    if (unit == "timestamp") {
        let startPoint = Temporal.Instant.fromEpochMilliseconds(Math.round(minValue)).toZonedDateTimeISO(Temporal.Now.timeZoneId());
        if (minStepSize <= DurationLikeToMs(posTimeSteps[posTimeSteps.length - 1], startPoint)) {
            let stepSize = <Temporal.DurationLike>posTimeSteps.find((v) => {
                return DurationLikeToMs(v, startPoint) >= minStepSize;
            });
            const converted = Temporal.Duration.from(stepSize);
            if (converted.total({ unit: "millisecond", relativeTo: startPoint }) > 1) {
                startPoint=startPoint.with({ millisecond: 0 });
            }
            if (converted.total({ unit: "second", relativeTo: startPoint }) > 1) {
                startPoint=startPoint.with({ second: 0 });
            }
            if (converted.total({ unit: "minute", relativeTo: startPoint }) > 1) {
                startPoint=startPoint.with({ minute: 0 });
            }
            if (converted.total({ unit: "hour", relativeTo: startPoint }) > 1) {
                startPoint=startPoint.with({ hour: 0 });
            }
            if (converted.total({ unit: "day", relativeTo: startPoint }) > 1) {
                startPoint=startPoint.with({ day: 1 });
            }
            if (converted.total({ unit: "month", relativeTo: startPoint }) > 1) {
                startPoint=startPoint.with({ month: 0 });
            }
            if (converted.total({ unit: "year", relativeTo: startPoint }) > 1) {
                startPoint=startPoint.with({ year: 2000 });
            }
            while (startPoint.epochMilliseconds < minValue) {
                startPoint=startPoint.add(stepSize);
            }
            while (startPoint.epochMilliseconds <= maxValue) {
                ticks.push({ value: startPoint.epochMilliseconds, text: formatTimeTick(startPoint.epochMilliseconds) });
                startPoint=startPoint.add(stepSize);
            }
        }
    }
    return ticks;
}
export function formatTimeTick(value: number): string {
    let date = Temporal.Instant.fromEpochMilliseconds(value).toZonedDateTimeISO(Temporal.Now.timeZoneId());
    if(date.millisecond!=0){
        return date.millisecond + "ms";
    }
    if(date.second!=0){
        return date.second + "s";
    }
    if(date.minute!=0){
        return ":"+date.minute;
    }
    if(date.hour!=0){
        return date.hour + ":00";
    }
    if(date.day!=1){
        return [undefined,"Mo","Tu","We","Th","Fr","Sa","Su"][date.dayOfWeek]+" "+ date.day + ".";
    }
    if(date.month!=0){
        return [undefined,"Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Nov","Dec"][date.month]!;
    }
    return date.year + "";
}
export function DurationLikeToMs(zdt: Temporal.DurationLike, relativeTo:Temporal.ZonedDateTime): number {
    let date = Temporal.Duration.from(zdt);
    return date.total({ unit: "millisecond",relativeTo: relativeTo});
}