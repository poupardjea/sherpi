const stroke = (w: number, size = 20) =>
  `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;

export const ICONS = {
  close: `<svg ${stroke(2)}><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  send: `<svg ${stroke(2)}><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
  back: `<svg ${stroke(2, 22)}><path d="M15 18l-6-6 6-6"/></svg>`,
  check: `<svg ${stroke(2.2, 30)}><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
  calendar: `<svg ${stroke(2, 18)}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>`,
  gift: `<svg ${stroke(1.8, 22)}><path d="M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z"/></svg>`,
  glass: `<svg ${stroke(1.8, 22)}><path d="M8 22h8M12 15v7M7 2h10l-1 7a4 4 0 0 1-8 0z"/></svg>`,
  star: `<svg ${stroke(1.8, 22)}><path d="M12 2l3 6 6 .9-4.5 4.3 1 6.3L12 16.6 6.5 19.5l1-6.3L3 8.9 9 8z"/></svg>`,
  jar: `<svg ${stroke(1.8, 22)}><path d="M8 2h8v3H8zM7 5h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM5 11h14"/></svg>`,
  book: `<svg ${stroke(1.8, 22)}><path d="M4 19.5V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h14v-4M8 7h8"/></svg>`,
  pin: `<svg ${stroke(1.8, 22)}><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>`,
  bottle: `<svg width="26" height="60" viewBox="0 0 26 60" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M10 2h6v14c0 3 6 6 6 12v28a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V28c0-6 6-9 6-12z"/></svg>`,
};
