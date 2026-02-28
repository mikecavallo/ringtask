import { motion } from 'framer-motion';

function SoundWave() {
  const bars = 32;
  return (
    <div className="flex items-center justify-center gap-[3px] h-32 md:h-48">
      {Array.from({ length: bars }).map((_, i) => {
        const delay = i * 0.08;
        const height = 20 + Math.sin(i * 0.5) * 60;
        return (
          <motion.div
            key={i}
            className="w-[3px] md:w-[4px] rounded-full"
            style={{
              background: `linear-gradient(180deg, #00f0ff ${30 + i * 2}%, #ff6b35)`,
              opacity: 0.6 + Math.sin(i * 0.3) * 0.4,
            }}
            animate={{
              height: [height * 0.3, height, height * 0.5, height * 0.8, height * 0.3],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: 'easeInOut',
              delay,
            }}
          />
        );
      })}
    </div>
  );
}

function PulsingPhone() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Pulse rings */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-cyan/30"
          style={{ width: 120 + i * 60, height: 120 + i * 60 }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.5 }}
        />
      ))}
      {/* Phone icon */}
      <div className="relative z-10 w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan/20 to-orange/20 border border-cyan/30 flex items-center justify-center">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="1.5" strokeLinecap="round">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
        </svg>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-cyan/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-orange/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan/20 bg-cyan/5 text-cyan text-sm font-medium mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-cyan animate-pulse" />
          MCP-Native Phone Infrastructure
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="font-heading font-bold text-5xl md:text-7xl lg:text-8xl tracking-tight leading-[0.95] mb-6"
        >
          <span className="text-white">AI Agents.</span>
          <br />
          <span className="text-cyan glow-cyan">Real Phone Calls.</span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Temp phone numbers for AI agents. Voice missions that make real calls.
          <br className="hidden md:block" />
          Pay with <span className="text-orange">SOL</span> or Stripe. Ship in minutes via <span className="text-cyan">MCP</span>.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <a
            href="#cta"
            className="px-8 py-3.5 rounded-lg bg-cyan text-dark font-heading font-bold text-lg hover:bg-cyan/90 transition-all hover:shadow-[0_0_30px_rgba(0,240,255,0.3)]"
          >
            Start Building
          </a>
          <a
            href="#how"
            className="px-8 py-3.5 rounded-lg border border-white/10 text-white/70 font-heading font-medium text-lg hover:border-white/20 hover:text-white transition-all"
          >
            See How It Works
          </a>
        </motion.div>

        {/* Animated elements */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <div className="flex items-center justify-center gap-8 md:gap-12 mb-6">
            <PulsingPhone />
            <SoundWave />
            <PulsingPhone />
          </div>
          <p className="text-xs text-white/20 font-mono tracking-widest uppercase">
            ━━━ active call ━━━ transmitting ━━━
          </p>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-dark to-transparent" />
    </section>
  );
}
