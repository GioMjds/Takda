# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this directory is

This directory holds **custom Dockerfiles and config files for local services** that the root `docker-compose.yml` wires up. The images themselves are public (`postgres:17-alpine`, `redis:8-alpine`, `axllent/mailpit`), so anything in this folder is overridable behaviour -- init scripts, config tweaks, image customization, or a reverse-proxy config in front of the API.

The repo's `docker-compose.yml` lives at the root and references:

- `docker/postgres/` -- Postgres init scripts (mounted into `/docker-entrypoint-initdb.d/`).
- `docker/redis/` -- Redis server config (mounted into `/usr/local/etc/redis/`).
- `docker/nginx/` -- Nginx reverse-proxy config (used when the API is fronted by Nginx).

The API service itself builds from `api/Dockerfile` (context `./api`), not from here.

## Layout

```folder
docker/
├── postgres/
│   └── init.sql      # Run on first container start; idempotent table/extension setup
├── redis/
│   └── redis.conf    # redis-server config (persistence, maxmemory, etc.)
└── nginx/
    └── nginx.conf    # Reverse-proxy config for the API
```

## Commands

All `docker compose` commands run from the repo root, not from inside this directory.

```bash
# Bring up the infra services only (postgres, redis, mailpit)
docker compose up -d postgres redis mailpit

# Bring up everything including the API container
docker compose up -d

# Tail logs for a single service
docker compose logs -f postgres
docker compose logs -f redis

# Rebuild after editing a Dockerfile or config in this folder
docker compose up -d --build postgres   # rebuilds only what changed
docker compose down -v                  # tear down + remove volumes (destructive)
```

Useful ports:

- Postgres: `5432`
- Redis: `6379`
- Mailpit SMTP: `1025`, web UI: `http://localhost:8025`
- API: `3000`

## Editing rules

- **Keep these files idempotent.** Postgres `init.sql` only runs on first boot of a fresh volume -- if you need schema changes, use Prisma migrations (`api/prisma/`) instead of editing `init.sql`.
- **Config files are mounted read-only** by `docker-compose.yml`. If you change a config, restart the affected container (`docker compose restart redis`) or rebuild it.
- **Don't add new services here without updating `docker-compose.yml` at the repo root.** The compose file is the source of truth for which services exist.
- **Secrets stay in `.env` at the repo root.** Don't hardcode credentials into any file in this directory.

## When to add a file here

- A non-default Postgres extension or role setup the app needs at first boot -> `docker/postgres/init.sql`.
- A Redis tuning change (maxmemory policy, append-only file, etc.) -> `docker/redis/redis.conf`.
- A reverse proxy, TLS termination, or path routing in front of the API -> `docker/nginx/nginx.conf`.

If you need a brand-new service (e.g. a queue dashboard, an object store), add it to `docker-compose.yml` and create a sibling folder in this directory only if you need to override its image's defaults.
