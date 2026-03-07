import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, Package, Users, DollarSign, CheckCircle, Star } from 'lucide-react';

const HERO_IMG = "https://images.unsplash.com/photo-1646920912229-bc0d5d94e68b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzZ8MHwxfHNlYXJjaHwyfHxwZXJzb24lMjBob2xkaW5nJTIwZGVsaXZlcnklMjBwYWNrYWdlJTIwY291cmllcnxlbnwwfHx8fDE3NzI4NDM2NTJ8MA&ixlib=rb-4.1.0&q=85";

const steps = [
  {
    icon: Package,
    title: "Post Your Errand",
    desc: "Describe what you need picked up, set neighborhoods, and name your price.",
    color: "bg-emerald-50",
    iconColor: "text-emerald-600",
    num: "01"
  },
  {
    icon: Users,
    title: "Runners Offer",
    desc: "Neighbors heading your way see your errand and offer to run it — at your price or with a counter.",
    color: "bg-amber-50",
    iconColor: "text-amber-600",
    num: "02"
  },
  {
    icon: DollarSign,
    title: "Agree & Pay",
    desc: "Accept the best offer, pay securely, then chat in real-time until delivery.",
    color: "bg-blue-50",
    iconColor: "text-blue-600",
    num: "03"
  }
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white font-['Inter']">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-slate-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-slate-900 text-xl font-['Manrope']">ErrandGo</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth" data-testid="landing-login-btn"
              className="text-slate-600 font-medium text-sm hover:text-emerald-600 transition-colors px-4 py-2">
              Sign In
            </Link>
            <Link to="/auth" data-testid="landing-signup-btn"
              className="rounded-full bg-emerald-600 px-5 py-2.5 text-white text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 hover:-translate-y-0.5">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24 bg-gradient-to-b from-emerald-50/50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 animate-slide-up stagger-1">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Neighborhood Errands
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight font-['Manrope'] leading-[1.05]">
              Neighbors helping<br />
              <span className="text-emerald-600">neighbors</span>
            </h1>
            <p className="mt-6 text-lg text-slate-500 leading-relaxed max-w-lg">
              Post what you need picked up. Someone heading that way will grab it for you — and earn a little on the side.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link to="/auth" data-testid="landing-post-errand-btn"
                className="rounded-full bg-emerald-600 px-8 py-4 text-white font-bold text-base hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 hover:-translate-y-0.5 flex items-center gap-2 justify-center">
                Post an Errand <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/auth" data-testid="landing-run-errands-btn"
                className="rounded-full bg-white border border-slate-200 px-8 py-4 text-slate-900 font-bold text-base hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                Run Errands & Earn
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-6">
              <div className="flex -space-x-2">
                {['A','B','C','D'].map((l, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-xs font-bold text-emerald-700">{l}</div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Trusted by 500+ neighbors</p>
              </div>
            </div>
          </div>
          <div className="lg:col-span-6 relative animate-slide-up stagger-2">
            <div className="relative rounded-3xl overflow-hidden shadow-[0_20px_60px_-12px_rgba(0,0,0,0.15)]">
              <img src={HERO_IMG} alt="Delivery person" className="w-full h-[420px] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent" />
            </div>
            {/* Floating card */}
            <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl p-4 border border-slate-100 max-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Package className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900">Grocery Pickup</p>
                  <p className="text-xs text-slate-500">Riverside → Oak St</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-100">$8.00</span>
                <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-md">3 offers</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-2">Simple process</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 font-['Manrope'] tracking-tight">How ErrandGo works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step) => (
              <div key={step.num} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className={`w-12 h-12 rounded-xl ${step.color} flex items-center justify-center`}>
                    <step.icon className={`w-6 h-6 ${step.iconColor}`} />
                  </div>
                  <span className="text-4xl font-extrabold text-slate-100 font-['Manrope']">{step.num}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 font-['Manrope'] mb-2">{step.title}</h3>
                <p className="text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-2">Why ErrandGo</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 font-['Manrope'] tracking-tight mb-6">
                Your neighborhood,<br />better connected
              </h2>
              <div className="space-y-4">
                {[
                  "Agree on price before anything starts",
                  "Real-time chat keeps you in the loop",
                  "Secure Stripe payments — no cash needed",
                  "Earn extra income on your daily commute"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <span className="text-slate-600">{item}</span>
                  </div>
                ))}
              </div>
              <Link to="/auth" data-testid="landing-join-btn"
                className="mt-8 inline-flex rounded-full bg-emerald-600 px-8 py-3.5 text-white font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 hover:-translate-y-0.5">
                Join the Community
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <p className="text-4xl font-extrabold text-emerald-600 font-['Manrope']">500+</p>
                <p className="text-slate-500 text-sm mt-1">Errands completed</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <p className="text-4xl font-extrabold text-emerald-600 font-['Manrope']">4.9</p>
                <p className="text-slate-500 text-sm mt-1">Average rating</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm col-span-2">
                <p className="text-4xl font-extrabold text-slate-900 font-['Manrope']">$15K+</p>
                <p className="text-slate-500 text-sm mt-1">Earned by runners in the community</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 bg-emerald-600">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white font-['Manrope'] tracking-tight">
            Ready to get started?
          </h2>
          <p className="mt-4 text-emerald-100 text-lg">
            Join hundreds of neighbors already using ErrandGo.
          </p>
          <Link to="/auth" data-testid="landing-footer-cta-btn"
            className="mt-8 inline-flex rounded-full bg-white px-10 py-4 text-emerald-700 font-extrabold text-lg hover:bg-emerald-50 transition-all shadow-xl hover:-translate-y-0.5">
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-extrabold text-white text-lg font-['Manrope']">ErrandGo</span>
          </div>
          <p className="text-slate-400 text-sm">© 2025 ErrandGo. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
