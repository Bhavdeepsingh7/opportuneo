import { Link } from 'react-router-dom'
import logo from '../../assets/logo.png'
import Footer from '../../components/Footer'
import { legalPages } from './legalContent'
import './LegalPage.css'

export default function LegalPage({ type }) {
  const page = legalPages[type]

  return (
    <div className="legal-page">
      <header className="legal-hero">
        <div className="legal-shell">
          <Link to="/" className="legal-brand">
            <img src={logo} alt="" style={{ height: '24px' }} />
            <span>opportuneo</span>
          </Link>
          <div className="legal-hero-copy">
            <span className="legal-eyebrow">{page.eyebrow}</span>
            <h1>{page.title}</h1>
            <p>{page.description}</p>
            <div className="legal-meta">Effective Date: {page.updated}</div>
          </div>
        </div>
      </header>

      <main className="legal-main">
        <article className="legal-document" aria-labelledby="legal-title">
          <h2 id="legal-title">{page.title}</h2>
          <p className="legal-notice">
            This template is provided for general informational purposes and should be reviewed by qualified legal counsel before publication.
          </p>

          {page.sections.map((section) => (
            <section key={section.title} className="legal-section">
              <h3>{section.title}</h3>
              {section.body?.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.list && (
                <ul>
                  {section.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>
      </main>

      <Footer />
    </div>
  )
}
