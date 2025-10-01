// script.js with DM system merged into main chat box (fixed so send goes to only one target)
// --- your existing imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getDatabase, ref, push, set, onChildAdded, off, get, query, orderByChild } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

const db = getDatabase();
const auth = getAuth();

function usernameKey(u) { return (u || '').toLowerCase().trim(); }
function dmIdFor(u1, u2) { return [u1, u2].sort().join('_'); }

async function getUidForUsername(username) {
  const key = usernameKey(username);
  const snap = await get(ref(db, `usernames/${key}`));
  return snap.exists() ? snap.val().uid : null;
}

async function ensureDMExists(dmId, u1, u2) {
  const metaRef = ref(db, `dms/${dmId}/meta`);
  const snap = await get(metaRef);
  if (!snap.exists()) {
    await set(metaRef, { participants: { [u1]: true, [u2]: true }, createdAt: Date.now() });
    await set(ref(db, `user-dms/${u1}/${dmId}`), true);
    await set(ref(db, `user-dms/${u2}/${dmId}`), true);
  }
}

let activeDM = null;
let dmUnsub = null;

async function openDM(dmId, otherUid, otherName) {
  const user = auth.currentUser;
  if (!user) return;

  if (dmUnsub && activeDM) {
    off(ref(db, `dms/${activeDM.dmId}/messages`));
    dmUnsub = null;
  }

  activeDM = { dmId, otherUid, otherName };
  const messagesDiv = document.getElementById('messages');
  messagesDiv.innerHTML = `Direct chat with <strong>${otherName}</strong><br><br>`;

  const msgsRef = ref(db, `dms/${dmId}/messages`);
  const msgsQuery = query(msgsRef, orderByChild('timestamp'));
  dmUnsub = onChildAdded(msgsQuery, (snap) => {
    const m = snap.val();
    if (!m) return;
    const el = document.createElement('div');
    el.textContent = `${m.name}: ${m.text}`;
    messagesDiv.appendChild(el);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

// Hook send button to send to DM if active, else to normal chat
const sendBtn = document.getElementById('send');
sendBtn.onclick = async (e) => {
  e.preventDefault(); // stop any default form behavior
  const input = document.getElementById('msg');
  const text = input.value.trim();
  if (!text) return;
  const u = auth.currentUser;
  if (!u) return;

  if (activeDM) {
    // send ONLY to DM
    const messageObj = { uid: u.uid, name: u.displayName || u.email || u.uid.slice(0,6), text, timestamp: Date.now() };
    await push(ref(db, `dms/${activeDM.dmId}/messages`), messageObj);
    input.value = '';
  } else {
  }
};

function addDMStarter() {
  const chat = document.getElementById('chat');
  if (document.getElementById('dm-username')) return; // prevent duplicate UI

  const starter = document.createElement('div');
  starter.style.margin = '8px 0';
  starter.innerHTML = `
    <input id="dm-username" placeholder="Start DM with username..." style="padding:6px"/>
    <button id="dm-start">Start DM</button>
    <button id="dm-exit">Back to Public Chat</button>
  `;
  chat.insertBefore(starter, document.getElementById('messages'));

  document.getElementById('dm-start').onclick = async () => {
    const other = document.getElementById('dm-username').value.trim();
    if (!other) return;
    const otherUid = await getUidForUsername(other);
    if (!otherUid) return alert('User not found');
    const me = auth.currentUser;
    if (!me) return alert('Log in first');

    const dmId = dmIdFor(me.uid, otherUid);
    await ensureDMExists(dmId, me.uid, otherUid);
    openDM(dmId, otherUid, other);
  };

  document.getElementById('dm-exit').onclick = () => {
    if (dmUnsub && activeDM) {
      off(ref(db, `dms/${activeDM.dmId}/messages`));
      dmUnsub = null;
    }
    activeDM = null;
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = '';
    if (typeof loadPublicMessages === 'function') loadPublicMessages();
  };
}

onAuthStateChanged(auth, (user) => {
  if (user) addDMStarter();
});

console.log('DM system fixed: messages now go ONLY to DM or ONLY to public chat');