import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | DAPA Law GPT Proxy",
  description:
    "Privacy policy for the DAPA Law GPT Proxy service used with ChatGPT Actions.",
};

const sections = [
  {
    title: "1. Service Overview",
    body: [
      "DAPA Law GPT Proxy is a service that helps users search and retrieve legal information related to the Defense Acquisition Program Administration (DAPA).",
      "The service uses catalog data collected from the DAPA website and may call the Korean National Law Information OPEN API in real time.",
    ],
  },
  {
    title: "2. Data We Process",
    body: [
      "We may process the text that users submit, such as law names, rule names, article numbers, and search queries.",
      "We do not require account registration or direct submission of personally identifying profile information to use this service.",
    ],
  },
  {
    title: "3. How Data Is Used",
    body: [
      "User input is used only to search the local DAPA catalog and to request legal information from the Korean National Law Information OPEN API.",
      "The service is intended for legal-information lookup and response generation inside ChatGPT Actions.",
    ],
  },
  {
    title: "4. Third-Party Services",
    body: [
      "This service may send search terms and lookup parameters to the Korean National Law Information OPEN API operated through law.go.kr.",
      "The service is deployed on Vercel, which may generate standard hosting, networking, and access logs as part of normal platform operation.",
    ],
  },
  {
    title: "5. Data Retention",
    body: [
      "This service does not intentionally store a separate user database of submitted searches.",
      "Operational logs may be retained for limited periods by the hosting platform or connected infrastructure according to their standard policies.",
    ],
  },
  {
    title: "6. Sensitive Information",
    body: [
      "Users should not submit unnecessary personal data, confidential information, or sensitive information through this service.",
      "Only information necessary to search laws, administrative rules, and articles should be entered.",
    ],
  },
  {
    title: "7. Changes",
    body: [
      "This privacy policy may be updated if the service scope, integrations, or data-processing behavior changes.",
      "The latest version will be published on this page.",
    ],
  },
  {
    title: "8. Contact",
    body: [
      "For questions about this service or this privacy policy, please contact the operator through the repository or service channel where this tool is managed.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-12 text-slate-900">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 rounded-[2rem] border border-slate-200 bg-white px-6 py-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)] sm:px-10 sm:py-12">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
            DAPA Law GPT Proxy
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            Effective date: April 23, 2026. This page describes how the DAPA
            Law GPT Proxy handles user input when used through ChatGPT Actions
            and related API routes.
          </p>
        </div>

        <div className="grid gap-6">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5 sm:px-6"
            >
              <h2 className="text-lg font-semibold tracking-tight">
                {section.title}
              </h2>
              <div className="mt-3 flex flex-col gap-3 text-sm leading-7 text-slate-700 sm:text-base">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="rounded-3xl bg-slate-900 px-5 py-5 text-sm leading-7 text-slate-200 sm:px-6 sm:text-base">
          <p>
            This service is designed for public-law information lookup. Do not
            enter sensitive personal data unless it is strictly necessary for
            your own lawful use.
          </p>
        </div>
      </div>
    </main>
  );
}
