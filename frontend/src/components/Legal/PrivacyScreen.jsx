import React from 'react';
import './Legal.css';

const PrivacyScreen = () => {
  return (
    <div className="legal-container">
      <div className="legal-header">
        <h1>Privacy Policy</h1>
        <p className="last-updated">Last updated: November 2025</p>
      </div>

      <div className="legal-content">
        <section className="legal-section">
          <h2>1. Information We Collect</h2>
          <p>We collect information you provide directly to us, such as when you:</p>
          <ul>
            <li>Create an account or use our services</li>
            <li>Make a purchase or place an order</li>
            <li>Contact us for support</li>
            <li>Participate in surveys or promotions</li>
          </ul>
          <p>This information may include:</p>
          <ul>
            <li>Name, email address, phone number</li>
            <li>Profile information and preferences</li>
            <li>Location data (with your permission)</li>
            <li>Payment information</li>
            <li>Communications with us</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve our services</li>
            <li>Process transactions and send related information</li>
            <li>Send you technical notices and support messages</li>
            <li>Communicate with you about products, services, and promotions</li>
            <li>Monitor and analyze trends and usage</li>
            <li>Detect, investigate, and prevent fraudulent transactions</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. Information Sharing</h2>
          <p>We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy:</p>
          <ul>
            <li><strong>Service Providers:</strong> We may share information with service providers who assist us in operating our platform</li>
            <li><strong>Legal Requirements:</strong> We may disclose information if required by law or to protect our rights</li>
            <li><strong>Business Transfers:</strong> In the event of a merger or acquisition, your information may be transferred</li>
            <li><strong>With Your Consent:</strong> We may share information with your explicit consent</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Data Security</h2>
          <p>
            We implement appropriate security measures to protect your personal information against
            unauthorized access, alteration, disclosure, or destruction. However, no method of
            transmission over the internet is 100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Location Information</h2>
          <p>
            With your permission, we may collect and use precise location information from your device.
            This information is used to provide location-based services, such as finding nearby
            service providers or providing location-specific recommendations. You can control
            location permissions through your device settings.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Cookies and Tracking</h2>
          <p>
            We use cookies and similar technologies to enhance your experience on our platform.
            Cookies help us remember your preferences and understand how you use our services.
            You can control cookie settings through your browser preferences.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Third-Party Services</h2>
          <p>
            Our services may contain links to third-party websites or services that are not owned
            or controlled by us. We are not responsible for the privacy practices of these third parties.
            We encourage you to read the privacy policies of any third-party services you use.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Children's Privacy</h2>
          <p>
            Our services are not intended for children under 13. We do not knowingly collect
            personal information from children under 13. If we become aware that we have collected
            personal information from a child under 13, we will take steps to delete such information.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access the personal information we hold about you</li>
            <li>Correct inaccurate or incomplete information</li>
            <li>Request deletion of your personal information</li>
            <li>Object to or restrict processing of your information</li>
            <li>Data portability</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>10. Data Retention</h2>
          <p>
            We retain your personal information for as long as necessary to provide our services
            and fulfill the purposes outlined in this privacy policy, unless a longer retention
            period is required by law.
          </p>
        </section>

        <section className="legal-section">
          <h2>11. International Data Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries other than your own.
            We ensure that such transfers comply with applicable data protection laws and implement
            appropriate safeguards to protect your information.
          </p>
        </section>

        <section className="legal-section">
          <h2>12. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify you of any changes
            by posting the new policy on this page and updating the "Last updated" date.
            We encourage you to review this policy periodically.
          </p>
        </section>

        <section className="legal-section">
          <h2>13. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at:
          </p>
          <div className="contact-info">
            <p><strong>Email:</strong> privacy@skillconnect.com</p>
            <p><strong>Phone:</strong> +63 (2) 123-4567</p>
            <p><strong>Address:</strong> Manila, Philippines</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PrivacyScreen;
