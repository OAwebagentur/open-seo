# PROGRESS — open-seo (OA)

Basis ist <https://github.com/every-app/open-seo> (MIT). `main` bleibt sauber am
Upstream-Stand, alle OA-Anpassungen leben auf dem Branch `oa/features`.

## Remotes

| Remote   | URL                                            | Regel                                                  |
| -------- | ---------------------------------------------- | ------------------------------------------------------ |
| `origin` | `https://github.com/every-app/open-seo.git`    | **Upstream. Nur pullen/fetchen — NIE dorthin pushen.** |
| `oa`     | `https://github.com/OAwebagentur/open-seo.git` | Unser Fork. Hierhin wird gepusht.                      |

`git push` ohne Remote-Angabe kann auf `origin` zeigen — immer `git push oa <branch>`
schreiben, bzw. den Upstream der Branches auf `oa` gesetzt lassen (`-u oa`).

## Branch-Layout

| Branch                        | Inhalt                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `main`                        | sauberer Upstream-Stand, keine OA-Commits                                                        |
| `oa/features`                 | **alle** OA-Anpassungen (Arbeitsbranch, hieraus wird gebaut)                                     |
| `feat/audit-table-pagination` | von `main` abgezweigt, enthaelt **nur** den Pagination-Commit als Vorlage fuer einen Upstream-PR |

Der PR-Text dazu liegt in [`docs/pr-pagination.md`](docs/pr-pagination.md)
(Ziel: `every-app/open-seo` ← `OAwebagentur/open-seo:feat/audit-table-pagination`).
Der **Pull Request ist bewusst NICHT geoeffnet** — Branch und Text liegen bereit,
das Aufmachen entscheidet onur.

## Update-Weg

```
git fetch origin                        # Upstream-Stand holen
git checkout main
git merge --ff-only origin/main         # main bleibt fremd-sauber, nur Fast-Forward
git checkout oa/features
git merge main                          # Upstream in unsere Anpassungen mergen
docker compose up -d --build
```

Niemals `docker compose down -v`, kein `docker volume rm`, kein `docker system prune`:
das Datenvolume `open-seo_open_seo_data` enthaelt die Audit-/Workspace-Daten.

## Build-Pfad

`compose.yaml` baut jetzt aus dem lokalen Checkout (`build:` mit `Dockerfile.selfhost`,
Tag `oa/open-seo:local`), statt `ghcr.io/every-app/open-seo:latest` zu ziehen — nur so
laufen unsere Anpassungen wirklich.
Rueckweg: `OPEN_SEO_IMAGE` setzen und den `build:`-Block auskommentieren.

## Falle: CRLF killt den Container

**Symptom.** Der Container lief in eine Restart-Schleife, im Log nur:

```
docker-entrypoint.sh: 8: set: Illegal option -
```

**Ursache.** Lokal stand `core.autocrlf=true`. Git hat `docker-entrypoint.sh` damit
mit CRLF-Zeilenenden in den Arbeitsbaum ausgecheckt, `COPY` im Dockerfile hat genau
diese Datei ins Image gebacken, und die Shell im Linux-Container stolpert dann ueber
das `\r` am Zeilenende der ersten `set`-Zeile. Am Repo-Inhalt lag es nicht — nur am
Checkout.

**Fix (beides noetig).**

1. `.gitattributes` pinnt `*.sh`, `Dockerfile*` und `docker-entrypoint.sh` auf
   `text eol=lf`, plattformunabhaengig — das schuetzt auch jeden frischen Clone.
2. Lokal `git config core.autocrlf false` gesetzt.

Nach einem Wechsel der Einstellung muss der Arbeitsbaum neu ausgecheckt werden
(z. B. `git rm --cached -r . && git reset --hard`), sonst bleiben die alten CRLF-
Dateien liegen und wandern erneut ins Image.

## Aenderungen auf oa/features

## 2026-08-23

- **Eigener Build-Pfad statt GHCR-Image.** `compose.yaml` baut das Image lokal
  (`Dockerfile.selfhost`) statt das Upstream-Image zu ziehen.
- **Seitenlimit pro Audit fuer self-hosted aufgehoben.** Decke jetzt 1.000.000 Seiten,
  per `OPENSEO_MAX_AUDIT_PAGES` senkbar. Dazu clientseitige Pagination der Pages-/
  Performance-Tabelle und eine schlankere Ergebnis-Payload, damit grosse Audits weder
  den Browser noch die Response sprengen.
- **DataForSEO-Setup-Modal dauerhaft wegklickbar.** Es poppte vorher bei jedem
  Routenwechsel neu auf; der Dismiss wird jetzt in `localStorage` gemerkt
  (`openseo:dataforseo-setup-modal-dismissed`). Der Hinweis-Banner oben bleibt.
- **CRLF-Falle geschlossen.** `.gitattributes` + `core.autocrlf=false`, siehe oben.
