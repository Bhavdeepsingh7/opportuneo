import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, ArrowRight, CheckCircle2, AlertCircle, X } from 'lucide-react'
import { useAppState } from '../../context/AppContext'
import { parseResume } from '../../lib/api'
import WizardSteps from '../../components/WizardSteps'
import toast from 'react-hot-toast'
import './pages.css'

export default function ResumePage() {
  const { setResumeData, setResumeRaw, setResumeFilePath, resumeData } = useAppState()
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [pasteText, setPasteText] = useState('')
  const [mode, setMode] = useState('upload') // upload | paste
  const [loading, setLoading] = useState(false)
  const [parsed, setParsed] = useState(resumeData || null)
  const [error, setError] = useState('')

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) { setFile(accepted[0]); setError('') }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/plain': ['.txt'] },
    maxFiles: 1,
  })

  const handleParse = async () => {
    setError(''); setLoading(true)
    try {
      const fd = new FormData()
      if (mode === 'upload' && file) {
        fd.append('file', file)
      } else if (mode === 'paste' && pasteText.trim()) {
        fd.append('text', pasteText.trim())
      } else {
        throw new Error('Please upload a file or paste your resume text')
      }
      const { data } = await parseResume(fd)
      setParsed(data.parsed)
      setResumeData(data.parsed)
      setResumeRaw(data.raw_text)
      setResumeFilePath(data.file_path || '')
      toast.success('Resume parsed successfully!')
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    } finally {
      setLoading(false)
    }
  }

  const canParse = (mode === 'upload' && file) || (mode === 'paste' && pasteText.trim().length > 50)

  return (
    <div className="step-page">
      <div className="container-sm">
        <WizardSteps current={1} />
        <div className="step-header">
          <h2>Upload your resume</h2>
          <p>We'll extract your skills, experience, and achievements to personalise every email.</p>
        </div>

        {/* Mode tabs */}
        <div className="tabs" style={{ marginBottom: 20 }}>
          <button className={`tab ${mode === 'upload' ? 'active' : ''}`} onClick={() => setMode('upload')}>Upload file</button>
          <button className={`tab ${mode === 'paste' ? 'active' : ''}`} onClick={() => setMode('paste')}>Paste text</button>
        </div>

        {mode === 'upload' ? (
          <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}>
            <input {...getInputProps()} />
            {file ? (
              <div className="file-preview">
                <FileText size={28} color="var(--accent3)" />
                <div>
                  <div className="file-name">{file.name}</div>
                  <div className="file-size">{(file.size / 1024).toFixed(1)} KB</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setFile(null) }}><X size={14}/></button>
              </div>
            ) : (
              <>
                <span className="dropzone-icon">📄</span>
                <h4>{isDragActive ? 'Drop it here' : 'Drag & drop your resume'}</h4>
                <p>PDF, DOCX, or TXT — or click to browse</p>
              </>
            )}
          </div>
        ) : (
          <textarea
            placeholder="Paste your full resume text here — include work experience, skills, achievements, and education..."
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            rows={12}
            style={{ marginBottom: 4 }}
          />
        )}

        {error && <div className="alert alert-error" style={{ marginTop: 12 }}><AlertCircle size={14}/> {error}</div>}

        {/* Parsed preview */}
        {parsed && (
          <div className="parsed-preview card fade-up">
            <div className="parsed-header"><CheckCircle2 size={16} color="var(--green)"/><span>Parsed successfully</span></div>
            <div className="parsed-grid">
              <div className="parsed-item"><span className="parsed-k">Name</span><span className="parsed-v">{parsed.name}</span></div>
              <div className="parsed-item"><span className="parsed-k">Title</span><span className="parsed-v">{parsed.current_title}</span></div>
              <div className="parsed-item"><span className="parsed-k">Company</span><span className="parsed-v">{parsed.current_company}</span></div>
              <div className="parsed-item"><span className="parsed-k">Experience</span><span className="parsed-v">{parsed.years_experience} years</span></div>
            </div>
            <div className="parsed-skills">
              {parsed.top_skills?.map(s => <span key={s} className="tag" style={{fontSize:12,padding:'3px 9px'}}>{s}</span>)}
            </div>
          </div>
        )}

        <div className="step-actions">
          <button className="btn btn-primary btn-lg" onClick={handleParse} disabled={!canParse || loading}>
            {loading ? <><span className="spinner"/> Parsing…</> : <>{parsed ? 'Re-parse' : 'Parse Resume'} <ArrowRight size={16}/></>}
          </button>
          {parsed && (
            <button className="btn btn-secondary btn-lg" onClick={() => navigate('/app/contacts')}>
              Next: Contacts <ArrowRight size={16}/>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
