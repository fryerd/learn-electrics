// Pure maths for chapter 2 (no DOM), so it can be sanity-checked on its own.

export const UK_VOLTS = 230;

/** Current in amps for a power (W) at a voltage (V): I = P ÷ V. */
export const currentFor = (watts: number, volts: number) => watts / volts;

/** Heat lost in a cable (W): I² × R. */
export const cableLoss = (amps: number, ohms: number) => amps * amps * ohms;

export interface Transmission {
  amps: number;
  lossW: number;
  /** Loss as a fraction of the power sent (can be more than 1: impossible in practice). */
  lossFrac: number;
}

export function transmit(watts: number, volts: number, ohms: number): Transmission {
  const amps = currentFor(watts, volts);
  const lossW = cableLoss(amps, ohms);
  return { amps, lossW, lossFrac: lossW / watts };
}

/** Total load in kW and amps at 230 V. */
export function supplyLoad(kws: number[]) {
  const kw = kws.reduce((s, k) => s + k, 0);
  return { kw, amps: (kw * 1000) / UK_VOLTS };
}

export type SupplyState = 'ok' | 'near' | 'over';

/** Fine below 80% of the fuse, close up to 100%, over above it. */
export function supplyState(amps: number, fuse: number): SupplyState {
  if (amps > fuse) return 'over';
  if (amps >= fuse * 0.8) return 'near';
  return 'ok';
}

export function fmtPower(w: number) {
  const a = Math.abs(w);
  if (a >= 1e6) return `${(w / 1e6).toFixed(a >= 1e7 ? 0 : 1)} MW`;
  if (a >= 1e3) return `${(w / 1e3).toFixed(a >= 1e4 ? 0 : 1)} kW`;
  if (a >= 10) return `${Math.round(w)} W`;
  return `${w.toFixed(1)} W`;
}

export function fmtAmps(a: number) {
  if (a >= 100) return `${Math.round(a).toLocaleString('en-GB')} A`;
  if (a >= 10) return `${a.toFixed(1)} A`;
  return `${a.toFixed(2)} A`;
}

export function fmtPercent(f: number) {
  const p = f * 100;
  if (p >= 100) return `${Math.round(p).toLocaleString('en-GB')}%`;
  if (p >= 1) return `${p.toFixed(1)}%`;
  if (p >= 0.01) return `${p.toFixed(2)}%`;
  return `${p.toFixed(4)}%`;
}
