import type { MetadataRoute } from 'next';

// Explicit allow-list for AI crawlers. Most respect robots.txt strictly;
// without an explicit Allow line some will skip the site entirely or
// crawl conservatively. The AEO play needs them in.
const aiCrawlers = [
  'GPTBot',           // OpenAI training crawler
  'ChatGPT-User',     // ChatGPT user-agent (browsing tool)
  'OAI-SearchBot',    // SearchGPT crawler
  'ClaudeBot',        // Anthropic's training crawler
  'anthropic-ai',     // Legacy Anthropic UA
  'Claude-Web',       // Claude.ai web tool
  'PerplexityBot',    // Perplexity AI crawler
  'Perplexity-User',  // Perplexity user-agent (live citation)
  'Google-Extended',  // Gemini / Bard training opt-in token (separate from Googlebot)
  'CCBot',            // Common Crawl (feeds many LLM training pipelines)
  'cohere-ai',        // Cohere
  'YouBot',           // You.com
  'Applebot-Extended',// Apple Intelligence training opt-in
  'Bytespider',       // ByteDance / TikTok
  'Diffbot',          // General LLM-adjacent crawler
  'FacebookBot',      // Meta AI training
  'Meta-ExternalAgent', // Meta AI external agent
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Catch-all default: traditional search engines and any unlisted bot.
      {
        userAgent: '*',
        allow: '/',
      },
      // Explicit allow for AI crawlers. Each gets its own rule block so
      // a future tightening (e.g. disallow training but allow citation)
      // is a small surgical edit, not a rewrite.
      ...aiCrawlers.map((ua) => ({
        userAgent: ua,
        allow: '/',
      })),
    ],
    sitemap: 'https://adlint.dev/sitemap.xml',
  };
}
