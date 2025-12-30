import React from 'react';
import { SavedQuiz, QuizData } from '../types';
import { TrashIcon, PlayCircleIcon, ArrowLeftIcon, CalendarDaysIcon } from '@heroicons/react/24/solid';

interface QuizHistoryProps {
  quizzes: SavedQuiz[];
  onSelect: (quiz: QuizData) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

export const QuizHistory: React.FC<QuizHistoryProps> = ({ quizzes, onSelect, onDelete, onBack }) => {
  
  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  };

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-french-blue transition-colors font-medium"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Back to Generator
        </button>
        <h2 className="text-2xl font-serif font-bold text-slate-800">Saved Quizzes</h2>
      </div>

      {quizzes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-200">
           <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <CalendarDaysIcon className="w-8 h-8" />
           </div>
           <h3 className="text-lg font-medium text-slate-700">No quizzes saved yet</h3>
           <p className="text-slate-500 mt-2">Generate a quiz to see it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes.map((item) => (
            <div 
              key={item.id} 
              className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-french-blue opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex justify-between items-start mb-4 pl-2">
                <div>
                   <span className="inline-block px-2 py-1 bg-blue-50 text-french-blue text-xs font-bold rounded mb-2">
                      {item.data.cefr_level} • {item.data.sub_difficulty}
                   </span>
                   <h3 className="font-serif font-bold text-lg text-slate-800 leading-tight">
                     {item.data.topic}
                   </h3>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
                  title="Delete Quiz"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50 pl-2">
                 <span className="text-xs text-slate-400 font-medium">
                   {formatDate(item.created_at)}
                 </span>
                 <button
                    onClick={() => onSelect(item.data)}
                    className="flex items-center gap-2 text-sm font-bold text-french-blue hover:text-blue-700 transition-colors"
                 >
                    Play Again
                    <PlayCircleIcon className="w-5 h-5" />
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
