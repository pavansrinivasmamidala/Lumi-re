
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { QuizData, StoryData, SavedQuiz, SavedStory, VocabularyEntry, CefrLevel, WordDetail } from '../types';

const LOCAL_QUIZ_KEY = 'lumiere_local_quizzes';
const LOCAL_STORY_KEY = 'lumiere_local_stories';
const LOCAL_VOCAB_PREFIX = 'lumiere_vocab_'; 

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
        const { data, error } = await supabase.from('quizzes').insert([{ user_id: userId, data: quiz }]).select().single();
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
