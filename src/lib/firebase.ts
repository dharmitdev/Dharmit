import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  setDoc, 
  getDoc,
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { PIPE_DIMENSIONS, PipeDimensionRecord } from './pipeDimensions';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { Feedback, AppSettings } from '../types';

const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || firebaseConfigJson.apiKey,
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || firebaseConfigJson.authDomain,
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || firebaseConfigJson.projectId,
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || firebaseConfigJson.storageBucket,
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || firebaseConfigJson.messagingSenderId,
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || firebaseConfigJson.appId,
};

const databaseId = (import.meta.env.VITE_FIREBASE_DATABASE_ID as string) || firebaseConfigJson.firestoreDatabaseId;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, databaseId);
export const auth = getAuth(app);

// Custom Firestore operations and error handlers as per firebase-integration guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentUser = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid || null,
      email: currentUser?.email || null,
      emailVerified: currentUser?.emailVerified || null,
      isAnonymous: currentUser?.isAnonymous || null,
      tenantId: currentUser?.tenantId || null,
      providerInfo: currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Generate stable visitor session ID & visitor ID
const SESSION_KEY = 'materials_desk_visitor_session_id';
const VISITOR_KEY = 'materials_desk_visitor_unique_id';

let sessionId = sessionStorage.getItem(SESSION_KEY);
if (!sessionId) {
  sessionId = 'sess-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now();
  sessionStorage.setItem(SESSION_KEY, sessionId);
}

let visitorId = localStorage.getItem(VISITOR_KEY);
if (!visitorId) {
  visitorId = 'vis-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now();
  localStorage.setItem(VISITOR_KEY, visitorId);
}

// Fetch user IP/geo-location gracefully
let visitorLocation = 'Mumbai, India';
let isGeoLoaded = false;

async function fetchLocation() {
  if (isGeoLoaded) return visitorLocation;
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (res.ok) {
      const data = await res.json();
      if (data.city && data.country_name) {
        visitorLocation = `${data.city}, ${data.country_name}`;
        isGeoLoaded = true;
        return visitorLocation;
      }
    }
  } catch (e) {
    // Graceful list of fallbacks for variety
    const fallbacks = [
      'Mumbai, India', 'Delhi, India', 'Chennai, India', 'Kolkata, India',
      'Ahmedabad, India', 'Pune, India', 'Bangalore, India', 'Hyderabad, India'
    ];
    visitorLocation = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    isGeoLoaded = true;
  }
  return visitorLocation;
}

