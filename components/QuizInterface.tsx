
import React, { useState } from 'react';
import { QuizData, UserAnswerValue, Question } from '../types';
import { McqQuestion, FillBlankQuestion, MatchingQuestion } from './QuestionRenderers';
import { InteractiveText } from './InteractiveText';
import { CheckCircleIcon, XCircleIcon, ArrowRightIcon, ArrowPathIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';

interface QuizInterfaceProps {
  quiz: QuizData;
  onRestart: () => void;
}

export const QuizInterface: React.FC<QuizInterfaceProps> = ({ quiz, onRestart }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, UserAnswerValue>>({});
  const [checkedState, setCheckedState] = useState<Record<number, boolean>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);

  const currentQuestion = quiz.questions[currentIndex];
  const glossary = quiz.glossary || [];
  const isChecked = !!checkedState[currentQuestion.id];

  const handleAnswer = (val: UserAnswerValue) => {
    if (isChecked) return; // Prevent changing answer after checking
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));
  };

  const checkCorrectness = (q: Question, ans: UserAnswerValue) => {
      if (!ans) return false;
      if (q.type === 'mcq') {
        return ans === q.content.correct_answer;
      } else if (q.type === 'fill_blank') {
        return typeof ans === 'string' && ans.toLowerCase().trim() === (q.content.correct_answer || '').toLowerCase().trim();
      } else if (q.type === 'matching') {
        const userPairs = ans as Record<string, string>;
        const correctPairs = q.content.pairs || [];
        // Must match all pairs
        if (Object.keys(userPairs).length !== correctPairs.length) return false;
        return correctPairs.every(p => userPairs[p.left] === p.right);
      }
      return false;
  };

  const handleCheck = () => {
    const ans = answers[currentQuestion.id];
    const isCorrect = checkCorrectness(currentQuestion, ans);
    
    if (isCorrect) {
        setScore(prev => prev + 1);
    }
    setCheckedState(prev => ({ ...prev, [currentQuestion.id]: true }));
  };

  const handleNext = () => {
    if (currentIndex < quiz.questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
    } else {
        setIsFinished(true);
    }
  };

  const isCurrentCorrect = isChecked && checkCorrectness(currentQuestion, answers[currentQuestion.id]);

  const canCheck = () => {
      const ans = answers[currentQuestion.id];
      if (!ans) return false;
      if (currentQuestion.type === 'matching') {
           const pairs = currentQuestion.content.pairs || [];
           const userPairs = ans as Record<string, string>;
           return Object.keys(userPairs).length === pairs.length;
      }
      if (typeof ans === 'string' && ans.trim() === '') return false;
      return true;
  };

  const isLastQuestion = currentIndex === quiz.questions.length - 1;
  const progress = ((currentIndex + (isChecked ? 1 : 0)) / quiz.questions.length) * 100;

  // -- Results View (Final Summary) --
  if (isFinished) {
    const percentage = Math.round((score / quiz.questions.length) * 100);
    let feedback = "Bon effort!";
    if (percentage === 100) feedback = "Excellent! Parfait!";
    else if (percentage >= 80) feedback = "Très bien!";
    else if (percentage >= 60) feedback = "Bien joué.";
    
    return (
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden animate-fade-in transition-colors">
        <div className="bg-french-blue dark:bg-slate-800 text-white p-8 text-center">
            <h2 className="text-3xl font-serif font-bold mb-2">{feedback}</h2>
            <p className="opacity-90">You scored {score} out of {quiz.questions.length}</p>
        </div>
        
        <div className="p-8 space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-4">Summary</h3>
            {quiz.questions.map((q, idx) => {
                const ans = answers[q.id];
                const correct = checkCorrectness(q, ans);

                return (
                    <div key={q.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                             {correct ? (
                                 <CheckCircleIcon className="w-5 h-5 text-green-500" />
                             ) : (
                                 <XCircleIcon className="w-5 h-5 text-red-500" />
                             )}
                             <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Question {idx+1}</span>
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                            {correct ? "Correct" : "Incorrect"}
                        </div>
                    </div>
                );
            })}
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-center">
            <button 
                onClick={onRestart}
                className="flex items-center gap-2 px-8 py-3 bg-french-dark dark:bg-slate-700 text-white rounded-full font-medium hover:bg-black dark:hover:bg-slate-600 transition-colors shadow-lg hover:shadow-xl"
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
      <div className="mb-8 flex items-start justify-between">
        <div>
             <h1 className="font-serif italic text-french-blue dark:text-blue-400 font-bold text-xl">{quiz.topic}</h1>
             <div className="mt-1">
                <span className="inline-block bg-slate-100 dark:bg-slate-800 text-xs font-bold px-2 py-0.5 rounded text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    {quiz.cefr_level} • {quiz.sub_difficulty}
                </span>
             </div>
        </div>
        
        <button 
            onClick={onRestart}
            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all text-sm font-medium"
            title="End Quiz and Return to Menu"
        >
            <span>End</span>
            <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mb-8">
        <div 
            className="bg-french-blue dark:bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 min-h-[400px] flex flex-col relative overflow-visible z-10 transition-all">
        
        {/* Question Header */}
        <div className="mb-6">
            <div className="flex justify-between items-start">
                <span className="text-xs font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">Question {currentIndex + 1} of {quiz.questions.length}</span>
                {isChecked && (
                    <span className={`flex items-center gap-1 text-sm font-bold ${isCurrentCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                        {isCurrentCorrect ? (
                            <>
                                <CheckCircleIcon className="w-5 h-5" /> Correct
                            </>
                        ) : (
                            <>
                                <XCircleIcon className="w-5 h-5" /> Incorrect
                            </>
                        )}
                    </span>
                )}
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-2 font-serif leading-tight">
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
                    isSubmitted={isChecked} 
                />
            )}
            {currentQuestion.type === 'fill_blank' && (
                <FillBlankQuestion 
                    question={currentQuestion} 
                    glossary={glossary}
                    currentAnswer={answers[currentQuestion.id]} 
                    onAnswer={handleAnswer} 
                    isSubmitted={isChecked} 
                />
            )}
            {currentQuestion.type === 'matching' && (
                <MatchingQuestion 
                    question={currentQuestion} 
                    glossary={glossary}
                    currentAnswer={answers[currentQuestion.id]} 
                    onAnswer={handleAnswer} 
                    isSubmitted={isChecked} 
                />
            )}
        </div>

        {/* Explanation Block (Immediate Feedback) */}
        {isChecked && (
             <div className={`mt-8 p-5 rounded-xl border animate-fade-in ${isCurrentCorrect ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50'}`}>
                 <h4 className={`text-sm font-bold uppercase tracking-wide mb-2 ${isCurrentCorrect ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                    Explanation
                 </h4>
                 <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {currentQuestion.explanation}
                 </p>
             </div>
        )}

        {/* Navigation */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
             <button 
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium disabled:opacity-30 px-4 py-2"
             >
                 Back
             </button>

             {!isChecked ? (
                 <button
                    onClick={handleCheck}
                    disabled={!canCheck()}
                    className="flex items-center gap-2 bg-french-dark dark:bg-slate-700 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-black dark:hover:bg-slate-600 transition-all disabled:opacity-50 disabled:shadow-none"
                 >
                     Check Answer
                     <CheckIcon className="w-4 h-4" />
                 </button>
             ) : (
                 <button
                    onClick={handleNext}
                    className="flex items-center gap-2 bg-french-blue dark:bg-blue-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-blue-700 dark:hover:bg-blue-500 hover:shadow-xl transition-all"
                 >
                     {isLastQuestion ? "Finish Quiz" : "Next Question"}
                     <ArrowRightIcon className="w-4 h-4" />
                 </button>
             )}
        </div>
      </div>
    </div>
  );
};
