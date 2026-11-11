import type { ItemId } from '../data/special-locations-lesson';

// Line icons drawn in a 24 x 24 box; stroke comes from the wrapper (currentColor).
export const icons: Record<ItemId, string> = {
  shaver: `<rect x="4" y="3" width="16" height="18" rx="3"/><circle cx="9.5" cy="10" r="1.4"/><circle cx="14.5" cy="10" r="1.4"/><path d="M8.5 16h7"/>`,
  socket: `<rect x="3" y="3" width="18" height="18" rx="3"/><rect x="11" y="6.5" width="2" height="4.2" rx=".4"/><rect x="6.3" y="13.2" width="4.2" height="2" rx=".4"/><rect x="13.5" y="13.2" width="4.2" height="2" rx=".4"/>`,
  switch: `<rect x="4" y="3" width="16" height="18" rx="3"/><rect x="9" y="7" width="6" height="10" rx="1.5"/><path d="M9 12h6"/>`,
  pullcord: `<rect x="7" y="2" width="10" height="5" rx="1.5"/><path d="M12 7v10.5"/><circle cx="12" cy="20" r="2.2"/>`,
  light: `<path d="M3 4h18M12 4v3.5"/><path d="M5 15a7 7 0 0 1 14 0z"/><path d="M8 18.5l-1 2.5M12 18.5V21M16 18.5l1 2.5"/>`,
  shower: `<rect x="2" y="5" width="8" height="13" rx="2"/><path d="M6 9v2.5"/><path d="M10 8h6a3 3 0 0 1 3 3v.5"/><path d="M15.5 11.5h7"/><path d="M17 14.5l-.6 2.2M19 14.5v2.6M21 14.5l.6 2.2"/>`,
  fan: `<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="1.7"/><path d="M12 10.3c-.3-3 .8-5.2 3.2-5.6M13.6 12.6c2.7 1.2 3.9 3.2 3.2 5.4M10.5 12.9c-2.5 1.8-4.8 1.8-6.2.3"/>`,
  towel: `<path d="M6 3v18M18 3v18M6 7h12M6 11h12M6 15h12M6 19h12"/>`,
  mat: `<rect x="2" y="6.5" width="20" height="11" rx="2"/><path d="M5 9.5h14v2.5H5v2.5h14"/>`,
  selv: `<path d="M4 6h16"/><path d="M6.5 6h11l-2 5.5h-7z"/><text x="12" y="20.5" text-anchor="middle" stroke="none" fill="currentColor" style="font:700 7px var(--font)">12V</text>`,
};

export const iconSvg = (id: ItemId, cls = 'sl-icon') =>
  `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[id]}</g></svg>`;
