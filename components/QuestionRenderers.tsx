import React, { useState, useEffect } from 'react';
import { Question, GlossaryEntry } from '../types';
import { InteractiveText } from './InteractiveText';

interface BaseQuestionProps {
  question: Question;
  glossary: GlossaryEntry[];
  currentAnswer: any;
  onAnswer: (answer: any) => void;
  isSubmitted: boolean;
}

// --- MCQ Component ---
export const McqQuestion: React.FC<BaseQuestionProps> = ({ question, glossary, currentAnswer, onAnswer, isSubmitted }) => {
  const options = question.content.options || [];

  return (
    <div className="space-y-3">
      {options.map((option, idx) => {
        const isSelected = currentAnswer === option;
        const isCorrect = isSubmitted && option === question.content.correct_answer;
        const isWrong = isSubmitted && isSelected && option !== question.content.correct_answer;

        let baseClasses = "w-full p-4 text-left border rounded-lg transition-all duration-200 flex items-center group relative";
        
        if (isSubmitted) {
            if (isCorrect) baseClasses += " bg-green-50 border-green-500 text-green-900";
            else if (isWrong) baseClasses += " bg-red-50 border-red-500 text-red-900";
            else baseClasses += " border-gray-200 opacity-60";
        } else {
            if (isSelected) baseClasses += " border-french-blue bg-blue-50 text-french-blue ring-1 ring-french-blue";
            else baseClasses += " border-gray-200 hover:bg-gray-50 hover:border-gray-300";
        }

        return (
          <button
            key={idx}
            onClick={() => !isSubmitted && onAnswer(option)}
            disabled={isSubmitted}
            className={baseClasses}
          >
            <div className={`w-5 h-5 rounded-full border mr-3 flex-shrink-0 flex items-center justify-center ${isSelected ? 'border-french-blue' : 'border-gray-400'}`}>
                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-french-blue" />}
            </div>
            {/* 
               Note: We use InteractiveText here. 
               However, since clicking the button selects the answer, we need to make sure tooltip interaction doesn't conflict. 
               The tooltip is hover-only, so it generally works fine.
            */}
            <span className="font-medium text-lg flex-grow">
                <InteractiveText text={option} glossary={glossary} />
            </span>
          </button>
        );
      })}
    </div>
  );
};

// --- Fill In Blank Component ---
export const FillBlankQuestion: React.FC<BaseQuestionProps> = ({ question, glossary, currentAnswer, onAnswer, isSubmitted }) => {
  const parts = (question.content.sentence_with_blank || "").split("_____");
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onAnswer(e.target.value);
  };

  const isCorrect = isSubmitted && 
    (currentAnswer || "").toLowerCase().trim() === (question.content.correct_answer || "").toLowerCase().trim();

  return (
    <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
      <div className="text-xl leading-relaxed text-slate-800 font-serif">
        <InteractiveText text={parts[0]} glossary={glossary} />
        <span className="inline-block mx-2 relative top-[-2px]">
            <input
                type="text"
                value={currentAnswer || ''}
                onChange={handleChange}
                disabled={isSubmitted}
                placeholder="..."
                className={`
                    min-w-[120px] px-3 py-1 border-b-2 text-center bg-transparent focus:outline-none transition-colors font-bold
                    ${isSubmitted 
                        ? (isCorrect ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700') 
                        : 'border-slate-400 focus:border-french-blue text-french-blue'
                    }
                `}
            />
        </span>
        <InteractiveText text={parts[1] || ""} glossary={glossary} />
      </div>
      {isSubmitted && !isCorrect && (
          <div className="mt-4 text-sm text-green-600 font-medium">
              Correct Answer: {question.content.correct_answer}
          </div>
      )}
    </div>
  );
};

// --- Matching Component ---
export const MatchingQuestion: React.FC<BaseQuestionProps> = ({ question, glossary, currentAnswer, onAnswer, isSubmitted }) => {
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
        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Term</h4>
        {pairs.map((pair, idx) => {
          const isSelected = selectedLeft === pair.left;
          const matchedRight = answerMap[pair.left];
          const isCompleted = !!matchedRight;
          
          let borderColor = "border-slate-200";
          let bgColor = "bg-white";
          
          if (isSubmitted) {
             if (isCompleted && isPairCorrect(pair.left, matchedRight)) {
                 borderColor = "border-green-400";
                 bgColor = "bg-green-50";
             } else if (isCompleted) {
                 borderColor = "border-red-400";
                 bgColor = "bg-red-50";
             }
          } else {
             if (isSelected) {
                 borderColor = "border-french-blue";
                 bgColor = "bg-blue-50";
             } else if (isCompleted) {
                 borderColor = "border-slate-300";
                 bgColor = "bg-slate-50";
             }
          }

          return (
            <button
              key={`left-${idx}`}
              onClick={() => handleLeftClick(pair.left)}
              disabled={isSubmitted}
              className={`w-full p-3 text-left border rounded-md text-sm font-medium transition-all ${borderColor} ${bgColor} relative`}
            >
              <InteractiveText text={pair.left} glossary={glossary} />
              {matchedRight && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-300"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Right Column */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Match</h4>
        {shuffledRight.map((rightItem, idx) => {
           const isUsed = Object.values(answerMap).includes(rightItem);
           
           let borderColor = "border-slate-200";
           let opacity = "opacity-100";
           
           if (isSubmitted) {
                const leftKey = Object.keys(answerMap).find(key => answerMap[key] === rightItem);
                if (leftKey) {
                    if (isPairCorrect(leftKey, rightItem)) {
                        borderColor = "border-green-400 bg-green-50";
                    } else {
                        borderColor = "border-red-400 bg-red-50";
                    }
                }
           } else {
               if (isUsed) {
                   borderColor = "border-slate-300 bg-slate-100 text-slate-400";
               }
           }

          return (
            <button
              key={`right-${idx}`}
              onClick={() => handleRightClick(rightItem)}
              disabled={isSubmitted || (isUsed && !isSubmitted)}
              className={`w-full p-3 text-left border rounded-md text-sm transition-all ${borderColor} ${opacity}`}
            >
              <InteractiveText text={rightItem} glossary={glossary} />
            </button>
          );
        })}
      </div>
      
      {!isSubmitted && (
          <div className="col-span-2 text-center text-xs text-slate-400 mt-2">
            Select an item on the left, then click the matching item on the right.
          </div>
      )}
    </div>
  );
};
