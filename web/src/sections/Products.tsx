import { motion } from 'framer-motion';

const products = [
  {
    title: 'Phone Numbers',
    tagline: 'Give your agent a real phone number',
    color: 'cyan',
    features: [
      'Provision US numbers instantly',
      'Send & receive SMS programmatically',
      'Account verification & OTP capture',
      'Temp or persistent — you choose',
      'Webhook or MCP callbacks',
    ],
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" strokeWidth="1.2" strokeLinecap="round">
        <rect x="5" y="2" width="14" height="20" rx="2" stroke="#00f0ff" />
        <line x1="9" y1="7" x2="15" y2="7" stroke="#00f0ff" opacity="0.5" />
        <line x1="9" y1="10" x2="13" y2="10" stroke="#00f0ff" opacity="0.3" />
        <circle cx="12" cy="18" r="1" fill="#00f0ff" />
      </svg>
    ),
  },
  {
    title: 'Voice Missions',
    tagline: 'Send an AI on a phone call',
    color: 'orange',
    features: [
      'Describe the mission in plain English',
      'AI makes the call autonomously',
      'Real-time transcripts & recordings',
      'Multiple voice styles & personas',
      'Structured results & summaries',
    ],
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" strokeWidth="1.2" strokeLinecap="round">
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke="#ff6b35" />
        <path d="M19 10v2a7 7 0 01-14 0v-2" stroke="#ff6b35" />
        <line x1="12" y1="19" x2="12" y2="23" stroke="#ff6b35" />
        <line x1="8" y1="23" x2="16" y2="23" stroke="#ff6b35" opacity="0.5" />
      </svg>
    ),
  },
];

export default function Products() {
  return (
    <section id="products" className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-heading font-bold text-4xl md:text-5xl text-center mb-4">
          Two <span className="text-orange glow-orange">Products</span>
        </h2>
        <p className="text-white/40 text-center mb-20 text-lg">One platform. Complete phone infrastructure for AI.</p>

        <div className="grid md:grid-cols-2 gap-8">
          {products.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, x: i === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className={`relative p-8 md:p-10 rounded-2xl border ${
                p.color === 'cyan'
                  ? 'border-cyan/10 hover:border-cyan/30 box-glow-cyan'
                  : 'border-orange/10 hover:border-orange/30 box-glow-orange'
              } bg-white/[0.02] transition-all duration-500 group`}
            >
              <div className="mb-6">{p.icon}</div>
              <h3 className="font-heading font-bold text-2xl md:text-3xl text-white mb-2">{p.title}</h3>
              <p className={`text-lg mb-8 ${p.color === 'cyan' ? 'text-cyan/70' : 'text-orange/70'}`}>
                {p.tagline}
              </p>
              <ul className="space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-white/50">
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      p.color === 'cyan' ? 'bg-cyan' : 'bg-orange'
                    }`} />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
