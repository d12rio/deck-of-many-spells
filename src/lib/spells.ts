import spellData from "@/data/spells-xphb.json";

export interface Spell {
  name: string;
  source: string;
  level: number;
  school: string;
  time: { number: number; unit: string }[];
  range: {
    type: string;
    distance?: { type: string; amount?: number };
  };
  components: { v?: boolean; s?: boolean; m?: string | boolean };
  duration: { type: string; duration?: { type: string; amount: number }; concentration?: boolean }[];
  entries: (string | Record<string, unknown>)[];
  entriesHigherLevel?: { type: string; name: string; entries: string[] }[];
  damageInflict?: string[];
  savingThrow?: string[];
  meta?: { ritual?: boolean };
}

const SCHOOL_MAP: Record<string, string> = {
  A: "Abjuration",
  C: "Conjuration",
  D: "Divination",
  E: "Enchantment",
  I: "Illusion",
  N: "Necromancy",
  T: "Transmutation",
  V: "Evocation",
};

export function schoolName(code: string): string {
  return SCHOOL_MAP[code] ?? code;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\//g, "-")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function cardImagePath(spell: Spell): string {
  return `/cards/${slugify(spell.name)}.png`;
}

export const allSpells: Spell[] = (spellData as { spell: Spell[] }).spell;

export function isConcentration(spell: Spell): boolean {
  return spell.duration[0]?.concentration === true;
}

export function isRitual(spell: Spell): boolean {
  return spell.meta?.ritual === true;
}

export function cleanEntryText(text: string): string {
  return text.replace(/\{@\w+\s([^}]+)\}/g, (_, inner: string) => {
    const parts = inner.split("|");
    if (parts.length === 1) return parts[0];
    if (parts.length >= 3) return parts[2];
    return parts[0];
  });
}

export function formatEntries(entries: (string | Record<string, unknown>)[]): string[] {
  const lines: string[] = [];
  for (const entry of entries) {
    if (typeof entry === "string") {
      lines.push(cleanEntryText(entry));
    } else if (typeof entry === "object" && entry !== null) {
      if (entry.type === "entries" && Array.isArray(entry.entries)) {
        if (entry.name) lines.push(`${entry.name}:`);
        for (const sub of entry.entries as (string | Record<string, unknown>)[]) {
          if (typeof sub === "string") lines.push(cleanEntryText(sub));
        }
      } else if (entry.type === "list" && Array.isArray(entry.items)) {
        for (const item of entry.items as (string | Record<string, unknown>)[]) {
          if (typeof item === "string") {
            lines.push("• " + cleanEntryText(item));
          } else if (typeof item === "object" && item !== null && typeof item.name === "string") {
            const itemEntries = (item.entries as string[]) || [];
            lines.push(`• ${item.name}: ${itemEntries.map((e: string) => cleanEntryText(e)).join(" ")}`);
          }
        }
      }
    }
  }
  return lines;
}

export function formatCastingTime(spell: Spell): string {
  const t = spell.time[0];
  if (!t) return "Unknown";
  return `${t.number} ${t.unit}${t.number > 1 ? "s" : ""}`;
}

export function formatRange(spell: Spell): string {
  const r = spell.range;
  if (r.type === "point" && r.distance) {
    if (r.distance.type === "self") return "Self";
    if (r.distance.type === "touch") return "Touch";
    return `${r.distance.amount} ${r.distance.type}`;
  }
  if (r.type === "self") return "Self";
  return r.type.charAt(0).toUpperCase() + r.type.slice(1);
}

export function formatComponents(spell: Spell): string {
  const parts: string[] = [];
  if (spell.components.v) parts.push("V");
  if (spell.components.s) parts.push("S");
  if (spell.components.m) {
    if (typeof spell.components.m === "string") {
      parts.push(`M (${spell.components.m})`);
    } else {
      parts.push("M");
    }
  }
  return parts.join(", ");
}

export function formatDuration(spell: Spell): string {
  const d = spell.duration[0];
  if (!d) return "Unknown";
  if (d.type === "instant") return "Instantaneous";
  if (d.type === "permanent") return "Permanent";
  if (d.type === "special") return "Special";
  const conc = d.concentration ? "Conc., " : "";
  if (d.duration) {
    return `${conc}${d.duration.amount} ${d.duration.type}${d.duration.amount > 1 ? "s" : ""}`;
  }
  return d.type;
}
