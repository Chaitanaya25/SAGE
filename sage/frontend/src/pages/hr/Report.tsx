import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getReport, getInterview } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import FadeContent from "@/components/FadeContent";
import AnimatedContent from "@/components/AnimatedContent";
import CountUp from "@/components/CountUp";
import { SCORE_DIMENSIONS, RECOMMENDATION_CONFIG } from "@/lib/constants";
import { ArrowLeft, Download, Share2, User, Briefcase, Calendar } from "lucide-react";
import type { Report as ReportType } from "@/types";

// -----------------------------------------------------------------------
// Types for the scores_json payload from evaluate_full_interview
// -----------------------------------------------------------------------
interface PerQuestionScore {
  question: string;
  category: string;
  scores: Record<string, number>;
  feedback: string;
}

interface ScoresJson {
  average_scores?: Record<string, number>;
  per_question_scores?: PerQuestionScore[];
}

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function scoreColor(score: number): string {
  if (score >= 7) return "bg-[#2563EB]";
  if (score >= 5) return "bg-yellow-400";
  return "bg-red-400";
}

/** Custom score bar — avoids fighting with Progress's hardcoded bg-primary */
function ScoreBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${scoreColor(value)}`}
        style={{ width: `${Math.min(value * 10, 100)}%` }}
      />
    </div>
  );
}

// -----------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------

export default function Report() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [report, setReport] = useState<ReportType | null>(null);
  const [interview, setInterview] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const [reportData, interviewData] = await Promise.all([
          getReport(id!),
          getInterview(id!),
        ]);
        setReport(reportData as ReportType);
        setInterview(interviewData as Record<string, unknown>);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Report not yet generated";
        setError(msg.includes("404") || msg.includes("not found") ? "Report not yet generated" : msg);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const scoresJson: ScoresJson = (report?.scores_json as ScoresJson) ?? {};
  const avgScores: Record<string, number> = scoresJson.average_scores ?? {};
  const perQuestionScores: PerQuestionScore[] = scoresJson.per_question_scores ?? [];
  const recConfig = report ? RECOMMENDATION_CONFIG[report.recommendation] : null;

  return (
    <div className="max-w-4xl mx-auto p-8 bg-[#FAFAFA] min-h-screen">
      <FadeContent blur duration={800}>
        {/* Back nav */}
        <button
          onClick={() => navigate("/hr/dashboard")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#0A0A0A] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-lg" />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <p className="text-gray-500 text-lg">{error}</p>
            <Button variant="outline" onClick={() => navigate("/hr/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        )}

        {/* Report content */}
        {!loading && !error && report && (
          <>
            {/* Section 1 — Candidate Info */}
            <AnimatedContent direction="vertical" distance={20} className="mb-6">
              <Card className="bg-white border border-[#E5E7EB] rounded-lg p-6 ring-0 gap-0 py-6">
                <div className="flex items-center gap-6">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-full bg-[#2563EB] flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-xl">C</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xl font-semibold text-[#0A0A0A]">
                      {String(interview?.candidate_id ?? "Candidate")}
                    </p>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <User className="w-3.5 h-3.5 shrink-0" />
                      <span>Candidate ID: {String(interview?.candidate_id ?? "—")}</span>
                    </div>
                  </div>

                  {/* Right meta */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {interview?.job_role && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        {String(interview.job_role)}
                      </Badge>
                    )}
                    {interview?.created_at && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(String(interview.created_at))}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </AnimatedContent>

            {/* Section 2 — Score Bars */}
            <AnimatedContent direction="vertical" distance={20} className="mb-6">
              <Card className="bg-white border border-[#E5E7EB] rounded-lg p-6 ring-0 gap-0 py-6">
                <p className="text-lg font-semibold text-[#0A0A0A] mb-4">
                  Evaluation Scores
                </p>

                {SCORE_DIMENSIONS.map((dim) => {
                  const raw = avgScores[dim.key] ?? 5;
                  const score = Number(raw.toFixed(1));
                  return (
                    <div key={dim.key} className="mb-4 last:mb-0">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {dim.label}
                        </span>
                        <span className="flex items-baseline gap-1">
                          <CountUp
                            from={0}
                            to={score}
                            duration={1.5}
                            className="text-sm font-bold text-[#0A0A0A]"
                          />
                          <span className="text-sm text-gray-400"> / 10</span>
                        </span>
                      </div>
                      <ScoreBar value={score} />
                    </div>
                  );
                })}

                <hr className="border-[#E5E7EB] my-4" />

                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold text-[#0A0A0A]">
                    Overall Score
                  </span>
                  <span className="flex items-baseline gap-1">
                    <CountUp
                      from={0}
                      to={Number(report.overall_score.toFixed(1))}
                      duration={2}
                      className="text-2xl font-bold text-[#0A0A0A]"
                    />
                    <span className="text-lg text-gray-400"> / 10</span>
                  </span>
                </div>
              </Card>
            </AnimatedContent>

            {/* Section 3 — Transcript Accordion */}
            <AnimatedContent direction="vertical" distance={20} className="mb-6">
              <Card className="bg-white border border-[#E5E7EB] rounded-lg p-6 ring-0 gap-0 py-6">
                <p className="text-lg font-semibold text-[#0A0A0A] mb-4">
                  Interview Transcript
                </p>

                {perQuestionScores.length > 0 ? (
                  <Accordion type="single" collapsible className="w-full">
                    {perQuestionScores.map((entry, index) => {
                      const entryAvg =
                        (
                          (entry.scores.technical_depth ?? 5) +
                          (entry.scores.communication ?? 5) +
                          (entry.scores.relevance ?? 5) +
                          (entry.scores.confidence ?? 5)
                        ) / 4;

                      return (
                        <AccordionItem key={index} value={`q-${index}`}>
                          <AccordionTrigger className="text-left hover:no-underline">
                            <span className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                              <span className="text-sm font-medium text-gray-500 shrink-0">
                                Q{index + 1}
                              </span>
                              <span className="text-sm font-medium text-[#0A0A0A] truncate">
                                {entry.question}
                              </span>
                              <Badge
                                className={`ml-auto shrink-0 ${scoreColor(entryAvg)} text-white border-0`}
                                variant="outline"
                              >
                                {entryAvg.toFixed(1)}
                              </Badge>
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="pt-1 pb-2 space-y-3">
                              {/* Per-dimension mini scores */}
                              <div className="flex flex-wrap gap-2">
                                <span className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-0.5">
                                  tech: {entry.scores.technical_depth ?? "—"}
                                </span>
                                <span className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-0.5">
                                  comm: {entry.scores.communication ?? "—"}
                                </span>
                                <span className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-0.5">
                                  rel: {entry.scores.relevance ?? "—"}
                                </span>
                                <span className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-0.5">
                                  conf: {entry.scores.confidence ?? "—"}
                                </span>
                              </div>

                              {/* Feedback */}
                              {entry.feedback && (
                                <p className="text-sm text-gray-600 italic border-l-2 border-[#E5E7EB] pl-3">
                                  {entry.feedback}
                                </p>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                ) : (
                  <p className="text-gray-400 text-sm">
                    Transcript details will be available once the evaluation is complete.
                  </p>
                )}
              </Card>
            </AnimatedContent>

            {/* Section 4 — Recommendation */}
            {recConfig && (
              <AnimatedContent direction="vertical" distance={20} className="mb-6">
                <Card
                  className={`bg-white border border-[#E5E7EB] border-l-4 ${recConfig.border} rounded-lg p-6 ring-0 gap-0 py-6`}
                >
                  <p className={`text-lg font-bold ${recConfig.color}`}>
                    {recConfig.label}
                  </p>

                  <p className="text-sm text-gray-700 leading-relaxed mt-3">
                    {report.summary}
                  </p>

                  {report.strengths.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-green-700 mb-2">
                        Strengths
                      </p>
                      <ul className="space-y-1">
                        {report.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {report.weaknesses.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-semibold text-red-700 mb-2">
                        Areas for Improvement
                      </p>
                      <ul className="space-y-1">
                        {report.weaknesses.map((w, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {report.suggested_follow_up.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-semibold text-yellow-700 mb-2">
                        Suggested Follow-up Questions
                      </p>
                      <ul className="space-y-1">
                        {report.suggested_follow_up.map((q, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              </AnimatedContent>
            )}

            {/* Section 5 — Actions */}
            <AnimatedContent direction="vertical" distance={20}>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => console.log("PDF download — coming soon")}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => console.log("Share — coming soon")}
                  className="flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share with Team
                </Button>
              </div>
            </AnimatedContent>
          </>
        )}
      </FadeContent>
    </div>
  );
}
