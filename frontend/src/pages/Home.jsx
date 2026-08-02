import React from 'react'
import { Link } from 'react-router-dom'

export default function Home() {
  const highlights = [
    { title: 'Verified uploads', detail: 'Keep proof documents secure and audited.' },
    { title: 'Live request flow', detail: 'Hospitals publish needs in minutes.' },
    { title: 'Donor readiness', detail: 'Maintain an always-on registry.' }
  ]

  const roles = [
    { title: 'Admins', detail: 'Control access, oversight, and reporting.', route: '/admin/dashboard' },
    { title: 'Hospitals', detail: 'Manage requests, uploads, and inventory.', route: '/hospitals' },
    { title: 'Donors', detail: 'Update availability and receive requests.', route: '/user' }
  ]

  const steps = [
    { title: 'Register', detail: 'Add donors and verify contact details.' },
    { title: 'Request', detail: 'Hospitals create urgent blood requests.' },
    { title: 'Validate', detail: 'Admins review uploads and approve flows.' }
  ]

  return (
    <div className="space-y-16">
      <section className="landing-hero p-8 md:p-12 reveal">
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white">
              Blood response command center
            </span>
            <h1 className="text-4xl md:text-5xl font-bold">Coordinate donors, hospitals, and requests in minutes.</h1>
            <p className="text-white/90 text-base md:text-lg max-w-xl">
              Bloodate keeps every request visible, every upload verified, and every donor reachable with a single, secure workflow.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/login" className="btn-inverse">Login</Link>
              <a href="#how" className="btn-ghost">See how it works</a>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 text-xs text-white/80">
              <div className="hero-card">
                <div className="text-sm font-semibold text-white">90 sec</div>
                <div>Average request publish time</div>
              </div>
              <div className="hero-card">
                <div className="text-sm font-semibold text-white">3x</div>
                <div>Faster validation turnaround</div>
              </div>
              <div className="hero-card">
                <div className="text-sm font-semibold text-white">24/7</div>
                <div>Always-on donor registry</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="hero-card reveal" style={{ animationDelay: '120ms' }}>
              <div className="text-xs uppercase tracking-widest text-white/70">Live feed</div>
              <div className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>Urgent request</span>
                  <span className="font-semibold">O- • 3 units</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Hospital network</span>
                  <span className="font-semibold">18 active sites</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Verified donors</span>
                  <span className="font-semibold">3,240 profiles</span>
                </div>
              </div>
            </div>
            <div className="hero-card reveal" style={{ animationDelay: '220ms' }}>
              <div className="text-xs uppercase tracking-widest text-white/70">Secure uploads</div>
              <div className="mt-2 text-sm">All proofs are encrypted, logged, and ready for review.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {highlights.map((item, index) => (
          <div key={item.title} className="panel p-6 reveal" style={{ animationDelay: `${index * 120}ms` }}>
            <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Capability</div>
            <h3 className="text-lg font-semibold mt-2">{item.title}</h3>
            <p className="text-sm text-slate-500 mt-2">{item.detail}</p>
          </div>
        ))}
      </section>

      {/* Workspaces section removed per request */}

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] items-start" id="how">
        <div className="panel p-8">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">How it works</div>
          <h2 className="text-2xl font-bold mt-2">One flow from donor to delivery</h2>
          <p className="text-sm text-slate-500 mt-2">Every action is tracked, approved, and visible across the network.</p>
          <div className="mt-6 grid gap-4">
            {steps.map((step, index) => (
              <div key={step.title} className="flex gap-4 items-start reveal" style={{ animationDelay: `${index * 140}ms` }}>
                <div className="h-9 w-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-sm font-semibold">
                  {index + 1}
                </div>
                <div>
                  <div className="text-sm font-semibold">{step.title}</div>
                  <div className="text-sm text-slate-500">{step.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-8 reveal" style={{ animationDelay: '140ms' }}>
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Readiness</div>
          <h3 className="text-xl font-semibold mt-2">Always know who is ready.</h3>
          <p className="text-sm text-slate-500 mt-2">
            Bloodate keeps donor availability, hospital inventory, and verification status in sync so teams can act fast.
          </p>
          <div className="mt-6 grid gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Pending requests</span>
              <span className="font-semibold">12</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Uploads awaiting review</span>
              <span className="font-semibold">5</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Hospitals online</span>
              <span className="font-semibold">18</span>
            </div>
          </div>
        </div>
      </section>

      <section className="panel p-8 text-center reveal" style={{ animationDelay: '180ms' }}>
        <h2 className="text-2xl font-bold">Ready to coordinate your next response?</h2>
        <p className="text-sm text-slate-500 mt-2">Login once and move to the right workspace instantly.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link to="/login" className="btn-primary">Login</Link>
        </div>
      </section>
    </div>
  )
}
