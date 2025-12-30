import React, { useState } from 'react';
import { QuizSettings, CefrLevel, Difficulty } from '../types';
import { ChevronRightIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';

interface QuizFormProps {
  onSubmit: (settings: QuizSettings) => void;
  isLoading: boolean;
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

export const QuizForm: React.FC<QuizFormProps> = ({ onSubmit, isLoading }) => {
  const [step, setStep] = useState(1);
  const [level, setLevel] = useState<CefrLevel | null>(null);
  const [topic, setTopic] = useState<string>('');
  const [customTopic, setCustomTopic] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);

  const handleLevelSelect = (lvl: CefrLevel) => {
    setLevel(lvl);
    setStep(2);
    setTopic(''); // Reset topic if level changes
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
    setStep(prev => prev - 1);
  };

  if (isLoading) {
    return (
       <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-12 flex flex-col items-center justify-center min-h-[400px]">
          <div className="relative mb-8">
            <div className="w-20 h-20 border-4 border-slate-100 rounded-full"></div>
            <div className="w-20 h-20 border-4 border-french-blue rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
          </div>
          <h3 className="text-2xl font-serif font-bold text-slate-800 animate-pulse">Génération du Quiz...</h3>
          <p className="text-slate-500 mt-2">Crafting your custom exercises tailored to {level} • {topic}</p>
       </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden min-h-[500px] flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="bg-french-dark p-6 text-center relative">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-french-blue via-white to-french-red"></div>
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
             {[1, 2, 3].map(i => (
                 <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i <= step ? 'w-12 bg-french-blue' : 'w-3 bg-slate-700'}`} />
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
                        className="group relative p-6 border-2 border-slate-100 rounded-xl hover:border-french-blue hover:bg-blue-50/30 transition-all text-left flex flex-col justify-center"
                    >
                        <span className="text-4xl font-black text-slate-100 group-hover:text-blue-100 absolute right-4 top-4 transition-colors">{lvl.id}</span>
                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-french-blue mb-1 transition-colors">{lvl.label}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed group-hover:text-slate-600">{lvl.desc}</p>
                    </button>
                ))}
            </div>
        )}

        {/* Step 2: Topic */}
        {step === 2 && level && (
            <div className="animate-fade-in flex flex-col h-full">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                    {TOPICS_BY_LEVEL[level].map((t) => (
                        <button
                            key={t}
                            onClick={() => handleTopicSelect(t)}
                            className="p-4 border border-slate-200 rounded-xl hover:border-french-blue hover:bg-blue-50 text-slate-700 font-medium hover:text-french-blue transition-all text-center flex items-center justify-center h-full text-sm md:text-base shadow-sm hover:shadow-md"
                        >
                            {t}
                        </button>
                    ))}
                </div>
                
                <div className="mt-auto border-t border-slate-100 pt-6">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">Or type your own</p>
                    <form onSubmit={handleCustomTopicSubmit} className="flex gap-2">
                        <input 
                            type="text" 
                            value={customTopic}
                            onChange={(e) => setCustomTopic(e.target.value)}
                            placeholder="e.g. French Cinema, Slang, History..."
                            className="flex-grow px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-french-blue focus:ring-1 focus:ring-french-blue outline-none transition-all"
                        />
                        <button 
                            type="submit"
                            disabled={!customTopic.trim()}
                            className="px-6 py-3 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-900 disabled:opacity-50 transition-colors shadow-md"
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
                {DIFFICULTIES.map((diff) => (
                    <button
                        key={diff.id}
                        onClick={() => handleDifficultySelect(diff.id)}
                        className="group flex items-center p-5 border-2 border-slate-100 rounded-xl hover:border-french-blue hover:bg-blue-50 transition-all text-left shadow-sm hover:shadow-md"
                    >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-5 transition-colors flex-shrink-0 ${
                            diff.id === 'Easy' ? 'bg-green-100 text-green-600 group-hover:bg-green-200' :
                            diff.id === 'Medium' ? 'bg-yellow-100 text-yellow-600 group-hover:bg-yellow-200' :
                            'bg-red-100 text-red-600 group-hover:bg-red-200'
                        }`}>
                            {diff.id === 'Easy' && <span className="text-xl">🌱</span>}
                            {diff.id === 'Medium' && <span className="text-xl">🌿</span>}
                            {diff.id === 'Hard' && <span className="text-xl">🌳</span>}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 group-hover:text-french-blue transition-colors">{diff.label}</h3>
                            <p className="text-sm text-slate-500 group-hover:text-slate-600">{diff.desc}</p>
                        </div>
                        <ChevronRightIcon className="w-5 h-5 text-slate-300 ml-auto group-hover:text-french-blue transition-colors" />
                    </button>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};
