/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { getSubscription, getProfile, getDefaultResume } from '../lib/api'
import { supabase } from '../lib/supabase'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const { user } = useAuth()
  // Wizard state persisted in sessionStorage
  const [resumeData, setResumeData] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('resumeData') || 'null') } catch { return null }
  })
  const [resumeRaw, setResumeRaw] = useState(() => sessionStorage.getItem('resumeRaw') || '')
  const [resumeFilePath, setResumeFilePath] = useState(() => sessionStorage.getItem('resumeFilePath') || '')
  const [contacts, setContacts] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('contacts') || 'null') } catch { return null }
  })
  const [generatedEmails, setGeneratedEmails] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('generatedEmails') || 'null') } catch { return null }
  })
  const [jobContext, setJobContext] = useState(() => sessionStorage.getItem('jobContext') || '')
  const [tone, setTone] = useState(() => sessionStorage.getItem('tone') || 'confident')
  const [availableCredits, setAvailableCredits] = useState(() => {
    const stored = Number(sessionStorage.getItem('availableCredits'))
    return Number.isFinite(stored) && stored >= 0 ? stored : 0
  })
  const [subscriptionName, setSubscriptionName] = useState(() => sessionStorage.getItem('subscriptionName') || 'Free')
  const [subscriptionStatus, setSubscriptionStatus] = useState(() => sessionStorage.getItem('subscriptionStatus') || 'inactive')
  const [profile, setProfile] = useState(null)
  const [defaultResume, setDefaultResume] = useState(null)

  // Gmail OAuth tokens (sessionStorage - cleared on tab close)
  const [gmailTokens, setGmailTokens] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('gmailTokens') || 'null') } catch { return null }
  })
  const [gmailEmail, setGmailEmail] = useState(() => sessionStorage.getItem('gmailEmail') || '')

  // Persist to sessionStorage
  useEffect(() => {
    if (resumeData) sessionStorage.setItem('resumeData', JSON.stringify(resumeData))
    else sessionStorage.removeItem('resumeData')
  }, [resumeData])
  useEffect(() => {
    if (resumeRaw) sessionStorage.setItem('resumeRaw', resumeRaw)
  }, [resumeRaw])
  useEffect(() => {
    if (resumeFilePath) sessionStorage.setItem('resumeFilePath', resumeFilePath)
    else sessionStorage.removeItem('resumeFilePath')
  }, [resumeFilePath])
  useEffect(() => {
    if (contacts) sessionStorage.setItem('contacts', JSON.stringify(contacts))
    else sessionStorage.removeItem('contacts')
  }, [contacts])
  useEffect(() => {
    if (generatedEmails) sessionStorage.setItem('generatedEmails', JSON.stringify(generatedEmails))
    else sessionStorage.removeItem('generatedEmails')
  }, [generatedEmails])
  useEffect(() => { sessionStorage.setItem('jobContext', jobContext) }, [jobContext])
  useEffect(() => { sessionStorage.setItem('tone', tone) }, [tone])
  useEffect(() => { sessionStorage.setItem('availableCredits', String(availableCredits)) }, [availableCredits])
  useEffect(() => { sessionStorage.setItem('subscriptionName', subscriptionName) }, [subscriptionName])
  useEffect(() => { sessionStorage.setItem('subscriptionStatus', subscriptionStatus) }, [subscriptionStatus])
  
  useEffect(() => {
    if (!user) {
      setProfile(null)
      setDefaultResume(null)
      return
    }

    let active = true
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      try {
        const [subRes, profRes, resRes] = await Promise.all([
          getSubscription(session.access_token).catch(() => null),
          getProfile(session.access_token).catch(() => null),
          getDefaultResume(session.access_token).catch(() => null)
        ])

        if (!active) return

        if (subRes?.data) {
          setAvailableCredits(subRes.data.available_credits)
          setSubscriptionName(subRes.data.subscription_name)
          setSubscriptionStatus(subRes.data.subscription_status)
        }
        if (profRes?.data) {
          setProfile(profRes.data)
          if (profRes.data.gmail_email && !gmailEmail) {
            setGmailEmail(profRes.data.gmail_email)
          }
        }
        if (resRes?.data) {
          setDefaultResume(resRes.data)
        }
      } catch (err) {
        console.error("Failed to fetch app data", err)
      }
    }

    fetchData()
    return () => { active = false }
  }, [user, gmailEmail])

  useEffect(() => {
    if (gmailTokens) sessionStorage.setItem('gmailTokens', JSON.stringify(gmailTokens))
    else sessionStorage.removeItem('gmailTokens')
  }, [gmailTokens])
  useEffect(() => {
    if (gmailEmail) sessionStorage.setItem('gmailEmail', gmailEmail)
  }, [gmailEmail])

  const resetWizard = () => {
    setResumeData(null); setResumeRaw(''); setResumeFilePath(''); setContacts(null)
    setGeneratedEmails(null); setJobContext(''); setTone('confident')
    sessionStorage.removeItem('resumeData'); sessionStorage.removeItem('contacts')
    sessionStorage.removeItem('generatedEmails'); sessionStorage.removeItem('resumeRaw')
    sessionStorage.removeItem('resumeFilePath')
  }

  return (
    <AppContext.Provider value={{
      resumeData, setResumeData,
      resumeRaw, setResumeRaw,
      resumeFilePath, setResumeFilePath,
      contacts, setContacts,
      generatedEmails, setGeneratedEmails,
      jobContext, setJobContext,
      tone, setTone,
      gmailTokens, setGmailTokens,
      gmailEmail, setGmailEmail,
      availableCredits, setAvailableCredits,
      subscriptionName, setSubscriptionName,
      subscriptionStatus, setSubscriptionStatus,
      profile, setProfile,
      defaultResume, setDefaultResume,
      resetWizard,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useAppState = () => useContext(AppContext)
