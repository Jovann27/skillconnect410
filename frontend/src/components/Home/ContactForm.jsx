import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api';
import contactLogo from './images/skillconnect.png';

const ContactForm = () => {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/contact/send', formData);

      if (res.data.success) {
        toast.success(res.data.message || 'Email Sent Successfully!!');
        setFormData({ name: '', email: '', subject: '', message: '' });
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send your email!';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-section">
      <div className="contact-form">
        <h3>Let's Get In Touch</h3>
        <form onSubmit={handleSubmit}>
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            placeholder="Your name"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Your email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <label htmlFor="subject">Subject</label>
          <input
            type="text"
            id="subject"
            name="subject"
            placeholder="Subject"
            value={formData.subject}
            onChange={handleChange}
            required
          />
          <label htmlFor="message">How Can We Help?</label>
          <textarea
            id="message"
            name="message"
            rows="4"
            placeholder="Type your message here..."
            value={formData.message}
            onChange={handleChange}
            required
          />
          <button type="submit" disabled={loading} className="send-btn">
            {loading ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
      <div className="contact-image">
        <img src={contactLogo} alt="Contact Person" />
      </div>
    </div>
  );
};

export default ContactForm;
