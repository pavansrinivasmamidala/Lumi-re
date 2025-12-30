import React, { useState } from 'react';
import { GlossaryEntry } from '../types';

interface InteractiveTextProps {
  text: string;
  glossary: GlossaryEntry[];
  className?: string;
}

export const InteractiveText: React.FC<InteractiveTextProps> = ({ text, glossary, className = "" }) => {
  // Create a lookup map for faster access
  // Normalize keys to lowercase for matching
  const glossaryMap = React.useMemo(() => {
    const map = new Map<string, GlossaryEntry>();
    glossary.forEach(entry => {
      map.set(entry.word.toLowerCase(), entry);
    });
    return map;
  }, [glossary]);

  // Split text by spaces and punctuation, but keep delimiters to reconstruct sentence
  // Regex matches words (including accents) or non-word characters
  const tokens = text.split(/([ \t\n.,!?;:()'"«»-]+)/);

  return (
    <div className={`inline-block ${className}`}>
      {tokens.map((token, index) => {
        // Clean token to find match (remove punctuation for lookup if stuck to word)
        const cleanToken = token.toLowerCase().trim();
        const entry = glossaryMap.get(cleanToken);

        if (!entry || !cleanToken.match(/[a-zA-Zà-üÀ-Ü]/)) {
          // If no definition or just punctuation/space, render text normally
          return <span key={index}>{token}</span>;
        }

        return (
          <WordTooltip key={index} word={token} entry={entry} />
        );
      })}
    </div>
  );
};

interface WordTooltipProps {
  word: string;
  entry: GlossaryEntry;
}

const WordTooltip: React.FC<WordTooltipProps> = ({ word, entry }) => {
  const [show, setShow] = useState(false);

  return (
    <span 
      className="relative inline-block group cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="border-b-2 border-french-blue/30 group-hover:bg-french-blue/10 rounded transition-colors duration-200">
        {word}
      </span>
      
      {/* Tooltip */}
      <div 
        className={`
          absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 
          bg-slate-800 text-white text-sm rounded-lg shadow-xl p-4 
          transition-all duration-200 pointer-events-none
          ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
        `}
      >
        <div className="flex justify-between items-baseline mb-1 border-b border-slate-600 pb-1">
          <span className="font-bold font-serif text-lg text-french-white">{entry.word}</span>
          <span className="text-slate-400 font-mono text-xs">{entry.phonetics}</span>
        </div>
        <div className="mb-2">
          <span className="text-blue-300 font-medium">Def: </span>
          {entry.definition}
        </div>
        <div className="text-xs italic text-slate-400 bg-slate-900/50 p-2 rounded border-l-2 border-french-blue">
          "{entry.example}"
        </div>
        
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-2 border-8 border-transparent border-t-slate-800"></div>
      </div>
    </span>
  );
};
