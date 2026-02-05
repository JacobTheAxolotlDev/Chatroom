 
import {
   initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
   getDatabase,
   ref,
   push,
   onChildAdded,
   onChildChanged,
   onChildRemoved,
   onValue,
   query,
   orderByChild,
   get,
   set
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

import {
   getAuth,
   setPersistence,
   browserLocalPersistence,
   onAuthStateChanged,
   signInWithEmailAndPassword,
   createUserWithEmailAndPassword,
   updateProfile,
   signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


// --- Your Firebase config ---

const firebaseConfig = {
   apiKey: "AIzaSyC0ppSfYRPCje-BusGftdn1kCMHgs-Z_BU",
   authDomain: "loganstoolsforschool.firebaseapp.com",
   databaseURL: "https://loganstoolsforschool-default-rtdb.firebaseio.com",
   projectId: "loganstoolsforschool",
   storageBucket: "loganstoolsforschool.firebasestorage.app",
   messagingSenderId: "883702419905",
   appId: "1:883702419905:web:8e9888e6d6f305ec165f40",
   measurementId: "G-P2HVQ9K0XD"
};

// --- Init ---
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

(async () => {
  await setPersistence(auth, browserLocalPersistence);
})();


// Auth DOM
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login");
const signupBtn = document.getElementById("signup");
const logoutBtn = document.getElementById("logout"); // --- Image upload -> COMPRESSED base64 -> send as a normal message ---
const whoami = document.getElementById("whoami");
const whoamiMini = document.getElementById("whoami-mini");

// --- AUTH: Sign Up ---
signupBtn.onclick = async () => {
   const username = usernameInput.value.trim();
   const password = passwordInput.value;
   if (!username) return alert("Enter a username");
   if (password.length < 6) return alert("Password must be at least 6 characters");

   // simple uniqueness check
   const key = username.toLowerCase();
   const unameRef = ref(db, "usernames/" + key);
   const taken = await get(unameRef);
   if (taken.exists()) return alert("Username is taken. Try another.");

   const fakeEmail = usernameToEmail(username);
   try {
      const cred = await createUserWithEmailAndPassword(auth, fakeEmail, password);

      // Save user profile + map username -> uid
      await set(ref(db, "users/" + cred.user.uid), {
         username
      });
      await set(unameRef, {
         uid: cred.user.uid
      });

      alert("Account created! You're logged in.");

      // Auto-reload page to update state
      location.reload();

   } catch (e) {
      alert(e.message);
   }
};


// --- AUTH: Login ---
loginBtn.onclick = async () => {
   const username = usernameInput.value.trim();
   const password = passwordInput.value;
   if (!username) return alert("Enter your username");
   const fakeEmail = usernameToEmail(username);
   try {
      await signInWithEmailAndPassword(auth, fakeEmail, password);
   } catch (e) {
      alert(e.message);
   }
};

// --- AUTH: Logout ---
logoutBtn.onclick = async () => {
   try {
      await signOut(auth);
   } catch (e) {
      alert(e.message);
   }
};

// --- AUTH state changes ---
onAuthStateChanged(auth, async (user) => {
   currentUser = user || null;
   if (user) {
      

      // ✅ Normal user logic
      document.getElementById("auth").style.display = "none";
      logoutBtn.style.display = "inline-block";

      // fetch username
      currentUsername = user.displayName || null;
      if (!currentUsername) {
         const snap = await get(ref(db, "users/" + user.uid));
         currentUsername = snap.exists() ? snap.val().username : "(user)";
      }
      whoami.innerHTML = `Logged in as: ${currentUsername}`;
      whoamiMini.innerHTML = currentUsername;

      

      
    
   } else {
      document.getElementById("auth").style.display = "flex";
      logoutBtn.style.display = "none";
      whoami.innerHTML = "Not logged in";
      whoamiMini.innerHTML = "";
      currentUsername = null;


   }
});
// helper: convert username to a fake email for Firebase Auth
function usernameToEmail(u) {
   return `${u}@myapp.local`.toLowerCase();
}