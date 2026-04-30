import { est_timestamp_to_est_date, unix_timestamp_to_est_timestamp } from "./main";
import { DataSet } from "./multi-t-graph/dataSet";
import { MultiTGraphManager } from "./multi-t-graph/graphManager";
import { Unit } from "./multi-t-graph/unit";
import $ from 'jquery'

export function renderGraph(e: HTMLElement) {
    let ds=new DataSet("EST",new DataView(new ArrayBuffer()),0,"#00ff00",new Unit("s",(v)=>{
        let { day, month, year, hour, minute, second } = est_timestamp_to_est_date(v);
        return day + "." + month + "." + year + " " + hour + ":" + minute + ":" + second;
    }),undefined, undefined, 0);
    let start = new Date(2026, 2, 20,15,45).getTime()/1000;
    let end = new Date(2026, 2, 20,18).getTime()/1000;
    let stepsizes = 1;
    for (let i = start; i <= end; i+=stepsizes) {
        ds.addPoint(BigInt(i)*1000n,unix_timestamp_to_est_timestamp(false, false,i*1000))
    }
    ds.updateMinMax();
    let manager=new MultiTGraphManager([ds],$(e));
    manager.bufferDraw();
}