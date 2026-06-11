/* Schulferien-Card – Lovelace Custom Card für den Schulferien & Feiertage Manager
 *
 * Minimale Konfiguration:
 *   type: custom:schulferien-card
 *   prefix: schulferien_bayern
 *
 * Alle Optionen sind über den visuellen Editor einstellbar.
 */
const CARD_VERSION = "1.2.0";
console.info(`%c SCHULFERIEN-CARD %c v${CARD_VERSION} `,
  "color:#1a1408;background:#e8a23d;font-weight:700", "color:#e8a23d;background:#1f2630");

const ENTITY_KEYS = [
  "naechste_schulferien", "naechster_feiertag",
  "heute_schulfrei", "morgen_schulfrei",
  "heute_feiertag", "morgen_feiertag", "status",
];

/* Alle vom Add-on angelegten Regionen aus den Entitäten ableiten. */
function detectRegions(hass) {
  const found = new Map();
  for (const eid of Object.keys(hass.states)) {
    const m = eid.match(/^(?:sensor|binary_sensor)\.((?:schulferien|feiertage)_.+)$/);
    if (!m) continue;
    const oid = m[1];
    for (const key of ENTITY_KEYS) {
      const idx = oid.indexOf(`_${key}`);
      if (idx > 0) {
        const prefix = oid.slice(0, idx);
        const rest = oid.slice(idx + key.length + 1);
        const suffix = rest.startsWith("_") ? rest.slice(1) : "";
        found.set(`${prefix}|${suffix}`, { prefix, suffix });
        break;
      }
    }
  }
  return [...found.values()].sort((a, b) => a.prefix.localeCompare(b.prefix));
}

const DEFAULTS = {
  show_badges: true,
  badge_heute_schulfrei: "Badge: Heute schulfrei",
  badge_morgen_schulfrei: "Badge: Morgen schulfrei",
  badge_heute_feiertag: "Badge: Heute Feiertag",
  badge_morgen_feiertag: "Badge: Morgen Feiertag",
  show_strip: true,
  strip_days: 14,
  show_feiertag: true,
  show_ferien: true,
  suffix: "",
};

class SchulferienCard extends HTMLElement {
  setConfig(config) {
    if (!config.prefix) {
      throw new Error('Bitte "prefix" angeben oder im visuellen Editor eine Region wählen.');
    }
    this._config = { ...DEFAULTS, ...config };
    this._fp = null;
  }

  set hass(hass) {
    this._hass = hass;
    const fp = JSON.stringify(this._relevant());
    if (fp !== this._fp) {
      this._fp = fp;
      this._render();
    }
  }

  _id(key) {
    const sfx = this._config.suffix ? `_${this._config.suffix}` : "";
    return `${this._config.prefix}_${key}${sfx}`;
  }

  _st(domain, key) {
    return this._hass.states[`${domain}.${this._id(key)}`] || null;
  }

  _relevant() {
    const ids = [
      ["binary_sensor", "heute_schulfrei"], ["binary_sensor", "morgen_schulfrei"],
      ["binary_sensor", "heute_feiertag"], ["binary_sensor", "morgen_feiertag"],
      ["sensor", "naechster_feiertag"], ["sensor", "naechste_schulferien"],
      ["sensor", "status"],
    ];
    return [this._config, ...ids.map(([d, k]) => {
      const s = this._st(d, k);
      return s ? [s.state, s.attributes] : null;
    })];
  }

