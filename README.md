# Schulferien Card

Custom Lovelace Card für Home Assistant – zeigt Status, 14-Tage-Vorschau und die nächsten Termine des [Schulferien & Feiertage Manager Add-ons](https://github.com/Melle79/HA-schulferien_feiertage).

[![In HACS öffnen](https://img.shields.io/badge/HACS-Repository_in_Home_Assistant_öffnen-41BDF5?logo=home-assistant&logoColor=white&style=for-the-badge)](https://my.home-assistant.io/redirect/hacs_repository/?owner=Melle79&repository=HA-schulferien-card&category=plugin)

**Funktionen:**
- Status-Badges: Heute/Morgen schulfrei, Heute/Morgen Feiertag
- 14-Tage-Streifen: Ferien (gelb), Feiertage (blau), Wochenenden (grau), heute umrandet
- Nächster Feiertag und nächste Schulferien mit Datum und „in X Tagen", laufende Ferien werden hervorgehoben
- Unterstützt alle Modi des Add-ons: einzelne Entitäten, „Nur Feiertage" und kombinierte Entität, inkl. Suffix
- Passt sich automatisch dem Home-Assistant-Theme an (hell/dunkel)

## Voraussetzungen

- [Schulferien & Feiertage Manager](https://github.com/Melle79/HA-schulferien_feiertage) Add-on **ab Version 1.2.0** (liefert das `vorschau`-Attribut für den Tagesstreifen)

## Installation

### Über HACS (empfohlen)

Entweder den Badge oben anklicken (öffnet das Repository direkt in HACS auf deiner HA-Instanz) – oder manuell:

1. HACS → ⋮ (oben rechts) → **Benutzerdefinierte Repositories** → URL `https://github.com/Melle79/HA-schulferien-card`, Typ **Dashboard** → hinzufügen
2. „Schulferien Card" installieren – HACS trägt die Ressource automatisch ein
3. Browser-Cache leeren (Strg/Cmd+Shift+R)

### Manuell

1. [`dist/schulferien-card.js`](dist/schulferien-card.js) nach `/config/www/` kopieren
2. *Einstellungen → Dashboards → ⋮ → Ressourcen* → `/local/schulferien-card.js` als **JavaScript-Modul** hinzufügen
3. Browser-Cache leeren

## Konfiguration

```yaml
type: custom:schulferien-card
title: Schulferien Bayern
prefix: schulferien_bayern
```

| Option | Pflicht | Standard | Beschreibung |
|---|---|---|---|
| `prefix` | ✅ | – | Entity-ID-Präfix der Region, z. B. `schulferien_bayern` oder `feiertage_bayern` |
| `title` | – | (leer) | Überschrift der Karte |
| `suffix` | – | (leer) | Suffix, falls beim Anlegen der Region vergeben (z. B. `kinder`) |
| `show_strip` | – | `true` | 14-Tage-Streifen anzeigen |

Der `prefix` ist der Teil der Entity-IDs vor dem Entitätsnamen – einfach aus der Infobox „Entitäten" im Add-on ablesen: `binary_sensor.schulferien_bayern_heute_schulfrei` → `schulferien_bayern`.

**Beispiele für die anderen Modi:**

```yaml
# Region im Modus "Nur Feiertage"
type: custom:schulferien-card
title: Feiertage Bayern
prefix: feiertage_bayern
```

```yaml
# Region mit kombinierter Entität und Suffix "kinder"
type: custom:schulferien-card
title: Schulferien (Kinder)
prefix: schulferien_bayern
suffix: kinder
```

## Haftungsausschluss

Dieser Code wurde **vollständig mit KI erstellt**. Die Nutzung erfolgt auf eigene Gefahr – **jegliche Haftung ist ausgeschlossen** (MIT-Lizenz). Es findet **kein Support** statt.
