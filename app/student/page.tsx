"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";

type ProfileItem = {
  id: string;
  full_name: string | null;
  role: "student" | "teacher" | "admin";
  class_name: string | null;
};

type ModuleItem = {
  id: number;
  title: string;
  description: string | null;
  order_no: number;
};

type AssessmentItem = {
  id: number;
  title: string;
  description: string | null;
  type: "bsb" | "chsb";
  module_id: number | null;
  duration_minutes: number;
  max_score: number | null;
};

type SubmissionItem = {
  id: number;
  assessment_id: number;
  student_name: string;
  student_class: string | null;
  status: "submitted" | "reviewed" | "returned";
  teacher_score: number | null;
  teacher_comment: string | null;
  submitted_at: string;
  submitted_late: boolean;
};

type QuizAttemptItem = {
  id: number;
  assessment_id: number;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  earned_points: number;
  total_points: number;
  percentage: number;
  time_up: boolean;
  created_at: string;
};

export default function StudentPage() {
  const [profile, setProfile] = useState<ProfileItem | null>(null);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttemptItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      const supabase = createBrowserClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, role, class_name")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      const { data: moduleData } = await supabase
        .from("modules")
        .select("id, title, description, order_no")
        .eq("is_published", true)
        .order("order_no", { ascending: true });

      if (moduleData) {
        setModules(moduleData);
      }

      const { data: assessmentData } = await supabase
        .from("assessments")
        .select("id, title, description, type, module_id, duration_minutes, max_score")
        .in("type", ["bsb", "chsb"])
        .eq("is_published", true)
        .order("id", { ascending: false });

      if (assessmentData) {
        setAssessments(assessmentData as AssessmentItem[]);
      }

      const { data: submissionData } = await supabase
        .from("bsb_submissions")
        .select(
          "id, assessment_id, student_name, student_class, status, teacher_score, teacher_comment, submitted_at, submitted_late"
        )
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false });

      if (submissionData) {
        setSubmissions(submissionData as SubmissionItem[]);
      }

      const { data: attemptData } = await supabase
        .from("quiz_attempts")
        .select(
          "id, assessment_id, total_questions, correct_answers, wrong_answers, earned_points, total_points, percentage, time_up, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (attemptData) {
        setQuizAttempts(attemptData as QuizAttemptItem[]);
      }

      setLoading(false);
    };

    loadDashboard();
  }, []);

  const stats = useMemo(() => {
    const bestQuiz =
      quizAttempts.length > 0
        ? Math.max(...quizAttempts.map((item) => item.percentage))
        : 0;

    return {
      totalModules: modules.length,
      totalBsb: assessments.filter((item) => item.type === "bsb").length,
      totalChsb: assessments.filter((item) => item.type === "chsb").length,
      mySubmissions: submissions.length,
      reviewed: submissions.filter((item) => item.status === "reviewed").length,
      myQuizAttempts: quizAttempts.length,
      bestQuiz,
    };
  }, [modules, assessments, submissions, quizAttempts]);

  const recentSubmissions = submissions.slice(0, 5);
  const recentQuizAttempts = quizAttempts.slice(0, 5);

  const getAssessmentTitle = (assessmentId: number) => {
    return assessments.find((item) => item.id === assessmentId)?.title || "Nazorat";
  };

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex gap-4">
          <Link href="/" className="text-blue-600 font-medium">
            ← Bosh sahifa
          </Link>
          <Link href="/profile" className="text-blue-600 font-medium">
            ← Profil
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-8 mb-8">
          <p className="text-sm text-blue-700 font-medium mb-3">Student panel</p>
          <h1 className="text-3xl font-bold text-slate-800 mb-3">
            O‘quvchi kabineti
          </h1>
          <p className="text-slate-600">
            {profile?.full_name
              ? `${profile.full_name}, kabinetga xush kelibsiz.`
              : "Kabinetga xush kelibsiz."}
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-md p-8 text-slate-600">
            Yuklanmoqda...
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-6 mb-8">
              <div className="bg-white rounded-2xl shadow-md p-6">
                <p className="text-sm text-slate-500 mb-2">Modullar</p>
                <p className="text-3xl font-bold text-slate-800">{stats.totalModules}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-md p-6">
                <p className="text-sm text-slate-500 mb-2">BSB</p>
                <p className="text-3xl font-bold text-amber-600">{stats.totalBsb}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-md p-6">
                <p className="text-sm text-slate-500 mb-2">CHSB</p>
                <p className="text-3xl font-bold text-rose-600">{stats.totalChsb}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-md p-6">
                <p className="text-sm text-slate-500 mb-2">BSB submissions</p>
                <p className="text-3xl font-bold text-blue-600">{stats.mySubmissions}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-md p-6">
                <p className="text-sm text-slate-500 mb-2">CHSB attempts</p>
                <p className="text-3xl font-bold text-purple-600">{stats.myQuizAttempts}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-md p-6">
                <p className="text-sm text-slate-500 mb-2">Eng yaxshi CHSB</p>
                <p className="text-3xl font-bold text-emerald-600">{stats.bestQuiz}%</p>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              <div className="bg-white rounded-2xl shadow-md p-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">
                  Modullar
                </h2>

                {modules.length === 0 ? (
                  <p className="text-slate-600">Modullar topilmadi.</p>
                ) : (
                  <div className="space-y-4">
                    {modules.map((item) => (
                      <Link key={item.id} href={`/modules/${item.id}`}>
                        <div className="border border-slate-200 rounded-2xl p-5 hover:shadow-md transition cursor-pointer">
                          <h3 className="text-xl font-bold text-slate-800 mb-2">
                            {item.order_no}. {item.title}
                          </h3>
                          <p className="text-slate-600">{item.description}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-md p-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">
                  Nazoratlar
                </h2>

                {assessments.length === 0 ? (
                  <p className="text-slate-600">Nazoratlar topilmadi.</p>
                ) : (
                  <div className="space-y-4">
                    {assessments.map((item) => (
                      <div
                        key={item.id}
                        className="border border-slate-200 rounded-2xl p-5"
                      >
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <h3 className="text-xl font-bold text-slate-800">
                            {item.title}
                          </h3>
                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-full ${
                              item.type === "bsb"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {item.type.toUpperCase()}
                          </span>
                        </div>

                        <p className="text-slate-600 mb-4">{item.description}</p>

                        <Link
                          href={item.type === "bsb" ? `/bsb/${item.id}` : `/quizzes/${item.id}`}
                          className="inline-block rounded-xl bg-blue-600 px-4 py-2 font-medium text-white"
                        >
                          {item.type === "bsb" ? "Topshirish" : "Boshlash"}
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-8 mt-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">
                Mening BSB topshiriqlarim
              </h2>

              {recentSubmissions.length === 0 ? (
                <p className="text-slate-600">
                  Hali yangi account bilan BSB submission qilinmagan.
                </p>
              ) : (
                <div className="space-y-4">
                  {recentSubmissions.map((item) => (
                    <div
                      key={item.id}
                      className="border border-slate-200 rounded-2xl p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                        <h3 className="text-lg font-bold text-slate-800">
                          {getAssessmentTitle(item.assessment_id)}
                        </h3>

                        <div className="flex gap-2">
                          {item.submitted_late && (
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-100 text-red-700">
                              Late
                            </span>
                          )}
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                            {item.status}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-slate-500 mb-2">
                        Topshirilgan vaqt: {new Date(item.submitted_at).toLocaleString()}
                      </p>

                      <p className="text-slate-700 mb-2">
                        Ball:{" "}
                        {item.teacher_score !== null ? item.teacher_score : "Hali qo‘yilmagan"}
                      </p>

                      <p className="text-slate-600 mb-4">
                        {item.teacher_comment || "Hali o‘qituvchi izohi yo‘q"}
                      </p>

                      <Link
                        href={`/bsb/${item.assessment_id}/status`}
                        className="inline-block rounded-xl border border-slate-200 px-4 py-2 font-medium text-slate-800"
                      >
                        Batafsil ko‘rish
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-md p-8 mt-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">
                Mening CHSB natijalarim
              </h2>

              {recentQuizAttempts.length === 0 ? (
                <p className="text-slate-600">
                  Hali CHSB attempt saqlanmagan.
                </p>
              ) : (
                <div className="space-y-4">
                  {recentQuizAttempts.map((item) => (
                    <div
                      key={item.id}
                      className="border border-slate-200 rounded-2xl p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                        <h3 className="text-lg font-bold text-slate-800">
                          {getAssessmentTitle(item.assessment_id)}
                        </h3>

                        <div className="flex gap-2">
                          {item.time_up && (
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-700">
                              Time up
                            </span>
                          )}
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-700">
                            {item.percentage}%
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-slate-500 mb-2">
                        Ishlangan vaqt: {new Date(item.created_at).toLocaleString()}
                      </p>

                      <p className="text-slate-700 mb-2">
                        To‘g‘ri / noto‘g‘ri: {item.correct_answers} / {item.wrong_answers}
                      </p>

                      <p className="text-slate-700">
                        Ball: {item.earned_points} / {item.total_points}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}