import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, RefreshCw, Copy, CheckCheck, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { useAppState } from '../../context/AppContext'
import { regenerateEmail } from '../../lib/api'
import WizardSteps from '../../components/WizardSteps'
import toast from 'react-hot-toast'
import './ReviewPage.css'

export default function ReviewPage() {
  const { generatedEmails, setGeneratedEmails, resumeData, jobContext, tone } = useAppState()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(0)
  const [editing, setEditing] = useState({})       // { idx: { subject, body } }
  const [regenerating, setRegenerating] = useState(null)
  const [copied, setCopied] = useState(null)
  const [feedback, setFeedback] = useState({})
  const [showFeedback, setShowFeedback] = useState(null)

  if (!generatedEmails?.length) {
    return (
      <div className="step-page">
        <div className="container-sm" style={{textAlign:'center',paddingTop:80}}>
          <AlertCircle size={40} color="var(--text3)" style={{margin:'0 auto 16px'}}/>
          <h3>No emails generated yet</h3>
          <p style={{color:'var(--text3)',marginBottom:24}}>Go back and generate emails first.</p>
          <button className="btn btn-primary" onClick={() => navigate('/app/configure')}>Go to Configure</button>
        </div>
      </div>
    )
  }

  const getEmail = (idx) => ({ ...generatedEmails[idx], ...(editing[idx] || {}) })

  const handleEdit = (idx, field, value) => {
    setEditing(prev => ({ ...prev, [idx]: { ...(prev[idx] || {}), [field]: value } }))
  }

  const handleCopy = (idx) => {
    const e = getEmail(idx)
    navigator.clipboard.writeText(`Subject: ${e.subject}\n\n${e.body}`)
    setCopied(idx)
    setTimeout(() => setCopied(null), 2000)
    toast.success('Copied to clipboard')
  }

  const handleRegenerate = async (idx) => {
    setRegenerating(idx)
    try {
      const original = generatedEmails[idx]
      const { data } = await regenerateEmail({
        resume_data: resumeData,
        contact: original.contact,
        job_context: jobContext,
        tone,
        feedback: feedback[idx] || '',
      })
      const updated = [...generatedEmails]
      updated[idx] = data
      setGeneratedEmails(updated)
      setEditing(prev => { const n={...prev}; delete n[idx]; return n })
      setShowFeedback(null)
      toast.success('Email regenerated!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Regeneration failed')
    } finally { setRegenerating(null) }
  }

  return (
    <div className="step-page">
      <div className="container-sm">
        <WizardSteps current={4} />
        <div className="step-header">
          <h2>Review emails</h2>
          <p>Each email is personalised for its recipient. Edit, regenerate, or approve — then send them all at once.</p>
        </div>

        <div className="review-summary">
          <span className="badge badge-accent">{generatedEmails.length} emails ready</span>
          <span style={{fontSize:13,color:'var(--text3)'}}>{Object.keys(editing).length > 0 ? `${Object.keys(editing).length} edited` : 'No edits yet'}</span>
        </div>

        <div className="email-list">
          {generatedEmails.map((_, idx) => {
            const e = getEmail(idx)
            const isOpen = expanded === idx
            const isRegenning = regenerating === idx
            return (
              <div key={idx} className={`email-card card ${isOpen ? 'open' : ''}`}>
                {/* Header row */}
                <div className="email-card-header" onClick={() => setExpanded(isOpen ? null : idx)}>
                  <div className="email-card-meta">
                    <div className="recipient-avatar">{e.contact?.name?.[0] || '?'}</div>
                    <div>
                      <div className="recipient-name">{e.contact?.name}</div>
                      <div className="recipient-sub">{e.contact?.title} · {e.contact?.company}</div>
                    </div>
                  </div>
                  <div className="email-card-right">
                    {editing[idx] && <span className="badge badge-amber" style={{fontSize:10}}>Edited</span>}
                    {isOpen ? <ChevronUp size={16} color="var(--text3)"/> : <ChevronDown size={16} color="var(--text3)"/>}
                  </div>
                </div>

                {/* Preview subject when collapsed */}
                {!isOpen && (
                  <div className="email-subject-preview">{e.subject}</div>
                )}

                {/* Expanded editor */}
                {isOpen && (
                  <div className="email-editor fade-up">
                    <div className="editor-field">
                      <label className="form-label">Subject line</label>
                      <input value={e.subject} onChange={ev => handleEdit(idx, 'subject', ev.target.value)} placeholder="Email subject"/>
                    </div>
                    <div className="editor-field">
                      <label className="form-label">Email body</label>
                      <textarea value={e.body} onChange={ev => handleEdit(idx, 'body', ev.target.value)} rows={12}/>
                    </div>

                    {/* Feedback for regen */}
                    {showFeedback === idx && (
                      <div className="editor-field fade-up">
                        <label className="form-label">Feedback for regeneration <span style={{color:'var(--text3)',fontWeight:400}}>(optional)</span></label>
                        <input
                          placeholder="e.g. Make it shorter, focus more on my Python skills, change the CTA..."
                          value={feedback[idx]||''}
                          onChange={ev => setFeedback(p => ({...p,[idx]:ev.target.value}))}
                        />
                      </div>
                    )}

                    <div className="editor-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => handleCopy(idx)}>
                        {copied===idx ? <><CheckCheck size={13}/> Copied!</> : <><Copy size={13}/> Copy</>}
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => showFeedback===idx ? handleRegenerate(idx) : setShowFeedback(idx)}
                        disabled={isRegenning}
                      >
                        {isRegenning ? <><span className="spinner"/> Regenerating…</> : <><RefreshCw size={13}/> {showFeedback===idx?'Regenerate now':'Regenerate'}</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="step-actions">
          <button className="btn btn-ghost btn-lg" onClick={() => navigate('/app/configure')}><ArrowLeft size={16}/> Back</button>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/app/send')}>
            Send All <ArrowRight size={16}/>
          </button>
        </div>
      </div>
    </div>
  )
}
