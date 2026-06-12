import { useCallback, useMemo, useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { AlertCircle, ArrowRight, FileText, Upload, X, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { parseResume } from '../../../lib/api'
import { useAppState } from '../../../context/AppContext'
import './Step1Resume.css'


export default function Step1Resume({ data, setData, nextStep }) {
  const { defaultResume } = useAppState()
  const [mode, setMode] = useState('upload') // upload | paste
  const [file, setFile] = useState(null)
  const [pasteText, setPasteText] = useState('')
  const [loading, setLoading] = useState(false) 
  const [error, setError] = useState('')

  const parsed = data.resumeData

  // Auto-fill from default resume if available and not already set
  useEffect(() => {
    if (defaultResume && !parsed) {
      setData({
        resumeData: defaultResume.parsed_data,
        resumeRaw: defaultResume.raw_text,
        resumeFilePath: defaultResume.storage_path || '',
      })
    }
  }, [defaultResume, parsed, setData])

  const onDrop = useCallback((accepted) => {
    if (accepted?.[0]) {
      setFile(accepted[0])
      setError('')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
  })

  const canParse = useMemo(() => {
    if (mode === 'upload') return !!file
    return pasteText.trim().length > 50
  }, [file, mode, pasteText])

  const handleParse = async () => {
    setError('')
    setLoading(true)
    try {
      const fd = new FormData()
      if (mode === 'upload' && file) fd.append('file', file)
      else if (mode === 'paste' && pasteText.trim()) fd.append('text', pasteText.trim())
      else throw new Error('Please upload a file or paste your resume text')

      const { data: res } = await parseResume(fd)
      setData({
        resumeData: res.parsed,
        resumeRaw: res.raw_text,
        resumeFilePath: res.file_path || '',
      })
      toast.success('Resume parsed successfully')
      nextStep()
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to parse resume')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="oa-step oa-step1 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text)]">Upload your resume</h2>
        <p className="mt-1 text-sm text-[var(--text2)]">
          We’ll extract your experience and skills to personalize every email.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-[var(--bg3)] p-1 ring-1 ring-[var(--border)]">
        <button
          className={[
            'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition',
            mode === 'upload' ? 'bg-[var(--bg2)] text-[var(--text)]' : 'text-[var(--text3)] hover:text-[var(--text2)]',
          ].join(' ')}
          onClick={() => setMode('upload')}
        >
          Upload file
        </button>
        <button
          className={[
            'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition',
            mode === 'paste' ? 'bg-[var(--bg2)] text-[var(--text)]' : 'text-[var(--text3)] hover:text-[var(--text2)]',
          ].join(' ')}
          onClick={() => setMode('paste')}
        >
          Paste text
        </button>
      </div>

      {defaultResume && !file && mode === 'upload' && (
        <div className="flex items-center gap-2 rounded-xl bg-[var(--bg3)] p-3 ring-1 ring-[var(--border)]">
          <CheckCircle2 size={16} className="text-[var(--green)]" />
          <div className="text-xs text-[var(--text2)]">
            Using your <strong>default resume</strong>. You can upload a different one below.
          </div>
        </div>
      )}

      {mode === 'upload' ? (
        <div
          {...getRootProps()}
          className={[
            'dropzone',
            'rounded-2xl border border-dashed p-8 text-center transition',
            'border-[var(--border2)] bg-[var(--bg3)]',
            isDragActive ? 'border-[var(--accent)] bg-[rgba(109,95,255,.08)]' : '',
          ].join(' ')}
        >
          <input {...getInputProps()} />
          {file ? (
            <div className="mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg2)] px-4 py-3">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-[var(--accent3)]" />
                <div className="text-left">
                  <div className="text-sm font-semibold text-[var(--text)]">{file.name}</div>
                  <div className="text-xs text-[var(--text3)]">{(file.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>
              <button
                className="rounded-lg p-2 text-[var(--text3)] hover:bg-[var(--bg3)] hover:text-[var(--text)]"
                onClick={(e) => {
                  e.stopPropagation()
                  setFile(null)
                }}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--bg2)] ring-1 ring-[var(--border)]">
                <Upload size={18} className="text-[var(--accent3)]" />
              </div>
              <div className="text-sm font-semibold text-[var(--text)]">
                {isDragActive ? 'Drop it here' : 'Drag & drop your resume'}
              </div>
              <div className="text-xs text-[var(--text3)]">PDF, DOCX, or TXT — click to browse</div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            className="min-h-[220px] w-full rounded-2xl border border-[var(--border)] bg-[var(--bg3)] p-4 text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-[var(--glow)]"
            placeholder="Paste your full resume text here — include work experience, skills, achievements, and education…"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <div className="text-xs text-[var(--text3)]">Tip: 50+ characters recommended for best parsing.</div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-[rgba(249,107,107,.25)] bg-[var(--red-bg)] px-4 py-3 text-sm text-[var(--red)]">
          <AlertCircle size={16} className="mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {parsed && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg3)] p-4">
          <div className="text-xs font-semibold text-[var(--text2)]">Parsed resume</div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-xl bg-[var(--bg2)] px-3 py-2">
              <div className="text-[11px] font-semibold text-[var(--text3)]">Name</div>
              <div className="text-sm font-semibold text-[var(--text)]">{parsed.name || '—'}</div>
            </div>
            <div className="rounded-xl bg-[var(--bg2)] px-3 py-2">
              <div className="text-[11px] font-semibold text-[var(--text3)]">Title</div>
              <div className="text-sm font-semibold text-[var(--text)]">{parsed.current_title || '—'}</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent2)] disabled:opacity-50 sm:w-auto"
          onClick={handleParse}
          disabled={!canParse || loading}
        >
          {loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Parsing…</> : <>Parse & Continue <ArrowRight size={16} /></>}
        </button>
        <div className="text-xs text-[var(--text3)]">
          {parsed ? 'You can re-parse anytime — we’ll keep your progress.' : 'Required to continue.'}
        </div>
      </div>
    </div>
  )
}
