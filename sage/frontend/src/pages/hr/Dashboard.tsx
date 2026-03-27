import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getCandidates, getInterviews } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import FadeContent from "@/components/FadeContent";
import CountUp from "@/components/CountUp";
import AnimatedContent from "@/components/AnimatedContent";
import { INTERVIEW_STATUS } from "@/lib/constants";
import {
  LayoutDashboard,
  Users,
  Settings,
  Search,
  LogOut,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import type { Candidate, Interview } from "@/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Auth guard
  useEffect(() => {
    if (!localStorage.getItem("sage_token")) {
      navigate("/hr/login");
    }
  }, [navigate]);

  // Data fetch
  useEffect(() => {
    async function load() {
      try {
        const [cData, iData] = await Promise.all([getCandidates(), getInterviews()]);
        setCandidates(
          (cData as { candidates: Candidate[] }).candidates ?? []
        );
        setInterviews(
          (iData as { interviews: Interview[] }).interviews ?? []
        );
      } catch {
        // Fail silently — empty state is handled in the table
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Aggregate stats
  const { totalCandidates, completedInterviews } = useMemo(() => ({
    totalCandidates: candidates.length,
    completedInterviews: interviews.filter((i) => i.status === "completed").length,
  }), [candidates, interviews]);

  // Latest interview per candidate
  const interviewMap = useMemo(() => {
    const map = new Map<string, Interview>();
    [...interviews]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .forEach((i) => {
        if (!map.has(i.candidate_id)) map.set(i.candidate_id, i);
      });
    return map;
  }, [interviews]);

  // Filtered candidates
  const filteredCandidates = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return candidates;
    return candidates.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [candidates, searchQuery]);

  function handleLogout() {
    localStorage.clear();
    navigate("/hr/login");
  }

  return (
    <div className="flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 w-60 h-screen bg-white border-r border-[#E5E7EB] flex flex-col justify-between z-40">
        <div>
          <div className="p-6 mb-2">
            <span className="font-bold text-xl text-[#0A0A0A]">SAGE</span>
          </div>

          <nav className="flex flex-col gap-1 px-3">
            <div className="flex items-center gap-3 bg-[#F3F4F6] text-[#0A0A0A] font-medium rounded-lg px-3 py-2 cursor-default">
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span className="text-sm">Dashboard</span>
            </div>
            <div className="flex items-center gap-3 text-gray-500 hover:bg-[#F3F4F6] rounded-lg px-3 py-2 cursor-pointer transition-colors">
              <Users className="w-4 h-4 shrink-0" />
              <span className="text-sm">Candidates</span>
            </div>
            <div className="flex items-center gap-3 text-gray-500 hover:bg-[#F3F4F6] rounded-lg px-3 py-2 cursor-pointer transition-colors">
              <Settings className="w-4 h-4 shrink-0" />
              <span className="text-sm">Settings</span>
            </div>
          </nav>
        </div>

        <div className="p-4 border-t border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarFallback className="text-xs bg-[#DBEAFE] text-[#2563EB] font-medium">
                SA
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-[#0A0A0A] flex-1 min-w-0 truncate">
              SAGE Admin
            </span>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-[#0A0A0A] transition-colors shrink-0"
              aria-label="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-60 p-8 bg-[#FAFAFA] min-h-screen w-full">
        <FadeContent blur duration={800}>
          <h1 className="text-2xl font-semibold text-[#0A0A0A] mb-6">Dashboard</h1>

          {/* Stats row */}
          <AnimatedContent direction="vertical" distance={30} className="mb-8">
            <div className="grid grid-cols-4 gap-4">
              {/* Total Candidates */}
              <Card className="bg-white border border-[#E5E7EB] rounded-lg p-6 ring-0 gap-0 py-6">
                <Users className="w-5 h-5 text-gray-400 mb-2" />
                <div className="flex items-baseline gap-1">
                  <CountUp
                    from={0}
                    to={totalCandidates}
                    duration={2}
                    className="text-3xl font-bold text-[#0A0A0A]"
                  />
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">
                  Total Candidates
                </p>
              </Card>

              {/* Completed */}
              <Card className="bg-white border border-[#E5E7EB] rounded-lg p-6 ring-0 gap-0 py-6">
                <CheckCircle2 className="w-5 h-5 text-gray-400 mb-2" />
                <div className="flex items-baseline gap-1">
                  <CountUp
                    from={0}
                    to={completedInterviews}
                    duration={2}
                    className="text-3xl font-bold text-[#0A0A0A]"
                  />
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">
                  Completed
                </p>
              </Card>

              {/* Avg Score */}
              <Card className="bg-white border border-[#E5E7EB] rounded-lg p-6 ring-0 gap-0 py-6">
                <TrendingUp className="w-5 h-5 text-gray-400 mb-2" />
                <div className="flex items-baseline gap-1">
                  <CountUp
                    from={0}
                    to={7.2}
                    duration={2}
                    className="text-3xl font-bold text-[#0A0A0A]"
                  />
                  <span className="text-lg text-gray-400"> / 10</span>
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">
                  Avg Score
                </p>
              </Card>

              {/* Hire Rate */}
              <Card className="bg-white border border-[#E5E7EB] rounded-lg p-6 ring-0 gap-0 py-6">
                <TrendingUp className="w-5 h-5 text-gray-400 mb-2" />
                <div className="flex items-baseline gap-1">
                  <CountUp
                    from={0}
                    to={65}
                    duration={2}
                    className="text-3xl font-bold text-[#0A0A0A]"
                  />
                  <span className="text-lg text-gray-400">%</span>
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">
                  Hire Rate
                </p>
              </Card>
            </div>
          </AnimatedContent>

          {/* Candidate table */}
          <AnimatedContent direction="vertical" distance={20}>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <Input
                placeholder="Search candidates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border border-[#E5E7EB] rounded-lg h-9"
              />
            </div>

            {/* Table */}
            <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-6 gap-4 px-4 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
                {["Candidate", "Role", "Date", "Status", "Score", "Action"].map(
                  (header) => (
                    <span
                      key={header}
                      className="text-xs text-gray-500 uppercase tracking-wider font-medium"
                    >
                      {header}
                    </span>
                  )
                )}
              </div>

              {/* Body */}
              {loading ? (
                <div className="p-4 flex flex-col gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-12 bg-gray-100 animate-pulse rounded"
                    />
                  ))}
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  No candidates found
                </div>
              ) : (
                filteredCandidates.map((candidate) => {
                  const interview = interviewMap.get(candidate.id);
                  const isCompleted = interview?.status === "completed";

                  return (
                    <div
                      key={candidate.id}
                      className="grid grid-cols-6 gap-4 px-4 py-3 border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors items-center last:border-b-0"
                    >
                      {/* Col 1 — Candidate */}
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarFallback className="text-xs bg-[#F3F4F6] text-gray-600 font-medium">
                            {candidate.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#0A0A0A] truncate">
                            {candidate.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {candidate.email}
                          </p>
                        </div>
                      </div>

                      {/* Col 2 — Role */}
                      <span className="text-sm text-gray-700 truncate">
                        {interview?.job_role ?? "—"}
                      </span>

                      {/* Col 3 — Date */}
                      <span className="text-sm text-gray-500">
                        {formatDate(candidate.created_at)}
                      </span>

                      {/* Col 4 — Status */}
                      <div>
                        {interview ? (
                          <Badge
                            className={INTERVIEW_STATUS[interview.status].color}
                            variant="outline"
                          >
                            {INTERVIEW_STATUS[interview.status].label}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </div>

                      {/* Col 5 — Score */}
                      <span className="text-sm font-semibold text-gray-500">—</span>

                      {/* Col 6 — Action */}
                      <div>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!isCompleted}
                          onClick={() =>
                            interview && navigate(`/hr/report/${interview.id}`)
                          }
                          className="text-[#2563EB] hover:text-[#1D4ED8] hover:bg-blue-50 disabled:opacity-40"
                        >
                          View Report
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </AnimatedContent>
        </FadeContent>
      </main>
    </div>
  );
}
