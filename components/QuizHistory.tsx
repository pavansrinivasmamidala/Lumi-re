
import React from 'react';
import { SavedQuiz, QuizData } from '../types';
import { TrashIcon, PlayCircleIcon, ArrowLeftIcon, CalendarDaysIcon } from '@heroicons/react/24/solid';

interface QuizHistoryProps {
  quizzes: SavedQuiz[];
  onSelect: (quiz: QuizData) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
  filterTopic?: string | null;
}

export const QuizHistory: React.FC<QuizHistoryProps> = ({ quizzes, onSelect, onDelete, onBack, filterTopic }) => {
  
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
          className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-french-blue dark:hover:text-blue-400 transition-colors font-medium"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          {filterTopic ? 'Back to Guide' : 'Back to Generator'}
        </button>
        <div className="text-right">
            <h2 className="text-2xl font-serif font-bold text-slate-800 dark:text-slate-100">Saved Quizzes</h2>
            {filterTopic && <p className="text-sm text-slate-500 dark:text-slate-400">Filter: {filterTopic}</p>}
        </div>
      </div>

      {quizzes.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
           <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 dark:text-slate-500">
              <CalendarDaysIcon className="w-8 h-8" />
           </div>
           <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">No quizzes saved {filterTopic ? 'for this topic' : 'yet'}</h3>
           <p className="text-slate-500 dark:text-slate-400 mt-2">Generate a quiz to see it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes.map((item) => (
            <div 
              key={item.id} 
              className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-french-blue dark:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex justify-between items-start mb-4 pl-2">
                <div>
                   <span className="inline-block px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-french-blue dark:text-blue-300 text-xs font-bold rounded mb-2">
                      {item.data.cefr_level} • {item.data.sub_difficulty}
                   </span>
                   <h3 className="font-serif font-bold text-lg text-slate-800 dark:text-slate-100 leading-tight">
                     {item.data.topic}
                   </h3>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                  className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Delete Quiz"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50 dark:border-slate-800 pl-2">
                 <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                   {formatDate(item.created_at)}
                 </span>
                 <button
                    onClick={() => onSelect(item.data)}
                    className="flex items-center gap-2 text-sm font-bold text-french-blue dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
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
