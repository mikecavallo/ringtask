import { motion } from 'framer-motion';

const cases = [
  { title: 'Appointment Booking', desc: 'An agent calls a clinic or salon to book a slot, then reports the confirmed time.' },
  { title: 'Customer Callbacks', desc: 'Return missed calls with context from your CRM and log the outcome.' },
  { title: 'Rescheduling', desc: 'Call the office to move an appointment and confirm the new time by SMS.' },
  { title: 'Appointment Reminders', desc: 'Text reminders from a dedicated number and read replies like "confirm" or "cancel".' },
  { title: 'Order Follow-ups', desc: 'Ask a supplier for an order status and get a structured summary back.' },
  { title: 'Two-way SMS Support', desc: 'Give a support agent its own number to answer customer texts.' },
];

export default function UseCases() {
  return (
    <section id="usecases" className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="font-heading font-bold text-4xl md:text-5xl text-center mb-4">
          Use <span className="text-cyan glow-cyan">Cases</span>
        </h2>
        <p className="text-white/40 text-center mb-20 text-lg">Everyday phone tasks for legitimate AI agents.</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:border-cyan/20 transition-colors"
            >
              <span className="font-mono text-sm text-cyan/50 mb-4 block">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="font-heading font-bold text-lg text-white mb-2">{c.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
