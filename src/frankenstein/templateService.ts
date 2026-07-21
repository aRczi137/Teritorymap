import { db } from '../firebaseConfig';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import type { HiveTemplate } from './types';

const TEMPLATES_COLLECTION = 'hive_templates';

export async function fetchTemplates(): Promise<HiveTemplate[]> {
  const col = collection(db, TEMPLATES_COLLECTION);
  const snapshot = await getDocs(col);
  const templates: HiveTemplate[] = [];
  snapshot.forEach((d) => {
    const data = d.data();
    templates.push({
      id: d.id,
      name: data.name,
      gridConfig: data.gridConfig,
      players: data.players,
      placedPlayers: data.placedPlayers,
      frankyPosition: data.frankyPosition,
      updatedAt: data.updatedAt,
    });
  });
  return templates;
}

export async function saveTemplate(data: Omit<HiveTemplate, 'id'>): Promise<void> {
  const col = collection(db, TEMPLATES_COLLECTION);
  await addDoc(col, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTemplate(id: string): Promise<void> {
  const ref = doc(db, TEMPLATES_COLLECTION, id);
  await deleteDoc(ref);
}
