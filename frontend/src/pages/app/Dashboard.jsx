import { useNavigate } from 'react-router-dom'
import { Upload, Users, Mail, Send, ArrowRight, RotateCcw, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useAppState } from '../../context/AppContext'
import './Dashboard.css'

const STEPS = [
  { n:1, icon:Upload,       label:'Upload Resume',      desc:'Upload PDF/DOCX or paste your resume text',           path:'/app/step/resume' },
  { n:2, icon:Users,        label:'Upload Contacts',    desc:'Import HR/employer emails via CSV or PDF',            path:'/app/step/contacts' },
  { n:3, icon:Mail,         label:'Configure Outreach', desc:'Set job context, tone and generation preferences',    path:'/app/step/configure' },
  { n:4, icon:CheckCircle2, label:'Review Emails',      desc:'Review, edit and regenerate each email individually', path:'/app/step/review' },
  { n:5, icon:Send,         label:'Send via Gmail',     desc:'Connect Gmail and send all emails at once',           path:'/app/step/send' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const { resumeData, contacts, generatedEmails, resetWizard } = useAppState()
  const navigate = useNavigate()
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'
  const getCurrentStep = () => {
    if (!resumeData) return 1
    if (!contacts) return 2
    if (!generatedEmails) return 3
    return 4
  }
  const currentStep = getCurrentStep()
  const getStatus = (n) => {
    if (n === 1 && resumeData) return 'done'
    if (n === 2 && contacts) return 'done'
    if (n === 3 && generatedEmails) return 'done'
    if (n === currentStep) return 'current'
    if (n < currentStep) return 'done'
    return 'locked'
  }
  return (
    <div className="dashboard">
      <div className="container">
        <div className="dash-header">
          <div>
            <h1 className="dash-greeting">Good day, <span className="grad">{firstName}</span> 👋</h1>
            <p className="dash-sub">Send personalized job outreach emails powered by AI — in 5 steps.</p>
          </div>
          {resumeData && (
            <button className="btn btn-secondary btn-sm" onClick={resetWizard}>
              <RotateCcw size={13} /> Start over
            </button>
          )}
        </div>
        {resumeData && (
          <div className="progress-card card fade-up">
            <div className="progress-row">
              <div className="progress-info">
                <span className="progress-label">Campaign progress</span>
                <span className="progress-step">{currentStep - 1} of 5 steps completed</span>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => navigate(STEPS[currentStep - 1].path)}>
                Continue <ArrowRight size={13} />
              </button>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${((currentStep - 1) / 5) * 100}%` }} />
            </div>
            <div className="progress-chips">
              {resumeData && <span className="badge badge-green"><CheckCircle2 size={10}/> Resume parsed</span>}
              {contacts && <span className="badge badge-green"><CheckCircle2 size={10}/> {contacts.length} contacts loaded</span>}
              {generatedEmails && <span className="badge badge-green"><CheckCircle2 size={10}/> {generatedEmails.length} emails generated</span>}
            </div>
          </div>
        )}
        <div className="steps-grid">
          {STEPS.map((step) => {
            const status = getStatus(step.n)
            const Icon = step.icon
            const clickable = status !== 'locked'
            return (
              <div key={step.n} className={`step-card card ${clickable ? 'card-hover' : ''} step-${status}`} onClick={() => clickable && navigate(step.path)}>
                <div className="step-card-top">
                  <div className={`step-card-icon icon-${status}`}>
                    {status === 'done' ? <CheckCircle2 size={18}/> : <Icon size={18}/>}
                  </div>
                  <span className={`badge ${status==='done'?'badge-green':status==='current'?'badge-accent':'badge-gray'}`}>
                    {status==='done'?'Done':status==='current'?'Up next':`Step ${step.n}`}
                  </span>
                </div>
                <h3 className="step-card-title">{step.label}</h3>
                <p className="step-card-desc">{step.desc}</p>
                {clickable && <div className="step-card-cta">{status==='done'?'Edit':'Start'} <ArrowRight size={13}/></div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
