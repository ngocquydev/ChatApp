interface JsonLdProps {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}

/**
 * Component injects JSON-LD Structured Data (Schema.org)
 * Tối ưu hóa SEO (Search Engine Optimization) và GEO (Generative Engine Optimization) cho các AI Search Engines
 * (Google Search, Bing Copilot, ChatGPT Search, Perplexity AI, Claude...)
 */
export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data),
      }}
    />
  );
}

