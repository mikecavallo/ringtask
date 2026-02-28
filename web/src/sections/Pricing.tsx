import { motion } from 'framer-motion';

const tiers = [
  {
    name: 'Starter',
    price: '$10',
    credits: '100 credits',
    features: ['5 phone numbers', '100 SMS', '10 voice missions', 'MCP access', 'Community support'],
    accent: false,
  },
  {
    name: 'Builder',
    price: '$49',
    credits: '600 credits',
    features: ['25 phone numbers', '600 SMS', '60 voice missions', 'Priority MCP', 'Webhooks', 'Email support'],
    accent: true,
  },
  {
    name: 'Scale',
    price: '$199',
    credits: '3,000 credits',
    features: ['Unlimited numbers', 'Unlimited SMS', '300 voice missions', 'Dedicated support', 'Custom voices', 'SLA'],
    accent: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-heading font-bold text-4xl md:text-5xl text-center mb-4">
          Simple <span className="text-orange glow-orange">Pricing</span>
        </h2>
        <p className="text-white/40 text-center mb-6 text-lg">Credit-based. No surprises.</p>
        <div className="flex items-center justify-center gap-3 mb-20">
          <span className="text-xs font-mono px-3 py-1 rounded-full border border-cyan/20 text-cyan/60 bg-cyan/5">
            SOL / USDC
          </span>
          <span className="text-xs font-mono px-3 py-1 rounded-full border border-white/10 text-white/40 bg-white/[0.02]">
            Stripe
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative p-8 rounded-2xl border transition-all duration-500 ${
                t.accent
                  ? 'border-cyan/30 bg-cyan/[0.03] box-glow-cyan'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/10'
              }`}
            >
              {t.accent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-mono px-3 py-1 rounded-full bg-cyan text-dark font-bold">
                  POPULAR
                </span>
              )}
              <h3 className="font-heading font-bold text-xl text-white mb-1">{t.name}</h3>
              <p className="text-white/30 text-sm mb-6">{t.credits}</p>
              <div className="mb-8">
                <span className="font-heading font-bold text-5xl text-white">{t.price}</span>
                <span className="text-white/30 ml-1">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-white/50 text-sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t.accent ? '#00f0ff' : '#555'} strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={`w-full py-3 rounded-lg font-heading font-bold text-sm transition-all ${
                  t.accent
                    ? 'bg-cyan text-dark hover:shadow-[0_0_30px_rgba(0,240,255,0.3)]'
                    : 'border border-white/10 text-white/60 hover:border-white/20 hover:text-white'
                }`}
              >
                Get Started
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
