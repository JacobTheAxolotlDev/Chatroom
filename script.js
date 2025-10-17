// Wait for the page to load
window.onload = function() {
  // Keep the loading screen visible for 3 seconds (3000 milliseconds)
  setTimeout(function() {
    // Hide the loading screen
    document.getElementById('loading-screen').style.display = 'none';
    
    // Show the main content
    document.getElementById('main-content').style.display = 'block';
  }, 300);  // Change 3000 to your desired delay in milliseconds
};

   
    import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
    import {
      getDatabase, ref, push, onChildAdded, onChildChanged, onChildRemoved, onValue,
      query, orderByChild, get, set
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
      apiKey: "AIzaSyBYJW83DPFsEBNM1wV_3SJ0sT8aerGPx7A",
      authDomain: "chatroomfunyay.firebaseapp.com",
      databaseURL: "https://chatroomfunyay-default-rtdb.firebaseio.com",
      projectId: "chatroomfunyay",
      storageBucket: "chatroomfunyay.firebasestorage.app",
      messagingSenderId: "741967066444",
      appId: "1:741967066444:web:b6e386b842d3c29febcbe9",
      measurementId: "G-4CXD16WBVL",
    };

    // --- Init ---
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    const auth = getAuth(app);

    // Persist sessions (this is the “memory” so you stay logged in)
    await setPersistence(auth, browserLocalPersistence);

    // --- DOM ---
    const messagesDiv = document.getElementById("messages");
    const msgInput = document.getElementById("msg");
    const sendBtn = document.getElementById("send");
    const channelsDiv = document.getElementById("channels");
    const composer = document.getElementById("composer");
    const whoami = document.getElementById("whoami");
    const whoamiMini = document.getElementById("whoami-mini");
    const banUserBtn = document.getElementById("ban-user");
    const unbanUserBtn = document.getElementById("unban-user");


    // Admin DOM
    const adminPanel = document.getElementById("admin-panel");
    const createBtn = document.getElementById("create-channel");
    const reloadBtn = document.getElementById("reload-all");
    const wipeBtn = document.getElementById("wipe-all");
    // ---------- Falling images controlled via Firebase setting (applies to everyone) ----------

// ---------------------- Shared falling-image control (milliseconds) ----------------------

// DOM refs for the two admin buttons
const jamasBtn = document.getElementById('jamas-spam');
const stopJamasBtn = document.getElementById('stop-jamas-spam');

// Firebase DB ref for the shared fall rate (stored as NUMBER = milliseconds)
const fallRateRef = ref(db, 'settings/fallRate');

let fallIntervalId = null;

// create a falling image (same visual behaviour as your CSS expects)
function createFallingImage() {
  const img = document.createElement('img');
  img.src = './images/jamasdog.jpeg';
  img.classList.add('falling-image');

  img.style.left = `${Math.random() * 100}vw`;
  img.style.animationDuration = `${Math.random() * 2 + 2}s`;
  document.body.appendChild(img);

  img.addEventListener('animationend', () => img.remove());
}

// Sets the client-side interval using a value interpreted AS MILLISECONDS.
// Enforces integer ms and a safe minimum of 1 ms.
function setFallRateMs(ms) {
  let numeric = Number(ms);
  if (!isFinite(numeric) || numeric <= 0) numeric = 5000; // fallback to 5000 ms

  const msInt = Math.max(1, Math.round(numeric)); // store/use integer ms, min 1

  // clear previously running interval
  if (fallIntervalId !== null) {
    clearInterval(fallIntervalId);
    fallIntervalId = null;
  }

  // start a new interval that spawns images every msInt milliseconds
  fallIntervalId = setInterval(createFallingImage, msInt);
  console.log('[fallRate] set to', msInt, 'ms');
}

// Ensure DB has a default value (5000 ms) if missing
(async () => {
  try {
    const snap = await get(fallRateRef);
    if (!snap.exists()) {
      await set(fallRateRef, 5000);
      console.log('[fallRate] initialized to 5000 ms');
    }
  } catch (e) {
    console.warn('Could not initialize fallRate setting:', e);
  }
})();

// Listen for changes to settings/fallRate and treat the DB value as milliseconds
onValue(fallRateRef, (snap) => {
  const v = snap.val();
  let numeric = Number(v);
  if (!isFinite(numeric) || numeric <= 0) numeric = 5000;
  setFallRateMs(numeric);
}, (err) => {
  console.error('Failed to listen to fallRate:', err);
});

