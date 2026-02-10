import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { Screenshots } from '@/components/landing/Screenshots';
import { Testimonials } from '@/components/landing/Testimonials';
import { Pricing } from '@/components/landing/Pricing';
import { Footer } from '@/components/landing/Footer';
import { ChatWidget } from '@/components/chat/ChatWidget';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const [clinicInfo, setClinicInfo] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    // Load first active clinic for demo; in production, resolve by subdomain
    supabase
      .from('clinics')
      .select('id, name')
      .eq('is_active', true)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setClinicInfo({ id: data.id, name: data.name });
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Features />
      <Screenshots />
      <Testimonials />
      <Pricing />
      <Footer />
      {clinicInfo && (
        <ChatWidget clinicId={clinicInfo.id} clinicName={clinicInfo.name} />
      )}
    </div>
  );
};

export default Index;
