const icons = {
  "chevron-left": [
    '<path d="m15 18-6-6 6-6"/>',
  ],
  "chevron-right": [
    '<path d="m9 18 6-6-6-6"/>',
  ],
  "disc-3": [
    '<circle cx="12" cy="12" r="10"/>',
    '<path d="M6 12c0-1.7 1.1-3.2 2.7-3.8"/>',
    '<path d="M18 12c0 1.7-1.1 3.2-2.7 3.8"/>',
    '<circle cx="12" cy="12" r="2"/>',
  ],
  "layers-3": [
    '<path d="m12 3 9 5-9 5-9-5 9-5Z"/>',
    '<path d="m3 13 9 5 9-5"/>',
    '<path d="m3 18 9 5 9-5"/>',
  ],
  "list-music": [
    '<path d="M21 15V6"/>',
    '<path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>',
    '<path d="M12 12H3"/>',
    '<path d="M16 6H3"/>',
    '<path d="M12 18H3"/>',
  ],
  palette: [
    '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>',
    '<circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>',
    '<circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>',
    '<circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>',
    '<path d="M12 22C6.5 22 2 17.7 2 12.3 2 7 6.5 2.7 12 2.7S22 6 22 11c0 3-2 3-3.5 3H17c-1.2 0-2 .8-2 2 0 .5.2.9.5 1.2.3.3.5.7.5 1.2 0 1.9-1.8 3.6-4 3.6Z"/>',
  ],
  pause: [
    '<rect x="14" y="4" width="4" height="16" rx="1"/>',
    '<rect x="6" y="4" width="4" height="16" rx="1"/>',
  ],
  play: [
    '<polygon points="6 3 20 12 6 21 6 3"/>',
  ],
  radio: [
    '<path d="M4.9 19.1C3.1 17.3 2 14.8 2 12s1.1-5.3 2.9-7.1"/>',
    '<path d="M7.8 16.2A5.9 5.9 0 0 1 6 12c0-1.6.6-3.1 1.8-4.2"/>',
    '<circle cx="12" cy="12" r="2"/>',
    '<path d="M16.2 16.2A5.9 5.9 0 0 0 18 12c0-1.6-.6-3.1-1.8-4.2"/>',
    '<path d="M19.1 19.1C20.9 17.3 22 14.8 22 12s-1.1-5.3-2.9-7.1"/>',
  ],
  "skip-back": [
    '<polygon points="19 20 9 12 19 4 19 20"/>',
    '<line x1="5" x2="5" y1="19" y2="5"/>',
  ],
  "skip-forward": [
    '<polygon points="5 4 15 12 5 20 5 4"/>',
    '<line x1="19" x2="19" y1="5" y2="19"/>',
  ],
  sparkles: [
    '<path d="m12 3-1.9 5.1L5 10l5.1 1.9L12 17l1.9-5.1L19 10l-5.1-1.9L12 3Z"/>',
    '<path d="M5 3v4"/>',
    '<path d="M3 5h4"/>',
    '<path d="M19 17v4"/>',
    '<path d="M17 19h4"/>',
  ],
  terminal: [
    '<polyline points="4 17 10 11 4 5"/>',
    '<line x1="12" x2="20" y1="19" y2="19"/>',
  ],
  x: [
    '<path d="M18 6 6 18"/>',
    '<path d="m6 6 12 12"/>',
  ],
};

export function renderIcon(name, fallback = "") {
  const paths = icons[name];

  if (!paths) {
    return fallback;
  }

  return `<svg class="lucide-icon" aria-hidden="true" viewBox="0 0 24 24">${paths.join("")}</svg>`;
}
