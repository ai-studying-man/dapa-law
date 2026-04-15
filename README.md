# dapa-law

`dapa-law` is a Next.js 16 project for building a law-focused web application.  
The repository is currently in its setup phase, with the base App Router project created and `fast-xml-parser` added for future XML-based data ingestion or processing.

## Current Status

- Next.js App Router project initialized
- TypeScript and ESLint configured
- Tailwind CSS v4 included
- `fast-xml-parser` installed
- GitHub repository connected: [ai-studying-man/dapa-law](https://github.com/ai-studying-man/dapa-law)

## Tech Stack

- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS 4
- fast-xml-parser

## Getting Started

Install dependencies if needed:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Project Structure

```text
app/          App Router pages and layouts
public/       Static assets
package.json  Project scripts and dependencies
```

## Notes

- The current homepage still uses the default starter UI from `create-next-app`.
- The site metadata in `app/layout.tsx` is also still set to the default values.
- `fast-xml-parser` is ready to use once XML import or transformation logic is added.

## Next Steps

- Replace the starter homepage with the actual DAPA law service UI
- Update metadata, branding, and content
- Define how legal or policy data will be fetched, parsed, and displayed
- Add the first domain-specific pages and components
