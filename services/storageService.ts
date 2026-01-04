
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { QuizData, StoryData, SavedQuiz, SavedStory, VocabularyEntry, CefrLevel, WordDetail } from '../types';

/* 
  SUPABASE TABLE SCHEMA REQUIREMENT:
  See supabase_setup.sql in project root.
*/

const LOCAL_QUIZ_KEY = 'lumiere_local_quizzes';
const LOCAL_STORY_KEY = 'lumiere_local_stories';
const LOCAL_VOCAB_PREFIX = 'lumiere_vocab_'; // e.g. lumiere_vocab_A1

// Generate a random ID for the browser session to group items
const getUserId = () => {
  const KEY = 'lumiere_device_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
};

// --- GENERIC HELPERS ---

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
  if (!isSupabaseConfigured()) {
    console.log("Supabase not configured (missing env vars). Using local storage.");
    return false;
  }
  try {
    const { error } = await supabase.from('quizzes').select('id', { count: 'exact', head: true });
    if (error) {
      console.warn("Supabase Access Check Failed (Check if tables exist via supabase_setup.sql):", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Supabase Connection Error:", e);
    return false;
  }
};

// --- QUIZZES ---

export const saveQuizToHistory = async (quiz: QuizData): Promise<SavedQuiz> => {
  const userId = getUserId();
  const timestamp = Date.now();
  
  if (isSupabaseConfigured()) {
    try {
        const { data, error } = await supabase
          .from('quizzes')
          .insert([{ user_id: userId, data: quiz }])
          .select()
          .single();

        if (error) throw error;

        return {
          id: data.id,
          created_at: new Date(data.created_at).getTime(),
          data: data.data
        };
    } catch (err: any) {
        console.warn("Supabase save failed:", err.message || err);
    }
  }

  const newSavedQuiz: SavedQuiz = {
      id: crypto.randomUUID(),
      created_at: timestamp,
      data: quiz
  };
  const current = getLocalItems<SavedQuiz>(LOCAL_QUIZ_KEY);
  saveLocalItems(LOCAL_QUIZ_KEY, [newSavedQuiz, ...current]);
  return newSavedQuiz;
};

export const getSavedQuizzes = async (): Promise<SavedQuiz[]> => {
  if (isSupabaseConfigured()) {
    try {
        const { data, error } = await supabase
          .from('quizzes')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map((row: any) => ({
          id: row.id,
          created_at: new Date(row.created_at).getTime(),
          data: row.data
        }));
    } catch (err: any) {
        // Fallback silently
    }
  }
  return getLocalItems<SavedQuiz>(LOCAL_QUIZ_KEY);
};

export const deleteSavedQuiz = async (id: string): Promise<void> => {
  if (isSupabaseConfigured()) {
    try {
        const { error } = await supabase.from('quizzes').delete().eq('id', id);
        if (error) throw error;
    } catch (err) {}
  }

  const current = getLocalItems<SavedQuiz>(LOCAL_QUIZ_KEY);
  const updated = current.filter(q => q.id !== id);
  if (current.length !== updated.length) {
      saveLocalItems(LOCAL_QUIZ_KEY, updated);
  }
};

// --- STORIES ---

export const saveStoryToHistory = async (story: StoryData): Promise<SavedStory> => {
  const userId = getUserId();
  const timestamp = Date.now();

  if (isSupabaseConfigured()) {
    try {
        const { data, error } = await supabase
          .from('stories')
          .insert([{ user_id: userId, data: story }])
          .select()
          .single();

        if (error) throw error;

        return {
          id: data.id,
          created_at: new Date(data.created_at).getTime(),
          data: data.data
        };
    } catch (err: any) {
        console.warn("Supabase save story failed:", err.message);
    }
  }

  const newSavedStory: SavedStory = {
      id: crypto.randomUUID(),
      created_at: timestamp,
      data: story
  };
  const current = getLocalItems<SavedStory>(LOCAL_STORY_KEY);
  saveLocalItems(LOCAL_STORY_KEY, [newSavedStory, ...current]);
  return newSavedStory;
};

export const getSavedStories = async (): Promise<SavedStory[]> => {
  if (isSupabaseConfigured()) {
    try {
        const { data, error } = await supabase
          .from('stories')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map((row: any) => ({
          id: row.id,
          created_at: new Date(row.created_at).getTime(),
          data: row.data
        }));
    } catch (err: any) {}
  }
  return getLocalItems<SavedStory>(LOCAL_STORY_KEY);
};

export const deleteSavedStory = async (id: string): Promise<void> => {
  if (isSupabaseConfigured()) {
    try {
        const { error } = await supabase.from('stories').delete().eq('id', id);
        if (error) throw error;
    } catch (err) {}
  }

  const current = getLocalItems<SavedStory>(LOCAL_STORY_KEY);
  const updated = current.filter(s => s.id !== id);
  if (current.length !== updated.length) {
      saveLocalItems(LOCAL_STORY_KEY, updated);
  }
};

// --- VOCABULARY ---

export const getVocabularyByLevel = async (level: CefrLevel): Promise<VocabularyEntry[]> => {
  if (isSupabaseConfigured()) {
    try {
      // Check if DB has words for this level
      const { data, error } = await supabase
        .from('vocabulary')
        .select('*')
        .eq('level', level);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        return data as VocabularyEntry[];
      }
    } catch (e: any) {
      console.warn(`Vocab fetch failed in Supabase (falling back to local): ${e.message}`);
    }
  }
  
  return getLocalItems<VocabularyEntry>(`${LOCAL_VOCAB_PREFIX}${level}`);
};

