# Deploy skryptu kontenera (Hetzner)

Kod: `deploy/update-container.test.mjs`  
Standard: [docs/test-cases/README.md](../README.md)

Logika zestawu: obraz Dockera buduje się z klona repo; sekrety zostają w
`--env-file`, nie w skrypcie.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| deploy-001 | high | Rebuild z env-file, bez sekretów w skrypcie |

### deploy-001 — Rebuild z env-file, bez sekretów w skrypcie

- **Kod:** `deploy/update-container.test.mjs` → `rebuilds the named image from the clone root and keeps secrets in env-file`
- **Krytyczność:** high
- **Logika:** CD na VPS nie może wklejać kluczy do `docker build`; musi podmienić kontener z `/opt/evabot/api/.env`.
- **Wejście:** treść `deploy/update-container.sh`
- **Wyjście:** `docker build` + `docker run --env-file` na porcie 3000; brak `password` / kluczy API w pliku
