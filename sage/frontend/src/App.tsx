import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import CandidateLogin from './pages/candidate/Login'
import Done from './pages/candidate/Done'
import Interview from './pages/candidate/Interview'
import Upload from './pages/candidate/Upload'
import Dashboard from './pages/hr/Dashboard'
import HRLogin from './pages/hr/HRLogin'
import Report from './pages/hr/Report'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<CandidateLogin />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/interview" element={<Interview />} />
        <Route path="/done" element={<Done />} />
        <Route path="/hr/login" element={<HRLogin />} />
        <Route path="/hr/dashboard" element={<Dashboard />} />
        <Route path="/hr/report/:id" element={<Report />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
