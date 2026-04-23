const endpoints = [
  {
    path: "/api/search",
    description: "Search live National Law Information categories.",
  },
  {
    path: "/api/detail",
    description: "Fetch live detail text for a selected result.",
  },
  {
    path: "/api/openapi",
    description: "Import this URL into ChatGPT Actions.",
  },
  {
    path: "/api/health",
    description: "Check deployment and API-key status.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-950 px-6 py-12 text-stone-100">
      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        <section className="rounded-3xl border border-stone-800 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_32%),linear-gradient(180deg,_rgba(28,25,23,0.98),_rgba(12,10,9,1))] p-8 shadow-2xl shadow-black/30">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-300">
            DAPA Law Wrapper
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-white">
            Vercel wrapper API for selected National Law Information categories
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-stone-300">
            This deployment is meant for ChatGPT Actions. It exposes only the
            categories approved for DAPA use and forwards live requests to the
            National Law Information OPEN API.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {endpoints.map((endpoint) => (
            <article
              key={endpoint.path}
              className="rounded-2xl border border-stone-800 bg-stone-900/70 p-6"
            >
              <code className="text-sm text-amber-300">{endpoint.path}</code>
              <p className="mt-3 text-sm leading-6 text-stone-300">
                {endpoint.description}
              </p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6 text-sm leading-7 text-stone-300">
          Recommended next step: deploy to Vercel, set `LAW_API_KEY`, then use
          `https://your-domain/api/openapi` as the ChatGPT Actions schema URL.
        </section>
      </div>
    </main>
  );
}
