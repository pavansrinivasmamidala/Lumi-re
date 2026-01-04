
import React, { useState, useEffect } from 'react';
import { Question, GlossaryEntry } from '../types';
import { InteractiveText } from './InteractiveText';
import { PencilSquareIcon } from '@heroicons/react/24/solid';

interface BaseQuestionProps {
  question: Question;
  glossary: GlossaryEntry[];
  currentAnswer: any;
  onAnswer: (answer: any) => void;
  isSubmitted: boolean;
  level?: string; // Add level prop
}

// --- MCQ Component ---
export const McqQuestion: React.FC<BaseQuestionProps> = ({ question, glossary, currentAnswer, onAnswer, isSubmitted, level }) => {
  const options = question.content.options || [];

  return (
    <div className="space-y-3">
      {options.map((option, idx) => {
        const isSelected = currentAnswer === option;
        const isCorrect = isSubmitted && option === question.content.correct_answer;
        const isWrong = isSubmitted && isSelected && option !== question.content.correct_answer;

        let baseClasses = "w-full p-4 text-left border rounded-lg transition-all duration-200 flex items-center group relative";
        
        if (isSubmitted) {
            if (isCorrect) baseClasses += " bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-500 text-green-900 dark:text-green-100";
            else if (isWrong) baseClasses += " bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-500 text-red-900 dark:text-red-100";
            else baseClasses += " border-gray-200 dark:border-slate-700 opacity-60 dark:text-slate-400";
        } else {
            if (isSelected) baseClasses += " border-french-blue dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-french-blue dark:text-blue-300 ring-1 ring-french-blue dark:ring-blue-500";
            else baseClasses += " border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600 text-slate-900 dark:text-slate-200";
        }

        return (
          <button
            key={idx}
            onClick={() => !isSubmitted && onAnswer(option)}
            disabled={isSubmitted}
            className={baseClasses}
          >
            <div className={`w-5 h-5 rounded-full border mr-3 flex-shrink-0 flex items-center justify-center ${isSelected ? 'border-french-blue dark:border-blue-500' : 'border-gray-400 dark:border-slate-500'}`}>
                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-french-blue dark:bg-blue-500" />}
            </div>
            <span className="font-medium text-lg flex-grow">
                <InteractiveText text={option} glossary={glossary} level={level} />
            </span>
          </button>
        );
      })}
    </div>
  );
};

