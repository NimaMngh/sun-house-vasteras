# Sun House Västerås

A ten-minute game for **BTA224, Module 3: Solar heating in buildings** (20 October 2026, slide 24).
Students design a 150 m² house in Västerås and try to use the low winter sun, keep the summer sun out and keep the rooms bright.
Every change sends the house through a whole year of weather, hour by hour (8 760 hours), and returns a score out of 1000.

👉 **Live app:** https://nimamngh.github.io/sun-house-vasteras/ (QR code for slide 24: [`docs/app_qr.png`](docs/app_qr.png))

The app runs in any phone browser. Nothing to install, no login, no data leaves the phone.

## In the lecture

Slide 24 comes right after the six rules (slide 23) and right before the two questions of slide 25.
Title of slide 24: **“Design a sun house for Västerås”**.
Put `docs/app_qr.png` in the Overleaf project as `images/app_qr.png`.

What students do, about 1 to 2 minutes per mission:

| Mission | What they change | Goal | Links to |
|---|---|---|---|
| 1 Face the sun | orientation | heating below 6 300 kWh | rule 1, slides 2 and 9 |
| 2 Size for daylight | window area per facade | daylight on both sides, peak below 4.7 kW | rules 2 and 6, slide 22 |
| 3 Good glass | glazing | heating below 5 200 kWh, keep the daylight | rule 3, slides 16 and 17 |
| 4 The passive house paradox | insulation, after a *guess first* | passive house | slide 18, **slide 25 question 1** |
| 5 Keep it cool | shading, thermal mass, summer ventilation | at most 100 h above 26 °C, heating below 2 000 kWh | rules 4 and 5, slides 19 and 20, **slide 25 question 2** |
| 6 Master architect | everything, from the client's bad sketch again, with a clock | 950 points (three stars) | all six rules |
| Bonus: a neighbour moves in | the 12 m building 25 m to the south | 950 points with the neighbour | task 1, slides 6 and 7 |

Each mission ends with a short insight that uses the student's own numbers (for example “the useful share of the sun fell from 45 % to 27 %”).
A coach line under the mission names the weakest point of the current design with the rule behind it.

**Questions that work at 11:00**

- “Who got three stars? How fast was mission 6?” (the clock makes it a race)
- “In mission 4, who guessed that the useful share goes *down*?” Then slide 25, question 1.
- “Concrete under carpet or exposed concrete: which one passed mission 5?” Then slide 25, question 2.

**Teacher tricks**

- `…/?free` opens free design with every control open, good for a demo on the projector.
- `…/?reset` clears the saved progress on that device.
- Progress is saved in the browser, so a student who closes the tab can continue.

## What happens behind the scenes

Students never see this, but every number in the app comes from a real hourly calculation.

- **Weather.** A typical year for Västerås (59.6° N) is generated from a fixed seed, so every student gets the same year.
  The monthly sun on a flat roof equals the lecture data exactly (backup slide 2, Hastings and Wall 2007), about 43 % of it is diffuse, and the monthly temperatures follow the Västerås normals.
  It includes a cold snap in late January (down to −18 °C) and a heat wave in mid-July (about 30 °C).
- **Sun on the facades.** Beam, diffuse (isotropic sky) and ground reflection (0.2), as in the lecture's own calculation.
  The result is close to backup slide 2:

  | kWh/m² | year, app | year, slide | Oct–Apr, app | Oct–Apr, slide |
  |---|---|---|---|---|
  | south wall | 882 | 905 | 382 | 402 |
  | east or west wall | 642 | 665 | 189 | 198 |
  | north wall | 346 | 378 | 96 | 96 |
  | 40° south roof | 1 174 | 1 190 | | |

- **Windows.** Glass share 0.7 (slide 12), g value, U value and light transmittance per glazing, lower gain at grazing angles, the overhang with a gap (slide 10: shaded part = *P* tan *α* − *G*), the neighbour (task 1), blinds inside (heat stays in the room) or outside (sun stopped before the glass). Blinds come down only when the room is warm.
- **The house.** One zone with the 5R1C network of ISO 13790 (air, surfaces, thermal mass), heated to 21 °C, no cooling. Three envelopes: the 1970s house of 6 October (about 20 000 kWh a year), a new build, a passive house. Summer ventilation = bypass of the heat recovery plus night airing (slide 20).
- **Results.** Heating per year and month, hours above 26 °C, peak load at −20 °C without sun (slide 22), daylight as glass area against 10 % of the floor on each side, and the **useful share of the sun**, found by running the year a second time without sun through the windows (slide 12, η).

The model reproduces the stories of the lecture: a passive house without shading gets about 2 300 h above 26 °C (slide 20: 2 080 h), and with external blinds, bypass and night air about 200 h in a light timber house (slide 20: 175 h). More north glass adds much more heating than more south glass (slide 22). The useful share of the sun falls from about 65 % in the 1970s house to about 27 % in the passive house (slide 18).
In the app, “How these numbers are calculated” (under the score) shows these calculations with the student's own values: the heat loss coefficient and the peak load, the year's heat in and out, the useful share of the sun and the sun through each facade.

