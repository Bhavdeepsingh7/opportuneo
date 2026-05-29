import { Link } from 'react-router-dom'
import './Footer.css'

const footerLinks = [
  { to: '/privacy-policy', label: 'Privacy Policy' },
  { to: '/terms-and-conditions', label: 'Terms & Conditions' },
  { to: '/refund-and-cancellation-policy', label: 'Refund & Cancellation Policy' },
  { to: 'mailto:[Business Email]', label: 'Contact Us', external: true },
]

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <Link to="/auth" className="site-footer-brand" aria-label="[Product Name] home">
          <span className="site-footer-mark">AI</span>
          <span>[Product Name]</span>
        </Link>

        <nav className="site-footer-links" aria-label="Legal and support links">
          {footerLinks.map((link) => (
            link.external ? (
              <a key={link.label} href={link.to}>
                {link.label}
              </a>
            ) : (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            )
          ))}
        </nav>

        <p className="site-footer-copy">
          &copy; [Company Name]. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