// --- Fill In Blank Component ---
export const FillBlankQuestion: React.FC<BaseQuestionProps> = ({ question, glossary, currentAnswer, onAnswer, isSubmitted, level }) => {
  const rawParts = (question.content.sentence_with_blank || "").split("_____");
  const parts = rawParts.length >= 2 ? rawParts : ["", ""];
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onAnswer(e.target.value);
  };

  const isCorrect = isSubmitted && 
    (currentAnswer || "").toLowerCase().trim() === (question.content.correct_answer || "").toLowerCase().trim();

  return (
    <div className="py-8 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center transition-colors">
      <div className="text-xl md:text-2xl leading-[2.5] text-slate-800 dark:text-slate-100 font-serif text-center w-full max-w-2xl">
        <InteractiveText text={parts[0]} glossary={glossary} level={level} className="mr-1" />
        
        <span className="inline-block relative align-baseline mx-1 group">
            <input
                type="text"
                value={currentAnswer || ''}
                onChange={handleChange}
                disabled={isSubmitted}
                placeholder="type answer"
                autoComplete="off"
                className={`
                    min-w-[140px] px-2 py-0.5 border-b-2 text-center bg-transparent 
                    focus:outline-none transition-all font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600 placeholder:font-sans placeholder:text-base
                    ${isSubmitted 
                        ? (isCorrect ? 'border-green-500 text-green-700 dark:text-green-400 bg-green-50/50 dark:bg-green-900/30' : 'border-red-500 text-red-700 dark:text-red-400 bg-red-50/50 dark:bg-red-900/30') 
                        : 'border-slate-300 dark:border-slate-600 focus:border-french-blue dark:focus:border-blue-500 text-french-blue dark:text-blue-300 focus:bg-white/50 dark:focus:bg-slate-700/50'
                    }
                `}
            />
            {!isSubmitted && !currentAnswer && (
                 <PencilSquareIcon className="w-4 h-4 text-slate-300 dark:text-slate-500 absolute -top-4 right-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
        </span>

        <InteractiveText text={parts[1] || ""} glossary={glossary} level={level} className="ml-1" />
      </div>

      {/* Answer Feedback */}
      {isSubmitted && !isCorrect && (
          <div className="mt-6 flex flex-col items-center animate-fade-in">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mb-1">Correct Answer</span>
              <div className="px-4 py-2 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 rounded-lg font-bold shadow-sm border border-green-200 dark:border-green-800">
                 {question.content.correct_answer || <span className="text-red-500 italic text-sm">Error: Answer key missing</span>}
              </div>
          </div>
      )}
    </div>
  );
};

// --- Matching Component ---
export const MatchingQuestion: React.FC<BaseQuestionProps> = ({ question, glossary, currentAnswer, onAnswer, isSubmitted, level }) => {
  const answerMap = (currentAnswer as Record<string, string>) || {};
  
  const [shuffledRight, setShuffledRight] = useState<string[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  useEffect(() => {
    if (question.content.pairs) {
      const rights = question.content.pairs.map(p => p.right);
      setShuffledRight([...rights].sort(() => Math.random() - 0.5));
    }
  }, [question.id]);

  const pairs = question.content.pairs || [];

  const handleLeftClick = (left: string) => {
    if (isSubmitted) return;
    if (selectedLeft === left) {
        setSelectedLeft(null);
        return;
    }
    setSelectedLeft(left);
  };

  const handleRightClick = (right: string) => {
    if (isSubmitted || !selectedLeft) return;
    const newAnswers = { ...answerMap, [selectedLeft]: right };
    onAnswer(newAnswers);
    setSelectedLeft(null);
  };

  const isPairCorrect = (left: string, right: string) => {
      const correctRight = pairs.find(p => p.left === left)?.right;
      return correctRight === right;
  };

  return (
    <div className="grid grid-cols-2 gap-8 relative">
      {/* Left Column */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Term</h4>
        {pairs.map((pair, idx) => {
          const isSelected = selectedLeft === pair.left;
          const matchedRight = answerMap[pair.left];
          const isCompleted = !!matchedRight;
          
          let borderColor = "border-slate-200 dark:border-slate-700";
          let bgColor = "bg-white dark:bg-slate-800";
          let textColor = "text-slate-900 dark:text-slate-200";
          
          if (isSubmitted) {
             if (isCompleted && isPairCorrect(pair.left, matchedRight)) {
                 borderColor = "border-green-400 dark:border-green-600";
                 bgColor = "bg-green-50 dark:bg-green-900/20";
                 textColor = "text-green-900 dark:text-green-200";
             } else if (isCompleted) {
                 borderColor = "border-red-400 dark:border-red-600";
                 bgColor = "bg-red-50 dark:bg-red-900/20";
                 textColor = "text-red-900 dark:text-red-200";
             }
          } else {
             if (isSelected) {
                 borderColor = "border-french-blue dark:border-blue-500";
                 bgColor = "bg-blue-50 dark:bg-blue-900/20";
                 textColor = "text-french-blue dark:text-blue-300";
             } else if (isCompleted) {
                 borderColor = "border-slate-300 dark:border-slate-600";
                 bgColor = "bg-slate-50 dark:bg-slate-700/50";
                 textColor = "text-slate-500 dark:text-slate-400";
             }
          }

          return (
            <button
              key={`left-${idx}`}
              onClick={() => handleLeftClick(pair.left)}
              disabled={isSubmitted}
              className={`w-full p-3 text-left border rounded-md text-sm font-medium transition-all ${borderColor} ${bgColor} ${textColor} relative`}
            >
              <InteractiveText text={pair.left} glossary={glossary} level={level} />
              {matchedRight && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-500"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Right Column */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Match</h4>
        {shuffledRight.map((rightItem, idx) => {
           const isUsed = Object.values(answerMap).includes(rightItem);
           
           let borderColor = "border-slate-200 dark:border-slate-700";
           let textColor = "text-slate-900 dark:text-slate-200";
           let bgColor = "bg-white dark:bg-slate-800";
           
           if (isSubmitted) {
                const leftKey = Object.keys(answerMap).find(key => answerMap[key] === rightItem);
                if (leftKey) {
                    if (isPairCorrect(leftKey, rightItem)) {
                        borderColor = "border-green-400 bg-green-50 dark:bg-green-900/20 dark:border-green-600";
                        textColor = "text-green-900 dark:text-green-200";
                    } else {
                        borderColor = "border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-600";
                        textColor = "text-red-900 dark:text-red-200";
                    }
                }
           } else {
               if (isUsed) {
                   borderColor = "border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700/50";
                   textColor = "text-slate-400 dark:text-slate-500";
               } else {
                   // Default hover only when not used/submitted
                   borderColor += " hover:border-slate-300 dark:hover:border-slate-500";
               }
           }

          return (
            <button
              key={`right-${idx}`}
              onClick={() => handleRightClick(rightItem)}
              disabled={isSubmitted || (isUsed && !isSubmitted)}
              className={`w-full p-3 text-left border rounded-md text-sm transition-all ${borderColor} ${bgColor} ${textColor}`}
            >
              <InteractiveText text={rightItem} glossary={glossary} level={level} />
            </button>
          );
        })}
      </div>
      
      {!isSubmitted && (
          <div className="col-span-2 text-center text-xs text-slate-400 dark:text-slate-500 mt-2">
            Select an item on the left, then click the matching item on the right.
          </div>
      )}
    </div>
  );
};
