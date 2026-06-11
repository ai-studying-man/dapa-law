# dapa-law

Next.js and Vercel wrapper API for ChatGPT Actions using the Korean National Law Information OPEN API.

## Scope

This wrapper only exposes the categories requested for DAPA use:

- `law`: current law, backed by upstream `eflaw`
- `admrul`: administrative rules
- `ordin`: local ordinances
- `prec`: precedents
- `detc`: Constitutional Court decisions
- `expc`: legal interpretations
- `decc`: administrative appeal decisions
- `trty`: treaties
- `lstrm`: legal terms
- `law_appendix`, `admrul_appendix`, `ordin_appendix`: appendix and form catalogs

The DAPA defense-law catalog mirrors the homepage sections:

- `방위사업 관련`
- `계약관련`
- `예산관련`
- `군수, 물품 관련`

Excluded on purpose:

- mobile APIs
- committee decisions
- custom category feeds
- central-agency interpretation feeds such as DAPA-specific ministry endpoints
- other guide-list categories outside the selected scope

## API

- `GET /api/search`
  - Live search across allowed categories
  - Use `category=auto` to search the main text categories
- `GET /api/detail`
  - Live detail lookup for non-appendix categories
  - Optional `article=10` or `article=제10조`
- `GET /api/openapi`
  - OpenAPI 3.1 schema for ChatGPT Actions import
- `GET /api/health`
  - Health check
- `GET /api/catalog`
  - DAPA defense law and administrative rule catalog from Supabase, with local JSON fallback
  - Supports `source`, `section`, `type`, `query`, and `limit`

## Environment

Set one of these on Vercel:

```bash
LAW_API_KEY=your-national-law-open-api-oc
```

or

```bash
LAW_API_OC=your-national-law-open-api-oc
```

Optional override:

```bash
LAW_API_BASE=https://www.law.go.kr/DRF
```

Optional Supabase catalog:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Use `SUPABASE_SERVICE_ROLE_KEY` only on the server side in Vercel environment
variables. The catalog stores only DAPA law and administrative-rule titles,
categories, source URLs, and lookup metadata. Statute and rule body text should
continue to come from the National Law Information API at request time.

## Supabase Catalog Setup

1. Run `supabase/catalog-schema.sql` in the Supabase SQL editor.
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel.
3. Sync the DAPA catalog:

```bash
npm run catalog:defense-laws
npm run catalog:sync:supabase
```

For production, schedule the sync daily or every 6 hours with Vercel Cron,
GitHub Actions, or another trusted server job.

## Deploy On Vercel

1. Import this repo into Vercel.
2. Set `LAW_API_KEY` in Project Settings > Environment Variables.
3. Deploy.
4. Use the deployed schema URL in ChatGPT Actions:

```text
https://your-vercel-domain.vercel.app/api/openapi
```

## Suggested ChatGPT Actions Flow

1. For DAPA homepage lists, call `/api/catalog` with `source=defense_laws` and optional `section`.
2. Call `/api/search` with `query` and optional `category`.
3. Pick the best result from `upstream.items`.
4. Call `/api/detail` with `query` or direct `id`.
5. For statutes, pass `article` when only one article is needed.

## GPT Instructions

Use [gpt-instructions.md](C:/Users/com/Desktop/law/dapa-law/docs/gpt-instructions.md) as the source text for the GPT Builder instructions field.

- The schema URL for Actions is still `https://your-vercel-domain.vercel.app/api/openapi`.
- The instructions file is separate from the schema and controls how the GPT chooses and presents action calls.

## Local Checks

```bash
npm run lint
npm run build
```
