import React from 'react';
import './Legal.css';

const TermsScreen = () => {
  return (
    <div className="legal-container">
      <div className="legal-header">
        <h1>Terms and Conditions</h1>
        <p className="last-updated">Last updated: November 2025</p>
      </div>

      <div className="legal-content">
        <section className="legal-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using SkillConnect, you accept and agree to be bound by the terms
            and provision of this agreement. If you do not agree to abide by the above,
            please do not use this service.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Use License</h2>
          <p>
            Permission is granted to temporarily use SkillConnect for personal, non-commercial
            transitory viewing only. This is the grant of a license, not a transfer of title,
            and under this license you may not:
          </p>
          <ul>
            <li>Modify or copy the materials</li>
            <li>Use the materials for any commercial purpose or for any public display</li>
            <li>Attempt to decompile or reverse engineer any software contained on SkillConnect</li>
            <li>Remove any copyright or other proprietary notations from the materials</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. Service Description</h2>
          <p>
            SkillConnect is a platform that connects service providers with customers seeking
            various services including but not limited to plumbing, electrical work, carpentry,
            painting, and cleaning services. We act as an intermediary and do not provide
            services directly.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. User Responsibilities</h2>
          <h3>Service Providers:</h3>
          <ul>
            <li>Provide accurate information about their skills and experience</li>
            <li>Complete services as agreed with customers</li>
            <li>Maintain professional conduct at all times</li>
            <li>Comply with all applicable laws and regulations</li>
          </ul>

          <h3>Customers:</h3>
          <ul>
            <li>Provide accurate information about service requirements</li>
            <li>Pay for services as agreed</li>
            <li>Treat service providers with respect</li>
            <li>Report any issues promptly</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. Payment Terms</h2>
          <p>
            Payment for services is handled directly between customers and service providers.
            SkillConnect does not process payments and is not responsible for payment disputes.
            Users are encouraged to use secure payment methods and document all agreements.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Liability Limitations</h2>
          <p>
            In no event shall SkillConnect or its suppliers be liable for any damages
            (including, without limitation, damages for loss of data or profit, or due to
            business interruption) arising out of the use or inability to use SkillConnect,
            even if SkillConnect or a SkillConnect authorized representative has been
            notified orally or in writing of the possibility of such damage.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Service Availability</h2>
          <p>
            SkillConnect reserves the right to modify, suspend, or discontinue the service
            at any time without notice. We do not guarantee that the service will be
            available at all times or that it will meet your requirements.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Governing Law</h2>
          <p>
            These terms and conditions are governed by and construed in accordance with
            the laws of the Philippines, and you irrevocably submit to the exclusive
            jurisdiction of the courts in that state or location.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Changes to Terms</h2>
          <p>
            SkillConnect reserves the right, at its sole discretion, to modify or replace
            these Terms at any time. If a revision is material, we will try to provide
            at least 30 days notice prior to any new terms taking effect.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. Contact Information</h2>
          <p>
            If you have any questions about these Terms and Conditions, please contact us at:
          </p>
          <div className="contact-info">
            <p><strong>Email:</strong> legal@skillconnect.com</p>
            <p><strong>Phone:</strong> +63 (2) 123-4567</p>
            <p><strong>Address:</strong> Manila, Philippines</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TermsScreen;