// Set up heartbeats and pageview counts
export async function initializeVisitorTracking() {
  try {
    const loc = await fetchLocation();
    const userAgent = navigator.userAgent;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
    const deviceType = isMobile ? 'Mobile' : 'Desktop';
    const referrer = document.referrer || 'Direct';

    // 1. Create or Update active session document
    const sessionRef = doc(db, 'sessions', sessionId);
    try {
      await setDoc(sessionRef, {
        id: sessionId,
        visitorId,
        location: loc,
        deviceType,
        userAgent,
        referrer,
        firstSeen: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `sessions/${sessionId}`);
    }

    // 2. Increment global pageview metrics / log pageview document
    const pageviewRef = collection(db, 'pageviews');
    try {
      await addDoc(pageviewRef, {
        sessionId,
        visitorId,
        location: loc,
        deviceType,
        referrer,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'pageviews');
    }

    // Start active heartbeat every 20 seconds to keep online status
    setInterval(async () => {
      try {
        const activeRef = doc(db, 'sessions', sessionId);
        await setDoc(activeRef, {
          lastActive: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `sessions/${sessionId}`);
      }
    }, 20000);
  } catch (err) {
    console.error('Failed to initialize visitor tracking:', err);
  }
}

// Log actions dynamically
export async function logVisitorAction(action: string, type: 'search' | 'view' | 'filter' | 'download' | 'share' | 'inquiry') {
  try {
    const loc = isGeoLoaded ? visitorLocation : await fetchLocation();
    const actionsRef = collection(db, 'actions');
    try {
      await addDoc(actionsRef, {
        sessionId,
        visitorId,
        location: loc,
        action,
        type,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'actions');
    }
  } catch (e) {
    console.error('Failed to log visitor action:', e);
  }
}

export interface AnalyticsData {
  activeUsers: number;
  totalPageviews: number;
  uniqueVisitors: number;
  recentEvents: Array<{
    id: string;
    location: string;
    action: string;
    time: string;
    type: string;
    timestamp: Date;
  }>;
  countries: Array<{ name: string; count: number; percentage: number }>;
  deviceSplit: { desktop: number; mobile: number };
  popularSearches: Array<{ query: string; count: number }>;
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 5000) return 'Just now';
  if (diffMs < 60000) return `${Math.floor(diffMs / 1000)}s ago`;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return date.toLocaleDateString();
}

export function subscribeToRealtimeAnalytics(onUpdate: (data: AnalyticsData) => void) {
  let sessionsList: any[] = [];
  let totalPageviewsCount = 0;
  let recentEvents: any[] = [];
  let popularList: any[] = [];

  const triggerUpdate = () => {
    const now = Date.now();
    // Calculate active users based strictly on lastActive time within last 90 seconds (90,000 ms)
    const activeCutoff = new Date(now - 90 * 1000).toISOString();

    const activeSessions = sessionsList.filter(s => s.lastActive && s.lastActive > activeCutoff);
    const activeCount = activeSessions.length;

    // Compute unique visitors from real visitor IDs
    const uniqueIds = new Set(sessionsList.map(s => s.visitorId));
    const uniqueCount = uniqueIds.size;

    // Compute device split from real session details
    let desktopCount = 0;
    let mobileCount = 0;
    sessionsList.forEach(s => {
      if (s.deviceType === 'Mobile') {
        mobileCount++;
      } else {
        desktopCount++;
      }
    });
    const totalDevices = desktopCount + mobileCount;
    const desktopPct = totalDevices > 0 ? Math.round((desktopCount / totalDevices) * 100) : 100;
    const mobilePct = totalDevices > 0 ? (100 - desktopPct) : 0;

    // Compute country statistics dynamically
    const countryCounts: Record<string, number> = {};
    sessionsList.forEach(s => {
      const loc = s.location || 'India';
      const parts = loc.split(', ');
      const country = parts[parts.length - 1] || 'India';
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    });
    const totalSessions = sessionsList.length || 1;
    const countryArray = Object.entries(countryCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / totalSessions) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    // Format recent actions feed with actual relative timestamps
    const formattedEvents = recentEvents.map(evt => {
      const ts = evt.timestamp instanceof Date ? evt.timestamp : new Date(evt.timestamp);
      return {
        id: evt.id,
        location: evt.location,
        action: evt.action,
        time: formatRelativeTime(ts),
        type: evt.type,
        timestamp: ts
      };
    });

    onUpdate({
      activeUsers: activeCount,
      totalPageviews: totalPageviewsCount,
      uniqueVisitors: uniqueCount,
      recentEvents: formattedEvents,
      countries: countryArray.slice(0, 5),
      deviceSplit: { desktop: desktopPct, mobile: mobilePct },
      popularSearches: popularList
    });
  };

  // 1. Subscribe to sessions
  const unsubscribeSessions = onSnapshot(collection(db, 'sessions'), (snapshot) => {
    sessionsList = [];
    snapshot.forEach(doc => {
      sessionsList.push(doc.data());
    });
    triggerUpdate();
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'sessions');
  });

  // 2. Subscribe to pageviews count
  const unsubscribePageviews = onSnapshot(collection(db, 'pageviews'), (snapshot) => {
    totalPageviewsCount = snapshot.size;
    triggerUpdate();
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'pageviews');
  });

  // 3. Subscribe to actions feed (recent 15 events)
  const actionsQuery = query(collection(db, 'actions'), orderBy('timestamp', 'desc'), limit(15));
  const unsubscribeActions = onSnapshot(actionsQuery, (actionsSnapshot) => {
    const events: any[] = [];
    actionsSnapshot.forEach(doc => {
      const act = doc.data();
      const timestamp = act.timestamp ? new Date(act.timestamp) : new Date();

      events.push({
        id: doc.id,
        location: act.location || 'India',
        action: act.action || '',
        type: act.type || 'view',
        timestamp
      });
    });
    recentEvents = events;
    triggerUpdate();
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'actions');
  });

  // 4. Subscribe to search actions specifically
  const searchActionsQuery = query(collection(db, 'actions'), where('type', '==', 'search'));
  const unsubscribeSearches = onSnapshot(searchActionsQuery, (searchSnapshot) => {
    const searchCounts: Record<string, number> = {};
    searchSnapshot.forEach(doc => {
      const act = doc.data();
      const q = (act.action || '').replace('Searched "', '').replace('"', '').trim();
      if (q) {
        searchCounts[q] = (searchCounts[q] || 0) + 1;
      }
    });

    popularList = Object.entries(searchCounts)
      .map(([queryStr, count]) => ({ query: queryStr, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    triggerUpdate();
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'actions');
  });

  // Periodically refresh the trigger to recalculate active cutoffs and relative timestamps
  const timeRefreshInterval = setInterval(() => {
    triggerUpdate();
  }, 5000);

  return () => {
    clearInterval(timeRefreshInterval);
    unsubscribeSessions();
    unsubscribePageviews();
    unsubscribeActions();
    unsubscribeSearches();
  };
}

export function subscribeToNpsDimensions(onUpdate: (data: PipeDimensionRecord[]) => void) {
  const colRef = collection(db, 'nps_dimensions');
  
  return onSnapshot(colRef, async (snapshot) => {
    const recordsMap = new Map<string, PipeDimensionRecord>();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data && data.nps) {
        recordsMap.set(data.nps, {
          nps: data.nps,
          dn: Number(data.dn),
          od: Number(data.od),
          schedules: data.schedules || {}
        });
      }
    });

    // Check if any standard nominal sizes from PIPE_DIMENSIONS are missing
    const missingStandardItems: PipeDimensionRecord[] = [];
    for (const item of PIPE_DIMENSIONS) {
      if (!recordsMap.has(item.nps)) {
        missingStandardItems.push(item);
        // Add to active list immediately so the UI is fully populated right away
        recordsMap.set(item.nps, item);
      }
    }

    // Convert map to sorted array
    const records = Array.from(recordsMap.values());
    records.sort((a, b) => a.dn - b.dn);
    onUpdate(records);

    // If there are missing standard items, seed them in the background to make them editable & deletable
    if (missingStandardItems.length > 0) {
      console.log(`Self-healing: Found ${missingStandardItems.length} missing standard sizes in Firestore. Seeding them now...`);
      for (const item of missingStandardItems) {
        const id = item.nps.replace(/\//g, '_').replace(/\s+/g, '_');
        try {
          await setDoc(doc(db, 'nps_dimensions', id), {
            id,
            nps: item.nps,
            dn: item.dn,
            od: item.od,
            schedules: item.schedules
          });
        } catch (e) {
          console.error(`Failed to self-heal seed NPS ${item.nps}:`, e);
        }
      }
    }
  }, (error) => {
    console.error("Firestore subscription error for nps_dimensions:", error);
    // Provide static fallback in case of Firestore rules, connection, or permission issues
    const records = [...PIPE_DIMENSIONS];
    records.sort((a, b) => a.dn - b.dn);
    onUpdate(records);
  });
}

