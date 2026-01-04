
import React, { useState } from 'react';
import { QuizSettings, CefrLevel, Difficulty } from '../types';
import { ChevronRightIcon, ArrowLeftIcon, SparklesIcon } from '@heroicons/react/24/solid';

interface QuizFormProps {
  onSubmit: (settings: QuizSettings) => void;
  isLoading: boolean;
  mode: 'quiz' | 'story';
}

const LEVELS: { id: CefrLevel; label: string; desc: string }[] = [
  { id: 'A1', label: 'A1 Beginner', desc: 'Basic vocabulary and simple sentences' },
  { id: 'A2', label: 'A2 Elementary', desc: 'Routine tasks and familiar topics' },
  { id: 'B1', label: 'B1 Intermediate', desc: 'Standard speech and opinions' },
  { id: 'B2', label: 'B2 Upper Inter.', desc: 'Complex texts and fluency' },
];

const TOPICS_BY_LEVEL: Record<CefrLevel, string[]> = {
  'A1': ['Greetings & Introductions', 'Numbers & Colors', 'Family & Friends', 'Food & Drink', 'Present Tense Verbs', 'Common Adjectives'],
  'A2': ['Daily Routine', 'Shopping & Clothing', 'Travel & Directions', 'Passé Composé', 'Future Proche', 'House & Home'],
  'B1': ['Work & Education', 'Holidays & Culture', 'Imparfait vs Passé Composé', 'Future Simple', 'Pronouns (y, en)', 'Health & Fitness'],
  'B2': ['Media & News', 'Environment', 'Subjunctive Mood', 'Conditional Tenses', 'Abstract Concepts', 'Politics & Society'],
};

const DIFFICULTIES: { id: Difficulty; label: string; desc: string }[] = [
  { id: 'Easy', label: 'Easy', desc: 'Core rules, simple structures' },
  { id: 'Medium', label: 'Medium', desc: 'Standard nuances and variations' },
  { id: 'Hard', label: 'Hard', desc: 'Complex cases and exceptions' },
];

