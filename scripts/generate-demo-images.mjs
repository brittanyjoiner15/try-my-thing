// Draws the logos and phone screenshots for the fake products in lib/data/mock.js.
// Output: public/demo/<product id>-logo.svg and -screenshot.svg.
// Run: node scripts/generate-demo-images.mjs
// These are our own static files, so SVG is fine here (the "no SVG" rule is for user uploads).
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = new URL("../public/demo/", import.meta.url);
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Each product: brand colors, a logo glyph, and what its main screen shows.
const PRODUCTS = {
  "pr-migrately": {
    name: "Migrately", color: "#336791", dark: "#1e3f5a", glyph: "M",
    hero: ["3 ready", "migrations · all tests pass"],
    rows: [
      ["0042_add_invoices", "tested on a copy of prod · 1.2s", "pass", "#16a34a"],
      ["0043_index_events", "no table lock · concurrent", "pass", "#16a34a"],
      ["0044_drop_legacy", "reversible · backup taken", "pass", "#16a34a"],
      ["0041_rename_users", "applied 2 days ago", "done", "#64748b"],
    ],
    button: "Apply to production",
  },
  "pr-invoicely": {
    name: "Invoicely", color: "#16a34a", dark: "#14532d", glyph: "I",
    hero: ["$4,280.00", "Invoice #1042 · due Nov 30"],
    rows: [
      ["Team plan, 12 seats", "Nov 1 – Nov 30", "$2,400", "#0f172a"],
      ["Extra seats added Nov 9", "3 seats, 21 days", "$420", "#0f172a"],
      ["API usage over your plan", "1.46M calls past 1M", "$1,460", "#0f172a"],
    ],
    button: "Pay invoice",
  },
  "pr-shipcheck": {
    name: "ShipCheck", color: "#7c3aed", dark: "#4c1d95", glyph: "✓",
    hero: ["92 / 100", "likely to pass App Review"],
    rows: [
      ["Privacy manifest", "all required reasons listed", "ok", "#16a34a"],
      ["Sign in with Apple", "offered next to Google login", "ok", "#16a34a"],
      ["Guideline 4.3", "looks close to 2 other apps", "check", "#d97706"],
      ["Screenshots", "6.9\" set missing", "fix", "#dc2626"],
    ],
    button: "Download report",
  },
  "pr-standup": {
    name: "Standup Bot", color: "#d97706", dark: "#78350f", glyph: "S",
    hero: ["8:59am", "#standup · posted for you"],
    rows: [
      ["Yesterday", "Shipped CSV export (#412)", "", "#0f172a"],
      ["Yesterday", "Fixed flaky login test", "", "#0f172a"],
      ["Today", "Billing page review", "", "#0f172a"],
      ["Blockers", "None 🎉", "", "#0f172a"],
    ],
    button: "Edit before posting",
  },
  "pr-tokens": {
    name: "TokenSync", color: "#db2777", dark: "#831843", glyph: "T",
    hero: ["48 synced", "Figma ⇄ tokens.css · just now"],
    rows: [
      ["--color-primary", "#DB2777", "", "#db2777"],
      ["--color-surface", "#FFF7FB", "", "#f9a8d4"],
      ["--radius-card", "16px", "", "#64748b"],
      ["--space-4", "changed in Figma · 16 → 20", "new", "#d97706"],
    ],
    button: "Open pull request",
  },
  "pr-evalkit": {
    name: "EvalKit", color: "#0d9488", dark: "#134e4a", glyph: "E",
    hero: ["12 / 13", "prompt tests passing"],
    rows: [
      ["summarize_ticket", "stays under 80 words", "pass", "#16a34a"],
      ["refund_policy", "never promises a refund", "pass", "#16a34a"],
      ["tone_check", "polite when the user is rude", "pass", "#16a34a"],
      ["extract_dates", "missed 'next Tues'", "fail", "#dc2626"],
    ],
    button: "Run again",
  },
  "pr-edgelog": {
    name: "EdgeLog", color: "#ea580c", dark: "#7c2d12", glyph: "E",
    hero: ["status:500", "14 matches · last hour", true],
    rows: [
      ["12:04:31 POST /api/checkout", "KV timeout after 50ms", "500", "#dc2626"],
      ["12:04:29 GET /api/cart", "cold start · 212ms", "200", "#16a34a"],
      ["12:03:58 POST /api/checkout", "KV timeout after 50ms", "500", "#dc2626"],
      ["12:03:12 GET /", "edge cache hit · 4ms", "200", "#16a34a"],
    ],
    button: "Save search",
  },
  "pr-hogchat": {
    name: "HogChat", color: "#f54e00", dark: "#1d1f27", glyph: "🦔",
    hero: ["+18%", "signups this week vs last"],
    rows: [
      ["You", "How many signups this week?", "", "#0f172a"],
      ["HogChat", "1,204, up 18%. Most from the blog.", "", "#f54e00"],
      ["You", "Which post?", "", "#0f172a"],
      ["HogChat", "'Postgres is enough' · 412 signups", "", "#f54e00"],
    ],
    button: "Ask a question",
  },
};

