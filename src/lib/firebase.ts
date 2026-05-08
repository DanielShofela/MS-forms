import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
// @ts-ignore
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with experimentalForceLongPolling to bypass some proxy/firewall issues 
// that cause "Could not reach Cloud Firestore backend"
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);

// Debug helper for auth issues
if (typeof window !== 'undefined') {
  (window as any).debugAuth = () => {
    const currentDomain = window.location.hostname;
    console.log("--- Auth Debug Info ---");
    console.log("Current Origin:", window.location.origin);
    console.log("Current Hostname:", currentDomain);
    console.log("Firebase Auth Domain:", firebaseConfig.authDomain);
    console.log("User Logged In:", !!auth.currentUser);
    console.log("Project ID:", firebaseConfig.projectId);
    console.log("\n--- ACTIONS REQUIRED ---");
    console.log(`1. Go to Firebase Console > Build > Authentication > Settings > Authorized Domains`);
    console.log(`2. Add this domain to the list: ${currentDomain}`);
    console.log("-----------------------");
  };
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection successful.");
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      console.log("Firebase network connection is OK, but test document access was denied (this is normal if rules are strict).");
    } else {
      console.error("Firestore Connection Test Failed:", error);
      if (error.code === 'unavailable' || error.message?.includes('network')) {
        console.error("\n--- FIRESTORE NETWORK ERROR ---");
        console.error("The browser cannot reach Firestore. This is usually due to:");
        console.error("1. Domain not authorized in Firebase Console.");
        console.error("2. A browser extension (ad-blocker) blocking Firebase requests.");
        console.error("3. Local network restrictions.");
        console.error("Run `debugAuth()` in the console for more details.");
      }
    }
  }
}
testConnection();
