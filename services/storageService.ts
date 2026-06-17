
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { QuizData, StoryData, SavedQuiz, SavedStory, VocabularyEntry, CefrLevel, WordDetail, UserProgress, StudyGuideDB, StudyGuideContent, PathCheckpoint, SavedDocument } from '../types';

const LOCAL_QUIZ_KEY = 'lumiere_local_quizzes';
const LOCAL_STORY_KEY = 'lumiere_local_stories';
const LOCAL_VOCAB_PREFIX = 'lumiere_vocab_'; 
const LOCAL_PROGRESS_KEY = 'lumiere_progress';
const LOCAL_GUIDES_KEY = 'lumiere_study_guides';
const LOCAL_DOC_KEY = 'lumiere_local_docs';

const getUserId = () => {
  const KEY = 'lumiere_device_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
};

const getLocalItems = <T>(key: string): T[] => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : [];
    } catch {
        return [];
    }
};

const saveLocalItems = <T>(key: string, items: T[]) => {
    localStorage.setItem(key, JSON.stringify(items));
};

export const checkSupabaseConnection = async (): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase.from('quizzes').select('id', { count: 'exact', head: true });
    return !error;
  } catch (e) {
    return false;
  }
};

// --- QUIZZES ---
export const saveQuizToHistory = async (quiz: QuizData): Promise<SavedQuiz> => {
  const userId = getUserId();
  const timestamp = Date.now();
  if (isSupabaseConfigured()) {
    try {
        // We now save topic and level as separate columns for easier querying
        const { data, error } = await supabase.from('quizzes').insert([{ 
            user_id: userId, 
            data: quiz,
            topic: quiz.topic,
            level: quiz.cefr_level
        }]).select().single();
        if (!error) return { id: data.id, created_at: new Date(data.created_at).getTime(), data: data.data };
    } catch (err) {}
  }
  const newSavedQuiz: SavedQuiz = { id: crypto.randomUUID(), created_at: timestamp, data: quiz };
  const current = getLocalItems<SavedQuiz>(LOCAL_QUIZ_KEY);
  saveLocalItems(LOCAL_QUIZ_KEY, [newSavedQuiz, ...current]);
  return newSavedQuiz;
};

export const getSavedQuizzes = async (): Promise<SavedQuiz[]> => {
  if (isSupabaseConfigured()) {
    try {
        const { data, error } = await supabase.from('quizzes').select('*').order('created_at', { ascending: false });
        if (!error) return data.map((row: any) => ({ id: row.id, created_at: new Date(row.created_at).getTime(), data: row.data }));
    } catch (err) {}
  }
  return getLocalItems<SavedQuiz>(LOCAL_QUIZ_KEY);
};

export const getSavedQuizzesByTopic = async (topic: string): Promise<SavedQuiz[]> => {
    if (isSupabaseConfigured()) {
      try {
          // Optimized query using the new column
          const { data, error } = await supabase.from('quizzes')
            .select('*')
            .eq('topic', topic)
            .order('created_at', { ascending: false });
            
          if (!error) return data.map((row: any) => ({ id: row.id, created_at: new Date(row.created_at).getTime(), data: row.data }));
      } catch (err) {}
    }
    // Local fallback filter
    const allLocal = getLocalItems<SavedQuiz>(LOCAL_QUIZ_KEY);
    return allLocal.filter(q => q.data.topic === topic).sort((a,b) => b.created_at - a.created_at);
  };

export const deleteSavedQuiz = async (id: string): Promise<void> => {
  if (isSupabaseConfigured()) {
    try { await supabase.from('quizzes').delete().eq('id', id); } catch (err) {}
  }
  const current = getLocalItems<SavedQuiz>(LOCAL_QUIZ_KEY);
  saveLocalItems(LOCAL_QUIZ_KEY, current.filter(q => q.id !== id));
};

// --- STORIES ---
export const saveStoryToHistory = async (story: StoryData): Promise<SavedStory> => {
  const userId = getUserId();
  const timestamp = Date.now();
  if (isSupabaseConfigured()) {
    try {
        const { data, error } = await supabase.from('stories').insert([{ user_id: userId, data: story }]).select().single();
        if (!error) return { id: data.id, created_at: new Date(data.created_at).getTime(), data: data.data };
    } catch (err) {}
  }
  const newSavedStory: SavedStory = { id: crypto.randomUUID(), created_at: timestamp, data: story };
  const current = getLocalItems<SavedStory>(LOCAL_STORY_KEY);
  saveLocalItems(LOCAL_STORY_KEY, [newSavedStory, ...current]);
  return newSavedStory;
};

export const getSavedStories = async (): Promise<SavedStory[]> => {
  if (isSupabaseConfigured()) {
    try {
        const { data, error } = await supabase.from('stories').select('*').order('created_at', { ascending: false });
        if (!error) return data.map((row: any) => ({ id: row.id, created_at: new Date(row.created_at).getTime(), data: row.data }));
    } catch (err) {}
  }
  return getLocalItems<SavedStory>(LOCAL_STORY_KEY);
};

