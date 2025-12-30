import React, { useState } from 'react';
import { QuizData, UserAnswerValue } from '../types';
import { McqQuestion, FillBlankQuestion, MatchingQuestion } from './QuestionRenderers';
import { InteractiveText } from './InteractiveText';
import { CheckCircleIcon, XCircleIcon, ArrowRightIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

interface QuizInterfaceProps {
  quiz: QuizData;
  onRestart: () => void;
}

export const QuizInterface: React.FC<QuizInterfaceProps> = ({ quiz, onRestart }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, UserAnswerValue>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const currentQuestion = quiz.questions[currentIndex];
  // Ensure glossary exists (backward compatibility or safety)
  const glossary = quiz.glossary || [];

  const handleAnswer = (val: UserAnswerValue) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));
  };

  const calculateScore = () => {
    let newScore = 0;
    quiz.questions.forEach(q => {
      const ans = answers[q.id];
      if (!ans) return;

      if (q.type === 'mcq') {
        if (ans === q.content.correct_answer) newScore++;
      } else if (q.type === 'fill_blank') {
        if (typeof ans === 'string' && ans.toLowerCase().trim() === (q.content.correct_answer || '').toLowerCase().trim()) {
          newScore++;
        }
      } else if (q.type === 'matching') {
        // For matching, we require ALL pairs to be correct to get the point
        const userPairs = ans as Record<string, string>;
        const correctPairs = q.content.pairs || [];
        const isAllCorrect = correctPairs.every(p => userPairs[p.left] === p.right);
        if (isAllCorrect && Object.keys(userPairs).length === correctPairs.length) {
          newScore++;
        }
      }
    });
    setScore(newScore);
    setIsSubmitted(true);
  };

  const isLastQuestion = currentIndex === quiz.questions.length - 1;
  const progress = ((currentIndex + 1) / quiz.questions.length) * 100;

  // -- Results View --
  if (isSubmitted) {
    const percentage = Math.round((score / quiz.questions.length) * 100);
    let feedback = "Bon effort!";
    if (percentage === 100) feedback = "Excellent! Parfait!";
    else if (percentage >= 80) feedback = "Très bien!";
    else if (percentage >= 60) feedback = "Bien joué.";
    
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in">
        <div className="bg-french-blue text-white p-8 text-center">
            <h2 className="text-3xl font-serif font-bold mb-2">{feedback}</h2>
            <p className="opacity-90">You scored {score} out of {quiz.questions.length}</p>
        </div>
        
        <div className="p-8 space-y-8">
            {quiz.questions.map((q, idx) => {
                const ans = answers[q.id];
                // Quick check for correctness for icon display (simplified logic)
                let correct = false;
                if (q.type === 'mcq') correct = ans === q.content.correct_answer;
                else if (q.type === 'fill_blank') correct = typeof ans === 'string' && ans.toLowerCase().trim() === (q.content.correct_answer||'').toLowerCase().trim();
                else if (q.type === 'matching') {
                    const u = ans as Record<string,string> || {};
                    correct = (q.content.pairs||[]).every(p => u[p.left] === p.right);
                }

                return (
                    <div key={q.id} className="border-b border-slate-100 last:border-0 pb-6 last:pb-0">
                        <div className="flex items-start gap-3 mb-2">
                             {correct ? (
                                 <CheckCircleIcon className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                             ) : (
                                 <XCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                             )}
                             <div>
                                 <h3 className="font-semibold text-slate-800 flex flex-wrap gap-1">
                                     <span className="mr-1">Q{idx+1}:</span>
                                     <InteractiveText text={q.question_text} glossary={glossary} />
                                 </h3>
                                 <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                     <span className="font-bold text-slate-700">Explanation:</span> {q.explanation}
                                 </p>
                             </div>
                        </div>
                    </div>
                );
            })}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
            <button 
                onClick={onRestart}
                className="flex items-center gap-2 px-8 py-3 bg-french-dark text-white rounded-full font-medium hover:bg-black transition-colors shadow-lg hover:shadow-xl"
            >
                <ArrowPathIcon className="w-5 h-5" />
                Generate New Quiz
            </button>
        </div>
      </div>
    );
  }

  // -- Active Quiz View --
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header Info */}
      <div className="mb-8 flex items-center justify-between text-slate-600">
        <span className="font-serif italic text-french-blue font-bold">{quiz.topic}</span>
        <span className="bg-slate-200 text-xs font-bold px-2 py-1 rounded text-slate-600">{quiz.cefr_level} • {quiz.sub_difficulty}</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
        <div 
            className="bg-french-blue h-2 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-xl p-8 min-h-[400px] flex flex-col relative overflow-visible z-10">
        
        {/* Question Header */}
        <div className="mb-6">
            <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">Question {currentIndex + 1} of {quiz.questions.length}</span>
            <h2 className="text-2xl font-bold text-slate-800 mt-2 font-serif leading-tight">
                <InteractiveText text={currentQuestion.question_text} glossary={glossary} />
            </h2>
        </div>

        {/* Question Content */}
        <div className="flex-grow">
            {currentQuestion.type === 'mcq' && (
                <McqQuestion 
                    question={currentQuestion} 
                    glossary={glossary}
                    currentAnswer={answers[currentQuestion.id]} 
                    onAnswer={handleAnswer} 
                    isSubmitted={false} 
                />
            )}
            {currentQuestion.type === 'fill_blank' && (
                <FillBlankQuestion 
                    question={currentQuestion} 
                    glossary={glossary}
                    currentAnswer={answers[currentQuestion.id]} 
                    onAnswer={handleAnswer} 
                    isSubmitted={false} 
                />
            )}
            {currentQuestion.type === 'matching' && (
                <MatchingQuestion 
                    question={currentQuestion} 
                    glossary={glossary}
                    currentAnswer={answers[currentQuestion.id]} 
                    onAnswer={handleAnswer} 
                    isSubmitted={false} 
                />
            )}
        </div>

        {/* Navigation */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
             <button 
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="text-slate-400 hover:text-slate-600 font-medium disabled:opacity-30 px-4 py-2"
             >
                 Back
             </button>

             {isLastQuestion ? (
                 <button
                    onClick={calculateScore}
                    disabled={!answers[currentQuestion.id]} // basic validation
                    className="bg-french-red text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-red-600 hover:shadow-xl transition-all disabled:opacity-50 disabled:shadow-none"
                 >
                     Submit Quiz
                 </button>
             ) : (
                 <button
                    onClick={() => setCurrentIndex(prev => Math.min(quiz.questions.length - 1, prev + 1))}
                    className="flex items-center gap-2 bg-french-blue text-white px-6 py-3 rounded-full font-medium shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all"
                 >
                     Next
                     <ArrowRightIcon className="w-4 h-4" />
                 </button>
             )}
        </div>
      </div>
    </div>
  );
};
