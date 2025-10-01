// Firebase/admin.js
import admin from "firebase-admin";
import serviceAccount from "../contra-cloud-firebase-adminsdk-ow8ha-7792acf400.json" assert { type: "json" };

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "contra-cloud.firebasestorage.app",
  });
}

export default admin;