function logo({ color, dark, glyph }) {
  const emoji = /\p{Extended_Pictographic}/u.test(glyph);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs>
  <rect width="256" height="256" fill="url(#g)"/>
  <circle cx="200" cy="56" r="70" fill="#fff" opacity="0.08"/>
  <text x="128" y="${emoji ? 160 : 168}" text-anchor="middle" font-family="${FONT}" font-size="${emoji ? 120 : 136}" font-weight="900" fill="#fff">${esc(glyph)}</text>
</svg>`;
}

// A 390x845 phone screen (9:19.5, same as the frame in ProductProfile.js).
function screenshot({ name, color, dark, hero, rows, button }) {
  const [big, small, mono] = hero;
  const rowSvg = rows
    .map(([title, sub, badge, accent], i) => {
      const y = 330 + i * 92;
      const badgeSvg = badge
        ? `<rect x="${330 - badge.length * 9}" y="${y + 26}" width="${badge.length * 9 + 20}" height="26" rx="13" fill="${accent}" opacity="0.14"/>
    <text x="${340 - badge.length * 4.5}" y="${y + 44}" text-anchor="middle" font-family="${FONT}" font-size="14" font-weight="700" fill="${accent}">${esc(badge)}</text>`
        : "";
      return `<rect x="20" y="${y}" width="350" height="78" rx="16" fill="#fff" stroke="#e5e7eb"/>
    <rect x="36" y="${y + 24}" width="6" height="30" rx="3" fill="${accent}"/>
    <text x="56" y="${y + 34}" font-family="${title.startsWith("--") || mono ? MONO : FONT}" font-size="16" font-weight="700" fill="#0f172a">${esc(title)}</text>
    <text x="56" y="${y + 58}" font-family="${FONT}" font-size="14" fill="#64748b">${esc(sub)}</text>
    ${badgeSvg}`;
    })
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 845" width="390" height="845">
  <rect width="390" height="845" fill="#f8fafc"/>
  <text x="28" y="34" font-family="${FONT}" font-size="15" font-weight="700" fill="#0f172a">9:41</text>
  <rect x="330" y="22" width="30" height="14" rx="4" fill="none" stroke="#0f172a" stroke-width="1.5"/><rect x="333" y="25" width="20" height="8" rx="2" fill="#0f172a"/>
  <rect x="20" y="64" width="40" height="40" rx="10" fill="${color}"/>
  <text x="72" y="92" font-family="${FONT}" font-size="22" font-weight="800" fill="#0f172a">${esc(name)}</text>
  <defs><linearGradient id="h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs>
  <rect x="20" y="130" width="350" height="170" rx="22" fill="url(#h)"/>
  <circle cx="340" cy="150" r="80" fill="#fff" opacity="0.08"/>
  <text x="44" y="215" font-family="${mono ? MONO : FONT}" font-size="${mono ? 34 : 44}" font-weight="900" fill="#fff">${esc(big)}</text>
  <text x="44" y="252" font-family="${FONT}" font-size="16" fill="#fff" opacity="0.85">${esc(small)}</text>
  ${rowSvg}
  <rect x="20" y="725" width="350" height="56" rx="28" fill="${color}"/>
  <text x="195" y="759" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="700" fill="#fff">${esc(button)}</text>
  <rect x="130" y="818" width="130" height="5" rx="2.5" fill="#0f172a"/>
</svg>`;
}

mkdirSync(OUT, { recursive: true });
for (const [id, p] of Object.entries(PRODUCTS)) {
  writeFileSync(new URL(`${id}-logo.svg`, OUT), logo(p));
  writeFileSync(new URL(`${id}-screenshot.svg`, OUT), screenshot(p));
}
console.log(`Wrote ${Object.keys(PRODUCTS).length * 2} files to public/demo/`);
