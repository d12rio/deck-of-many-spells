# Deck of Many Spells

A digital spell card deck for D&D 5e spellcasters. Manage your prepared spells as holographic cards with 3D tilt effects, track spell slots, HP, conditions, and save multiple character profiles — all in the browser with no backend required.

Built with the 2024 Player's Handbook (XPHB) spell list - more to come.

## Features

### Spell Cards
- **Holographic 3D cards** with mouse-tracking tilt and gradient effects
- **Flip to reveal** full spell details — casting time, range, components, duration, and description
- **Card view or compact list view** for dense spell management
- **Drag-and-drop reordering** with custom sort, alphabetical, or by level

### Spell Casting
- **Double-click to cast** — automatically consumes the correct spell slot
- **Right-click to upcast** — pick a higher-level slot from a context menu
- **Shift+double-click for ritual casting** — no slot consumed
- **Concentration tracking** — warns before breaking an active concentration spell

### Spell Slot Tracker
- Visual pip display for each slot level (1st–9th)
- Click pips to use or restore slots
- Edit mode to configure max slots per level

### HP & Conditions
- Current / Max / Temporary HP with visual health bar
- Quick damage/heal buttons
- Temp HP absorbs damage first
- 15 standard D&D conditions (Blinded, Charmed, Stunned, etc.)

### Spell Preparation
- Star spells to mark them as prepared
- Configurable preparation limit (cantrips excluded)
- Filter to show prepared spells only

### Character Profiles
- Save and load multiple characters
- Each profile stores hand, prepared spells, slots, HP, conditions, and prep limit
- Rename and delete profiles
- **Import/Export** profiles as JSON files

### Long Rest
- Single button restores all HP, resets spell slots, and drops concentration

### Mobile Support
- Responsive layout with touch-friendly controls
- Full-screen sidebar overlay on small screens
- Collapsible HP and spell slot sections

## Tech Stack

- [Next.js](https://nextjs.org) 16 with static export
- [React](https://react.dev) 19
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com) v4
- [@dnd-kit](https://dndkit.com) for drag-and-drop
- All data persisted in `localStorage` — no server, no database

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build for Production

```bash
npm run build
```

Outputs a fully static site to the `out/` directory, ready to deploy anywhere (GitHub Pages, Netlify, Cloudflare Pages, etc.).

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout and metadata
│   ├── page.tsx            # Entry point
│   └── globals.css         # All custom styles
├── components/
│   ├── Playfield.tsx       # Main orchestrator (state + layout)
│   ├── HoloCard.tsx        # 3D holographic spell card
│   ├── SpellSearch.tsx     # Sidebar spell browser
│   ├── SpellSlotTracker.tsx
│   └── HPTracker.tsx
├── data/
│   └── spells-xphb.json   # D&D 2024 XPHB spell data
└── lib/
    ├── spells.ts           # Spell types and utility functions
    └── useLocalStorage.ts  # Persistent state hook
```

## Spell Data & Card Art

### Spell JSON

Place your spell data JSON in `src/data/`. The app expects a `{ "spell": [...] }` structure where each spell object has fields like `name`, `level`, `school`, `time`, `range`, `components`, `duration`, and `entries`. See other projects to get an idea of a potential `spells-xphb.json` for the full schema and data.

### Card Images

Card art goes in `public/cards/` using the naming convention:

```
public/cards/{slugified-name}.png
```

The slug is the spell name lowercased with spaces replaced by hyphens and special characters stripped. Examples:

| Spell Name                    | Filename                              |
| ----------------------------- | ------------------------------------- |
| Magic Missile                 | `magic-missile.png`                   |
| Cure Wounds                   | `cure-wounds.png`                     |
| Protection from Evil and Good | `protection-from-evil-and-good.png`   |

Cards without a matching image fall back to a styled placeholder showing the spell's level, name, and school.

## Acknowledgements

- Holographic card effect inspired by [poke-holo](https://poke-holo.simey.me/) by [Simon Goellner](https://github.com/simeydotme/pokemon-cards-css)

## License

This project is for personal use. D&D spell data and mechanics are property of Wizards of the Coast.