export const saveVocabularyList = async (level: CefrLevel, words: VocabularyEntry[]): Promise<void> => {
  // Ensure level is set on all words
  const cleanWords = words.map(w => ({ ...w, level, details: null }));

  if (isSupabaseConfigured()) {
    try {
      // Batch insert
      const { error } = await supabase.from('vocabulary').insert(cleanWords);
      if (error) throw error;
      return;
    } catch (e: any) {
      console.warn(`Supabase vocab insert failed (falling back to local): ${e.message}`);
    }
  }

  // Local Fallback
  // Overwrite local list for simplicity or append unique? Overwrite usually fine for this use case.
  saveLocalItems(`${LOCAL_VOCAB_PREFIX}${level}`, cleanWords);
};

export const saveVocabularyEntry = async (entry: VocabularyEntry): Promise<void> => {
  if (isSupabaseConfigured()) {
    try {
      // Check if exists first to avoid duplicate errors if constraints are loose, or use upsert
      const { error } = await supabase.from('vocabulary').upsert(entry, { onConflict: 'word' });
      if (error) throw error;
      return;
    } catch (e: any) {
      console.warn(`Supabase vocab entry save failed: ${e.message}`);
    }
  }

  // Local Fallback
  const key = `${LOCAL_VOCAB_PREFIX}${entry.level}`;
  const list = getLocalItems<VocabularyEntry>(key);
  // Check if exists
  const idx = list.findIndex(w => w.word.toLowerCase() === entry.word.toLowerCase());
  if (idx !== -1) {
    list[idx] = entry; // Update
  } else {
    list.push(entry); // Add
  }
  saveLocalItems(key, list);
};

export const getWordDetailsFromDB = async (word: string): Promise<WordDetail | null> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('vocabulary')
        .select('details')
        .ilike('word', word) // Case insensitive
        .limit(1)
        .single();
      
      if (!error && data?.details) {
        return data.details as WordDetail;
      }
    } catch (e) {}
  }

  // Local Fallback: Scan all levels to find the word
  const levels: CefrLevel[] = ['A1', 'A2', 'B1', 'B2'];
  for (const lvl of levels) {
    const list = getLocalItems<VocabularyEntry>(`${LOCAL_VOCAB_PREFIX}${lvl}`);
    const found = list.find(w => w.word.toLowerCase() === word.toLowerCase());
    if (found && found.details) {
      return found.details;
    }
  }
  return null;
};

export const updateWordDetailsInDB = async (word: string, details: WordDetail): Promise<void> => {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('vocabulary')
        .update({ details: details })
        .eq('word', word);
        
      if (!error) return;
    } catch (e) {}
  }

  // Local Fallback
  const levels: CefrLevel[] = ['A1', 'A2', 'B1', 'B2'];
  for (const lvl of levels) {
    const key = `${LOCAL_VOCAB_PREFIX}${lvl}`;
    const list = getLocalItems<VocabularyEntry>(key);
    const idx = list.findIndex(w => w.word === word);
    if (idx !== -1) {
      list[idx].details = details;
      saveLocalItems(key, list);
      return; // Stop after first match
    }
  }
};