export const QuizForm: React.FC<QuizFormProps> = ({ onSubmit, isLoading, mode }) => {
  const [step, setStep] = useState(1);
  const [level, setLevel] = useState<CefrLevel | null>(null);
  const [topic, setTopic] = useState<string>('');
  const [customTopic, setCustomTopic] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);

  const handleLevelSelect = (lvl: CefrLevel) => {
    setLevel(lvl);
    if (mode === 'story') {
      // Skip topic selection for stories, default to Surprise Me
      setTopic('Surprise Me');
      setStep(3);
    } else {
      setTopic(''); // Reset topic if level changes
      setStep(2);
    }
  };

  const handleTopicSelect = (t: string) => {
    setTopic(t);
    setStep(3);
  };

  const handleCustomTopicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customTopic.trim()) {
      setTopic(customTopic);
      setStep(3);
    }
  };

  const handleDifficultySelect = (diff: Difficulty) => {
    setDifficulty(diff);
    // Proceed to submit if we have level and topic
    if (level && (topic || customTopic)) {
      onSubmit({ 
        level: level, 
        topic: topic || customTopic, 
        difficulty: diff 
      });
    }
  };

  const handleBack = () => {
    // If in story mode and at step 3, go back to step 1 (skipping step 2)
    if (mode === 'story' && step === 3) {
      setStep(1);
    } else {
      setStep(prev => prev - 1);
    }
  };

  if (isLoading) {
    const isQuiz = mode === 'quiz';
    return (
       <div className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-12 flex flex-col items-center justify-center min-h-[400px] transition-colors">
          <div className="relative mb-8">
            <div className="w-20 h-20 border-4 border-slate-100 dark:border-slate-800 rounded-full"></div>
            <div className={`w-20 h-20 border-4 ${isQuiz ? 'border-french-blue' : 'border-french-red'} rounded-full border-t-transparent animate-spin absolute top-0 left-0`}></div>
          </div>
          <h3 className="text-2xl font-serif font-bold text-slate-800 dark:text-slate-100 animate-pulse">
            {isQuiz ? "Génération du Quiz..." : "Rédaction de l'Histoire..."}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
             {isQuiz 
               ? `Crafting your custom exercises tailored to ${level} • ${topic}`
               : `Writing a creative story for ${level} proficiency...`
             }
          </p>
       </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden min-h-[500px] flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="bg-french-dark dark:bg-slate-950 p-6 text-center relative transition-colors">
         <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${mode === 'quiz' ? 'from-french-blue via-white to-french-blue' : 'from-french-red via-white to-french-red'}`}></div>
         {step > 1 && (
             <button onClick={handleBack} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-2">
                 <ArrowLeftIcon className="w-6 h-6" />
             </button>
         )}
         <h2 className="text-2xl font-serif text-white font-bold tracking-wide">
            {step === 1 && "Select Level"}
            {step === 2 && "Choose Topic"}
            {step === 3 && "Select Difficulty"}
         </h2>
         <div className="flex justify-center gap-2 mt-4">
             {/* Dynamic Progress Dots */}
             {(mode === 'story' ? [1, 3] : [1, 2, 3]).map((i, idx) => (
                 <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${step >= i ? `w-12 ${mode === 'quiz' ? 'bg-french-blue' : 'bg-french-red'}` : 'w-3 bg-slate-700'}`} />
             ))}
         </div>
      </div>

      <div className="p-8 flex-grow flex flex-col">
        {/* Step 1: Level */}
        {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in flex-grow">
                {LEVELS.map((lvl) => (
                    <button
                        key={lvl.id}
                        onClick={() => handleLevelSelect(lvl.id)}
                        className={`group relative p-6 border-2 border-slate-100 dark:border-slate-800 rounded-xl hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all text-left flex flex-col justify-center ${mode === 'quiz' ? 'hover:border-french-blue dark:hover:border-blue-500' : 'hover:border-french-red dark:hover:border-red-500'}`}
                    >
                        <span className="text-4xl font-black text-slate-100 dark:text-slate-800 group-hover:text-slate-200 dark:group-hover:text-slate-700 absolute right-4 top-4 transition-colors">{lvl.id}</span>
                        <h3 className={`text-lg font-bold text-slate-800 dark:text-slate-200 mb-1 transition-colors ${mode === 'quiz' ? 'group-hover:text-french-blue dark:group-hover:text-blue-400' : 'group-hover:text-french-red dark:group-hover:text-red-400'}`}>{lvl.label}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed group-hover:text-slate-600 dark:group-hover:text-slate-300">{lvl.desc}</p>
                    </button>
                ))}
            </div>
        )}

        {/* Step 2: Topic (Quiz Only) */}
        {step === 2 && level && mode === 'quiz' && (
            <div className="animate-fade-in flex flex-col h-full">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                    {TOPICS_BY_LEVEL[level].map((t) => (
                        <button
                            key={t}
                            onClick={() => handleTopicSelect(t)}
                            className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-french-blue dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:text-french-blue dark:hover:text-blue-400 transition-all text-center flex items-center justify-center h-full text-sm md:text-base shadow-sm hover:shadow-md"
                        >
                            {t}
                        </button>
                    ))}
                </div>
                
                <div className="mt-auto border-t border-slate-100 dark:border-slate-800 pt-6">
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 text-center">Or type your own</p>
                    <form onSubmit={handleCustomTopicSubmit} className="flex gap-2">
                        <input 
                            type="text" 
                            value={customTopic}
                            onChange={(e) => setCustomTopic(e.target.value)}
                            placeholder="e.g. French Cinema, Slang, History..."
                            className="flex-grow px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-french-blue dark:focus:border-blue-500 focus:ring-1 focus:ring-french-blue dark:focus:ring-blue-500 outline-none transition-all text-slate-800 dark:text-slate-200 placeholder-slate-400"
                        />
                        <button 
                            type="submit"
                            disabled={!customTopic.trim()}
                            className="px-6 py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-900 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors shadow-md"
                        >
                            Next
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* Step 3: Difficulty */}
        {step === 3 && (
            <div className="flex flex-col gap-4 animate-fade-in max-w-md mx-auto w-full my-auto">
                <div className="mb-4 text-center">
                   {mode === 'story' && (
                     <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-full text-sm font-medium border border-yellow-200 dark:border-yellow-900/50 mb-4">
                        <SparklesIcon className="w-4 h-4" />
                        Topic: Surprise Me
                     </div>
                   )}
                </div>

                {DIFFICULTIES.map((diff) => (
                    <button
                        key={diff.id}
                        onClick={() => handleDifficultySelect(diff.id)}
                        className={`group flex items-center p-5 border-2 border-slate-100 dark:border-slate-800 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800 transition-all text-left shadow-sm hover:shadow-md ${mode === 'quiz' ? 'hover:border-french-blue dark:hover:border-blue-500' : 'hover:border-french-red dark:hover:border-red-500'}`}
                    >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-5 transition-colors flex-shrink-0 ${
                            diff.id === 'Easy' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 group-hover:bg-green-200 dark:group-hover:bg-green-900/50' :
                            diff.id === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 group-hover:bg-yellow-200 dark:group-hover:bg-yellow-900/50' :
                            'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 group-hover:bg-red-200 dark:group-hover:bg-red-900/50'
                        }`}>
                            {diff.id === 'Easy' && <span className="text-xl">🌱</span>}
                            {diff.id === 'Medium' && <span className="text-xl">🌿</span>}
                            {diff.id === 'Hard' && <span className="text-xl">🌳</span>}
                        </div>
                        <div>
                            <h3 className={`text-lg font-bold text-slate-800 dark:text-slate-200 transition-colors ${mode === 'quiz' ? 'group-hover:text-french-blue dark:group-hover:text-blue-400' : 'group-hover:text-french-red dark:group-hover:text-red-400'}`}>{diff.label}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">{diff.desc}</p>
                        </div>
                        <ChevronRightIcon className={`w-5 h-5 text-slate-300 dark:text-slate-600 ml-auto transition-colors ${mode === 'quiz' ? 'group-hover:text-french-blue dark:group-hover:text-blue-400' : 'group-hover:text-french-red dark:group-hover:text-red-400'}`} />
                    </button>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};
