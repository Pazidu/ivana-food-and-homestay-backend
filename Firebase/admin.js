// Firebase/admin.js
import admin from "firebase-admin";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serviceAccount = require("../contra-cloud-firebase-adminsdk-ow8ha-7792acf400.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "contra-cloud.firebasestorage.app",
  });
}

export default admin;
