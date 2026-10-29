"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, limitToLast, onSnapshot, orderBy, query } from "firebase/firestore";
import type { Message as ApiMessage } from "./api/messages";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp() {
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || !firebaseConfig.appId) {
    throw new Error("Firebase is not configured. Set the NEXT_PUBLIC_FIREBASE_* values in frontend/.env.local.");
  }
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function getFirebaseFirestore() {
  return getFirestore(getFirebaseApp());
}

export function listenToGroupMessages(
  groupId: string,
  onMessages: (messages: ApiMessage[]) => void,
  onError: (error: Error) => void,
) {
  const messagesQuery = query(
    collection(getFirebaseFirestore(), "groups", groupId, "messages"),
    orderBy("createdAt", "asc"),
    limitToLast(100),
  );
  return onSnapshot(messagesQuery, (snapshot) => {
    onMessages(snapshot.docs
      .filter((document) => !document.data().deletedAt)
      .map((document) => document.data() as ApiMessage));
  }, onError);
}