  _fmt(iso) {
    if (!iso) return "–";
    return new Date(iso + "T00:00:00").toLocaleDateString("de-DE",
      { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  _in(n) {
    if (n === null || n === undefined) return "";
    return n === 0 ? "heute" : n === 1 ? "morgen" : `in ${n} Tagen`;
  }

  _badge(label, st, holidayStyle) {
    if (!st) return "";
    const on = st.state === "on";
    const why = st.attributes.grund || st.attributes.name || "";
    return `<div class="badge ${on ? (holidayStyle ? "on ft" : "on") : ""}" title="${why}">
      ${label}: <b>${on ? "Ja" : "Nein"}</b></div>`;
  }

  _render() {
    if (!this._hass || !this._config) return;
    const c = this._config;

    const hs = this._st("binary_sensor", "heute_schulfrei");
    const ms = this._st("binary_sensor", "morgen_schulfrei");
    const hf = this._st("binary_sensor", "heute_feiertag");
    const mf = this._st("binary_sensor", "morgen_feiertag");
    const nf = this._st("sensor", "naechster_feiertag");
    const ns = this._st("sensor", "naechste_schulferien");
    const combined = this._st("sensor", "status");

    if (!hs && !hf && !combined) {
      this.innerHTML = `<ha-card><div class="sfc-wrap">
        Keine Entitäten mit Präfix <code>${c.prefix}</code> gefunden.<br>
        Region im visuellen Editor wählen oder Präfix aus der Infobox „Entitäten"
        im Add-on übernehmen (z. B. <code>schulferien_bayern</code>).</div></ha-card>`;
      return;
    }

    const a = combined ? combined.attributes : {};
    const days = Math.max(3, Math.min(14, Number(c.strip_days) || 14));
    const strip = ((nf?.attributes.vorschau) || a.vorschau || []).slice(0, days);
    const nextFt = nf
      ? { name: nf.state !== "unknown" ? nf.state : null, datum: nf.attributes.datum, in: nf.attributes.in_tagen }
      : { name: a.naechster_feiertag, datum: a.naechster_feiertag_datum, in: a.naechster_feiertag_in_tagen };
    const nextFe = ns
      ? { name: ns.state !== "unknown" ? ns.state : null, beginn: ns.attributes.beginn,
          ende: ns.attributes.ende, in: ns.attributes.in_tagen, aktuell: ns.attributes.aktuell_ferien }
      : { name: a.naechste_schulferien, beginn: a.schulferien_beginn,
          ende: a.schulferien_ende, in: a.schulferien_in_tagen, aktuell: a.aktuell_ferien };

    const bf = {
      hs: c.show_badges !== false && c.badge_heute_schulfrei !== false,
      ms: c.show_badges !== false && c.badge_morgen_schulfrei !== false,
      hf: c.show_badges !== false && c.badge_heute_feiertag !== false,
      mf: c.show_badges !== false && c.badge_morgen_feiertag !== false,
    };
    const badgeItems = combined
      ? ((bf.hs || bf.ms || bf.hf || bf.mf)
          ? [`<div class="badge ${["Ferien", "Feiertag", "Wochenende"].includes(combined.state) ? "on" : ""}">
               Heute: <b>${combined.state}</b></div>`]
          : [])
      : [
          bf.hs ? this._badge("Heute schulfrei", hs, false) : "",
          bf.ms ? this._badge("Morgen schulfrei", ms, false) : "",
          bf.hf ? this._badge("Heute Feiertag", hf, true) : "",
          bf.mf ? this._badge("Morgen Feiertag", mf, true) : "",
        ];
    const badgesJoined = badgeItems.join("");
    const badges = badgesJoined ? `<div class="badges">${badgesJoined}</div>` : "";

    const stripHtml = c.show_strip && strip.length ? `
      <div class="strip">${strip.map((d, i) => `
        <div class="d ${d.status} ${i === 0 ? "today" : ""}"
             title="${d.weekday} ${this._fmt(d.date)} – ${d.status}">
          <div class="box"></div><span>${d.weekday}<br>${d.day}.</span>
        </div>`).join("")}
      </div>
      <div class="legend">
        <span><i class="lg-ferien"></i>Ferien</span>
        <span><i class="lg-feiertag"></i>Feiertag</span>
        <span><i class="lg-we"></i>Wochenende</span>
      </div>` : "";

    const rows = [];
    if (c.show_ferien && nextFe.aktuell) {
      rows.push(`<div class="row live"><span class="ico">🏖️</span>
        <span class="nm">${nextFe.aktuell}</span><span class="when">läuft gerade</span></div>`);
    }
    if (c.show_feiertag && nextFt.name) {
      rows.push(`<div class="row"><span class="ico">★</span>
        <span class="nm">${nextFt.name} <small>${this._fmt(nextFt.datum)}</small></span>
        <span class="when">${this._in(nextFt.in)}</span></div>`);
    }
    if (c.show_ferien && nextFe.name) {
      rows.push(`<div class="row"><span class="ico">🏖️</span>
        <span class="nm">${nextFe.name} <small>${this._fmt(nextFe.beginn)} – ${this._fmt(nextFe.ende)}</small></span>
        <span class="when">${this._in(nextFe.in)}</span></div>`);
    }
    const rowsHtml = (c.show_feiertag || c.show_ferien)
      ? `<div class="rows">${rows.join("") || "<small>Keine anstehenden Termine.</small>"}</div>`
      : "";

    this.innerHTML = `
      <ha-card ${c.title ? `header="${c.title}"` : ""}>
        <div class="sfc-wrap">
          ${badges}
          ${stripHtml}
          ${rowsHtml}
        </div>
      </ha-card>
      <style>
        .sfc-wrap{padding:0 16px 16px;display:flex;flex-direction:column;gap:12px}
        ha-card:not([header]) .sfc-wrap{padding-top:16px}
        .badges{display:flex;flex-wrap:wrap;gap:6px}
        .badge{font-size:.8rem;border-radius:8px;padding:4px 10px;
          background:var(--secondary-background-color);color:var(--secondary-text-color);
          border:1px solid var(--divider-color)}
        .badge.on{color:var(--success-color,#4cc38a);border-color:var(--success-color,#4cc38a);
          background:rgba(76,195,138,.12)}
        .badge.on.ft{color:#7aa2ff;border-color:#7aa2ff;background:rgba(122,162,255,.12)}
        .strip{display:flex;gap:3px}
        .strip .d{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;
          font-size:.62rem;line-height:1.15;text-align:center;color:var(--secondary-text-color);min-width:0}
        .strip .box{width:100%;height:20px;border-radius:5px;
          background:var(--secondary-background-color);border:1px solid var(--divider-color)}
        .strip .d.today .box{outline:2px solid var(--primary-text-color);outline-offset:1px}
        .strip .d.ferien .box{background:rgba(232,162,61,.55);border-color:#e8a23d}
        .strip .d.feiertag .box{background:rgba(122,162,255,.6);border-color:#7aa2ff}
        .strip .d.wochenende .box{background:rgba(138,148,163,.25)}
        .legend{display:flex;gap:12px;font-size:.68rem;color:var(--secondary-text-color);margin-top:-6px}
        .legend i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:4px}
        .lg-ferien{background:#e8a23d}.lg-feiertag{background:#7aa2ff}.lg-we{background:rgba(138,148,163,.45)}
        .rows{display:flex;flex-direction:column;gap:6px}
        .row{display:flex;gap:8px;align-items:baseline;font-size:.9rem}
        .row .ico{width:18px;text-align:center;flex:none}
        .row .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .row .nm small{color:var(--secondary-text-color)}
        .row .when{margin-left:auto;color:var(--secondary-text-color);white-space:nowrap;font-size:.82rem}
        .row.live .nm{color:var(--success-color,#4cc38a)}
      </style>`;
  }

  getCardSize() { return 4; }

  static getConfigElement() {
    return document.createElement("schulferien-card-editor");
  }

  static getStubConfig(hass) {
    const first = hass ? detectRegions(hass)[0] : null;
    const stub = { prefix: first ? first.prefix : "schulferien_bayern" };
    if (first && first.suffix) stub.suffix = first.suffix;
    return stub;
  }
}

/* ------------------------------- Visueller Editor ------------------------------- */

const EDITOR_LABELS = {
  region: "Region (vom Add-on angelegt)",
  title: "Titel",
  badge_heute_schulfrei: "Badge: Heute schulfrei",
  badge_morgen_schulfrei: "Badge: Morgen schulfrei",
  badge_heute_feiertag: "Badge: Heute Feiertag",
  badge_morgen_feiertag: "Badge: Morgen Feiertag",
  show_strip: "Tages-Streifen anzeigen",
  strip_days: "Tage im Streifen",
  show_feiertag: "Nächsten Feiertag anzeigen",
  show_ferien: "Nächste Schulferien anzeigen",
};

class SchulferienCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...DEFAULTS, ...config };
    this._update();
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
  }

