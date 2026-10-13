import { User as FirebaseUser } from '@firebase/auth-types';

declare module 'firebase/auth' {
  export interface Auth {
    currentUser: FirebaseUser | null;
  }
  export type User = FirebaseUser;
  export class GoogleAuthProvider {
    constructor();
  }
  export function getAuth(app?: any): Auth;
  export function signInWithEmailAndPassword(auth: Auth, email: string, password: string): Promise<{ user: User }>;
  export function createUserWithEmailAndPassword(auth: Auth, email: string, password: string): Promise<{ user: User }>;
  export function signInWithPopup(auth: Auth, provider: any): Promise<{ user: User }>;
  export function signInAnonymously(auth: Auth): Promise<{ user: User }>;
  export function signOut(auth: Auth): Promise<void>;
  export function onAuthStateChanged(auth: Auth, callback: (user: User | null) => void): () => void;
  export function updateProfile(user: User, profile: { displayName?: string | null; photoURL?: string | null }): Promise<void>;
}

declare module 'firebase/database' {
  export interface Database {}
  export function getDatabase(app?: any): Database;
}

declare module 'firebase/storage' {
  export interface FirebaseStorage {}
  export function getStorage(app?: any): FirebaseStorage;
}
