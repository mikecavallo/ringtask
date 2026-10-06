import { AUTHOR_URL, README_URL, REPO_URL } from '../links';

export default function Footer() {
  return (
    <>
      <section id="cta" className="py-32 px-6 relative">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-cyan/5 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="font-heading font-bold text-4xl md:text-6xl text-white mb-6">
            Run <span className="text-cyan glow-cyan">RingTask</span> Locally
          </h2>
          <p className="text-white/40 text-lg mb-6 max-w-xl mx-auto">
            Clone the repo and start the MCP server in mock mode. No accounts or API keys needed.
          </p>
          <pre className="inline-block text-left text-sm font-mono text-white/60 bg-[#111] border border-white/5 rounded-xl px-6 py-4 mb-10 overflow-x-auto max-w-full">
            <code>{'npm install\nnpm run build\nRINGTASK_MOCK=1 node dist/mcp-server.js'}</code>
          </pre>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={REPO_URL}
              className="px-8 py-4 rounded-lg bg-cyan text-dark font-heading font-bold text-lg hover:shadow-[0_0_40px_rgba(0,240,255,0.3)] transition-all"
            >
              View on GitHub
            </a>
            <a
              href={README_URL}
              className="px-8 py-4 rounded-lg border border-white/10 text-white/60 font-heading font-medium text-lg hover:border-white/20 hover:text-white transition-all"
            >
              Read the README
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="font-heading font-bold text-lg">
            <span className="text-cyan">Ring</span>
            <span className="text-white">Task</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-white/30">
            <a href={REPO_URL} className="hover:text-white/60 transition-colors">GitHub</a>
            <a href={README_URL} className="hover:text-white/60 transition-colors">Docs</a>
          </div>
          <p className="text-xs text-white/20 font-mono">
            Open-source project by <a href={AUTHOR_URL} className="hover:text-white/50">Mike Cavallo</a>
          </p>
        </div>
      </footer>
    </>
  );
}
