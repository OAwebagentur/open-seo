# PROGRESS — open-seo (OA)

Dieses Repo ist ein direkter **Klon** von <https://github.com/every-app/open-seo> (MIT), **kein Fork**.
`main` bleibt sauber am Upstream-Stand, alle OA-Anpassungen leben auf dem Branch `oa/features`.

## Update-Weg

```
git checkout main
git pull                      # Upstream-Stand holen, main bleibt unveraendert-fremd
git checkout oa/features
git merge main                # Upstream in unsere Anpassungen mergen
docker compose build && docker compose up -d
```

Niemals `docker compose down -v`, kein `docker volume rm`, kein `docker system prune`:
das Datenvolume `open-seo_open_seo_data` enthaelt die Audit-/Workspace-Daten.

## Build-Pfad

`compose.yaml` baut jetzt aus dem lokalen Checkout (`build:` mit `Dockerfile.selfhost`,
Tag `oa/open-seo:local`), statt `ghcr.io/every-app/open-seo:latest` zu ziehen — nur so
laufen unsere Anpassungen wirklich.
Rueckweg: `OPEN_SEO_IMAGE` setzen und den `build:`-Block auskommentieren.

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