## How we know the numbers are right

`npm run verify` runs about 50 checks. GitHub runs them before every deployment and stops the deployment if one fails.

- **The lecture's answer key.** Noon heights 53.8°, 19.0° and 7.0°; the new building at 21.8° and no noon sun from 13 October to 28 February; overhang depth 1.10 m and 0.38 m of shade today; with a gap 1.47 m and 0.51 m, and 0.34 m of shade in March; the window break-even of 120 W/m² (94 W/m² with quadruple glazing).
- **The weather against backup slide 2.** Every month of the flat roof exactly, the walls and the 40° roof within 10 %, south against north from October to April 4.0 (slide 9: four times).
- **The hourly solver against hand calculations.** At a constant −20 °C without sun, the hour-by-hour calculation lands exactly (to the watt) on the steady state of its heat network, also with 600 W of internal gains. Against the slide 22 formula P = H · 41 K it gives 1.5 to 3 % less: the hourly method keeps the air at 21 °C and lets the room surfaces settle slightly cooler, while the design-load formula takes all of the room at 21 °C. The app shows the slide 22 value for the peak.
- **Energy is conserved.** For every design tested, heat in (heating, people, sun) equals heat out (windows, walls, air) plus heat stored, to 10⁻¹² %.
- **The lecture's claims.** The 1970s house needs about 20 000 kWh; more north glass costs much more heat than more south glass; the useful share of the sun falls from about 66 % (1970s) to 27 % (passive house); about 2 300 h above 26 °C without shading (slide 20: 2 080 h) and about 200 h with external blinds, bypass and night air (slide 20: 175 h); blinds inside help less than outside; exposed mass beats mass under carpet beats a light house.

## What is calculated, what is assumed, what is a game choice

**Calculated** (physics, hour by hour): the sun's position; the sun on each facade (beam, sky and ground); what the glass, overhang, neighbour and blinds let through; the heat flows through windows, walls, roof, floor and air; the heat stored in the mass; the heating needed for 21 °C; the room temperature when nothing is heated; the peak load; the useful share of the sun.

**Assumed** (typical inputs; change them in `src/sim/design.ts` and `src/sim/weather.ts`):
- the weather year is generated, not measured: exact monthly sun of backup slide 2 and Västerås monthly temperatures, but the hour-by-hour sequence is synthetic;
- U values of the three houses, g value, U value and light transmittance of the four glazings, glass share 0.7;
- thermal mass as the ISO 13790 classes; “concrete under carpet” as an intermediate class;
- people and appliances about 4 W/m² with a daily profile; 21 °C heating set point; ventilation 0.35 l/s per m² with 75 or 85 % heat recovery;
- occupants open a window when the room is above 26 °C; blinds come down when the room is warm and the sun is strong;
- one heated zone; the floor loses half of what a wall to outdoor air would; no sun on walls and roof, no night sky radiation.

**Game choices** (not physics): the score (heating 300, summer 250, daylight 250, peak 200 points), the star limits and the mission targets. Daylight uses the Swedish rule of thumb of glass equal to 10 % of the floor area on each side of the house, not a daylight simulation.

It is made for learning, not for design.

## Run and change it

Requires Node.js 20 or later.

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build in dist/
npm run typecheck
```

GitHub Pages hosts the app. Every push to `main` runs [`.github/workflows/pages.yml`](.github/workflows/pages.yml), which type-checks, runs the physics checks, builds and publishes `dist/`.
The app is static: the page, one script and one stylesheet. All calculations run in the browser, so any static web host would work too.

Tools for tuning the model and the missions:

```bash
npm run verify       # about 50 checks against the lecture's answer key and physics
npm run calibrate    # weather and house model against the lecture numbers
npm run playthrough  # scores along the intended path through the missions
npm run optimum      # best design the score allows (open field and city plot)
```

| Where | What |
|---|---|
| `src/sim/weather.ts` | the typical year and the sun position |
| `src/sim/design.ts` | everything a student can choose, with U, g, mass and envelope data |
| `src/sim/simulate.ts` | the hourly heat balance |
| `src/game/score.ts` | the four ratings (heating 300, summer comfort 250, daylight 250, peak power 200) |
| `src/game/missions.ts` | mission texts, goals and insights |
| `src/game/tips.ts` | the coach lines |
| `src/components/` | the screens, the house section drawing and the charts |

## Sources

- S. R. Hastings and M. Wall (eds.) (2007). *Sustainable Solar Housing, Vol. 1.* Earthscan. Stockholm climate data, window balance, overheating hours.
- D. Chwieduk (2014). *Solar Energy in Buildings.* Academic Press. Thermal mass and passive systems at high latitudes.
- J. A. Duffie and W. A. Beckman (2013). *Solar Engineering of Thermal Processes.* Wiley. Sun position, overhang with gap, Erbs diffuse fraction.
- ISO 13790:2008, simple hourly method (5R1C).
