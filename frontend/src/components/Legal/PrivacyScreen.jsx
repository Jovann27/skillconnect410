import React from 'react';

const PrivacyScreen = () => {
  return (
    <div className="max-w-2xl mx-auto p-5 bg-gray-50 min-h-screen">
      <div className="text-center mb-8 p-5 bg-white rounded-xl shadow-lg">
        <h1 className="text-gray-800 text-4xl mb-3 font-bold">Privacy Policy</h1>
        <p className="text-gray-600 text-sm m-0 italic">Last updated: November 2025</p>
      </div>

      <div className="bg-white rounded-xl p-8 shadow-lg mb-5">
        <section className="mb-8">
          <h2 className="text-pink-600 text-xl mb-4 font-semibold border-b-2 border-gray-100 pb-2">1. Information We Collect</h2>
          <p className="text-gray-700 leading-relaxed mb-4 text-base">We collect information you provide directly to us, such as when you:</p>
          <ul className="my-4 pl-6">
            <li className="text-gray-700 leading-relaxed mb-2 text-sm">Create an account or use our services</li>
            <li className="text-gray-700 leading-relaxed mb-2 text-sm">Make a purchase or place an order</li>
            <li className="text-gray-700 leading-relaxed mb-2 text-sm">Contact us for support</li>
            <li className="text-gray-700 leading-relaxed mb-2 text-sm">Participate in surveys or promotions</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mb-4 text-base">This information may include:</p>
          <ul className="my-4 pl-6">
            <li className="text-gray-700 leading-relaxed mb-2 text-sm">Name, email address, phone number</li>
            <li className="text-gray-700 leading-relaxed mb-2 text-sm">Profile information and preferences</li>
            <li className="text-gray-700 leading-relaxed mb-2 text-sm">Location data (with your permission)</li>
            <li className="text-gray-700 leading-relaxed mb-2 text-sm">Payment information</li>
            <li className="text-gray-700 leading-relaxed mb-2 text-sm">Communications with us</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-pink-600 text-xl mb-4 font-semibold border-b-2 border-gray-100 pb-2">2. How We Use Your Information</h2>
          <p className="text-gray-700 leading-relaxed mb-4 text-base">We use the information we collect to:</p>
          <ul className="my-4 pl-6">
            <li className="text-gray-700 leading-relaxed mb-2 text-sm">Provide, maintain, and improve our services</li>
            <li className="text-gray-700 leading-relaxed mb-2 text-sm">Process transactions and send related information</li>
            <li className="text-gray-700 leading-relaxed mb-2 text-sm">Send you technical notices and support messages</li>
            <li className="text-gray-700 leading-relaxed mb-2 text-sm">Communicate with you about products, services, and promotions</li>
            <li className="text-gray-700 leading-relaxed mb-2 text-sm">Monitor and analyze trends and usage</li>
            <li className="text-gray-700 leading-relaxed mb-2 text-sm">Detect, investigate, and prevent fraudulent transactions</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-pink-600 text-xl mb-4 font-semibold border-b-2 border-gray-100 pb-2">3. Information Sharing</h2>
          <p className="text-gray-700 leading-relaxed mb-4 text-base">We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy:</p>
          <ul className="my-4 pl-6">
            <li className="text-gray-700 leading-relaxed mb-2 text-sm"><strong className="text-gray-800 font-semibold">Service Providers:</strong> We may share information with service providers who assist us in operating our platform</li>
            <li className="text-gray-700 leading-relaxed mb-2 text-sm"><strong className="text-gray-800 font-semibold">Legal Requirements:</strong> We may disclose information if required by law or to protect our rights</li>
            <li className="text-gray-700 leading-relaxed mb-2 text-sm"><strong className="text-gray-800 font-semibold">Business Transfers:</strong> In the event of a merger or acquisition, your information may be transferred</li>
            <li className="text-gray-700 leading-relaxed mb-2 text-sm"><strong className="text-gray-800 font-semibold">With Your Consent:</strong> We may share information with your explicit consent</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-pink-600 text-xl mb-4 font-semibold border-b-2 border-gray-100 pb-2">4. Data Security</h2>
          <p className="text-gray-700 leading-relaxed mb-4 text-base">
            We implement appropriate security measures to protect your personal information against
            unauthorized access, alteration, disclosure, or destruction. However, no method of
            transmission over the internet is 100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-pink-600 text-xl mb-4 font-semibold border-b-2 border-gray-100 pb-2">5. Location Information</h2>
          <p className="text-gray-700 leading-relaxed mb-4 text-base">
            With your permission, we may collect and use precise location information from your device.
            This information is used to provide location-based services, such as finding nearby
            service providers or providing location-specific recommendations. You can control
            location permissions through your device settings.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-pink-600 text-xl mb-4 font-semibold border-b-2 border-gray-100 pb-2">6. Cookies and Tracking</h2>
          <p className="text-gray-700 leading-relaxed mb-4 text-base">
            We use cookies and similar technologies to enhance your experience on our platform.
            Cookies help us remember your preferences and understand how you use our services.
            You can control cookie settings through your browser preferences.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-pink-600 text-xl mb-4 font-semibold border-b-2 border-gray-100 pb-2">7. Third-Party Services</h2>
          <p className="text-gray-700 leading-relaxed mb-4 text-base">
            Our services may contain links to third-party websites or services that are not owned
            or controlled by us. We are not responsible for the privacy practices of these third parties.
            We encourage you to read the privacy policies of any third-party services you use.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-pink-600 text-xl mb-4 font-semibold border-b-2 border-gray-100 pb-2">8. Children's Privacy</h2>
          <p className="text-gray-700 leading-relaxed mb-4 text-base">
            Our services are not intended for children under 13. We do not knowingly collect
            personal information from children under 13. If we become aware that we have collected
            personal information from a child under 13, we will take steps to delete such information.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-pink-600 text-xl mb-4 font-semibold border-b-2 border-gray-100 pb-2">9. Your Rights</h2>
          <p className="text-gray-700 leading-relaxed mb-4 text-base">You have the right to:</p>
          <ul className="my-4 pl-6">
            <li className="text-gray-700 leading-relaxed mb-2 text-sm">Access the personal information we hold about you</li>
            <li className="text-gray-700 leading-relaxed mb-2 text-sm">Correct inaccurate or incomplete information</li>
            <li className="text-gray-700 leading-relaxed mb-2 text-sm">Request deletion of your personal information</li>
            <li className="text-gray-700 leading-relaxed mb-2 text-sm">Object to or restrict processing of your information</li>
            <li className="text-gray-700 leading-relaxed mb-2 text-sm">Data portability</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-pink-600 text-xl mb-4 font-semibold border-b-2 border-gray-100 pb-2">10. Data Retention</h2>
          <p className="text-gray-700 leading-relaxed mb-4 text-base">
            We retain your personal information for as long as necessary to provide our services
            and fulfill the purposes outlined in this privacy policy, unless a longer retention
            period is required by law.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-pink-600 text-xl mb-4 font-semibold border-b-2 border-gray-100 pb-2">11. International Data Transfers</h2>
          <p className="text-gray-700 leading-relaxed mb-4 text-base">
            Your information may be transferred to and processed in countries other than your own.
            We ensure that such transfers comply with applicable data protection laws and implement
            appropriate safeguards to protect your information.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-pink-600 text-xl mb-4 font-semibold border-b-2 border-gray-100 pb-2">12. Changes to This Policy</h2>
          <p className="text-gray-700 leading-relaxed mb-4 text-base">
            We may update this privacy policy from time to time. We will notify you of any changes
            by posting the new policy on this page and updating the "Last updated" date.
            We encourage you to review this policy periodically.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-pink-600 text-xl mb-4 font-semibold border-b-2 border-gray-100 pb-2">13. Contact Us</h2>
          <p className="text-gray-700 leading-relaxed mb-4 text-base">
            If you have any questions about this Privacy Policy, please contact us at:
          </p>
          <div className="bg-gray-50 rounded-lg p-5 mt-4 border border-gray-200">
            <p className="my-2 text-gray-800 text-sm"><strong className="text-pink-600 font-semibold">Email:</strong> privacy@skillconnect.com</p>
            <p className="my-2 text-gray-800 text-sm"><strong className="text-pink-600 font-semibold">Phone:</strong> +63 (2) 123-4567</p>
            <p className="my-2 text-gray-800 text-sm"><strong className="text-pink-600 font-semibold">Address:</strong> Manila, Philippines</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PrivacyScreen;
