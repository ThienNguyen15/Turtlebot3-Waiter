import { getApp, getApps, initializeApp } from 'firebase/app'
import { getStorage } from 'firebase/storage'
import { getDatabase} from 'firebase/database'

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSEAGING_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
  }

const realtimedb_firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    databaseURL: "https://turtlebot3-waiter-default-rtdb.firebaseio.com",
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSEAGING_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.measurementId
  }

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
const app_realtime =
  getApps().some(a => a.name === 'app_realtime')
    ? getApp('app_realtime')
    : initializeApp(realtimedb_firebaseConfig, 'app_realtime')

const storage = getStorage(app)
const database = getDatabase(app)
const realtimedb = getDatabase(app_realtime)

export { app, storage, database, app_realtime, realtimedb }