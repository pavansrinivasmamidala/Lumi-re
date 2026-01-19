
import React, { useState, useEffect } from 'react';
import { StudyGuideContent, CefrLevel } from '../types';
import { generateStudyGuide } from '../services/geminiService';
import { getStudyGuide, saveStudyGuide } from '../services/storageService';
import { InteractiveText } from './InteractiveText';
import { ArrowLeftIcon, BookOpenIcon, ExclamationTriangleIcon, PlayCircleIcon, LightBulbIcon } from '@heroicons/react/24/solid';

interface StudyGuideViewProps {
  topic: string;
  level: CefrLevel;
  onBack: () => void;
  onStartQuiz: () => void;
}

export const StudyGuideView: React.FC<StudyGuideViewProps> = ({ topic, level, onBack, onStartQuiz }) => {
  const [content, setContent] = useState<StudyGuideContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGuide();
  }, [topic, level]);

  const loadGuide = async () => {
    setLoading(true);
    try {
      // 1. Try DB first
      const cached = await getStudyGuide(topic, level);
      if (cached) {
        setContent(cached);
        setLoading(false);
        return;
      }

      // 2. Generate if missing
      const response = await generateStudyGuide(topic, level);
      const newGuide = response.guide;
      
      setContent(newGuide);
      
      // 3. Save to DB
      await saveStudyGuide(topic, level, newGuide);
    } catch (e) {
      console.error("Failed to load guide", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
     return (
        <div className="w-full max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-12 flex flex-col items-center justify-center min-h-[500px] transition-colors">
            <div className="relative mb-8">
              <div className="w-20 h-20 border-4 border-slate-100 dark:border-slate-800 rounded-full"></div>
              <div className="w-20 h-20 border-4 border-french-blue rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
            </div>
            <h3 className="text-2xl font-serif font-bold text-slate-800 dark:text-slate-100 animate-pulse">
              Consulting the Professor...
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
               Preparing study notes for "{topic}"
            </p>
         </div>
     );
  }

  if (!content) return <div>Error loading content.</div>;

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in pb-12">
        <button 
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-french-blue dark:hover:text-blue-400 transition-colors font-medium"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Back to Path
        </button>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800 transition-colors">
            {/* Header */}
            <div className="bg-french-blue dark:bg-slate-800 p-8 text-white relative">
                 <div className="absolute top-0 right-0 p-4 opacity-10">
                     <BookOpenIcon className="w-32 h-32" />
                 </div>
                 <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-bold tracking-wider mb-3 uppercase">
                    {level} Study Guide
                 </span>
                 <h1 className="text-4xl font-serif font-bold relative z-10">{topic}</h1>
            </div>

            <div className="p-8 md:p-12 space-y-10">
                
                {/* Concept */}
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-french-blue dark:text-blue-300 rounded-lg">
                             <LightBulbIcon className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Concept</h2>
                    </div>
                    <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300">
                        {content.concept_explanation}
                    </p>
                </section>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* Key Rules */}
                <section>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 uppercase tracking-wide">Key Rules</h3>
                    <ul className="space-y-3">
                        {content.key_rules.map((rule, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-french-blue dark:bg-blue-500 flex-shrink-0"></span>
                                <span className="leading-relaxed">{rule}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Exceptions (Conditional) */}
                {content.exceptions && content.exceptions.length > 0 && (
                    <section className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-4 text-amber-700 dark:text-amber-500">
                            <ExclamationTriangleIcon className="w-6 h-6" />
                            <h3 className="text-lg font-bold uppercase tracking-wide">Exceptions & Warnings</h3>
                        </div>
                        <ul className="space-y-2">
                             {content.exceptions.map((ex, idx) => (
                                 <li key={idx} className="text-amber-900 dark:text-amber-200/80 text-sm md:text-base">
                                     • {ex}
                                 </li>
                             ))}
                        </ul>
                    </section>
                )}

                {/* Examples */}
                <section>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 uppercase tracking-wide">Examples in Context</h3>
                    <div className="grid gap-4">
                        {content.examples.map((ex, idx) => (
                            <div key={idx} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                <div className="text-lg font-medium text-french-blue dark:text-blue-300 mb-1 font-serif">
                                    <InteractiveText text={ex.french} glossary={[]} level={level} />
                                </div>
                                <div className="text-slate-500 dark:text-slate-500 italic text-sm">{ex.english}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Action Area */}
                <div className="pt-8 flex flex-col items-center">
                    <p className="text-slate-500 dark:text-slate-400 mb-4 text-center">Ready to test your knowledge on this topic?</p>
                    <button 
                        onClick={onStartQuiz}
                        className="flex items-center gap-2 px-8 py-4 bg-french-dark dark:bg-slate-700 text-white rounded-full font-bold text-lg hover:bg-black dark:hover:bg-slate-600 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
                    >
                        <PlayCircleIcon className="w-6 h-6" />
                        Start Practice Quiz
                    </button>
                </div>

            </div>
        </div>
    </div>
  );
};
