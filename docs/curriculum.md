# Learn Electrics: curriculum outline

The story: **follow electricity from the street to the appliances.** Each module is one stop on that journey, and a "current" glowing along the route is the progress bar.

Practical, not perfect: this is a self-learning project for UK domestic electrics, based on BS 7671:2018+A4:2026 (18th Edition) and BS 1363. It is not a substitute for qualified training.

## How every lesson works

Nothing is read-only. Each lesson runs four beats:

1. **Try:** a challenge first (wire this, fix that, pick the right one).
2. **Reveal:** the explanation appears as you attempt it.
3. **Check:** a short quiz; progress is saved in the browser.
4. **Tool:** a calculator or virtual meter you can keep playing with.

Hands-on modes used across the course: do-first challenges, build-it-yourself 3D wiring, a virtual test rig (meter and fault-finding), and calculators with quiz loops.

## The journey

### Act 1: The basics

**1. Electricity basics**
- Flow and pressure: current, voltage and the water analogy
- Ohm's law (V = I × R) and the power formula
- The UK supply: 230 V and its tolerance
- Hands-on: Ohm's law and power sliders with a live water-pipe animation

### Act 2: From the street to your house

**2. The power network**
- From the local transformer (11 kV) to the low-voltage street cable
- The service cable, the cut-out fuse and the meter; who owns what
- Sizing a supply: what a bigger load (such as an EV charger) means
- Hands-on: follow-the-current map of the street; a "will my supply cope?" calculator

**3. Supply and earthing arrangements**
- Why we earth, and what Ze means
- TN-S, TN-C-S and TT compared
- The main earth terminal and main protective bonding (water and gas)
- Hands-on: switch the arrangement and watch the fault path change; place the bonding clamps

### Act 3: Inside the consumer unit

**4. The consumer unit and protective devices**
- Main switch, busbar, MCBs and RCDs
- MCB ratings and types (B, C, D)
- RCD types (AC, A, F, B, S) and selectivity
- Hands-on: pick the right device for each appliance; RCD ramp and trip-time tester

**5. Cables and circuit design**
- Cable size, installation method and current-carrying capacity
- Ib ≤ In ≤ Iz: matching load, breaker and cable
- Volt drop limits and how to calculate them
- Hands-on: size a circuit for a shower; stretch the cable run and watch volt drop

**6. The earth fault loop**
- The path a fault current takes: Ze plus your own R1 and R2
- Zs = Ze + (R1 + R2), maximum Zs and why disconnection time matters
- Live testing Zs and prospective fault current
- Hands-on: build the loop with sliders; virtual earth-fault-loop meter

### Act 4: Out to the appliances

**7. Socket circuits**
- Anatomy of a 13 A socket (the existing 3D lesson)
- Wiring a socket: line, neutral and earth terminals and cable colours
- Ring and radial circuits, and spurs
- Testing: ring continuity, polarity and insulation resistance
- Hands-on: wire the socket yourself; build a ring; test it with the virtual meter

**8. Lighting and switches**
- Gangs, poles and ways
- One-way lighting (3-plate and loop-in), plus the neutral-at-the-switch variants
- Two-way and intermediate switching
- Testing: polarity and insulation resistance on a lighting circuit
- Hands-on: wire lamp circuits and flip the switches; a two-way and intermediate puzzle

**9. Special locations and IP codes**
- Bathroom zones, and what is allowed in each
- The bathroom extractor fan circuit and its isolator
- IP codes: the two numbers and the optional letter
- Hands-on: drag fittings into the right zones; match IP ratings to places

### Act 5: Rules and proof

**10. Safety and the law**
- Part P, notifiable work and competent persons
- BS 7671, the IET and where the rules come from
- Safe isolation: prove dead, never assume
- Hands-on: put the safe-isolation steps in the right order; "is this notifiable?" quiz

**11. Certification and fault-finding**
- Inspection and testing, put together
- The installation certificate and the schedule of circuit details
- How often to inspect
- Hands-on: fill in a certificate from test results; a find-the-fault game with planted faults

## Where testing lives

Tests are taught beside the circuit they belong to, not in one block at the end:

| Test | Module |
|---|---|
| RCD trip times | 4 |
| Earth fault loop (Zs) and fault current | 6 |
| Ring continuity, polarity, insulation (sockets) | 7 |
| Polarity, insulation (lighting) | 8 |
| Everything together, certification | 11 |

## Conventions

- UK standards and UK colours throughout.
- Say **line** for the line conductor (not "live"); neutral is live too.
- Original text, diagrams and 3D models only; course slides and photos stay private.
- Anything we could not confirm is left out or marked "check this".
