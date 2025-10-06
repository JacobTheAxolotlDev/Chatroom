// ---------- Imports ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getDatabase, ref, push, set, onChildAdded, get, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

// ---------- Firebase Config ----------
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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch(() => { /* ignore */ });

// ---------- Helpers ----------
function usernameKey(u) {
  return (u || '').toLowerCase().trim();
}

function dmIdFor(u1, u2) {
  return [u1, u2].sort().join('_');
}

async function getUidForUsername(username) {
  if (!username) return null;
  const snap = await get(ref(db, `usernames/${usernameKey(username)}`));
  return snap.exists() ? snap.val().uid : null;
}

async function ensureDMExists(dmId, u1, u2, otherName) {
  const metaSnap = await get(ref(db, `dms/${dmId}/meta`));
  if (!metaSnap.exists()) {
    await set(ref(db, `dms/${dmId}/meta`), {
      participants: { [u1]: true, [u2]: true },
      createdAt: Date.now(),
      name: `DM with ${otherName}`
    });
    await set(ref(db, `user-dms/${u1}/${dmId}`), true);
    await set(ref(db, `user-dms/${u2}/${dmId}`), true);
  }
}

async function getDisplayName(uid) {
  const user = auth.currentUser;
  if (user && user.uid === uid && user.displayName) return user.displayName;
  const snap = await get(ref(db, `users/${uid}`));
  if (snap.exists()) return snap.val().username || uid.slice(0, 6);
  return uid.slice(0, 6);
}

// ---------- State ----------
let activeChannel = "general";
let currentUnsub = null;

// ---------- UI Helpers ----------
function showChannelTabActive(channelId) {
  const channelsDiv = document.getElementById('channels');
  if (!channelsDiv) return;
  [...channelsDiv.children].forEach(c =>
    c.classList.toggle('active', c.dataset && c.dataset.channel === channelId)
  );
}

// ---------- Channel Handling ----------
async function openChannel(channelId, label) {
  try {
    if (typeof currentUnsub === 'function') currentUnsub();
  } catch(e) {}
  currentUnsub = null;
  activeChannel = channelId;
  showChannelTabActive(channelId);

  const messagesDiv = document.getElementById('messages');
  if (!messagesDiv) return;

  messagesDiv.innerHTML = `<em>Loading ${label || channelId}...</em>`;

  const msgsRef = ref(db, 'messages');
  const msgsQuery = query(msgsRef, orderByChild('channel'), equalTo(channelId));
  messagesDiv.innerHTML = '';

  currentUnsub = onChildAdded(msgsQuery, snap => {
    const m = snap.val();
    if (!m) return;
    const el = document.createElement('div');
    el.textContent = `${m.name || '(user)'}: ${m.text}`;
    messagesDiv.appendChild(el);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

// ---------- Send Buttons ----------
function setupSendButtons() {
  const composer = document.getElementById('composer');
  if (!composer) return;

  const msgInput = document.getElementById('msg');
  if (!msgInput) return;

  const generalBtn = document.createElement('button');
  generalBtn.id = 'send-general';
  generalBtn.textContent = 'Send to General';

  const dmBtn = document.createElement('button');
  dmBtn.id = 'send-dm';
  dmBtn.textContent = 'Send to DM';

  composer.appendChild(generalBtn);
  composer.appendChild(dmBtn);

  generalBtn.addEventListener('click', () => sendMessage('general'));
  dmBtn.addEventListener('click', () => {
    if (activeChannel === 'general') return alert('Open a DM first');
    sendMessage(activeChannel);
  });
}

async function sendMessage(targetChannel) {
  const input = document.getElementById('msg');
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  const user = auth.currentUser;
  if (!user) return alert('Please log in to send messages.');

  const messageObj = {
    uid: user.uid,
    name: user.displayName || (await getDisplayName(user.uid)) || user.uid.slice(0, 6),
    text,
    timestamp: Date.now(),
    channel: targetChannel
  };

  await push(ref(db, 'messages'), messageObj);
  input.value = '';
}

// ---------- DM Starter ----------
function addDMStarter() {
  const chat = document.getElementById('chat');
  if (!chat) return;
  if (document.getElementById('dm-starter')) return;

  const starter = document.createElement('div');
  starter.id = 'dm-starter';
  starter.style.margin = '8px 0';
  starter.innerHTML = `
    <input id="dm-username" placeholder="Start DM with username..." style="padding:6px" />
    <button id="dm-start">Start DM</button>
    <button id="dm-exit">Back to Public</button>
  `;
  chat.insertBefore(starter, document.getElementById('messages'));

  const usernameInput = document.getElementById('dm-username');
  const startBtn = document.getElementById('dm-start');
  const exitBtn = document.getElementById('dm-exit');

  function updateUIForAuth(user) {
    if (!usernameInput) return;
    if (!user) {
      usernameInput.disabled = true;
      usernameInput.placeholder = 'Log in to start a DM';
      startBtn.disabled = true;
    } else {
      usernameInput.disabled = false;
      usernameInput.placeholder = 'Start DM with username...';
      startBtn.disabled = false;
    }
  }

  startBtn.addEventListener('click', async () => {
    const other = usernameInput.value.trim();
    if (!other) return;
    const otherUid = await getUidForUsername(other);
    if (!otherUid) return alert('User not found');

    const me = auth.currentUser;
    if (!me) return alert('Log in first');

    const dmId = dmIdFor(me.uid, otherUid);
    await ensureDMExists(dmId, me.uid, otherUid, other);
    await renderDMChannels(me.uid);
    openChannel(dmId, `DM with ${other}`);
  });

  exitBtn.addEventListener('click', () => {
    if (typeof currentUnsub === 'function') try { currentUnsub(); } catch(e) {}
    currentUnsub = null;
    openChannel('general', 'General');
  });

  updateUIForAuth(auth.currentUser);
  onAuthStateChanged(auth, user => updateUIForAuth(user));
}

// ---------- Render DM Tabs ----------
async function renderDMChannels(uid) {
  try {
    const listSnap = await get(ref(db, `user-dms/${uid}`));
    const channelsDiv = document.getElementById('channels');
    if (!channelsDiv) return;

    [...channelsDiv.querySelectorAll('[data-dm-tab]')].forEach(n => n.remove());
    if (!listSnap.exists()) return;

    const dmIds = Object.keys(listSnap.val() || {});
    for (let dmId of dmIds) {
      const metaSnap = await get(ref(db, `dms/${dmId}/meta`));
      const label = metaSnap.exists() ? (metaSnap.val().name || `DM ${dmId}`) : `DM ${dmId}`;
      const tab = document.createElement('div');
      tab.className = 'channel-tab';
      tab.textContent = label;
      tab.dataset.channel = dmId;
      tab.setAttribute('data-dm-tab', '1');
      tab.addEventListener('click', () => openChannel(dmId, label));
      channelsDiv.appendChild(tab);
    }
  } catch(e) {
    console.warn('renderDMChannels error', e);
  }
}

// ---------- Bootstrap ----------
addDMStarter();
setupSendButtons();

onAuthStateChanged(auth, async user => {
  if (user) {
    try { await renderDMChannels(user.uid); } catch(e) {}
    if (activeChannel === 'general') openChannel('general', 'General');
    else openChannel(activeChannel, activeChannel);
  } else {
    openChannel('general', 'General');
  }
});

console.log('Robust DM system loaded — v5: two send buttons (general & DM).');
