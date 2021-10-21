// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { main } from "./webgl"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAs4rLWFbJymfRmC1BdItylcSDwDwI0Meo",
  authDomain: "coastline-d884f.firebaseapp.com",
  projectId: "coastline-d884f",
  storageBucket: "coastline-d884f.appspot.com",
  messagingSenderId: "176713969683",
  appId: "1:176713969683:web:08c70e38da50adef9bcfe6",
  measurementId: "G-J7KFTBJ2L1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

main();