  _update() {
    if (!this._hass || !this._config) return;

    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => EDITOR_LABELS[s.name] || s.name;
      this._form.addEventListener("value-changed", (ev) => {
        const v = ev.detail.value || {};
        const [prefix, suffix = ""] = String(v.region || "").split("|");
        const config = { type: "custom:schulferien-card", prefix: prefix || this._config.prefix };
        if (suffix) config.suffix = suffix;
        if (v.title) config.title = v.title;
        if (v.badge_heute_schulfrei === false) config.badge_heute_schulfrei = false;
        if (v.badge_morgen_schulfrei === false) config.badge_morgen_schulfrei = false;
        if (v.badge_heute_feiertag === false) config.badge_heute_feiertag = false;
        if (v.badge_morgen_feiertag === false) config.badge_morgen_feiertag = false;
        if (v.show_strip === false) config.show_strip = false;
        if (v.show_feiertag === false) config.show_feiertag = false;
        if (v.show_ferien === false) config.show_ferien = false;
        if (v.strip_days && Number(v.strip_days) !== 14) config.strip_days = Number(v.strip_days);
        this._config = { ...DEFAULTS, ...config };
        this.dispatchEvent(new CustomEvent("config-changed",
          { detail: { config }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }

    const regions = detectRegions(this._hass);
    const options = regions.map((r) => ({
      value: `${r.prefix}|${r.suffix}`,
      label: r.prefix.replace(/^(schulferien|feiertage)_/, (m, p) =>
        (p === "feiertage" ? "Feiertage: " : "Schulferien: ")) + (r.suffix ? ` (Suffix: ${r.suffix})` : ""),
    }));
    const current = `${this._config.prefix || ""}|${this._config.suffix || ""}`;
    if (this._config.prefix && !options.some((o) => o.value === current)) {
      options.push({ value: current, label: `${this._config.prefix} (Entitäten nicht gefunden)` });
    }

    this._form.hass = this._hass;
    this._form.schema = [
      { name: "region", selector: { select: { mode: "dropdown", options } } },
      { name: "title", selector: { text: {} } },
      { name: "", type: "grid", schema: [
        { name: "badge_heute_schulfrei", selector: { boolean: {} } },
        { name: "badge_morgen_schulfrei", selector: { boolean: {} } },
        { name: "badge_heute_feiertag", selector: { boolean: {} } },
        { name: "badge_morgen_feiertag", selector: { boolean: {} } },
      ] },
      { name: "show_strip", selector: { boolean: {} } },
      { name: "strip_days", selector: { number: { min: 3, max: 14, step: 1, mode: "slider" } } },
      { name: "show_feiertag", selector: { boolean: {} } },
      { name: "show_ferien", selector: { boolean: {} } },
    ];
    this._form.data = {
      region: current,
      title: this._config.title || "",
      badge_heute_schulfrei: this._config.badge_heute_schulfrei !== false,
      badge_morgen_schulfrei: this._config.badge_morgen_schulfrei !== false,
      badge_heute_feiertag: this._config.badge_heute_feiertag !== false,
      badge_morgen_feiertag: this._config.badge_morgen_feiertag !== false,
      show_strip: this._config.show_strip !== false,
      strip_days: Number(this._config.strip_days) || 14,
      show_feiertag: this._config.show_feiertag !== false,
      show_ferien: this._config.show_ferien !== false,
    };
  }
}

customElements.define("schulferien-card", SchulferienCard);
customElements.define("schulferien-card-editor", SchulferienCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "schulferien-card",
  name: "Schulferien Card",
  description: "Status, Tages-Vorschau und nächste Termine des Schulferien & Feiertage Managers",
  preview: true,
});
