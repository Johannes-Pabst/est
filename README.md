# UTC to EST converter
## features
- supports EST as well as EST (United Kingdom)
- both timezones have a DST variant
- now tested for normal solstice and full moon cases
## limitations
- only works for dates AFTER 14.1.1970 00:00 UTC
- up to 27s wrong for dates close to 14.1.1970 00:00 UTC
- not tested yet for solstice/full moon/end of day 4 min overlap edge cases
- since the EST definition is, despite its claim, not "clearly defined", I had to make some assumptions.
## assumptions
- "for 4 hours after every full moon, run clocks backward."
    - this means 4 EST hours
    - they start exactly when the moon is fullest
    - clocks still run at the same speed
- "the non-prime-numbered minutes of the first full non-reversed hour after a solstice or equinox happen twice"
    - a "full" hour needs to start at x:00 AND end at x:00 AND last exactly 1 EST hour.
    - the minute from x:00:00 to x:00:59 is minute number 0.
    - clocks jump from x:y:59 to x:y:00 for y not prime once per y in such hours and run at normal speed at all times
- "... the fourth month only has the name 'April' in even-numbered years, and is otherwise unnamed."
    - this means the CURRENT ETC year, not the CONVERTED ETC year. e.g.: it's 2026 and you convert a date to 1.4.2025 EST. In this case, the date is spoken "first of april 2025" because it's currently an even year, despite the converted date being an odd year.
- "Countries may enter DST, but no time may pass there."
    - at any time, any country may enter DST. Bevore time passes there, so in most cases immediately, the country must leave DST, meaning it has no effect at all. If a country is entirely made of photons, it may stay in DST though since it travels at light speed and therefore, from its point of view, no time passes while it is in DST. This means there ARE theoretical EDT as well as EDT (United Kingdom) timezones. Now to get enough other countries to recognize something made entirely of photons as a country in order to make EDT real to spite XDCD.
    - DST is equal to (UTC + 1 EST hour) converted to EST, assuming all celestial events happened 1 EST hour later.
    - DST (United Kingdom) is equal to (UTC + 1 EST (United Kingdom) hour) converted to EST (United Kingdom), assuming all celestial events happened 1 EST (United Kingdom) hour later.
