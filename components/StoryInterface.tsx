
import React from 'react';
import { StoryData } from '../types';
import { InteractiveText } from './InteractiveText';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';

interface StoryInterfaceProps {
  story: StoryData;
  onBack: () => void;
}

export const StoryInterface: React.FC<StoryInterfaceProps> = ({ story, onBack }) => {
  const paragraphs = story.content.split('\n').filter(p => p.trim() !== '');

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-visible animate-fade-in relative z-10 transition-colors">
       {/* Header */}
       <div className="bg-french-blue dark:bg-slate-800 text-white p-8 relative rounded-t-2xl transition-colors">
           <button 
             onClick={onBack}
             className="absolute top-8 left-8 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
           >
              <ArrowLeftIcon className="w-5 h-5 text-white" />
           </button>
           <div className="text-center mt-4">
               <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-bold tracking-wider mb-3 uppercase">
                  {story.cefr_level} • {story.sub_difficulty}
               </span>
               <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2">{story.title}</h1>
               <p className="opacity-80 text-lg font-medium">{story.topic}</p>
           </div>
       </div>

       {/* Content */}
       <div className="p-8 md:p-12 space-y-8">
           <p className="text-sm text-slate-400 dark:text-slate-500 italic text-center border-b border-slate-100 dark:border-slate-800 pb-4">
               Hover over words to see their meaning.
           </p>
           
           {paragraphs.map((para, idx) => (
               <p key={idx} className="text-xl md:text-2xl leading-loose text-slate-800 dark:text-slate-200 font-serif text-justify">
                   <InteractiveText text={para} glossary={story.glossary} className="inline" />
               </p>
           ))}
       </div>
    </div>
  )
}
