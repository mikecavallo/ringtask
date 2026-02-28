import { motion } from 'framer-motion';
import Hero from './sections/Hero';
import HowItWorks from './sections/HowItWorks';
import Products from './sections/Products';
import MCPIntegration from './sections/MCPIntegration';
import Pricing from './sections/Pricing';
import UseCases from './sections/UseCases';
import Footer from './sections/Footer';
import Nav from './components/Nav';

const fadeUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-100px' },
  transition: { duration: 0.6, ease: 'easeOut' as const },
};

export default function App() {
  return (
    <div className="min-h-screen bg-dark overflow-hidden">
      <Nav />
      <Hero />
      <motion.div {...fadeUp}><HowItWorks /></motion.div>
      <motion.div {...fadeUp}><Products /></motion.div>
      <motion.div {...fadeUp}><MCPIntegration /></motion.div>
      <motion.div {...fadeUp}><Pricing /></motion.div>
      <motion.div {...fadeUp}><UseCases /></motion.div>
      <Footer />
    </div>
  );
}
