import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import CandidateDone from "@/pages/candidate/Done"
import CandidateInterview from "@/pages/candidate/Interview"
import CandidateLogin from "@/pages/candidate/Login"
import CandidateUpload from "@/pages/candidate/Upload"
import Dashboard from "@/pages/hr/Dashboard"
import HRLogin from "@/pages/hr/HRLogin"
import ReportPage from "@/pages/hr/Report"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<CandidateLogin />} />
        <Route path="/upload" element={<CandidateUpload />} />
        <Route path="/interview" element={<CandidateInterview />} />
        <Route path="/done" element={<CandidateDone />} />
        <Route path="/hr/login" element={<HRLogin />} />
        <Route path="/hr/dashboard" element={<Dashboard />} />
        <Route path="/hr/report/:id" element={<ReportPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
