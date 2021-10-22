// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { main } from "./webgl"
import { getDatabase, ref, query, get } from "firebase/database";

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

const dbRef = ref(getDatabase());
get(query(dbRef)).then((snapshot) => {
  if (snapshot.exists()) {
    console.log(snapshot.val());
    main(snapshot.val());
  } else {
    console.log("No data available");
  }
}).catch((error) => {
  console.error(error);
});