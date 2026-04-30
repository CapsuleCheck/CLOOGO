import { Link } from 'react-router-dom';

export default function Terms() {
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

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 md:p-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Terms of Service</h1>
          <p className="text-slate-500 text-sm mb-10">Last updated: February 2026</p>

          <div className="space-y-8">

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">1. Acceptance of Terms</h2>
              <p className="text-slate-600 leading-relaxed">
                By accessing or using Cloogo ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. Cloogo is owned and operated by Irhimefe Otuburun ("we," "us," or "our").
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">2. Description of Service</h2>
              <p className="text-slate-600 leading-relaxed">
                Cloogo is a platform that connects individuals who need errands completed ("Posters") with individuals willing to complete those errands for compensation ("Runners"). We act as an intermediary and are not a party to any agreement between Posters and Runners.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">3. Eligibility</h2>
              <ul className="list-disc list-inside text-slate-600 space-y-1 ml-2">
                <li>You must be at least 18 years of age to use this Service.</li>
                <li>You must provide accurate and complete registration information.</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                <li>One person may not maintain more than one active account.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">4. User Conduct</h2>
              <p className="text-slate-600 leading-relaxed mb-2">You agree not to:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-1 ml-2">
                <li>Post illegal, harmful, or fraudulent errands</li>
                <li>Harass, threaten, or abuse other users</li>
                <li>Provide false information about yourself or your errands</li>
                <li>Circumvent the platform's payment system to pay Runners outside Cloogo</li>
                <li>Use the Service for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to any portion of the Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">5. Payments & Fees</h2>
              <p className="text-slate-600 leading-relaxed">
                All payments between Posters and Runners are processed through Stripe, our third-party payment processor. By using payment features, you agree to Stripe's Terms of Service. Cloogo may charge a service fee on transactions. All fees are displayed clearly before any payment is confirmed. Payments are non-refundable unless otherwise agreed.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">6. Errand Completion & Disputes</h2>
              <p className="text-slate-600 leading-relaxed">
                Runners are independent contractors, not employees of Cloogo. We are not responsible for the quality, timeliness, or completion of any errand. Disputes between Posters and Runners should be resolved between the parties directly. Cloogo may, at its sole discretion, mediate disputes but has no obligation to do so.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">7. Ratings & Reviews</h2>
              <p className="text-slate-600 leading-relaxed">
                Users may leave ratings and feedback after errand completion. Ratings must be honest and based on actual experience. Fake, manipulated, or retaliatory reviews are prohibited and may result in account suspension.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">8. Content & Intellectual Property</h2>
              <p className="text-slate-600 leading-relaxed">
                You retain ownership of content you upload (photos, descriptions). By posting content, you grant Cloogo a non-exclusive, royalty-free license to display and use that content to provide the Service. All Cloogo branding, code, and design are owned exclusively by Irhimefe Otuburun.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">9. Termination</h2>
              <p className="text-slate-600 leading-relaxed">
                We reserve the right to suspend or terminate your account at any time, with or without cause, if we determine you have violated these Terms. You may delete your account at any time through the Profile page. Upon termination, all your data will be permanently removed from our systems.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">10. Disclaimer of Warranties</h2>
              <p className="text-slate-600 leading-relaxed">
                The Service is provided "as is" and "as available" without warranties of any kind. We do not guarantee uninterrupted, error-free operation of the Service. To the fullest extent permitted by law, Cloogo disclaims all express, implied, and statutory warranties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">11. Limitation of Liability</h2>
              <p className="text-slate-600 leading-relaxed">
                To the maximum extent permitted by law, Cloogo shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of, or inability to use, the Service, including any damages arising from errand transactions between users.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">12. Governing Law</h2>
              <p className="text-slate-600 leading-relaxed">
                These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">13. Changes to Terms</h2>
              <p className="text-slate-600 leading-relaxed">
                We may update these Terms at any time. Continued use of the Service after changes constitutes your acceptance of the updated Terms. Material changes will be communicated via in-app notification or email.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">14. Contact</h2>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-slate-700 font-medium">Cloogo</p>
                <p className="text-slate-600 text-sm mt-1">Email: <a href="mailto:legal@cloogo.app" className="text-emerald-600 hover:underline">legal@cloogo.app</a></p>
                <p className="text-slate-600 text-sm">Support: <Link to="/support" className="text-emerald-600 hover:underline">cloogo.app/support</Link></p>
              </div>
            </section>

          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-slate-400 text-sm">
        © 2026 Irhimefe Otuburun. All rights reserved. ·{' '}
        <Link to="/privacy-policy" className="hover:text-emerald-500 transition-colors">Privacy Policy</Link>
        {' '}·{' '}
        <Link to="/support" className="hover:text-emerald-500 transition-colors">Support</Link>
      </footer>
    </div>
  );
}
