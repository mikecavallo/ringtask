export default function Footer() {
  return (
    <>
      {/* Final CTA */}
      <section id="cta" className="py-32 px-6 relative">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-cyan/5 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="font-heading font-bold text-4xl md:text-6xl text-white mb-6">
            Start Building with{' '}
            <span className="text-cyan glow-cyan">RingTask</span>
          </h2>
          <p className="text-white/40 text-lg mb-10 max-w-xl mx-auto">
            Give your AI agents real phone superpowers. Ship in minutes, not months.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://ringtask.ai"
              className="px-8 py-4 rounded-lg bg-cyan text-dark font-heading font-bold text-lg hover:shadow-[0_0_40px_rgba(0,240,255,0.3)] transition-all"
            >
              Get Your API Key
            </a>
            <a
              href="https://docs.ringtask.ai"
              className="px-8 py-4 rounded-lg border border-white/10 text-white/60 font-heading font-medium text-lg hover:border-white/20 hover:text-white transition-all"
            >
              Read the Docs
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="font-heading font-bold text-lg">
            <span className="text-cyan">Ring</span>
            <span className="text-white">Task</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-white/30">
            <a href="https://docs.ringtask.ai" className="hover:text-white/60 transition-colors">Docs</a>
            <a href="https://github.com/ringtask" className="hover:text-white/60 transition-colors">GitHub</a>
            <a href="https://twitter.com/ringtask" className="hover:text-white/60 transition-colors">Twitter</a>
            <a href="mailto:hello@ringtask.ai" className="hover:text-white/60 transition-colors">Contact</a>
          </div>
          <p className="text-xs text-white/20 font-mono">© 2025 RingTask. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}