// Admin buttons write explicit millisecond values to the DB.
// Buttons are client-side-protected by adminUIDs check that you already have.
if (jamasBtn) {
  jamasBtn.onclick = async () => {
    if (!auth.currentUser || !adminUIDs.includes(auth.currentUser.uid)) {
      return alert('Admins only.');
    }
    try {
      // Set to 1 ms (interpreted as 1 millisecond). Browsers may throttle anything below ~1-4 ms.
      await set(fallRateRef, 1);
      alert('Jamas Dog Spam activated — fallRate set to 1 ms.');
    } catch (e) {
      alert('Failed to set jamas spam: ' + e.message);
    }
  };
}

if (stopJamasBtn) {
  stopJamasBtn.onclick = async () => {
    if (!auth.currentUser || !adminUIDs.includes(auth.currentUser.uid)) {
      return alert('Admins only.');
    }
    try {
      await set(fallRateRef, 5000); // 5000 ms = 5 seconds
      alert('Jamas Dog Spam stopped — fallRate reset to 5000 ms.');
    } catch (e) {
      alert('Failed to stop jamas spam: ' + e.message);
    }
  };
}


    // Auth DOM
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const loginBtn = document.getElementById("login");
    const signupBtn = document.getElementById("signup");
    const logoutBtn = document.getElementById("logout");

    // --- Image upload -> base64 -> send as a normal message ---
    const imageInput = document.getElementById("imageInput");

    imageInput.addEventListener("change", async () => {
      const file = imageInput.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result; // "data:image/...;base64,AAAA..."

        if (!auth.currentUser) {
          alert("You must be logged in to upload images!");
          return;
        }

        const messageObj = {
          name: currentUsername || "(user)",
          uid: auth.currentUser.uid,
          text: base64Data,          // <-- your addMessageElement() already renders this
          timestamp: Date.now(),
          channel: currentChannel,
        };

        try {
          await push(ref(db, "messages"), messageObj);
        } catch (err) {
          alert("Failed to upload image: " + err.message);
        }
      };

      reader.readAsDataURL(file);
      imageInput.value = ""; // allow re-selecting the same file
    });


    // --- State ---
    let channels = new Set();
    let allMessages = [];
    let currentChannel = "general";
    let currentUser = null;
    let currentUsername = null; // cached username

    const adminUIDs = [
      "INrpu9xmk0hZ16BLM8Z5GuPbTi12", // Logan
      "FF2pCJaZ3vRb1l3fYBYVnaFHcZk2",  // Baylor
      "1xniuFbfwIP44QBRWZbbpsvH60X2", //jahaml
      "V4AdzBN1B2MdZEt5CnXgt4kwMA63", //geo
      "fQ4iNM6q0xhXjqs8tBLLA5jVoSA2", //joy
      "1HZElGj4ZDOqcG0pNQEIJlc79622", //cindy
      "I8dNaLXmjMeUSwYZQ3uCm0tnTMM2", //gurt/rudy
      "uYDrDMHHMTPCVlROOCYsS5uC8F33"
    ];


    // helper: convert username to a fake email for Firebase Auth
    function usernameToEmail(u) { return `${u}@myapp.local`.toLowerCase(); }

    function cleanMessage(text) { return text; }

    // Slugify for channel keys
    function toSlug(s){
      return (s || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    // --- Channels / Messages ---
    async function loadChannels() {
  // Load messages
  const messagesRef = ref(db, "messages");
  const messagesSnap = await get(messagesRef);
  channels.clear();
  allMessages = [];

  if (messagesSnap.exists()) {
    messagesSnap.forEach((child) => {
      const msg = child.val();
      msg._id = child.key; // store the Firebase key for edits/deletes
      allMessages.push(msg);
      channels.add(msg.channel || "general");
    });
  }

  // Load explicit channels list so channels can exist without messages
  const channelsRef = ref(db, "channels");
  const channelsSnap = await get(channelsRef);
  if (channelsSnap.exists()) {
    channelsSnap.forEach(child => channels.add(child.key));
  }

  // Always include Admin Only channel for admins, even if no messages exist
  if (adminUIDs.includes(auth.currentUser?.uid)) {
    channels.add("admin-only"); // add "admin-only" channel for admins
  }

  if (channels.size === 0) channels = new Set(["general"]);
  if (!channels.has(currentChannel)) currentChannel = [...channels][0];

  renderChannels();
  displayMessagesForChannel(currentChannel);
}

    function renderChannels() {
  channelsDiv.innerHTML = "";
  [...channels].sort().forEach((channel) => {
    // Hide Admin Only channel unless the user is an admin
    if (channel === "admin-only" && !adminUIDs.includes(auth.currentUser?.uid)) {
      return; // Skip this channel for non-admins
    }

    const tab = document.createElement("div");
    tab.textContent = channel;
    tab.className = "channel-tab";
    if (channel === currentChannel) tab.classList.add("active");
    tab.onclick = () => {
      if (currentChannel !== channel) {
        currentChannel = channel;
        updateActiveTab();
        displayMessagesForChannel(currentChannel);
      }
    };
    channelsDiv.appendChild(tab);
  });
}

    function updateActiveTab() {
      const tabs = channelsDiv.querySelectorAll(".channel-tab");
      tabs.forEach((tab) => {
        tab.classList.toggle("active", tab.textContent === currentChannel);
      });
    }

    // List of banned UIDs (you can add more)
    const bannedUIDs = [
      "LSYwLmYBuOQGYTRS076QgkmLefq2",   // replace with the actual UID
      "wFfXjSlXkQaoaNU2gLfqPPY04t92"
    ];


    function addMessageElement(data) {
      let name = data.name || "Anonymous";
      const uname = (name || "").trim().toLowerCase();
      if (uname === "logan") name += " {👑Owner👑}";
      if (uname === "cindysussy") name += " {🟥Pokemon Addict🟥}";
      if (uname === "jahmal") name += " {🦐 Co-Owner🦐}";
      if (uname === "baylor") name += " [🟦Co-Owner🟦]";
      if (uname === "asher") name += " [🧈 Butter 🧈]"
      if (uname === "giooo") name += " [❓IDK❓]"
      if (uname === "joy") name += " [🧀cheese🧀]"
      if (uname === "gurt") name += " [🥛yogurt🥛]"

      let text = data.text || "(no message)";
      const timestamp = new Date(data.timestamp).toLocaleTimeString();

      if ((data.channel || "general") !== currentChannel) return;

      // Check if the message contains an image URL (http(s) or data:image)
      const imageURLMatch = text.match(/(https?:\/\/.*\.(jpg|jpeg|png|gif|bmp|webp)|data:image\/(png|jpeg|jpg|gif|bmp|webp);base64,[A-Za-z0-9+/=]+)/i);

      if (imageURLMatch) {
        const imgEl = document.createElement("img");
        imgEl.src = imageURLMatch[0];
        imgEl.alt = "Image message";
        imgEl.style.maxWidth = "100%";
        imgEl.style.borderRadius = "8px";
        imgEl.style.marginTop = "8px";

        const msgEl = document.createElement("div");
        msgEl.id = "msg-" + data._id;
        msgEl.appendChild(imgEl);
        messagesDiv.appendChild(msgEl);
        return; // Skip adding the rest of the message content
      }


      let color = null;
      let rainbow = false, baylor = false, glitch = false, diamond = false, gold = false, gren = false, electric = false, idk = false, laser = false, uranium = false, glowinggold = false, espurr = false, slime = false, gurt = false, axey = false, gio = false, butter = false, jamas = false, bread = false, fweh = false, pokemon = false, minecraft = false, silksong = false, maxwell = false, oiia = false, undertale = false, cooked = false;

      const namedColorMatch = text.match(/^(red|blue|green|orange|purple|white|yellow):\s*(.*)/i);
      const rainbowMatch = text.match(/^rainbow:\s*(.*)/i);
      const baylorMatch = text.match(/^baylor:\s*(.*)/i);
      const goldMatch = text.match(/^gold:\s*(.*)/i);
      const grenMatch = text.match(/^gren:\s*(.*)/i);
      const glitchMatch = text.match(/^glitch:\s*(.*)/i);
      const diamondMatch = text.match(/^diamond:\s*(.*)/i);
      const electricMatch = text.match(/^electric:\s*(.*)/i);
      const uraniumMatch = text.match(/^uranium:\s*(.*)/i);
      const laserMatch = text.match(/^laser:\s*(.*)/i);
      const idkMatch = text.match(/^idk:\s*(.*)/i);
      const glowinggoldMatch = text.match(/^glowinggold:\s*(.*)/i);
      const slimeMatch = text.match(/^slime:\s*(.*)/i);
      const axeyMatch = text.match(/^axey:\s*(.*)/i);
      const gioMatch = text.match(/^gio:\s*(.*)/i);
      const gurtMatch = text.match(/^gurt:\s*(.*)/i);
      const espurrMatch = text.match(/^espurr:\s*(.*)/i);
      const butterMatch = text.match(/^butter:\s*(.*)/i);
      const jamasMatch = text.match(/jamas:\s*(.*)/i)
      const breadMatch = text.match(/^bread:\s*(.*)/i);
      const fwehMatch = text.match(/^fweh:\s*(.*)/i);
      const pokemonMatch = text.match(/^pokemon:\s*(.*)/i);
      const minecraftMatch = text.match(/^minecraft:\s*(.*)/i);
      const silksongMatch = text.match(/^silksong:\s*(.*)/i);
      const oiiaMatch = text.match(/^oiia:\s*(.*)/i);
      const maxwellMatch = text.match(/^maxwell:\s*(.*)/i);
      const undertaleMatch = text.match(/^undertale:\s*(.*)/i);
      const cookedMatch = text.match(/^cooked:\s*(.*)/i);  // Detect "cooked:" prefix
      const hexMatch = text.match(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}):\s*(.*)/);

      if (cookedMatch) { 
        cooked = true;
        text = cookedMatch[1];  // Strip "cooked:" prefix
      }
      else if (namedColorMatch) { color = namedColorMatch[1].toLowerCase(); text = namedColorMatch[2]; }
      else if (rainbowMatch) { rainbow = true; text = rainbowMatch[1]; }
      else if (goldMatch) { gold = true; text = goldMatch[1]; }
      else if (grenMatch) { gren = true; text = grenMatch[1]; }
      else if (diamondMatch) { diamond = true; text = diamondMatch[1]; }
      else if (electricMatch) { electric = true; text = electricMatch[1]; }
      else if (baylorMatch) { baylor = true; text = baylorMatch[1]; }
      else if (uraniumMatch) { uranium = true; text = uraniumMatch[1]; }
      else if (laserMatch) { laser = true; text = laserMatch[1]; }
      else if (idkMatch) { idk = true; text = idkMatch[1]; }
      else if (glowinggoldMatch) { glowinggold = true; text = glowinggoldMatch[1]; }
      else if (slimeMatch) { slime = true; text = slimeMatch[1]; }
      else if (axeyMatch) { axey = true; text = axeyMatch[1]; }
      else if (gioMatch) { gio = true; text = gioMatch[1]; }
      else if (gurtMatch) { gurt = true; text = gurtMatch[1]; }
      else if (espurrMatch) { espurr = true; text = espurrMatch[1]; }
      else if (butterMatch) { butter = true; text = butterMatch[1]; }
      else if (jamasMatch) { jamas = true; text = jamasMatch[1]; }
      else if (breadMatch) { bread = true; text = breadMatch[1]; }
      else if (fwehMatch) { fweh = true; text = fwehMatch[1]; }
      else if (pokemonMatch) { pokemon = true; text = pokemonMatch[1]; }
      else if (minecraftMatch) { minecraft = true; text = minecraftMatch[1]; }
      else if (glitchMatch) { glitch = true; text = glitchMatch[1]; }
      else if (silksongMatch) { silksong = true; text = silksongMatch[1]; }
      else if (oiiaMatch) { oiia = true; text = oiiaMatch[1]; }
      else if (maxwellMatch) { maxwell = true; text = maxwellMatch[1]; }
      else if (undertaleMatch) { undertale = true; text = undertaleMatch[1]; }
      else if (hexMatch) { color = `#${hexMatch[1]}`; text = hexMatch[2]; }

      const msgEl = document.createElement("div");

      // Apply styles to the remaining text
      let messageContent = `${timestamp} - ${name}: ${text}`;
      msgEl.id = "msg-" + data._id;
      if (cooked) {
        const s = document.createElement("span");
        s.classList.add("cooked-text");  // Apply the cooked-text class to use Blaze_of_Glory font
        s.textContent = messageContent;
        msgEl.appendChild(s);
      } else if (rainbow) {
        const s = document.createElement("span");
        s.classList.add("rainbow-text");
        s.textContent = messageContent;
        msgEl.appendChild(s);
      } else if (gold) {
        const s = document.createElement("span");
        s.classList.add("gold-text");
        s.textContent = messageContent;
        msgEl.appendChild(s);
      } else if (gren) {
        const s = document.createElement("span");
        s.classList.add("gren-text");
        s.textContent = messageContent;
        msgEl.appendChild(s);
      } else if (diamond) {
        const s = document.createElement("span");
        s.classList.add("diamond-text");
        s.textContent = messageContent;
        msgEl.appendChild(s);
        } else if (electric) {
        const s = document.createElement("span");
        s.classList.add("electric-text");
        s.textContent = messageContent;
        msgEl.appendChild(s);
        } else if (baylor) {
        const s = document.createElement("span");
        s.classList.add("baylor-text");
        s.textContent = messageContent;
        msgEl.appendChild(s);
      } else if (uranium) {
        const s = document.createElement("span");
        s.classList.add("uranium-text");
        s.textContent = messageContent;
        msgEl.appendChild(s);
      } else if (laser) {
        const s = document.createElement("span");
        s.classList.add("laser-text");
        s.textContent = messageContent;
        msgEl.appendChild(s);
        } else if (idk) {
        const s = document.createElement("span");
        s.classList.add("idk-text");
        s.textContent = messageContent;
        msgEl.appendChild(s);
        } else if (glowinggold) {
        const s = document.createElement("span");
        s.classList.add("glowinggold-text");
        s.textContent = messageContent;
        msgEl.appendChild(s);
      } else if (slime) {
        const s = document.createElement("span");
        s.classList.add("slime-text");
        s.textContent = messageContent;
        msgEl.appendChild(s);
      } else if (axey) {
        const c = document.createElement("div");
        c.classList.add("axey-container");
        c.textContent = messageContent;
        const a1 = document.createElement("img");
        a1.src = "./images/axey.png";
        a1.classList.add("axey-img");
        const a2 = document.createElement("img");
        a2.src = "./images/axey.png";
        a2.classList.add("axey-img", "second");
        c.appendChild(a1);
        c.appendChild(a2);
        msgEl.appendChild(c);
      } else if (gio) {
        const c = document.createElement("div");
        c.classList.add("gio-container");
        c.textContent = messageContent;
        const a1 = document.createElement("img");
        a1.src = "./images/image-removebg-preview_-_2025-10-15T095130.742.png";
        a1.classList.add("gio-img");
        const a2 = document.createElement("img");
        a2.src = "./images/image-removebg-preview_-_2025-10-15T095130.742.png";
        a2.classList.add("gio-img", "second");
        c.appendChild(a1);
        c.appendChild(a2);
        msgEl.appendChild(c);
        } else if (gurt) {
        const c = document.createElement("div");
        c.classList.add("gurt-container");
        c.textContent = messageContent;
        const a1 = document.createElement("img");
        a1.src = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCzIjtq_tH-8oaT1bsvChvXoRHS0YEbRPrmQ&s";
        a1.classList.add("gurt-img");
        const a2 = document.createElement("img");
        a2.src = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRCzIjtq_tH-8oaT1bsvChvXoRHS0YEbRPrmQ&s";
        a2.classList.add("gurt-img", "second");
        c.appendChild(a1);
        c.appendChild(a2);
        msgEl.appendChild(c);
      } else if (espurr) {
        const c = document.createElement("div");
        c.classList.add("espurr-container");
        c.textContent = messageContent;
        const a1 = document.createElement("img");
        a1.src = "./images/espurr-removebg-preview.png";
        a1.classList.add("espurr-img");
        const a2 = document.createElement("img");
        a2.src = "./images/espurr-removebg-preview.png";
        a2.classList.add("espurr-img", "second");
        c.appendChild(a1);
        c.appendChild(a2);
        msgEl.appendChild(c);
      } else if (butter) {
        const c = document.createElement("div");
        c.classList.add("butter-container");
        c.textContent = messageContent;
        const a1 = document.createElement("img");
        a1.src = "./images/butter.png";
        a1.classList.add("butter-img");
        const a2 = document.createElement("img");
        a2.src = "./images/butter.png";
        a2.classList.add("butter-img", "second");
        c.appendChild(a1);
        c.appendChild(a2);
        msgEl.appendChild(c);
} else if (jamas) {
  const c = document.createElement("div");
  c.classList.add("jamas-container");
  c.textContent = messageContent;

  // wrapper #1
  const w1 = document.createElement("div");
  w1.classList.add("jamas-img");
  const i1 = document.createElement("img");
  i1.src = "./images/jamasdog.jpeg";
  i1.alt = "jamas dog";
  w1.appendChild(i1);

  // wrapper #2 (staggered)
  const w2 = document.createElement("div");
  w2.classList.add("jamas-img", "second");
  const i2 = document.createElement("img");
  i2.src = "./images/jamasdog.jpeg";
  i2.alt = "jamas dog";
  w2.appendChild(i2);

  c.appendChild(w1);
  c.appendChild(w2);
  msgEl.appendChild(c);


      } else if (bread) {
        const c = document.createElement("div");
        c.classList.add("bread-container");
        c.textContent = messageContent;
        const a1 = document.createElement("img");
        a1.src = "./images/images-removebg-preview_15_.png";
        a1.classList.add("bread-img");
        const a2 = document.createElement("img");
        a2.src = "./images/images-removebg-preview_15_.png";
        a2.classList.add("bread-img", "second");
        c.appendChild(a1);
        c.appendChild(a2);
        msgEl.appendChild(c);
      } else if (pokemon) {
        const c = document.createElement("div");
        c.classList.add("pokemon-container");
        c.textContent = messageContent;
        const p1 = document.createElement("img");
        p1.src = "./images/image-removebg-preview_-_2025-08-12T192644.788.png";
        p1.classList.add("pokemon-img");
        const p2 = document.createElement("img");
        p2.src = "./images/image-removebg-preview_-_2025-08-12T192644.788.png";
        p2.classList.add("pokemon-img", "second");
        const p3 = document.createElement("img");
        p3.src = "./images/image-removebg-preview_-_2025-08-12T192644.788.png";
        p3.classList.add("pokemon-img",  "third");
        const p4 = document.createElement("img");
        p4.src = "./images/image-removebg-preview_-_2025-08-12T192644.788.png";
        p4.classList.add("pokemon-img", "fourth");
        const p5 = document.createElement("img");
        p5.src = "./images/image-removebg-preview_-_2025-08-12T192644.788.png";
        p5.classList.add("pokemon-img", "fifth");
        const p6 = document.createElement("img");
        p6.src = "./images/image-removebg-preview_-_2025-08-12T192644.788.png";
        p6.classList.add("pokemon-img", "sixth");
        c.appendChild(p1);
        c.appendChild(p2);
        c.appendChild(p3);
        c.appendChild(p4);
        c.appendChild(p5);
        c.appendChild(p6);
        msgEl.appendChild(c);
      } else if (minecraft) {
        const c = document.createElement("div");
        c.classList.add("minecraft-container");
        c.textContent = messageContent;
        const m1 = document.createElement("img");
        m1.src = "./images/image-removebg-preview_-_2025-08-14T085703.894.png";
        m1.classList.add("minecraft-img");
        const m2 = document.createElement("img");
        m2.src = "./images/image-removebg-preview_-_2025-08-14T085703.894.png";
        m2.classList.add("minecraft-img", "second");
        c.appendChild(m1);
        c.appendChild(m2);
        msgEl.appendChild(c);
     } else if (glitch) {
        const c = document.createElement("div");
        c.classList.add("glitch-container");
        c.textContent = messageContent;
        msgEl.appendChild(c);
        } else if (silksong) {
        const c = document.createElement("div");
        c.classList.add("silksong-container");
        c.textContent = messageContent;
        const m1 = document.createElement("img");
        m1.src = "./images/description-image.png";
        m1.classList.add("silksong-img");
        const m2 = document.createElement("img");
        m2.src = "./images/description-image.png";
        m2.classList.add("silksong-img", "second");
        c.appendChild(m1);
        c.appendChild(m2);
        msgEl.appendChild(c);
        } else if (oiia) {
        const c = document.createElement("div");
        c.classList.add("oiia-container");
        c.textContent = messageContent;
        const m1 = document.createElement("img");
        m1.src = "./images/OIIA-Website-loop.gif";
        m1.classList.add("oiia-img");
        const m2 = document.createElement("img");
        m2.src = "./images/OIIA-Website-loop.gif";
        m2.classList.add("oiia-img", "second");
        c.appendChild(m1);
        c.appendChild(m2);
        msgEl.appendChild(c);
        } else if (maxwell) {
        const c = document.createElement("div");
        c.classList.add("maxwell-container");
        c.textContent = messageContent;
        const m1 = document.createElement("img");
        m1.src = "./images/maxwellspin-ezgif.com-crop.gif";
        m1.classList.add("maxwell-img");
        const m2 = document.createElement("img");
        m2.src = "./images/maxwellspin-ezgif.com-crop.gif";
        m2.classList.add("maxwell-img", "second");
        c.appendChild(m1);
        c.appendChild(m2);
        msgEl.appendChild(c);
      } else if (undertale) {
        const c = document.createElement("div");
        c.classList.add("undertale-container");
        c.textContent = messageContent;
        const m1 = document.createElement("img");
        m1.src = "./images/image-removebg-preview_-_2025-09-04T143902.404.png";
        m1.classList.add("undertale-img");
        const m2 = document.createElement("img");
        m2.src = "./images/image-removebg-preview_-_2025-09-04T143907.178.png";
        m2.classList.add("undertale-img", "second");
        c.appendChild(m1);
        c.appendChild(m2);
        msgEl.appendChild(c);
      } else if (fweh) {
        const s = document.createElement("span");
        s.classList.add("fweh-text");
        s.textContent = messageContent;
        msgEl.appendChild(s);
      } else if (color) {
        const s = document.createElement("span");
        s.style.color = color;
        s.textContent = messageContent;
        msgEl.appendChild(s);
      } else {
        const s = document.createElement("span");
        s.textContent = messageContent;
        msgEl.appendChild(s);
      }

      messagesDiv.appendChild(msgEl);
    }



    function displayMessagesForChannel(channel) {
      messagesDiv.innerHTML = "";
      allMessages.forEach((msg) => {
        if ((msg.channel || "general") === channel) addMessageElement(msg);
      });
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // Live listener (messages)
    const messagesRefLive = ref(db, "messages");
    const messagesQuery = query(messagesRefLive, orderByChild("timestamp"));
    onChildAdded(messagesQuery, (snapshot) => {
      const data = snapshot.val(); if (!data) return;
      data._id = snapshot.key;
      allMessages.push(data);
      channels.add(data.channel || "general");
      renderChannels();
      if ((data.channel || "general") === currentChannel) {
        addMessageElement(data);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }
    });

    // Handle edits
    onChildChanged(messagesQuery, (snapshot) => {
      const updated = snapshot.val();
      updated._id = snapshot.key;
      const idx = allMessages.findIndex(m => m._id === updated._id);
      if (idx >= 0) allMessages[idx] = updated;
      // re-render current channel so the edit appears
      if ((updated.channel || "general") === currentChannel) {
        displayMessagesForChannel(currentChannel);
      }
    });

    // Handle deletes
    onChildRemoved(messagesQuery, (snapshot) => {
      const removedId = snapshot.key;
      allMessages = allMessages.filter(m => m._id !== removedId);
      displayMessagesForChannel(currentChannel);
    });

    // Live listener (channels list)
    const channelsRefLive = ref(db, "channels");
    onChildAdded(channelsRefLive, (snapshot) => {
      channels.add(snapshot.key);
      renderChannels();
    });
    onChildRemoved(channelsRefLive, (snapshot) => {
      channels.delete(snapshot.key);
      if (!channels.has(currentChannel)) currentChannel = [...channels][0] || 'general';
      renderChannels();
      displayMessagesForChannel(currentChannel);
    });

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
        await set(ref(db, "users/" + cred.user.uid), { username });
        await set(unameRef, { uid: cred.user.uid });

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
      try { await signOut(auth); } catch (e) { alert(e.message); }
    };

    // --- AUTH state changes ---
    onAuthStateChanged(auth, async (user) => {
      currentUser = user || null;
      if (user) {
        // 🚫 Check if user is banned
        if (bannedUIDs.includes(user.uid)) {
          document.getElementById("auth").style.display = "none";
          composer.classList.add("disabled");
          logoutBtn.style.display = "inline-block";
          whoami.textContent = "🚫 You are banned from chatting.";
          whoamiMini.textContent = "BANNED";

          // Hide admin controls just in case
          adminPanel.style.display = 'none';
          document.body.classList.remove('admin-open');

          return;
        }

        // ✅ Normal user logic
        document.getElementById("auth").style.display = "none";
        composer.classList.remove("disabled");
        logoutBtn.style.display = "inline-block";

        // fetch username
        currentUsername = user.displayName || null;
        if (!currentUsername) {
          const snap = await get(ref(db, "users/" + user.uid));
          currentUsername = snap.exists() ? snap.val().username : "(user)";
        }
        whoami.textContent = `Logged in as: ${currentUsername}`;
        whoamiMini.textContent = currentUsername;

        // Logan + Baylor special panels
        if (user.uid === "INrpu9xmk0hZ16BLM8Z5GuPbTi12") {
          document.getElementById("logan-panel").style.display = "block";
        } else {
          document.getElementById("logan-panel").style.display = "none";
        }
        if (user.uid === "I8dNaLXmjMeUSwYZQ3uCm0tnTMM2") {
          document.getElementById("rudy-panel").style.display = "block";
        } else {
          document.getElementById("rudy-panel").style.display = "none";
        }
        if (user.uid === "FF2pCJaZ3vRb1l3fYBYVnaFHcZk2") {
          document.getElementById("baylor-panel").style.display = "block";
        } else {
          document.getElementById("baylor-panel").style.display = "none";
        }

        // 🔐 Admin panel (same users as Baylor & Logan)
        if (adminUIDs.includes(user.uid)) {
          adminPanel.style.display = 'block';
          document.body.classList.add('admin-open');
        } else {
          adminPanel.style.display = 'none';
          document.body.classList.remove('admin-open');
        }
      } else {
        document.getElementById("auth").style.display = "flex";
        composer.classList.add("disabled");
        logoutBtn.style.display = "none";
        whoami.textContent = "Not logged in";
        whoamiMini.textContent = "";
        currentUsername = null;

        // Hide admin on sign-out
        adminPanel.style.display = 'none';
        document.body.classList.remove('admin-open');
      }
    });

     msgInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {  // Check if the key pressed is Enter
        e.preventDefault();  // Prevent the default behavior of Enter key (e.g., form submission)
        sendMessage();  // Call the sendMessage function
      }
    });

    // --- Send message (must be logged in) ---
    sendBtn.onclick = async () => {
  if (!auth.currentUser) return alert("You must be logged in to chat!");

  // Prevent non-admins from sending to "admin-only" channel
  if (currentChannel === "admin-only" && !adminUIDs.includes(auth.currentUser.uid)) {
    return alert("You are not authorized to send messages to the Admin Only channel.");
  }

  let text = msgInput.value.trim();
  if (!text) return;

  const messageObj = {
    name: currentUsername || "(user)",
    uid: auth.currentUser.uid,
    text: cleanMessage(text),
    timestamp: Date.now(),
    channel: currentChannel,
  };

  try {
    await push(ref(db, "messages"), messageObj);
    msgInput.value = "";
  } catch (err) {
    alert("Failed to send: " + err.message);
  }
};

    // --- Admin Buttons Logic ---
    createBtn.onclick = async () => {
      if (!auth.currentUser || !adminUIDs.includes(auth.currentUser.uid)) return alert('Admins only.');
      const name = prompt("New channel name:");
      if (!name) return;
      const key = toSlug(name);
      if (!key) return alert('Invalid channel name.');
      if (channels.has(key)) return alert('Channel already exists.');
      try {
        await set(ref(db, `channels/${key}`), {
          name,
          createdAt: Date.now(),
          createdBy: auth.currentUser.uid
        });
        channels.add(key);
        currentChannel = key;
        renderChannels();
        displayMessagesForChannel(currentChannel);
      } catch (e) {
        alert('Failed to create channel: ' + e.message);
      }
    };

    reloadBtn.onclick = async () => {
      await loadChannels();
      alert('Channels & messages reloaded.');
    };

    wipeBtn.onclick = async () => {
      if (!auth.currentUser || !adminUIDs.includes(auth.currentUser.uid)) return alert('Admins only.');
      if (!confirm("⚠️ This will permanently delete ALL messages. Continue?")) return;
      try {
        await set(ref(db, 'messages'), null);
        allMessages = [];
        displayMessagesForChannel(currentChannel);
        alert('All messages wiped.');
      } catch (e) {
        alert('Failed to wipe: ' + e.message);
      }
    };

    // initial load
    await loadChannels();