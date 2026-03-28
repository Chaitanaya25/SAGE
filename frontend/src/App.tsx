import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import CandidateDone from "@/pages/candidate/Done"
import CandidateDashboard from "@/pages/candidate/Dashboard"
import CandidateHome from "@/pages/candidate/Home"
import CandidateInterview from "@/pages/candidate/Interview"
import CandidateLogin from "@/pages/candidate/Login"
import CandidateUpload from "@/pages/candidate/Upload"
import Dashboard from "@/pages/hr/Dashboard"
import HRLogin from "@/pages/hr/HRLogin"
import HRPricing from "@/pages/hr/Pricing"
import ReportPage from "@/pages/hr/Report"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<CandidateHome />} />
        <Route path="/analyze" element={<Navigate to="/dashboard" replace />} />
        <Route path="/schedule" element={<Navigate to="/dashboard" replace />} />
        <Route path="/interviews" element={<Navigate to="/dashboard" replace />} />
        <Route path="/pricing" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<CandidateLogin />} />
        <Route path="/dashboard" element={<CandidateDashboard />} />
        <Route path="/upload" element={<CandidateUpload />} />
        <Route path="/interview" element={<CandidateInterview />} />
        <Route path="/done" element={<CandidateDone />} />
        <Route path="/hr/login" element={<HRLogin />} />
        <Route path="/hr/dashboard" element={<Dashboard />} />
        <Route path="/hr/pricing" element={<HRPricing />} />
        <Route path="/hr/report/:id" element={<ReportPage />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
