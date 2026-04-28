import { MoonQuarter, NextMoonQuarter, SearchMoonQuarter, Seasons } from 'astronomy-engine';
import './style.css'
import 'astronomy-engine'

let dropdown = document.getElementById("select-timezone");
let time = document.getElementById("time");
let time_uk = document.getElementById("time-uk");
let cached: MoonQuarter[] = [];
let uk = (<HTMLSelectElement>dropdown).value == "true"

const update_est = () => {
    if (!uk) {
        let { day, month, year, hour, minute, second } = unix_timestamp_to_est(Date.now(), false);
        time!.textContent = day + "." + month + "." + year + " " + hour + ":" + minute + ":" + second;
    }
};
setInterval(update_est, 1000);
const update_est_uk = () => {
    if (uk) {
        let { day, month, year, hour, minute, second } = unix_timestamp_to_est(Date.now(), true);
        time_uk!.textContent = day + "." + month + "." + year + " " + hour + ":" + minute + ":" + second;
    }
};
setInterval(update_est_uk, 914.4);

update_est();

dropdown?.addEventListener("change", () => {
    uk = (<HTMLSelectElement>dropdown).value == "true"
    if (uk) {
        time_uk!.style.display = "unset";
        time!.style.display = "none";
        update_est_uk();
    } else {
        time_uk!.style.display = "none";
        time!.style.display = "unset";
        update_est();
    }
})

