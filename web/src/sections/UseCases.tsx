import { motion } from 'framer-motion';

const cases = [
  { title: 'Book a Restaurant', emoji: '🍽️', desc: 'AI calls, reserves a table, confirms details.' },
  { title: 'Verify an Account', emoji: '🔐', desc: 'Get a number, receive OTP, pass verification.' },
  { title: 'Mystery Shop', emoji: '🕵️', desc: 'Send an AI to evaluate customer service quality.' },
  { title: 'Reschedule Appointments', emoji: '📅', desc: 'AI calls the office and moves your appointment.' },
  { title: 'Prank Your Friend', emoji: '😈', desc: 'Send a hilarious AI caller with a custom script.' },
  { title: 'Test a Phone Tree', emoji: '🌳', desc: 'Navigate IVR systems and map out menu options.' },
];

export default function UseCases() {
  return (
    <section id="usecases" className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-heading font-bold text-4xl md:text-5xl text-center mb-4">
          Use <span className="text-cyan glow-cyan">Cases</span>
        </h2>
        <p className="text-white/40 text-center mb-20 text-lg">What will your agent do?</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.03, borderColor: 'rgba(0,240,255,0.2)' }}
              className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] cursor-default transition-colors"
            >
              <span className="text-3xl mb-4 block">{c.emoji}</span>
              <h3 className="font-heading font-bold text-lg text-white mb-2">{c.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
