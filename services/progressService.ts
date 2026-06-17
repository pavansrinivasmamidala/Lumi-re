import localforage from 'localforage';
import { WeakConcept } from '../types';

const PROGRESS_STORE_KEY = 'lumiere_weak_concepts';

export const getWeakConcepts = async (): Promise<WeakConcept[]> => {
  try {
    const concepts = await localforage.getItem<WeakConcept[]>(PROGRESS_STORE_KEY);
    return concepts || [];
  } catch (error) {
    console.error("Failed to get weak concepts", error);
    return [];
  }
};

export const updateWeakConcepts = async (concepts: string[], isCorrect: boolean) => {
  if (!concepts || concepts.length === 0) return;

  try {
    const currentList = await getWeakConcepts();
    const updatedList = [...currentList];

    concepts.forEach(concept => {
      // Create a normalized id
      const id = concept.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const existingIndex = updatedList.findIndex(c => c.id === id);

      if (existingIndex >= 0) {
        if (isCorrect) {
          updatedList[existingIndex].correctCount += 1;
        } else {
          updatedList[existingIndex].wrongCount += 1;
        }
        updatedList[existingIndex].lastEncountered = Date.now();
      } else if (!isCorrect) {
        // Only add new weak concepts if they made a mistake
        updatedList.push({
          id,
          concept,
          wrongCount: 1,
          correctCount: 0,
          lastEncountered: Date.now()
        });
      }
    });

    // Option: remove concepts they've gotten correct 3 times
    const filteredList = updatedList.filter(c => c.correctCount < 3);

    await localforage.setItem(PROGRESS_STORE_KEY, filteredList);
  } catch (error) {
    console.error("Failed to update weak concepts", error);
  }
};

export const getTopWeakConcepts = async (limit: number = 2): Promise<string[]> => {
  const concepts = await getWeakConcepts();
  // Sort by highest wrongCount, lowest correctCount, and most recently encountered
  concepts.sort((a, b) => {
    if (a.wrongCount !== b.wrongCount) return b.wrongCount - a.wrongCount;
    if (a.correctCount !== b.correctCount) return a.correctCount - b.correctCount;
    return b.lastEncountered - a.lastEncountered;
  });

  return concepts.slice(0, limit).map(c => c.concept);
};
