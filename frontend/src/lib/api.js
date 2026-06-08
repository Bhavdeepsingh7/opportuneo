import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 120000,
})

// Resume
export const parseResume = (formData) =>
  api.post('/resume/parse', formData, { headers: { 'Content-Type': 'multipart/form-data' } })

// Contacts
export const parseContacts = (formData) =>
  api.post('/contacts/parse', formData, { headers: { 'Content-Type': 'multipart/form-data' } })

// Emails
export const generateEmails = (data) => api.post('/emails/generate', data)
export const regenerateEmail = (data) => api.post('/emails/regenerate', data)
export const sendEmails = (data) => api.post('/emails/send', data)

// Gmail OAuth
export const getGmailAuthUrl  = ()           => api.get('/gmail/auth-url')
export const getGmailTokens   = (sessionId)  => api.get(`/gmail/tokens/${sessionId}`)
export const verifyGmailToken = (tokenData)  => api.post('/gmail/verify', { token_data: tokenData })

// Razorpay checkout
export const createPaymentOrder = (planId, accessToken) =>
  api.post('/payments/orders', { plan_id: planId }, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
export const verifyPayment = (payment, accessToken) =>
  api.post('/payments/verify', payment, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
export const getSubscription = (accessToken) =>
  api.get('/payments/subscription', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