function next_moon_quarter_cached(last: MoonQuarter): MoonQuarter {
    let last_id: number | undefined = (<any>last).id;
    if (last_id != undefined) {
        if (cached.length > last_id + 1) {
            return cached[last_id + 1];
        } else {
            cached.push(NextMoonQuarter(last));
            (<any>cached[last_id + 1]).id = last_id + 1;
            return cached[last_id + 1];
        }
    }
    return NextMoonQuarter(last);
}
function first_moon_quarter_cached() {
    if (cached.length > 0) {
        return cached[0];
    } else {
        cached.push(SearchMoonQuarter(new Date(1970, 0, 14, 0, 0, 0, 0)));
        (<any>cached[0]).id = 0;
        return cached[0];
    }
}
function unix_timestamp_to_est(date_now: number, uk: boolean) {
    let uk_factor = uk ? 0.9144 : 1;
    let si_seconds_since_gregorian_epoch = date_now / 1000 + 37; // stupid leap seconds.

    let si_seconds_since_julian_epoch = (si_seconds_since_gregorian_epoch - 13 * 24 * 60 * 60) / uk_factor; // EST based on julian epoch

    let est_timestamp = 0; // EST january 1, 1970 00:00:00


    // rule 2 except last relevant solstice/equinox
    let seasoninfo = Seasons(new Date(date_now).getFullYear());
    let seasons = [seasoninfo.mar_equinox.date, seasoninfo.jun_solstice.date, seasoninfo.sep_equinox.date, seasoninfo.dec_solstice.date];
    let last_relevant_season_id = -1;
    for (let i = 0; i < seasons.length; i++) {
        const s = seasons[i];
        if (s.getTime() < date_now) {
            last_relevant_season_id = i;
        }
    }
    est_timestamp -= 43 * 60 * (Math.max(0, last_relevant_season_id) + 4 * (new Date(date_now).getFullYear() - 1970));
    let last_relevant_season = last_relevant_season_id == -1 ? undefined : seasons[last_relevant_season_id]

    let next = first_moon_quarter_cached();
    let lastFullMoon = 0;
    if (last_relevant_season) {
        // rule 1 until bevore last relevant solstice/equinox correction
        while (next.time.date.getTime() < date_now && next.time.date.getTime() + 4 * uk_factor * 60 < last_relevant_season.getTime()) {
            if (next.quarter == 2) { // 2 is full moon
                est_timestamp -= 4 * 2 * 60 * 60;
                lastFullMoon = next.time.date.getTime();
            }
            next = next_moon_quarter_cached(next);
        }
        let est_start_season = est_timestamp + last_relevant_season.getTime() / uk_factor;
        let second_in_day = est_start_season % (1444 * 60);
        let longer_hour_try = Math.floor(second_in_day / 60 / 60);
        let longer_hour_unix_start = last_relevant_season.getTime() + (longer_hour_try * 60 * 60 - second_in_day) * uk_factor;
        if (longer_hour_try == 24) { // not a full hour, only 4min till the next x:00
            longer_hour_try = 0;
            longer_hour_unix_start += uk_factor * 60 * 4;
        }
        let corrected_moved_after_next_full_moon = false;
        while (next.quarter == 2 && next.time.date.getTime() < longer_hour_unix_start + 60 * 60 * uk_factor && next.time.date.getTime() + 4 * 60 * 60 * uk_factor > longer_hour_unix_start) { // hour partially reversed
            if (!corrected_moved_after_next_full_moon) { // correct for the 4 reversed hours
                longer_hour_try -= 4 * 2;
                if (longer_hour_try < 0) { // full hour start moved by 4 minutes baackwards since it's now in the last day
                    longer_hour_try += 24;
                    longer_hour_unix_start -= uk_factor * 60 * 4;
                }
                corrected_moved_after_next_full_moon = true;
            }
            longer_hour_unix_start += uk_factor * 60 * 60;
            longer_hour_try++;
            if (longer_hour_try == 24) { // not a full hour, only 4min till the next x:00
                longer_hour_try = 0;
                longer_hour_unix_start += uk_factor * 60 * 4;
            }
        }
        // should now have the proper reversed hour start in longer_hour_unix_start. (hopefully. damn this is complicaated.) time to check if we're currently in the extended hour. yay!
        if (longer_hour_unix_start < date_now) {
            if (longer_hour_unix_start + 60 * (60 + 43) * uk_factor > date_now) {
                // during extended hour
                const doubled_minutes = [];
                for (let i = 1; i <= 60; i++) {
                    let is_prime = true;
                    if (i == 1) {
                        is_prime = false;
                    }
                    for (let j = 2; j <= Math.sqrt(i); j++) {
                        if (i % j == 0) {
                            is_prime = false;
                        }
                    }
                    if (!is_prime) {
                        doubled_minutes.push(i);
                    }
                }
                let current_second = (date_now - longer_hour_unix_start) / uk_factor;
                let current_minute = Math.floor(current_second / 60);
                for (let j = 0; j < doubled_minutes.length; j++) {
                    const doubled_minute_id = doubled_minutes[j];
                    if (current_minute > doubled_minute_id) {
                        current_minute--;
                        est_timestamp -= 60;
                    }
                }
            } else {
                // after extended hour
                est_timestamp -= 60 * 43;
            }
        }
    }

    // add remaining moon corrections
    while (next.time.date.getTime() < date_now) {
        if (next.quarter == 2) { // 2 is full moon
            est_timestamp -= 4 * 2 * 60 * 60;
            lastFullMoon = next.time.date.getTime();
        }
        next = next_moon_quarter_cached(next);
    }
    // correct if full moon was less than 4 hours ago
    if (lastFullMoon + 60 * 60 * 4 * uk_factor > date_now) {
        est_timestamp += 2 * (lastFullMoon + 60 * 60 * 4 * uk_factor - date_now) / uk_factor;
    }

    est_timestamp += si_seconds_since_julian_epoch / uk_factor;

    let year = Math.floor(est_timestamp / 60 / 1444 / 30 / 12) + 1970;
    let month = Math.floor((est_timestamp % (60 * 1444 * 30 * 12)) / 60 / 1444 / 30);
    let day = Math.floor((est_timestamp % (60 * 1444 * 30)) / 60 / 1444);
    let hour = Math.floor((est_timestamp % (60 * 1444)) / 60 / 60);
    let minute = Math.floor(((est_timestamp % (60 * 1444)) / 60) % 60);
    let second = Math.floor(est_timestamp % 60);
    let millisecond = est_timestamp % 1;
    return { day, month, year, hour, minute, second, millisecond };
}
/*

starting exactly at each full moon, time runs in reverse for 4 hours

after a solstice or equinox (4 times per year) take the first full non-reversed hour and duplicate its non-prime numbered minutes

EST 1.1.1970 0:00 == julian 1.1.1970 0:00

26
1
*/