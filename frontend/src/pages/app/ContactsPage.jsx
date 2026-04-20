import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { Users, FileSpreadsheet, ArrowRight, ArrowLeft, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAppState } from '../../context/AppContext'
import { parseContacts } from '../../lib/api'
import WizardSteps from '../../components/WizardSteps'
import toast from 'react-hot-toast'
import './pages.css'

export default function ContactsPage() {
  const { contacts, setContacts } = useAppState()
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [localContacts, setLocalContacts] = useState(contacts || null)

  const onDrop = useCallback((accepted) => { if (accepted[0]) { setFile(accepted[0]); setError('') } }, [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/pdf': ['.pdf'], 'text/plain': ['.txt'] },
    maxFiles: 1,
  })

  const handleParse = async () => {
    if (!file) return
    setError(''); setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await parseContacts(fd)
      setLocalContacts(data.contacts)
      setContacts(data.contacts)
      toast.success(`${data.count} contacts loaded!`)
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    } finally { setLoading(false) }
  }

  const removeContact = (idx) => {
    const updated = localContacts.filter((_, i) => i !== idx)
    setLocalContacts(updated)
    setContacts(updated)
  }

  return (
    <div className="step-page">
      <div className="container-sm">
        <WizardSteps current={2} />
        <div className="step-header">
          <h2>Upload contacts</h2>
          <p>Import a CSV with columns: <code>name, email, company, title</code> — or upload a PDF contact sheet.</p>
        </div>

        <div className="alert alert-info" style={{marginBottom:20}}>
          <FileSpreadsheet size={14}/>
          <div>
            <strong>CSV format:</strong> name, email, company, title &nbsp;|&nbsp;
            <a href="/sample-contacts.csv" style={{color:'var(--accent3)',textDecoration:'underline'}}>Download sample</a>
          </div>
        </div>

        <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`} style={{marginBottom:16}}>
          <input {...getInputProps()} />
          {file ? (
            <div className="file-preview">
              <FileSpreadsheet size={26} color="var(--accent3)"/>
              <div><div className="file-name">{file.name}</div><div className="file-size">{(file.size/1024).toFixed(1)} KB</div></div>
            </div>
          ) : (
            <>
              <span className="dropzone-icon">📊</span>
              <h4>{isDragActive ? 'Drop it here' : 'Drag & drop your contacts file'}</h4>
              <p>CSV or PDF — click to browse</p>
            </>
          )}
        </div>

        {error && <div className="alert alert-error" style={{marginBottom:16}}><AlertCircle size={14}/> {error}</div>}

        <button className="btn btn-secondary" onClick={handleParse} disabled={!file || loading}>
          {loading ? <><span className="spinner"/> Parsing contacts…</> : <><Users size={15}/> Import contacts</>}
        </button>

        {/* Contacts table */}
        {localContacts && localContacts.length > 0 && (
          <div className="contacts-table card fade-up" style={{marginTop:24}}>
            <div className="contacts-table-head">
              <span style={{color:'var(--green)',display:'flex',alignItems:'center',gap:6}}><CheckCircle2 size={14}/> {localContacts.length} contacts ready</span>
            </div>
            <div className="ct-header">
              <span>Name</span><span>Email</span><span>Company</span><span>Title</span><span/>
            </div>
            {localContacts.map((c, i) => (
              <div key={i} className="ct-row">
                <span className="ct-name">{c.name}</span>
                <span className="ct-email">{c.email}</span>
                <span className="ct-company">{c.company}</span>
                <span className="ct-title">{c.title}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => removeContact(i)}><Trash2 size={13}/></button>
              </div>
            ))}
          </div>
        )}

        <div className="step-actions">
          <button className="btn btn-ghost btn-lg" onClick={() => navigate('/app/step/resume')}><ArrowLeft size={16}/> Back</button>
          {localContacts?.length > 0 && (
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/app/step/configure')}>
              Next: Configure <ArrowRight size={16}/>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
