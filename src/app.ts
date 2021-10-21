// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { main } from "./webgl"
import { firebaseConfig } from "./secrets";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Initialize Firebase
const app = initializeApp(firebaseConfig);

main();