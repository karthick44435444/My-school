import { getAdminFirestore } from "./firebaseAdmin";
import type { CollectionReference, Query, DocumentData } from "firebase-admin/firestore";

export const COLLECTIONS = {
  SCHOOLS: "schools",
  USERS: "users",
  CLASSES: "classes",
  HOMEWORK: "homework",
  ANNOUNCEMENTS: "announcements",
  ATTENDANCE: "attendance",
  MARKS: "marks",
  NOTIFICATIONS: "notifications",
  READ_RECEIPTS: "readReceipts",
  PUSH_TOKENS: "pushTokens",
} as const;

/** Generic Firestore document reader helper */
export async function getDocById<T = any>(collection: string, id: string): Promise<T | null> {
  const db = getAdminFirestore();
  const snap = await db.collection(collection).doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as T;
}

/** Generic Firestore query list helper */
export async function queryDocs<T = any>(
  collection: string,
  filterFn?: (ref: CollectionReference<DocumentData>) => Query<DocumentData>
): Promise<T[]> {
  const db = getAdminFirestore();
  let query: Query<DocumentData> = db.collection(collection);
  if (filterFn) {
    query = filterFn(db.collection(collection));
  }
  const snap = await query.get();
  return snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as T));
}

/** Generic Firestore document writer helper */
export async function setDoc<T = any>(collection: string, id: string, data: Partial<T>): Promise<void> {
  const db = getAdminFirestore();
  await db.collection(collection).doc(id).set(
    {
      ...data,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/** Generic Firestore document creator helper */
export async function addDoc<T = any>(collection: string, data: T): Promise<string> {
  const db = getAdminFirestore();
  const res = await db.collection(collection).add({
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return res.id;
}

/** Generic Firestore document delete helper */
export async function deleteDoc(collection: string, id: string): Promise<void> {
  const db = getAdminFirestore();
  await db.collection(collection).doc(id).delete();
}

/** Get user by email from Firestore */
export async function getFirestoreUserByEmail(email: string) {
  const users = await queryDocs(COLLECTIONS.USERS, (ref) =>
    ref.where("email", "==", email.toLowerCase().trim()).limit(1)
  );
  return users[0] || null;
}

/** Get school by schoolCode from Firestore */
export async function getFirestoreSchoolByCode(schoolCode: string) {
  const schools = await queryDocs(COLLECTIONS.SCHOOLS, (ref) =>
    ref.where("schoolCode", "==", schoolCode.toUpperCase().trim()).limit(1)
  );
  return schools[0] || null;
}
