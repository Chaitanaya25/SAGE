import { Link } from "react-router-dom"
import { CheckCircle } from "lucide-react"

export default function Done() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <CheckCircle className="mx-auto text-green-600" size={64} />
        <div className="mt-6 text-3xl font-semibold text-[#0A0A0A]">Interview Complete</div>
        <div className="mt-2 text-sm text-gray-600">
          Thank you for your time. Your responses have been recorded and will be reviewed shortly.
        </div>
        <div className="mt-8">
          <Link className="text-sm text-[#2563EB] hover:underline" to="/login">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

