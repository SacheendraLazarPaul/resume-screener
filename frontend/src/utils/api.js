import axios from 'axios';

// In dev: Vite proxy forwards /api → localhost:3001
// In production: set VITE_API_URL to your deployed backend URL (e.g. https://yourapp.onrender.com)
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

export async function getStatus() {
  const { data } = await axios.get(`${BASE}/status`);
  return data;
}

export async function getProviders() {
  const { data } = await axios.get(`${BASE}/providers`);
  return data;
}

export async function screenResumes({ resumeFiles, manualResumes, jdText, jdFile }) {
  const form = new FormData();
  if (jdText) form.append('jdText', jdText);
  if (jdFile) form.append('jdFile', jdFile);
  resumeFiles.forEach(f => form.append('resumes', f));
  if (manualResumes.length > 0) {
    form.append('manualResumes', JSON.stringify(manualResumes));
  }
  const { data } = await axios.post(`${BASE}/screen`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function getHistory() {
  const { data } = await axios.get(`${BASE}/history`);
  return data.sessions;
}

export async function getSession(id) {
  const { data } = await axios.get(`${BASE}/history/${id}`);
  return data.session;
}

export async function deleteSession(id) {
  await axios.delete(`${BASE}/history/${id}`);
}