export const deleteSavedStory = async (id: string): Promise<void> => {
  if (isSupabaseConfigured()) {
    try { await supabase.from('stories').delete().eq('id', id); } catch (err) {}
  }
  const current = getLocalItems<SavedStory>(LOCAL_STORY_KEY);
  saveLocalItems(LOCAL_STORY_KEY, current.filter(s => s.id !== id));
};

// --- VOCABULARY ---

export const clearVocabularyByLevel = async (level: CefrLevel): Promise<void> => {
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('vocabulary').delete().eq('level', level);
    } catch (e) {}
  }
  localStorage.removeItem(`${LOCAL_VOCAB_PREFIX}${level}`);
};

export const getVocabularyByLevel = async (level: CefrLevel): Promise<VocabularyEntry[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('vocabulary').select('*').eq('level', level);
      if (!error && data && data.length > 0) return data as VocabularyEntry[];
    } catch (e: any) {}
  }
  return getLocalItems<VocabularyEntry>(`${LOCAL_VOCAB_PREFIX}${level}`);
};

export const saveVocabularyList = async (level: CefrLevel, words: VocabularyEntry[]): Promise<void> => {
  const cleanWords = words.map(w => ({ ...w, level, details: null }));
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('vocabulary').insert(cleanWords);
      return;
    } catch (e: any) {}
  }
  saveLocalItems(`${LOCAL_VOCAB_PREFIX}${level}`, cleanWords);
};

export const saveVocabularyEntry = async (entry: VocabularyEntry): Promise<void> => {
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('vocabulary').upsert(entry, { onConflict: 'word' });
      return;
    } catch (e: any) {}
  }
  const key = `${LOCAL_VOCAB_PREFIX}${entry.level}`;
  const list = getLocalItems<VocabularyEntry>(key);
  const idx = list.findIndex(w => w.word.toLowerCase() === entry.word.toLowerCase());
  if (idx !== -1) list[idx] = entry; else list.push(entry);
  saveLocalItems(key, list);
};

export const getWordDetailsFromDB = async (word: string): Promise<WordDetail | null> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('vocabulary').select('details').ilike('word', word).limit(1).single();
      if (!error && data?.details) return data.details as WordDetail;
    } catch (e) {}
  }
  const levels: CefrLevel[] = ['A1', 'A2', 'B1', 'B2'];
  for (const lvl of levels) {
    const list = getLocalItems<VocabularyEntry>(`${LOCAL_VOCAB_PREFIX}${lvl}`);
    const found = list.find(w => w.word.toLowerCase() === word.toLowerCase());
    if (found && found.details) return found.details;
  }
  return null;
};

export const updateWordDetailsInDB = async (word: string, details: WordDetail): Promise<void> => {
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('vocabulary').update({ details: details }).eq('word', word);
      return;
    } catch (e) {}
  }
  const levels: CefrLevel[] = ['A1', 'A2', 'B1', 'B2'];
  for (const lvl of levels) {
    const key = `${LOCAL_VOCAB_PREFIX}${lvl}`;
    const list = getLocalItems<VocabularyEntry>(key);
    const idx = list.findIndex(w => w.word === word);
    if (idx !== -1) {
      list[idx].details = details;
      saveLocalItems(key, list);
      return;
    }
  }
};

export const searchVocabulary = async (query: string): Promise<VocabularyEntry[]> => {
  if (!query || query.length < 2) return [];
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('vocabulary').select('*').ilike('word', `${query}%`).limit(8);
      if (!error && data) return data as VocabularyEntry[];
    } catch (e) {}
  }
  const allWords: VocabularyEntry[] = [];
  const levels: CefrLevel[] = ['A1', 'A2', 'B1', 'B2'];
  for (const lvl of levels) allWords.push(...getLocalItems<VocabularyEntry>(`${LOCAL_VOCAB_PREFIX}${lvl}`));
  return allWords.filter(w => w.word.toLowerCase().startsWith(query.toLowerCase())).slice(0, 8);
};

// --- PATH / PROGRESS ---

export const getPathProgress = async (level: string): Promise<UserProgress[]> => {
  const userId = getUserId();
  if (isSupabaseConfigured()) {
    try {
       const { data, error } = await supabase.from('user_progress').select('*').eq('user_id', userId).eq('level_id', level);
       if (!error && data) return data as UserProgress[];
    } catch(e) {}
  }
  // Local fallback
  const allProgress = getLocalItems<UserProgress>(LOCAL_PROGRESS_KEY);
  return allProgress.filter(p => p.level_id === level);
};

export const markCheckpointComplete = async (level: string, title: string, score: number): Promise<void> => {
  const userId = getUserId();
  const entry: UserProgress = {
      level_id: level,
      checkpoint_title: title,
      completed: true,
      score: score
  };
  
  if (isSupabaseConfigured()) {
    try {
       await supabase.from('user_progress').upsert({
         user_id: userId,
         ...entry
       }, { onConflict: 'user_id, level_id, checkpoint_title' });
       return;
    } catch(e) {}
  }
  
  // Local Fallback
  const allProgress = getLocalItems<UserProgress>(LOCAL_PROGRESS_KEY);
  const idx = allProgress.findIndex(p => p.level_id === level && p.checkpoint_title === title);
  if (idx > -1) {
      // Keep highest score
      if (score > allProgress[idx].score) allProgress[idx].score = score;
      allProgress[idx].completed = true;
  } else {
      allProgress.push(entry);
  }
  saveLocalItems(LOCAL_PROGRESS_KEY, allProgress);
};

