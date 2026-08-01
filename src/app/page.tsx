import { SiteHeader } from '@/components/site-header'
import { Hero } from '@/components/hero'
import { ModulesShowcase } from '@/components/modules-showcase'
import { Features } from '@/components/features'
import { Pricing } from '@/components/pricing'
import { TrustStats } from '@/components/trust-stats'
import { SiteFooter } from '@/components/site-footer'

export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <ModulesShowcase />
        <TrustStats />
        <Features />
        <Pricing />
      </main>
      <SiteFooter />
    </div>
  )
}
