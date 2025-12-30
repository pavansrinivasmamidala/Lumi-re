import { supabase } from './supabaseClient';
import { QuizData, SavedQuiz } from '../types';

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

export const saveQuizToHistory = async (quiz: QuizData): Promise<SavedQuiz> => {
  const userId = getUserId();
  const timestamp = Date.now();
  
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
      
      // Fallback to local storage
      const newSavedQuiz: SavedQuiz = {
          id: crypto.randomUUID(),
          created_at: timestamp,
          data: quiz
      };
      
      const current = getLocalHistory();
      saveLocalHistory([newSavedQuiz, ...current]);
      
      return newSavedQuiz;
  }
};

export const getSavedQuizzes = async (): Promise<SavedQuiz[]> => {
  const userId = getUserId();
  
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
      // Suppress "table not found" errors to avoid scary console logs for users who haven't run SQL migration yet
      if (err.code === '42P01') { 
          console.info("Supabase 'quizzes' table not found. Using local storage only.");
      } else {
          console.error('Error fetching history from Supabase:', err.message || err);
      }
      return getLocalHistory();
  }
};

export const deleteSavedQuiz = async (id: string): Promise<void> => {
  let supabaseFailed = false;
  try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
  } catch (err) {
      supabaseFailed = true;
      // Continue to try local delete
  }

  // Always try to delete from local storage as well to keep sync if we fell back previously
  try {
      const current = getLocalHistory();
      const updated = current.filter(q => q.id !== id);
      if (current.length !== updated.length) {
          saveLocalHistory(updated);
      } else if (supabaseFailed) {
          // If it wasn't in local and Supabase failed, propagate the error (or just log it)
          console.warn("Could not delete quiz from cloud storage.");
      }
  } catch (e) {
      console.error("Local delete failed", e);
  }
};
