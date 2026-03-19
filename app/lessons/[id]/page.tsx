"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@/utils/supabase/client";

type LessonItem = {
  id: number;
  title: string;
  content: string | null;
  order_no: number;
  module_id: number;
};

type PracticeTask = {
  id: number;
  title: string;
  instruction: string;
  starter_sql: string | null;
  expected_result: string | null;
  order_no: number;
};

type AssessmentItem = {
  id: number;
  title: string;
  description: string | null;
  type: "lesson_quiz" | "bsb" | "chsb";
  duration_minutes: number;
};

export default function LessonPage() {
  const params = useParams();
  const lessonId = Number(params.id);

  const [lesson, setLesson] = useState<LessonItem | null>(null);
  const [prevLesson, setPrevLesson] = useState<LessonItem | null>(null);
  const [nextLesson, setNextLesson] = useState<LessonItem | null>(null);
  const [tasks, setTasks] = useState<PracticeTask[]>([]);
  const [assessment, setAssessment] = useState<AssessmentItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLesson = async () => {
      const supabase = createBrowserClient();

      const { data: lessonData, error: lessonError } = await supabase
        .from("lessons")
        .select("id, title, content, order_no, module_id")
        .eq("id", lessonId)
        .single();

      if (lessonError || !lessonData) {
        console.error(lessonError?.message);
        setLoading(false);
        return;
      }

      setLesson(lessonData);

      const { data: moduleLessons, error: listError } = await supabase
        .from("lessons")
        .select("id, title, content, order_no, module_id")
        .eq("module_id", lessonData.module_id)
        .eq("is_published", true)
        .order("order_no", { ascending: true });

      if (listError) {
        console.error(listError.message);
      } else {
        const lessonsList = moduleLessons || [];
        const currentIndex = lessonsList.findIndex((item) => item.id === lessonData.id);

        if (currentIndex > 0) {
          setPrevLesson(lessonsList[currentIndex - 1]);
        } else {
          setPrevLesson(null);
        }

        if (currentIndex < lessonsList.length - 1) {
          setNextLesson(lessonsList[currentIndex + 1]);
        } else {
          setNextLesson(null);
        }
      }

      const { data: tasksData, error: tasksError } = await supabase
        .from("practice_tasks")
        .select("id, title, instruction, starter_sql, expected_result, order_no")
        .eq("lesson_id", lessonData.id)
        .eq("is_published", true)
        .order("order_no", { ascending: true });

      if (tasksError) {
        console.error(tasksError.message);
      } else {
        setTasks(tasksData || []);
      }

      const { data: assessmentData, error: assessmentError } = await supabase
        .from("assessments")
        .select("id, title, description, type, duration_minutes")
        .eq("lesson_id", lessonData.id)
        .eq("is_published", true)
        .maybeSingle();

      if (assessmentError) {
        console.error(assessmentError.message);
      } else {
        setAssessment(assessmentData);
      }

      setLoading(false);
    };

    if (!Number.isNaN(lessonId)) {
      loadLesson();
    }
  }, [lessonId]);

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        {loading ? (
          <p className="text-slate-600">Yuklanmoqda...</p>
        ) : !lesson ? (
          <p className="text-red-600">Dars topilmadi.</p>
        ) : (
          <>
            <div className="mb-6 flex gap-4">
              <Link href="/" className="text-blue-600 font-medium">
                ← Bosh sahifa
              </Link>
              <Link
                href={`/modules/${lesson.module_id}`}
                className="text-blue-600 font-medium"
              >
                ← Modulga qaytish
              </Link>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-8 mb-8">
              <p className="text-sm text-emerald-700 font-medium mb-3">
                Dars #{lesson.order_no}
              </p>

              <h1 className="text-3xl font-bold text-slate-800 mb-4">
                {lesson.title}
              </h1>

              <div className="text-slate-700 text-lg leading-8">
                {lesson.content}
              </div>
            </div>

            {assessment && (
              <div className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-2xl shadow-md p-8 mb-8">
                <p className="text-sm opacity-90 mb-2">Mini test</p>
                <h2 className="text-2xl font-bold mb-2">{assessment.title}</h2>
                <p className="opacity-90 mb-4">{assessment.description}</p>
                <p className="text-sm mb-5">
                  Davomiyligi: {assessment.duration_minutes} daqiqa
                </p>

                <Link
                  href={`/quizzes/${assessment.id}`}
                  className="inline-block bg-white text-blue-700 font-semibold px-5 py-3 rounded-xl"
                >
                  Testni boshlash
                </Link>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-md p-8 mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">
                Amaliy topshiriqlar
              </h2>

              {tasks.length === 0 ? (
                <p className="text-slate-600">Bu dars uchun topshiriq hali qo‘shilmagan.</p>
              ) : (
                <div className="space-y-6">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="border border-slate-200 rounded-2xl p-5"
                    >
                      <h3 className="text-xl font-semibold text-slate-800 mb-3">
                        {task.order_no}. {task.title}
                      </h3>

                      <p className="text-slate-700 mb-4">{task.instruction}</p>

                      {task.starter_sql && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-slate-500 mb-2">
                            Namuna SQL:
                          </p>
                          <pre className="bg-slate-100 rounded-xl p-4 text-sm overflow-x-auto">
{task.starter_sql}
                          </pre>
                        </div>
                      )}

                      {task.expected_result && (
                        <p className="text-sm text-emerald-700">
                          Kutilgan natija: {task.expected_result}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
              <div>
                {prevLesson && (
                  <Link
                    href={`/lessons/${prevLesson.id}`}
                    className="inline-block bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-sm hover:shadow-md transition"
                  >
                    <span className="block text-sm text-slate-500">
                      ← Oldingi dars
                    </span>
                    <span className="block font-semibold text-slate-800">
                      {prevLesson.title}
                    </span>
                  </Link>
                )}
              </div>

              <div className="sm:text-right">
                {nextLesson && (
                  <Link
                    href={`/lessons/${nextLesson.id}`}
                    className="inline-block bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-sm hover:shadow-md transition"
                  >
                    <span className="block text-sm text-slate-500">
                      Keyingi dars →
                    </span>
                    <span className="block font-semibold text-slate-800">
                      {nextLesson.title}
                    </span>
                  </Link>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}