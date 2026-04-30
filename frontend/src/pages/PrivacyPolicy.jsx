import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
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
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
          <p className="text-slate-500 text-sm mb-10">Last updated: February 2026</p>

          <div className="prose prose-slate max-w-none space-y-8">

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">1. Introduction</h2>
              <p className="text-slate-600 leading-relaxed">
                Welcome to Cloogo ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our errand-running platform, including our website and mobile application (collectively, the "Service").
              </p>
              <p className="text-slate-600 leading-relaxed mt-3">
                Please read this policy carefully. If you disagree with its terms, please discontinue use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">2. Information We Collect</h2>
              <h3 className="text-base font-semibold text-slate-700 mb-2">Personal Information You Provide</h3>
              <ul className="list-disc list-inside text-slate-600 space-y-1 ml-2">
                <li>Full name and email address (when creating an account)</li>
                <li>Pickup and delivery addresses (when posting or accepting an errand)</li>
                <li>Payment information (processed securely via Stripe — we do not store card details)</li>
                <li>Profile information including ratings and reviews</li>
                <li>Photos or images you upload for errand items</li>
                <li>Messages sent through our in-app chat</li>
              </ul>

              <h3 className="text-base font-semibold text-slate-700 mb-2 mt-4">Information Collected Automatically</h3>
              <ul className="list-disc list-inside text-slate-600 space-y-1 ml-2">
                <li>Device information (device type, operating system, browser type)</li>
                <li>IP address and approximate location</li>
                <li>Usage data (pages visited, features used, time spent)</li>
                <li>Push notification tokens (for sending app notifications)</li>
                <li>Log data and cookies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">3. How We Use Your Information</h2>
              <p className="text-slate-600 leading-relaxed mb-2">We use the information we collect to:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-1 ml-2">
                <li>Create and manage your account</li>
                <li>Facilitate errand matching between posters and runners</li>
                <li>Process payments and prevent fraud</li>
                <li>Send push notifications and in-app alerts about your errands</li>
                <li>Enable real-time chat between users</li>
                <li>Calculate and display ratings and reviews</li>
                <li>Improve our Service and develop new features</li>
                <li>Comply with legal obligations</li>
                <li>Send service-related communications (account confirmations, updates)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">4. How We Share Your Information</h2>
              <p className="text-slate-600 leading-relaxed mb-2">We may share your information with:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-1 ml-2">
                <li><strong>Other Users:</strong> Your name, rating, and errand details are visible to other users as part of the Service's core functionality.</li>
                <li><strong>Stripe:</strong> Payment information is shared with Stripe for processing. Stripe's privacy policy applies to data they collect.</li>
                <li><strong>Expo (Push Notifications):</strong> Push notification tokens are shared with Expo to deliver notifications to your device.</li>
                <li><strong>Service Providers:</strong> Trusted third parties who assist in operating our platform (hosting, analytics), under confidentiality agreements.</li>
                <li><strong>Legal Requirements:</strong> When required by law, court order, or to protect the rights, property, or safety of Cloogo or others.</li>
              </ul>
              <p className="text-slate-600 leading-relaxed mt-3">
                We do not sell your personal information to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">5. Data Storage & Security</h2>
              <p className="text-slate-600 leading-relaxed">
                Your data is stored in secure cloud databases. We implement industry-standard security measures including encrypted connections (HTTPS/TLS), hashed passwords (bcrypt), and JWT-based authentication. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
              </p>
              <p className="text-slate-600 leading-relaxed mt-3">
                We retain your data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">6. Your Rights & Choices</h2>
              <p className="text-slate-600 leading-relaxed mb-2">Depending on your location, you may have the right to:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-1 ml-2">
                <li><strong>Access</strong> the personal data we hold about you</li>
                <li><strong>Correct</strong> inaccurate or incomplete data</li>
                <li><strong>Delete</strong> your account and personal data</li>
                <li><strong>Opt out</strong> of push notifications at any time via your device settings</li>
                <li><strong>Data portability</strong> — request a copy of your data in a portable format</li>
                <li><strong>Withdraw consent</strong> where processing is based on consent</li>
              </ul>
              <p className="text-slate-600 leading-relaxed mt-3">
                To exercise these rights, contact us at <a href="mailto:privacy@cloogo.app" className="text-emerald-600 hover:underline">privacy@cloogo.app</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">7. Cookies</h2>
              <p className="text-slate-600 leading-relaxed">
                We use essential cookies and local storage to maintain your login session and app preferences. We do not use third-party advertising cookies. You can control cookie behavior through your browser settings, though disabling cookies may affect app functionality.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">8. Children's Privacy</h2>
              <p className="text-slate-600 leading-relaxed">
                Cloogo is not directed to individuals under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has provided us with personal information, please contact us and we will delete it promptly.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">9. Changes to This Policy</h2>
              <p className="text-slate-600 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page with an updated "Last updated" date and, where appropriate, via email or in-app notification. Your continued use of the Service after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">10. Contact Us</h2>
              <p className="text-slate-600 leading-relaxed">
                If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="mt-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-slate-700 font-medium">Cloogo</p>
                <p className="text-slate-600 text-sm mt-1">Email: <a href="mailto:privacy@cloogo.app" className="text-emerald-600 hover:underline">privacy@cloogo.app</a></p>
                <p className="text-slate-600 text-sm">Website: <a href="https://ride-delivery-8.preview.emergentagent.com" className="text-emerald-600 hover:underline">cloogo.app</a></p>
              </div>
            </section>

          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-slate-400 text-sm">
        © {new Date().getFullYear()} Cloogo. All rights reserved.
      </footer>
    </div>
  );
}