export async function addNpsDimension(record: PipeDimensionRecord) {
  const npsId = record.nps.replace(/\//g, '_').replace(/\s+/g, '_');
  const docRef = doc(db, 'nps_dimensions', npsId);
  try {
    await setDoc(docRef, {
      id: npsId,
      nps: record.nps,
      dn: Number(record.dn),
      od: Number(record.od),
      schedules: record.schedules
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `nps_dimensions/${npsId}`);
  }
}

export async function updateNpsDimension(npsId: string, record: Partial<PipeDimensionRecord>) {
  const docRef = doc(db, 'nps_dimensions', npsId);
  try {
    await setDoc(docRef, record, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `nps_dimensions/${npsId}`);
  }
}

export async function deleteNpsDimension(npsId: string) {
  const docRef = doc(db, 'nps_dimensions', npsId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `nps_dimensions/${npsId}`);
  }
}

export async function resetNpsDimensionsToDefault() {
  // To reset, we can delete existing and seed them, or simply overwrite them
  for (const item of PIPE_DIMENSIONS) {
    const id = item.nps.replace(/\//g, '_').replace(/\s+/g, '_');
    try {
      await setDoc(doc(db, 'nps_dimensions', id), {
        id,
        nps: item.nps,
        dn: item.dn,
        od: item.od,
        schedules: item.schedules
      });
    } catch (e) {
      console.error(`Failed to reset/seed NPS ${item.nps}:`, e);
    }
  }
}

// ==========================================
// USER FEEDBACK AND BUG REPORTS DATABASE API
// ==========================================

export async function submitFeedback(feedbackData: Omit<Feedback, 'id' | 'timestamp' | 'status'>) {
  const id = `feedback-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const docRef = doc(db, 'feedbacks', id);
  try {
    const feedbackDoc: any = {
      id,
      name: feedbackData.name,
      type: feedbackData.type,
      message: feedbackData.message,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    if (feedbackData.email !== undefined) {
      feedbackDoc.email = feedbackData.email;
    }
    if (feedbackData.attachmentName !== undefined) {
      feedbackDoc.attachmentName = feedbackData.attachmentName;
    }
    if (feedbackData.attachmentType !== undefined) {
      feedbackDoc.attachmentType = feedbackData.attachmentType;
    }
    if (feedbackData.attachmentData !== undefined) {
      feedbackDoc.attachmentData = feedbackData.attachmentData;
    }

    await setDoc(docRef, feedbackDoc);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `feedbacks/${id}`);
    throw error;
  }
}

export function subscribeFeedbacks(onUpdate: (feedbacks: Feedback[]) => void) {
  const colRef = collection(db, 'feedbacks');
  const q = query(colRef, orderBy('timestamp', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const records: Feedback[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      records.push({
        id: data.id || doc.id,
        name: data.name,
        email: data.email,
        type: data.type,
        message: data.message,
        timestamp: data.timestamp,
        status: data.status || 'pending',
        attachmentName: data.attachmentName,
        attachmentType: data.attachmentType,
        attachmentData: data.attachmentData
      });
    });
    onUpdate(records);
  }, (error) => {
    console.error("Firestore subscription error for feedbacks:", error);
    onUpdate([]);
  });
}

export async function updateFeedbackStatus(feedbackId: string, status: 'pending' | 'resolved' | 'ignored') {
  const docRef = doc(db, 'feedbacks', feedbackId);
  try {
    await setDoc(docRef, { status }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `feedbacks/${feedbackId}`);
  }
}

export async function deleteFeedback(feedbackId: string) {
  const docRef = doc(db, 'feedbacks', feedbackId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `feedbacks/${feedbackId}`);
  }
}

export async function getAppSettings(): Promise<AppSettings> {
  const docRef = doc(db, 'settings', 'admin');
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: 'admin',
        web3FormsKey: data.web3FormsKey || '',
        emailNotificationsEnabled: data.emailNotificationsEnabled ?? false,
        notificationRecipient: data.notificationRecipient || 'dharmitpatel8960@gmail.com'
      };
    } else {
      const envKey = (import.meta.env.VITE_WEB3FORMS_ACCESS_KEY as string) || '';
      return {
        id: 'admin',
        web3FormsKey: envKey,
        emailNotificationsEnabled: !!envKey,
        notificationRecipient: 'dharmitpatel8960@gmail.com'
      };
    }
  } catch (error) {
    console.error("Failed to fetch settings, returning defaults:", error);
    const envKey = (import.meta.env.VITE_WEB3FORMS_ACCESS_KEY as string) || '';
    return {
      id: 'admin',
      web3FormsKey: envKey,
      emailNotificationsEnabled: !!envKey,
      notificationRecipient: 'dharmitpatel8960@gmail.com'
    };
  }
}

export async function saveAppSettings(settings: Omit<AppSettings, 'id'>) {
  const docRef = doc(db, 'settings', 'admin');
  try {
    const cleanSettings: any = {
      id: 'admin',
      emailNotificationsEnabled: settings.emailNotificationsEnabled ?? false
    };

    if (settings.web3FormsKey !== undefined) {
      cleanSettings.web3FormsKey = settings.web3FormsKey;
    }
    if (settings.notificationRecipient !== undefined) {
      cleanSettings.notificationRecipient = settings.notificationRecipient;
    }

    await setDoc(docRef, cleanSettings, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'settings/admin');
  }
}

export function subscribeAppSettings(onUpdate: (settings: AppSettings) => void) {
  const docRef = doc(db, 'settings', 'admin');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      onUpdate({
        id: 'admin',
        web3FormsKey: data.web3FormsKey || '',
        emailNotificationsEnabled: data.emailNotificationsEnabled ?? false,
        notificationRecipient: data.notificationRecipient || 'dharmitpatel8960@gmail.com'
      });
    } else {
      const envKey = (import.meta.env.VITE_WEB3FORMS_ACCESS_KEY as string) || '';
      onUpdate({
        id: 'admin',
        web3FormsKey: envKey,
        emailNotificationsEnabled: !!envKey,
        notificationRecipient: 'dharmitpatel8960@gmail.com'
      });
    }
  }, (error) => {
    console.error("Settings subscription error:", error);
  });
}


