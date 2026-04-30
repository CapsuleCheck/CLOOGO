import { Link } from 'react-router-dom';
import { Mail, MessageCircle, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const faqs = [
  {
    q: "How do I post an errand?",
    a: "Tap 'Post an Errand', fill in the item details, set your pickup and delivery locations, name your price, and submit. Runners in your area will see it and send offers."
  },
  {
    q: "How do I become a runner?",
    a: "Simply browse the Dashboard for open errands near you. Tap any errand and submit an offer at the posted price or propose your own. Once accepted, you're set to run!"
  },
  {
    q: "How does payment work?",
    a: "Payments are processed securely via Stripe. The poster pays once an offer is accepted. Funds are held until the errand is marked complete."
  },
  {
    q: "Can I negotiate the price?",
    a: "Yes. Runners can counter-propose a different price, and posters can accept, reject, or counter back. Both parties must agree before the errand begins."
  },
  {
    q: "How do I track my errand?",
    a: "Visit 'My Errands' (if you're a poster) or 'My Runs' (if you're a runner) to see real-time status updates. You can also chat directly with the other party."
  },
  {
    q: "What if something goes wrong with my errand?",
    a: "Contact us immediately at support@cloogo.app with your errand ID and a description of the issue. We aim to respond within 24 hours."
  },
  {
    q: "How does the rating system work?",
    a: "After an errand is completed, both the poster and runner can leave a star rating. Ratings build your reputation on the platform."
  },
  {
    q: "How do I delete my account?",
    a: "Email us at support@cloogo.app with the subject 'Account Deletion Request' and your registered email. We'll process it within 5 business days."
  }
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="font-medium text-slate-800 pr-4">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-6 pb-4 text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

export default function Support() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <span className="font-bold text-slate-900 text-lg">Cloogo</span>
          </Link>
          <Link to="/" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
            ← Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">

        {/* Hero */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Support Center</h1>
          <p className="text-slate-500 text-lg">We're here to help. Find answers below or reach out directly.</p>
        </div>

        {/* Contact Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a href="mailto:support@cloogo.app"
            className="bg-white rounded-2xl border border-slate-200 p-6 flex items-start gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Email Support</p>
              <p className="text-sm text-slate-500 mt-0.5">support@cloogo.app</p>
              <p className="text-xs text-slate-400 mt-1">Response within 24 hours</p>
            </div>
          </a>

          <a href="mailto:support@cloogo.app?subject=Live%20Chat%20Request"
            className="bg-white rounded-2xl border border-slate-200 p-6 flex items-start gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Live Chat</p>
              <p className="text-sm text-slate-500 mt-0.5">Chat with our team</p>
              <p className="text-xs text-slate-400 mt-1">Mon – Fri, 9am – 6pm</p>
            </div>
          </a>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-semibold text-slate-900">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((item, i) => <FAQItem key={i} q={item.q} a={item.a} />)}
          </div>
        </div>

        {/* Footer note */}
        <div className="text-center p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
          <p className="text-slate-700 font-medium">Still need help?</p>
          <p className="text-slate-500 text-sm mt-1">
            Email us at{' '}
            <a href="mailto:support@cloogo.app" className="text-emerald-600 hover:underline font-medium">
              support@cloogo.app
            </a>{' '}
            and we'll get back to you as soon as possible.
          </p>
        </div>

      </main>

      <footer className="text-center py-6 text-slate-400 text-sm">
        © 2026 Irhimefe Otuburun. All rights reserved. ·{' '}
        <Link to="/privacy-policy" className="hover:text-emerald-500 transition-colors">Privacy Policy</Link>
      </footer>
    </div>
  );
}
