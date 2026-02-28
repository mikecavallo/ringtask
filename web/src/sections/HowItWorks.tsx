import { motion } from 'framer-motion';

const steps = [
  {
    num: '01',
    title: 'Get a Number',
    desc: 'Provision a real phone number in seconds via MCP or API. US numbers, ready for SMS and voice.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="1.5" strokeLinecap="round">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <line x1="12" y1="18" x2="12" y2="18.01" strokeWidth="2" />
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Send Your Mission',
    desc: 'Tell your agent what to do — make a call, send an SMS, verify an account. Natural language or structured.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff6b35" strokeWidth="1.5" strokeLinecap="round">
        <path d="M22 2L11 13" />
        <path d="M22 2L15 22L11 13L2 9L22 2Z" />
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Get Results',
    desc: 'Receive transcripts, SMS logs, call recordings, and structured data. All via MCP callbacks.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="1.5" strokeLinecap="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-heading font-bold text-4xl md:text-5xl text-center mb-4">
          How It <span className="text-cyan glow-cyan">Works</span>
        </h2>
        <p className="text-white/40 text-center mb-20 text-lg">Three steps. That's it.</p>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative group"
            >
              <div className="p-8 rounded-2xl border border-white/5 bg-white/[0.02] hover:border-cyan/20 transition-all duration-500">
                <div className="flex items-center gap-4 mb-6">
                  <span className="font-mono text-4xl font-bold text-white/10 group-hover:text-cyan/20 transition-colors">
                    {s.num}
                  </span>
                  {s.icon}
                </div>
                <h3 className="font-heading font-bold text-xl text-white mb-3">{s.title}</h3>
                <p className="text-white/40 leading-relaxed">{s.desc}</p>
              </div>
              {/* Connector line */}
              {i < 2 && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 border-t border-dashed border-white/10" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
