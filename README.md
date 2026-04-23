# dapa-law

Next.js/Vercel proxy for GPTs Actions that searches DAPA law catalogs and retrieves live text from the Korean National Law Information OPEN API.

## Data

- `data/dapa-defense-laws.json`: 25 DAPA defense-law entries from the DAPA website.
- `data/dapa-admin-rules.json`: 2,587 DAPA administrative-rule rows, plus 1,754 latest unique titles.

Refresh administrative rules:

```bash
npm run catalog:admin-rules
```

## API

- `GET /api/catalog`: Search the local DAPA catalog.
- `GET /api/search`: Search the local catalog and, unless `catalog_only=true`, proxy `lawSearch.do`.
- `GET /api/detail`: Resolve a catalog item and proxy `lawService.do`; optionally pass `article=10` or `article=제10조`.
- `GET /api/openapi`: OpenAPI 3.1 schema for GPTs Actions import.
- `GET /api/health`: Health and catalog summary.

## Environment

Set this on Vercel:

```bash
LAW_API_KEY=your-national-law-open-api-oc
```

Alternative name:

```bash
LAW_API_OC=your-national-law-open-api-oc
```

Optional:

```bash
LAW_API_BASE=https://www.law.go.kr/DRF
```

## GPTs Actions

Deploy to Vercel, then import this schema URL in GPTs Actions:

```text
https://your-vercel-domain.vercel.app/api/openapi
```

Recommended lookup flow:

1. Call `/api/catalog` to narrow to DAPA defense laws or administrative rules.
2. Call `/api/detail` with `query` and optional `article` for live law text.
3. Use `/api/search` when broader National Law Information search results are needed.

## Local Checks

```bash
npm run lint
npm run build
```
