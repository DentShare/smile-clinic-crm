import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { Screenshots } from '@/components/landing/Screenshots';
import { Testimonials } from '@/components/landing/Testimonials';
import { Pricing } from '@/components/landing/Pricing';
import { Footer } from '@/components/landing/Footer';

const Index = () => {
  console.log('[Index] Rendering landing page');
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Features />
      <Screenshots />
      <Testimonials />
      <Pricing />
      <Footer />
    </div>
  );
};

export default Index;
