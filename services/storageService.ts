import { supabase, isSupabaseConfigured } from './supabaseClient';
import { QuizData, SavedQuiz } from '../types';

/* 
  SUPABASE TABLE SCHEMA REQUIREMENT:
  Table Name: 'quizzes'
  Columns:
    - id: uuid (Primary Key, default: gen_random_uuid())
    - user_id: uuid (To group quizzes by device/browser)
    - data: jsonb (Stores the full quiz object)
    - created_at: timestamptz (default: now())
*/

const LOCAL_STORAGE_KEY = 'lumiere_local_quizzes';

// Generate a random ID for the browser session to group quizzes
const getUserId = () => {
  const KEY = 'lumiere_device_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
};

// Helper for local storage fallback
const getLocalHistory = (): SavedQuiz[] => {
    try {
        const item = localStorage.getItem(LOCAL_STORAGE_KEY);
        return item ? JSON.parse(item) : [];
    } catch {
        return [];
    }
};

const saveLocalHistory = (quizzes: SavedQuiz[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(quizzes));
};

export const checkSupabaseConnection = async (): Promise<boolean> => {
  // Fail fast if no keys are present
  if (!isSupabaseConfigured()) {
    console.log("Supabase not configured (missing env vars). Using local storage.");
    return false;
  }

  try {
    // Lightweight check: verify we can access the table structure
    const { error } = await supabase
      .from('quizzes')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.warn("Supabase Access Check Failed:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Supabase Connection Error:", e);
    return false;
  }
};

export const saveQuizToHistory = async (quiz: QuizData): Promise<SavedQuiz> => {
  const userId = getUserId();
  const timestamp = Date.now();
  
  // Try Supabase only if configured
  if (isSupabaseConfigured()) {
    try {
        const { data, error } = await supabase
          .from('quizzes')
          .insert([
            { 
              user_id: userId,
              data: quiz 
            }
          ])
          .select()
          .single();

        if (error) throw error;

        return {
          id: data.id,
          created_at: new Date(data.created_at).getTime(),
          data: data.data
        };
    } catch (err: any) {
        console.warn("Supabase save failed (falling back to localStorage):", err.message || err);
    }
  }

  // Fallback to local storage (either if not configured OR if save failed)
  const newSavedQuiz: SavedQuiz = {
      id: crypto.randomUUID(),
      created_at: timestamp,
      data: quiz
  };
  
  const current = getLocalHistory();
  saveLocalHistory([newSavedQuiz, ...current]);
  
  return newSavedQuiz;
};

export const getSavedQuizzes = async (): Promise<SavedQuiz[]> => {
  const userId = getUserId();
  
  if (isSupabaseConfigured()) {
    try {
        const { data, error } = await supabase
          .from('quizzes')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map((row: any) => ({
          id: row.id,
          created_at: new Date(row.created_at).getTime(),
          data: row.data
        }));

    } catch (err: any) {
        if (err.code === '42P01') { 
            console.info("Supabase 'quizzes' table not found. Using local storage only.");
        } else {
            console.warn('Error fetching history from Supabase:', err.message || err);
        }
    }
  }

  return getLocalHistory();
};

export const deleteSavedQuiz = async (id: string): Promise<void> => {
  let supabaseFailed = false;

  if (isSupabaseConfigured()) {
    try {
        const { error } = await supabase
          .from('quizzes')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
    } catch (err) {
        supabaseFailed = true;
    }
  }

  // Always try to delete from local storage as well to keep sync
  try {
      const current = getLocalHistory();
      const updated = current.filter(q => q.id !== id);
      if (current.length !== updated.length) {
          saveLocalHistory(updated);
      } else if (supabaseFailed) {
          console.warn("Could not delete quiz from cloud storage.");
      }
  } catch (e) {
      console.error("Local delete failed", e);
  }
};
