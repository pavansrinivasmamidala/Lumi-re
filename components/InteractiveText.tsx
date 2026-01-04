
import React, { useState } from 'react';
import { GlossaryEntry, CefrLevel, VocabularyEntry } from '../types';
import { SpeakerWaveIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { generateWordDetails } from '../services/geminiService';
import { getWordDetailsFromDB, saveVocabularyEntry } from '../services/storageService';

interface InteractiveTextProps {
  text: string;
  glossary: GlossaryEntry[];
  level?: string; // Add level to support saving to DB
  className?: string;
}

export const InteractiveText: React.FC<InteractiveTextProps> = ({ text, glossary, level, className = "" }) => {
  // Create a map for fast lookups of pre-loaded glossary items
  const glossaryMap = React.useMemo(() => {
    const map = new Map<string, GlossaryEntry>();
    glossary.forEach(entry => {
      map.set(entry.word.toLowerCase(), entry);
    });
    return map;
  }, [glossary]);

  // Split text into tokens (keeping punctuation)
  const tokens = text.split(/([ \t\n.,!?;:()'"«»-]+)/);

  return (
    <div className={`inline-block ${className}`}>
      {tokens.map((token, index) => {
        const cleanToken = token.toLowerCase().trim();
        
        // Skip whitespace/punctuation for interaction
        if (!cleanToken.match(/[a-zA-Zà-üÀ-Ü]/)) {
           return <span key={index}>{token}</span>;
        }

        // Check if we have it in the initial glossary
        const initialEntry = glossaryMap.get(cleanToken);

        return (
          <WordToken 
            key={index} 
            word={token} 
            initialEntry={initialEntry} 
            level={level as CefrLevel || 'A1'} 
          />
        );
      })}
    </div>
  );
};

interface WordTokenProps {
  word: string;
  initialEntry?: GlossaryEntry;
  level: CefrLevel;
}

const WordToken: React.FC<WordTokenProps> = ({ word, initialEntry, level }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [entry, setEntry] = useState<GlossaryEntry | undefined>(initialEntry);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 1. Audio Pronunciation (Immediate)
    const u = new SpeechSynthesisUtterance(word);
    u.lang = 'fr-FR';
    window.speechSynthesis.speak(u);

    // 2. Fetch logic if not present
    if (!entry) {
      setIsLoading(true);
      setShowTooltip(true);
      
      try {
        // A. Check Database First
        const dbDetail = await getWordDetailsFromDB(word);
        
        if (dbDetail) {
           // Map DB WordDetail to GlossaryEntry
           setEntry({
             word: dbDetail.word,
             definition: dbDetail.definition,
             phonetics: dbDetail.phonetics || "",
             example: `${dbDetail.examples[0].french} (${dbDetail.examples[0].english})`
           });
        } else {
           // B. Fallback to AI (Generate, Save, Show)
           const response = await generateWordDetails(word);
           const details = response.word_data;
           
           // Construct DB Entry
           const newVocabEntry: VocabularyEntry = {
              word: details.word,
              type: details.type,
              translation: details.translation,
              level: level,
              details: details
           };
           
           // Fire and forget save
           saveVocabularyEntry(newVocabEntry).catch(err => console.error("Auto-save failed", err));
           
           setEntry({
             word: details.word,
             definition: details.definition,
             phonetics: details.phonetics || "",
             example: `${details.examples[0].french} (${details.examples[0].english})`
           });
        }
      } catch (err) {
        console.error("Definition load failed", err);
      } finally {
        setIsLoading(false);
      }
    } else {
      setShowTooltip(!showTooltip);
    }
  };

  const isGlossaryWord = !!initialEntry;

  return (
    <span 
      className="relative inline-block group cursor-pointer z-20"
      onMouseEnter={() => isGlossaryWord && setShowTooltip(true)} // Hover only works for pre-loaded words for UX smoothness
      onMouseLeave={() => setShowTooltip(false)}
      onClick={handleClick}
    >
      <span className={`
        transition-colors duration-200 rounded px-0.5
        ${isGlossaryWord 
           ? 'border-b-2 border-french-blue/30 dark:border-blue-400/30 group-hover:bg-french-blue/10 dark:group-hover:bg-blue-400/10' 
           : 'hover:text-french-blue dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800'
        }
      `}>
        {word}
      </span>
      
      {/* Tooltip */}
      <div 
        className={`
          absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 
          bg-slate-800 dark:bg-slate-700 text-white text-sm rounded-lg shadow-xl p-4 
          transition-all duration-200 border dark:border-slate-600
          ${showTooltip ? 'opacity-100 translate-y-0 visible' : 'opacity-0 translate-y-2 invisible'}
        `}
        onClick={(e) => e.stopPropagation()} 
      >
        {isLoading ? (
           <div className="flex items-center justify-center gap-2 py-2">
              <ArrowPathIcon className="w-4 h-4 animate-spin text-french-blue" />
              <span className="text-xs text-slate-300">Searching Dictionary...</span>
           </div>
        ) : entry ? (
          <>
            <div className="flex justify-between items-center mb-2 border-b border-slate-600 dark:border-slate-500 pb-2">
              <div className="flex flex-col">
                  <span className="font-bold font-serif text-lg text-french-white capitalize">{entry.word}</span>
                  <span className="text-slate-400 dark:text-slate-300 font-mono text-xs">{entry.phonetics}</span>
              </div>
              <SpeakerWaveIcon className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mb-2">
              <span className="text-blue-300 font-medium">Def: </span>
              {entry.definition}
            </div>
            <div className="text-xs italic text-slate-400 dark:text-slate-300 bg-slate-900/50 p-2 rounded border-l-2 border-french-blue dark:border-blue-400">
              "{entry.example}"
            </div>
          </>
        ) : (
           <div className="text-xs text-red-300">Could not load definition.</div>
        )}
        
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-2 border-8 border-transparent border-t-slate-800 dark:border-t-slate-700"></div>
      </div>
    </span>
  );
};