// --- DOCUMENTS ---
export const saveDocumentToHistory = async (doc: SavedDocument): Promise<SavedDocument> => {
  if (isSupabaseConfigured()) {
    try {
        const { data, error } = await supabase.from('shared_documents').insert([{ 
            id: doc.id,
            name: doc.name, 
            pages: doc.pages,
            translations: doc.translations || {},
            created_at: new Date(doc.timestamp).toISOString()
        }]).select().single();
        if (!error) return doc;
    } catch (err) {}
  }
  const current = getLocalItems<SavedDocument>(LOCAL_DOC_KEY);
  const existing = current.findIndex(d => d.id === doc.id);
  if (existing > -1) {
      current[existing] = doc;
  } else {
      current.unshift(doc);
  }
  saveLocalItems(LOCAL_DOC_KEY, current);
  return doc;
};

export const saveDocumentTranslations = async (id: string, translations: Record<number, string[]>): Promise<void> => {
  if (isSupabaseConfigured()) {
    try {
        await supabase.from('shared_documents').update({ translations }).eq('id', id);
    } catch (err) {}
  }
  const current = getLocalItems<SavedDocument>(LOCAL_DOC_KEY);
  const existing = current.findIndex(d => d.id === id);
  if (existing > -1) {
      current[existing].translations = translations;
      saveLocalItems(LOCAL_DOC_KEY, current);
  }
};

export const getSavedDocuments = async (): Promise<SavedDocument[]> => {
  if (isSupabaseConfigured()) {
    try {
        const { data, error } = await supabase.from('shared_documents').select('*').order('created_at', { ascending: false });
        if (!error && data) {
            return data.map((row: any) => ({ 
                id: row.id,
                name: row.name,
                pages: row.pages,
                translations: row.translations || {},
                timestamp: new Date(row.created_at).getTime(),
                currentPage: 0 // Will be overridden by local progress
            }));
        }
    } catch (err) {}
  }
  return getLocalItems<SavedDocument>(LOCAL_DOC_KEY);
};

export const deleteSavedDocument = async (id: string): Promise<void> => {
  if (isSupabaseConfigured()) {
    try { await supabase.from('shared_documents').delete().eq('id', id); } catch (err) {}
  }
  const current = getLocalItems<SavedDocument>(LOCAL_DOC_KEY);
  saveLocalItems(LOCAL_DOC_KEY, current.filter(d => d.id !== id));
};


export const getStudyGuide = async (topic: string, level: string): Promise<StudyGuideContent | null> => {
  if (isSupabaseConfigured()) {
    try {
        const { data, error } = await supabase.from('study_guides')
            .select('content')
            .eq('level_id', level)
            .eq('topic_id', topic)
            .single();
        if (!error && data) return data.content as StudyGuideContent;
    } catch (e) {}
  }
  
  // Local Fallback
  const guides = getLocalItems<StudyGuideDB>(LOCAL_GUIDES_KEY);
  const found = guides.find(g => g.level_id === level && g.topic_id === topic);
  return found ? found.content : null;
};

export const saveStudyGuide = async (topic: string, level: string, content: StudyGuideContent): Promise<void> => {
   if (isSupabaseConfigured()) {
       try {
           await supabase.from('study_guides').upsert({
               level_id: level,
               topic_id: topic,
               content: content
           }, { onConflict: 'level_id, topic_id' });
           return;
       } catch (e) {}
   }
   
   // Local Fallback
   const guides = getLocalItems<StudyGuideDB>(LOCAL_GUIDES_KEY);
   const idx = guides.findIndex(g => g.level_id === level && g.topic_id === topic);
   const newEntry: StudyGuideDB = { level_id: level, topic_id: topic, content };
   
   if (idx > -1) guides[idx] = newEntry;
   else guides.push(newEntry);
   
   saveLocalItems(LOCAL_GUIDES_KEY, guides);
};

export const getSyllabusList = async (level: string): Promise<PathCheckpoint[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('study_guides')
        .select('topic_id, content')
        .eq('level_id', level)
        .order('created_at', { ascending: true }); // Assumption: inserted in desired order

      if (!error && data && data.length > 0) {
        return data.map((row: any) => {
            const content = row.content as StudyGuideContent;
            // Truncate description for the card view
            const description = content.concept_explanation || "Study guide available.";
            const shortDesc = description.length > 120 ? description.substring(0, 120) + "..." : description;
            
            const examples = Array.isArray(content.examples) 
                ? content.examples.slice(0, 3).map((ex: any) => typeof ex === 'string' ? ex : ex.french) 
                : [];

            return {
                title: row.topic_id,
                description: shortDesc,
                examples: examples
            };
        });
      }
    } catch (e) {
      console.warn("Failed to fetch syllabus from DB", e);
    }
  }
  return [];
};
