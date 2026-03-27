import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { candidateLogin } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import BlurText from "@/components/BlurText"
import FadeContent from "@/components/FadeContent"
import Aurora from "@/components/Aurora"

export default function Login() {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const data: unknown = await candidateLogin(email, name)
      const token =
        typeof (data as { token?: unknown }).token === "string"
          ? (data as { token: string }).token
          : null

      if (!token) throw new Error("Login failed")

      localStorage.setItem("sage_token", token)
      localStorage.setItem("sage_candidate", JSON.stringify(data))
      navigate("/upload")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <FadeContent blur={true} duration={800}>
      <div className="relative min-h-screen bg-[#FAFAFA] text-[#0A0A0A] overflow-hidden">
        <div className="absolute top-6 left-6 z-10 font-semibold text-xl text-[#0A0A0A]">
          SAGE
        </div>

        <div className="absolute inset-0 z-0 opacity-40">
          <Aurora
            colorStops={["#DBEAFE", "#EDE9FE", "#DBEAFE"]}
            amplitude={0.5}
            speed={0.3}
            blend={0.3}
          />
        </div>

        <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
          <div className="relative z-10 max-w-md w-full bg-white border border-[#E5E7EB] rounded-lg p-8 shadow-sm">
            <BlurText
              text="Sign in to SAGE"
              delay={100}
              animateBy="words"
              direction="top"
              className="text-3xl font-semibold text-[#0A0A0A] mb-2"
            />
            <div className="text-gray-500 text-sm mb-8">
              AI-Powered Recruitment Platform
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <Input
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <Input
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {error ? (
                <div className="text-sm text-red-600">{error}</div>
              ) : null}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors duration-200 ease-out"
              >
                {isLoading ? "Signing in..." : "Continue"}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => navigate("/hr/login")}
              className="w-full text-sm text-[#2563EB] text-center mt-4 hover:underline transition-colors duration-200 ease-out"
            >
              HR Portal →
            </button>
          </div>
        </div>
      </div>
    </FadeContent>
  )
}
