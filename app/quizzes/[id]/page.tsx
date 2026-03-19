"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";

type AssessmentItem = {
  id: number;
  title: string;
  description: string | null;
  type: "lesson_quiz" | "bsb" | "chsb";
  duration_minutes: number;
  lesson_id: number | null;
  module_id: number | null;
};

type OptionItem = {
  id: number;
  option_text: string;
  is_correct: boolean;
  order_no: number;
};

type QuestionItem = {
  id: number;
  question_text: string;
  order_no: number;
  points: number;
  skill_type: "general" | "bilish" | "qollash" | "mulohaza";
  assessment_options: OptionItem[];
};

type SaveStatus = "idle" | "saving" | "saved" | "error" | "guest";

export default function QuizPage() {
  const params = useParams();
  const assessmentId = Number(params.id);

  const [assessment, setAssessment] = useState<AssessmentItem | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [finished, setFinished] = useState(false);
  const [locked, setLocked] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const hasSavedAttemptRef = useRef(false);

  useEffect(() => {
    const loadQuiz = async () => {
      const supabase = createBrowserClient();

      const { data: assessmentData, error: assessmentError } = await supabase
        .from("assessments")
        .select("id, title, description, type, duration_minutes, lesson_id, module_id")
        .eq("id", assessmentId)
        .single();

      const { data: questionsData, error: questionsError } = await supabase
        .from("assessment_questions")
        .select(`
          id,
          question_text,
          order_no,
          points,
          skill_type,
          assessment_options (
            id,
            option_text,
            is_correct,
            order_no
          )
        `)
        .eq("assessment_id", assessmentId)
        .order("order_no", { ascending: true });

      if (assessmentError) {
        console.error(assessmentError.message);
      } else {
        setAssessment(assessmentData);
        setRemainingSeconds((assessmentData?.duration_minutes || 0) * 60);
      }

      if (questionsError) {
        console.error(questionsError.message);
      } else {
        const formatted: QuestionItem[] = (questionsData || []).map((item: any) => ({
          ...item,
          assessment_options: [...(item.assessment_options || [])].sort(
            (a, b) => a.order_no - b.order_no
          ),
        }));
        setQuestions(formatted);
      }

      setLoading(false);
    };

    if (!Number.isNaN(assessmentId)) {
      loadQuiz();
    }
  }, [assessmentId]);

  useEffect(() => {
    if (loading || finished || !assessment) return;
    if (assessment.duration_minutes <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimeUp(true);
          setFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, finished, assessment]);

  const currentQuestion = questions[currentIndex];

  const result = useMemo(() => {
    let totalQuestions = questions.length;
    let correct = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    const skillStats: Record<string, { correct: number; total: number }> = {};

    for (const question of questions) {
      totalPoints += question.points;

      if (!skillStats[question.skill_type]) {
        skillStats[question.skill_type] = { correct: 0, total: 0 };
      }

      skillStats[question.skill_type].total += 1;

      const selectedOptionId = answers[question.id];
      const correctOption = question.assessment_options.find((opt) => opt.is_correct);

      if (correctOption && selectedOptionId === correctOption.id) {
        correct += 1;
        earnedPoints += question.points;
        skillStats[question.skill_type].correct += 1;
      }
    }

    const wrong = totalQuestions - correct;
    const percentage =
      totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    return {
      totalQuestions,
      correct,
      wrong,
      earnedPoints,
      totalPoints,
      percentage,
      skillStats,
    };
  }, [answers, questions]);

  useEffect(() => {
    if (!finished || !assessment || questions.length === 0) return;
    if (hasSavedAttemptRef.current) return;

    const saveAttempt = async () => {
  hasSavedAttemptRef.current = true;

  const supabase = createBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    setSaveStatus("guest");
    return;
  }

  setSaveStatus("saving");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, class_name")
    .eq("id", user.id)
    .single();

  const { error } = await supabase.from("quiz_attempts").insert({
    user_id: user.id,
    assessment_id: assessment.id,
    student_name: profile?.full_name || user.email || "Nomsiz user",
    student_class: profile?.class_name || null,
    total_questions: result.totalQuestions,
    correct_answers: result.correct,
    wrong_answers: result.wrong,
    earned_points: result.earnedPoints,
    total_points: result.totalPoints,
    percentage: result.percentage,
    time_up: timeUp,
    skill_stats: result.skillStats,
  });

      if (error) {
        console.error(error.message);
        setSaveStatus("error");
        return;
      }

      setSaveStatus("saved");
    };

    saveAttempt();
  }, [finished, assessment, questions.length, result, timeUp]);

  const handleAnswer = (optionId: number) => {
    if (!currentQuestion || locked || finished) return;

    setLocked(true);

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));

    setTimeout(() => {
      if (currentIndex === questions.length - 1) {
        setFinished(true);
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
      setLocked(false);
    }, 350);
  };

  const restartQuiz = () => {
    setAnswers({});
    setCurrentIndex(0);
    setFinished(false);
    setLocked(false);
    setTimeUp(false);
    setRemainingSeconds((assessment?.duration_minutes || 0) * 60);
    setSaveStatus("idle");
    hasSavedAttemptRef.current = false;
  };

  const getSkillLabel = (key: string) => {
    if (key === "bilish") return "Bilish";
    if (key === "qollash") return "Qo‘llash";
    if (key === "mulohaza") return "Mulohaza";
    return "Umumiy";
  };

  const getAssessmentLabel = (type: AssessmentItem["type"]) => {
    if (type === "bsb") return "BSB";
    if (type === "chsb") return "CHSB";
    return "Mini test";
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="max-w-4xl mx-auto text-slate-600">Yuklanmoqda...</div>
      </main>
    );
  }

  if (!assessment || questions.length === 0) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="max-w-4xl mx-auto text-red-600">Test topilmadi.</div>
      </main>
    );
  }

  if (finished) {
    const skillEntries = Object.entries(result.skillStats).filter(
      ([key]) => key !== "general"
    );

    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-md p-8 mb-8">
            <p className="text-sm text-emerald-700 font-medium mb-3">
              {getAssessmentLabel(assessment.type)} natijalari
            </p>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              {assessment.title}
            </h1>
            <p className="text-slate-600">
              {timeUp
                ? "Vaqt tugadi. Test avtomatik yakunlandi."
                : "Test yakunlandi. Quyida natijangiz ko‘rsatilgan."}
            </p>
          </div>

          {saveStatus === "saving" && (
            <div className="bg-blue-50 text-blue-700 rounded-2xl px-5 py-4 mb-6">
              Natija bazaga saqlanmoqda...
            </div>
          )}

          {saveStatus === "saved" && (
            <div className="bg-emerald-50 text-emerald-700 rounded-2xl px-5 py-4 mb-6">
              Natija bazaga muvaffaqiyatli saqlandi.
            </div>
          )}

          {saveStatus === "guest" && (
            <div className="bg-amber-50 text-amber-700 rounded-2xl px-5 py-4 mb-6">
              Siz login qilmagansiz, shu sabab natija bazaga saqlanmadi.
            </div>
          )}

          {saveStatus === "error" && (
            <div className="bg-red-50 text-red-700 rounded-2xl px-5 py-4 mb-6">
              Natijani bazaga saqlashda xato yuz berdi.
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <div className="bg-white rounded-2xl shadow-md p-6">
              <p className="text-sm text-slate-500 mb-2">Savollar soni</p>
              <p className="text-3xl font-bold text-slate-800">
                {result.totalQuestions}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6">
              <p className="text-sm text-slate-500 mb-2">To‘g‘ri</p>
              <p className="text-3xl font-bold text-emerald-600">
                {result.correct}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6">
              <p className="text-sm text-slate-500 mb-2">Noto‘g‘ri</p>
              <p className="text-3xl font-bold text-red-600">
                {result.wrong}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6">
              <p className="text-sm text-slate-500 mb-2">Foiz</p>
              <p className="text-3xl font-bold text-blue-600">
                {result.percentage}%
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-8 mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">
              Umumiy hisobot
            </h2>
            <p className="text-slate-700 mb-2">
              Ball: <span className="font-semibold">{result.earnedPoints}</span> / {result.totalPoints}
            </p>
            <p className="text-slate-700">
              Natija: <span className="font-semibold">{result.correct}</span> ta to‘g‘ri,{" "}
              <span className="font-semibold">{result.wrong}</span> ta noto‘g‘ri
            </p>
          </div>

          {(assessment.type === "chsb" || assessment.type === "bsb") &&
            skillEntries.length > 0 && (
              <div className="bg-white rounded-2xl shadow-md p-8 mb-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">
                  Ko‘nikmalar bo‘yicha natija
                </h2>

                <div className="grid gap-4 md:grid-cols-3">
                  {skillEntries.map(([key, value]) => (
                    <div
                      key={key}
                      className="border border-slate-200 rounded-2xl p-5"
                    >
                      <p className="text-sm text-slate-500 mb-2">
                        {getSkillLabel(key)}
                      </p>
                      <p className="text-2xl font-bold text-slate-800">
                        {value.correct} / {value.total}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          <div className="flex flex-wrap gap-4">
            <button
              onClick={restartQuiz}
              className="bg-blue-600 text-white px-5 py-3 rounded-xl font-semibold"
            >
              Qayta ishlash
            </button>

            {assessment.lesson_id && (
              <Link
                href={`/lessons/${assessment.lesson_id}`}
                className="bg-white border border-slate-200 px-5 py-3 rounded-xl font-semibold text-slate-800"
              >
                Darsga qaytish
              </Link>
            )}

            {assessment.module_id && !assessment.lesson_id && (
              <Link
                href={`/modules/${assessment.module_id}`}
                className="bg-white border border-slate-200 px-5 py-3 rounded-xl font-semibold text-slate-800"
              >
                Modulga qaytish
              </Link>
            )}

            <Link
              href="/"
              className="bg-white border border-slate-200 px-5 py-3 rounded-xl font-semibold text-slate-800"
            >
              Bosh sahifa
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const colors = [
    "bg-red-500 hover:bg-red-600",
    "bg-blue-500 hover:bg-blue-600",
    "bg-yellow-500 hover:bg-yellow-600",
    "bg-emerald-500 hover:bg-emerald-600",
  ];

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-sm text-slate-500">
                {getAssessmentLabel(assessment.type)}
              </p>
              <h1 className="text-2xl font-bold text-slate-800">
                {assessment.title}
              </h1>
            </div>

            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-sm text-slate-500">Savol</p>
                <p className="text-xl font-bold text-slate-800">
                  {currentIndex + 1} / {questions.length}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm text-slate-500">Vaqt</p>
                <p
                  className={`text-xl font-bold ${
                    remainingSeconds <= 60 ? "text-red-600" : "text-slate-800"
                  }`}
                >
                  {formatTime(remainingSeconds)}
                </p>
              </div>
            </div>
          </div>

          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 h-3 transition-all"
              style={{
                width: `${((currentIndex + 1) / questions.length) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-8 mb-6 text-center">
          <p className="text-sm text-emerald-700 font-medium mb-3">
            {getSkillLabel(currentQuestion.skill_type)}
          </p>

          <h2 className="text-3xl font-bold text-slate-800 leading-snug">
            {currentQuestion.question_text}
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {currentQuestion.assessment_options.map((option, index) => (
            <button
              key={option.id}
              onClick={() => handleAnswer(option.id)}
              disabled={locked}
              className={`${colors[index % colors.length]} text-white rounded-2xl p-8 text-left shadow-md transition transform hover:scale-[1.01] disabled:opacity-70`}
            >
              <span className="block text-sm opacity-90 mb-2">
                Variant {index + 1}
              </span>
              <span className="block text-2xl font-bold">
                {option.option_text}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}