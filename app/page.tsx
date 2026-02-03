'use client';

import { useState } from 'react';
import Link from 'next/link';
import { tools, categories, type ToolConfig, type ToolCategory } from '@/lib/tools';

const cardColorMap: Record<string, { bar: string; badge: string; badgeText: string }> = {
  blue:    { bar: 'bg-blue-500',    badge: 'bg-blue-100',    badgeText: 'text-blue-700' },
  emerald: { bar: 'bg-emerald-500', badge: 'bg-emerald-100', badgeText: 'text-emerald-700' },
  violet:  { bar: 'bg-violet-500',  badge: 'bg-violet-100',  badgeText: 'text-violet-700' },
  amber:   { bar: 'bg-amber-500',   badge: 'bg-amber-100',   badgeText: 'text-amber-700' },
  pink:    { bar: 'bg-pink-500',    badge: 'bg-pink-100',    badgeText: 'text-pink-700' },
};

function ToolCard({ tool }: { tool: ToolConfig }) {
  const colors = cardColorMap[tool.color] ?? cardColorMap.blue;

  const card = (
    <div
      className={`group relative bg-white rounded-xl border border-gray-200 overflow-hidden transition-all ${
        tool.enabled
          ? 'hover:shadow-lg hover:border-gray-300 cursor-pointer'
          : 'opacity-60 cursor-default'
      }`}
    >
      {/* Color bar */}
      <div className={`h-1.5 ${colors.bar}`} />

      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <span className="text-3xl">{tool.icon}</span>
          {!tool.enabled && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
              Coming Soon
            </span>
          )}
          {tool.enabled && tool.checkCount > 0 && (
            <span className={`text-xs ${colors.badge} ${colors.badgeText} px-2 py-0.5 rounded-full font-medium`}>
              {tool.checkCount} checks
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-1">{tool.name}</h3>
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{tool.description}</p>

        {tool.enabled && (
          <div className="flex items-center text-sm font-medium text-gray-400 group-hover:text-gray-900 transition-colors">
            Open tool
            <span className="ml-1 group-hover:translate-x-1 transition-transform" aria-hidden="true">
              &rarr;
            </span>
          </div>
        )}
      </div>
    </div>
  );

  if (!tool.enabled) return card;

  return (
    <Link href={`/tools/${tool.slug}`} className="block">
      {card}
    </Link>
  );
}

export default function Home() {
  const [filter, setFilter] = useState<'all' | ToolCategory>('all');

  const filtered = filter === 'all' ? tools : tools.filter((t) => t.category === filter);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600">AdLint</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              Free
            </span>
          </div>
          <p className="text-sm text-gray-500 hidden sm:block">
            Ad Tracking Audit Tools
          </p>
        </div>
      </header>

      {/* Hero */}
      <div className="container mx-auto px-4 pt-16 pb-10 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 leading-tight">
          Professional Ad Tracking Audits
          <br />
          <span className="text-blue-600">100% Free, 100% Private</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-2">
          Pick a tool below to audit your tracking setup. All processing happens
          in your browser &mdash; your data never leaves your machine.
        </p>
      </div>

      {/* Filter Pills */}
      <div className="container mx-auto px-4 max-w-4xl mb-8">
        <div className="flex justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setFilter(cat.key as 'all' | ToolCategory)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                filter === cat.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tool Grid */}
      <div className="container mx-auto px-4 max-w-4xl pb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-12">
            No tools in this category yet.
          </p>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6">
        <div className="container mx-auto px-4 text-center text-xs text-gray-400">
          AdLint &mdash; Free Google Ads + GTM Auditor. All processing happens in your browser.
        </div>
      </footer>
    </main>
  );
}
