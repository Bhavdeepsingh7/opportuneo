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
export const generateEmails = (data, accessToken) =>
  api.post('/emails/generate', data, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
export const regenerateEmail = (data, accessToken) =>
  api.post('/emails/regenerate', data, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
export const sendEmails = (data) => api.post('/emails/send', data)

// Gmail OAuth
export const getGmailAuthUrl  = async () => {
  const response = await api.get('/gmail/auth-url')
  console.log("AUTH_URL_RESPONSE", response.data.url)
  return response
}
export const getGmailTokens   = (sessionId)  => api.get(`/gmail/tokens/${sessionId}`)
export const verifyGmailToken = (tokenData)  => api.post('/gmail/verify', { token_data: tokenData })
export const linkGmail = (email, accessToken) =>
  api.post('/gmail/link', { email }, { headers: { Authorization: `Bearer ${accessToken}` } })
export const disconnectGmail = (accessToken) =>
  api.post('/gmail/disconnect', {}, { headers: { Authorization: `Bearer ${accessToken}` } })

// Resumes
export const getDefaultResume = (accessToken) =>
  api.get('/resume/default', { headers: { Authorization: `Bearer ${accessToken}` } })
export const uploadDefaultResume = (formData, accessToken) =>
  api.post('/resume/upload-default', formData, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'multipart/form-data',
    },
  })
export const deleteDefaultResume = (accessToken) =>
  api.delete('/resume/default', { headers: { Authorization: `Bearer ${accessToken}` } })

// Users
export const getProfile = (accessToken) =>
  api.get('/users/profile', { headers: { Authorization: `Bearer ${accessToken}` } })
export const updateProfile = (data, accessToken) =>
  api.patch('/users/profile', data, { headers: { Authorization: `Bearer ${accessToken}` } })
export const deleteAccount = (accessToken) =>
  api.delete('/users/account', { headers: { Authorization: `Bearer ${accessToken}` } })

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
