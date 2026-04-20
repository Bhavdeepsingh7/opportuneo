import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Sparkles, AlertCircle } from 'lucide-react'
import { useAppState } from '../../context/AppContext'
import { generateEmails } from '../../lib/api'
import WizardSteps from '../../components/WizardSteps'
import toast from 'react-hot-toast'
import './pages.css'

const TONES = [
  { id:'confident', emoji:'💪', label:'Confident', desc:'Direct, assertive, leads with your strongest qualification' },
  { id:'warm',      emoji:'😊', label:'Warm',      desc:'Friendly and genuinely curious about their work' },
  { id:'humble',    emoji:'🙏', label:'Humble',    desc:'Eager to learn, positions you as growth-oriented' },
]

const LOADING_STAGES = [
  'Analysing your resume…',
  'Researching each company…',
  'Matching your background…',
  'Writing personalised emails…',
  'Reviewing quality…',
]

export default function ConfigurePage() {
  const { resumeData, contacts, jobContext, setJobContext, tone, setTone, setGeneratedEmails } = useAppState()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [stageIdx, setStageIdx] = useState(0)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    setError(''); setLoading(true); setStageIdx(0)
    const interval = setInterval(() => setStageIdx(i => Math.min(i + 1, LOADING_STAGES.length - 1)), 2800)
    try {
      const { data } = await generateEmails({ resume_data: resumeData, contacts, job_context: jobContext, tone })
      setGeneratedEmails(data.emails)
      toast.success(`${data.emails.length} emails generated!`)
      navigate('/app/step/review')
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Generation failed')
    } finally { clearInterval(interval); setLoading(false) }
  }

  return (
    <div className="step-page">
      <div className="container-sm">
        <WizardSteps current={3} />
        <div className="step-header">
          <h2>Configure your outreach</h2>
          <p>Add context about the role you're targeting and choose how you want to come across.</p>
        </div>

        {/* Summary */}
        <div className="config-summary card" style={{marginBottom:24}}>
          <div className="cs-item"><span className="cs-k">Resume</span><span className="cs-v">{resumeData?.name} · {resumeData?.current_title}</span></div>
          <div className="cs-divider"/>
          <div className="cs-item"><span className="cs-k">Contacts</span><span className="cs-v">{contacts?.length} recipients</span></div>
        </div>

        {/* Job context */}
        <div className="form-group" style={{marginBottom:24}}>
          <label className="form-label">Job context <span style={{color:'var(--text3)',fontWeight:400}}>(optional but recommended)</span></label>
          <textarea
            placeholder="Describe the type of role or company you're targeting. E.g. 'Senior Frontend Engineer roles at B2B SaaS startups, 50–200 employees, Series A/B stage. I want to work on product-led growth tooling.'"
            value={jobContext}
            onChange={e => setJobContext(e.target.value)}
            rows={5}
          />
          <span className="form-hint">The more specific you are, the more targeted each email will be.</span>
        </div>

        {/* Tone */}
        <div className="form-group" style={{marginBottom:28}}>
          <label className="form-label">Tone</label>
          <div className="tone-grid">
            {TONES.map(t => (
              <button key={t.id} className={`tone-card ${tone===t.id?'active':''}`} onClick={() => setTone(t.id)}>
                <span className="tone-emoji">{t.emoji}</span>
                <span className="tone-label">{t.label}</span>
                <span className="tone-desc">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <div className="alert alert-error" style={{marginBottom:16}}><AlertCircle size={14}/> {error}</div>}

        {loading && (
          <div className="loading-box card fade-up" style={{marginBottom:20}}>
            <div className="loading-stage-row">
              <span className="spinner"/>
              <span className="loading-stage-text">{LOADING_STAGES[stageIdx]}</span>
            </div>
            <div className="loading-bar-track"><div className="loading-bar-fill" style={{width:`${((stageIdx+1)/LOADING_STAGES.length)*100}%`}}/></div>
            <p style={{fontSize:12,color:'var(--text3)',marginTop:4}}>Generating {contacts?.length} personalised emails — this takes ~{Math.ceil((contacts?.length||1)*3)}s</p>
          </div>
        )}

        <div className="step-actions">
          <button className="btn btn-ghost btn-lg" onClick={() => navigate('/app/step/contacts')} disabled={loading}><ArrowLeft size={16}/> Back</button>
          <button className="btn btn-primary btn-lg" onClick={handleGenerate} disabled={loading}>
            {loading ? <><span className="spinner"/> Generating…</> : <><Sparkles size={16}/> Generate {contacts?.length} Emails <ArrowRight size={16}/></>}
          </button>
        </div>
      </div>
    </div>
  )
}
