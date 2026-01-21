
import React, { useState, useEffect } from 'react';
import { CefrLevel, PathCheckpoint, UserProgress } from '../types';
import { A2_SYLLABUS } from '../data/syllabus';
import { getPathProgress, markCheckpointComplete } from '../services/storageService';
import { CheckCircleIcon, PlayCircleIcon, LockClosedIcon, BookOpenIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { InteractiveText } from './InteractiveText';
import { StudyGuideView } from './StudyGuideView';

interface PathExplorerProps {
  onStartQuiz: (topic: string, level: CefrLevel) => void;
}

const LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2'];

export const PathExplorer: React.FC<PathExplorerProps> = ({ onStartQuiz }) => {
  const [activeLevel, setActiveLevel] = useState<CefrLevel>('A2');
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Navigation State
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  useEffect(() => {
    loadProgress();
  }, [activeLevel]);

  const loadProgress = async () => {
    setLoading(true);
    try {
      const data = await getPathProgress(activeLevel);
      setProgress(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getCheckpointStatus = (title: string, index: number) => {
    const entry = progress.find(p => p.checkpoint_title === title);
    if (entry?.completed) return { status: 'completed', score: entry.score };
    
    // Previously locked logic removed to enable all topics
    return { status: 'unlocked', score: 0 };
  };

  const handleStartQuizFromGuide = (cumulative: boolean) => {
      if (!selectedTopic) return;
      
      let quizTopic = selectedTopic;
      
      if (cumulative && activeLevel === 'A2') {
          const currentIndex = A2_SYLLABUS.findIndex(t => t.title === selectedTopic);
          if (currentIndex > 0) {
              const previousTitles = A2_SYLLABUS.slice(0, currentIndex + 1).map(t => t.title);
              // Construct a prompt-friendly string containing all topics
              quizTopic = `Cumulative Review of: ${previousTitles.join(', ')}`;
          }
      }
      
      setSelectedTopic(null); // Close the guide
      onStartQuiz(quizTopic, activeLevel);
  };

  // --- RENDERERS ---

  if (selectedTopic) {
      const currentIndex = A2_SYLLABUS.findIndex(t => t.title === selectedTopic);
      const allowCumulative = currentIndex > 0;

      return (
          <StudyGuideView 
             topic={selectedTopic} 
             level={activeLevel} 
             allowCumulative={allowCumulative}
             onBack={() => setSelectedTopic(null)}
             onStartQuiz={handleStartQuizFromGuide}
          />
      );
  }

  const renderSyllabus = () => {
    // Currently only A2 is implemented as per spec
    if (activeLevel !== 'A2') {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                <LockClosedIcon className="w-16 h-16 text-slate-200 dark:text-slate-800 mb-4" />
                <h3 className="text-xl font-bold text-slate-400 dark:text-slate-600">Coming Soon</h3>
                <p className="text-slate-400 dark:text-slate-500 mt-2 max-w-sm">
                    The {activeLevel} path is currently under construction. Please try A2.
                </p>
            </div>
        );
    }

    // Determine the next recommended step (first incomplete item) to highlight
    const firstIncompleteIndex = A2_SYLLABUS.findIndex(item => !progress.find(p => p.checkpoint_title === item.title)?.completed);

    return (
        <div className="max-w-3xl mx-auto py-8 relative">
            {/* Vertical Line */}
            <div className="absolute left-6 md:left-8 top-12 bottom-12 w-0.5 bg-slate-200 dark:bg-slate-800 z-0"></div>

            {A2_SYLLABUS.map((checkpoint, index) => {
                const { status, score } = getCheckpointStatus(checkpoint.title, index);
                const isLocked = status === 'locked'; // Always false now
                const isCompleted = status === 'completed';
                const isRecommended = index === firstIncompleteIndex;

                return (
                    <div key={index} className={`relative z-10 pl-20 md:pl-24 mb-12 last:mb-0 group ${isLocked ? 'opacity-50 grayscale' : 'opacity-100'}`}>
                        {/* Connector Dot */}
                        <div className={`
                            absolute left-3 md:left-5 top-6 -translate-x-1/2 w-6 h-6 md:w-8 md:h-8 rounded-full border-4 flex items-center justify-center transition-colors shadow-sm bg-white dark:bg-slate-900
                            ${isCompleted 
                                ? 'border-green-500 text-green-500' 
                                : isLocked 
                                    ? 'border-slate-300 dark:border-slate-700 text-slate-300' 
                                    : 'border-french-blue dark:border-blue-500 text-french-blue dark:text-blue-500'
                            }
                        `}>
                            {isCompleted && <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-green-500" />}
                            {/* Pulse only the recommended next step to avoid visual noise */}
                            {!isCompleted && !isLocked && isRecommended && <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-french-blue dark:bg-blue-500 animate-pulse" />}
                        </div>

                        {/* Content Card */}
                        <div 
                            onClick={() => !isLocked && setSelectedTopic(checkpoint.title)}
                            className={`
                            bg-white dark:bg-slate-900 rounded-2xl p-6 border transition-all duration-300
                            ${isLocked 
                                ? 'border-slate-100 dark:border-slate-800 cursor-not-allowed' 
                                : isCompleted
                                    ? 'border-green-200 dark:border-green-900/50 shadow-sm cursor-pointer hover:border-green-300 dark:hover:border-green-800'
                                    : 'border-french-blue dark:border-blue-600 shadow-md ring-1 ring-french-blue/10 cursor-pointer hover:shadow-xl hover:-translate-y-1'
                            }
                        `}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                                <div>
                                    <h3 className="text-xl font-bold font-serif text-slate-800 dark:text-slate-100 group-hover:text-french-blue dark:group-hover:text-blue-400 transition-colors">
                                        {checkpoint.title}
                                    </h3>
                                    {isCompleted && (
                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400 mt-1">
                                            <CheckCircleIcon className="w-3 h-3" />
                                            Completed (Best: {score}/10)
                                        </span>
                                    )}
                                </div>
                                {!isLocked && (
                                    <div className="flex items-center text-sm font-bold text-french-blue dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
                                        Open Guide <ChevronRightIcon className="w-4 h-4 ml-1" />
                                    </div>
                                )}
                            </div>
                            
                            <p className="text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                                {checkpoint.description}
                            </p>

                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-100 dark:border-slate-800">
                                <span className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-2 block tracking-wider">Examples</span>
                                <ul className="space-y-2">
                                    {checkpoint.examples.map((ex, i) => (
                                        <li key={i} className="text-sm text-slate-700 dark:text-slate-300 italic">
                                            • <InteractiveText text={ex} glossary={[]} level="A2" />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            
                            {!isLocked && (
                                <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800 flex justify-end">
                                     <button className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-french-blue dark:text-slate-400 dark:hover:text-blue-400 transition-colors">
                                         <BookOpenIcon className="w-4 h-4" />
                                         Study Concept
                                     </button>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-in">
        {/* Level Tabs */}
        <div className="flex justify-center mb-12">
            <div className="bg-white dark:bg-slate-900 p-1.5 rounded-full shadow-sm border border-slate-200 dark:border-slate-800 inline-flex">
                {LEVELS.map(lvl => (
                    <button
                        key={lvl}
                        onClick={() => setActiveLevel(lvl)}
                        className={`
                            px-6 py-2 rounded-full font-bold text-sm transition-all
                            ${activeLevel === lvl 
                                ? 'bg-french-blue text-white shadow-md' 
                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                            }
                            ${lvl !== 'A2' ? 'opacity-60' : ''}
                        `}
                    >
                        {lvl}
                    </button>
                ))}
            </div>
        </div>
        
        {/* Syllabus List */}
        {renderSyllabus()}
    </div>
  );
};
