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
  - Local DAPA catalog helper kept from the earlier project version

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

## Deploy On Vercel

1. Import this repo into Vercel.
2. Set `LAW_API_KEY` in Project Settings > Environment Variables.
3. Deploy.
4. Use the deployed schema URL in ChatGPT Actions:

```text
https://your-vercel-domain.vercel.app/api/openapi
```

## Suggested ChatGPT Actions Flow

1. Call `/api/search` with `query` and optional `category`.
2. Pick the best result from `upstream.items`.
3. Call `/api/detail` with `query` or direct `id`.
4. For statutes, pass `article` when only one article is needed.

## GPT Instructions

Use [gpt-instructions.md](C:/Users/com/Desktop/law/dapa-law/docs/gpt-instructions.md) as the source text for the GPT Builder instructions field.

- The schema URL for Actions is still `https://your-vercel-domain.vercel.app/api/openapi`.
- The instructions file is separate from the schema and controls how the GPT chooses and presents action calls.

## Local Checks

```bash
npm run lint
npm run build
```
