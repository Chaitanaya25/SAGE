import React from "react"
import { useNavigate } from "react-router-dom"
import FadeContent from "@/components/FadeContent"
import BlurText from "@/components/BlurText"
import { CheckCircle } from "lucide-react"

export default function Done() {
  const navigate = useNavigate()

  return (
    <React.Fragment>
      <FadeContent blur={true} duration={800}>
        <div className="min-h-screen bg-[#FAFAFA] text-[#0A0A0A] flex items-center justify-center px-4">
          <div className="absolute top-6 left-6 font-semibold text-xl text-[#0A0A0A]">
            SAGE
          </div>

          <div className="max-w-md w-full text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <BlurText
              text="Interview Complete"
              delay={100}
              animateBy="words"
              direction="top"
              className="text-3xl font-semibold text-[#0A0A0A] mb-4"
            />
            <p className="text-gray-500 text-base leading-relaxed mb-8">
              Your responses have been submitted and are being evaluated. The
              hiring team will review your assessment shortly.
            </p>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-[#2563EB] text-sm font-medium hover:underline cursor-pointer transition-colors duration-200 ease-out"
            >
              Return to Home
            </button>
          </div>
        </div>
      </FadeContent>
    </React.Fragment>
  )
}
