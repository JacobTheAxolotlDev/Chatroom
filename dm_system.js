// script.js with DM system merged
// --- your existing imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getDatabase, ref, push, set, onChildAdded, serverTimestamp, get, child, query, orderByChild } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

// existing Firebase config + app init should already be here

// ------------------------------------------------------------
// existing chat code (channels, messages, etc.)
// ------------------------------------------------------------
// ... keep all of your chat functionality untouched here ...

// ------------------------------------------------------------
// DIRECT MESSAGING SYSTEM (merged from dm-system.js)
// ------------------------------------------------------------

const db = getDatabase();
const auth = getAuth();

function createDMUI() {
  const dmRoot = document.createElement('div');
  dmRoot.id = 'dm-root';
  dmRoot.style.width = '100%';
  dmRoot.style.maxWidth = '640px';
  dmRoot.style.margin = '12px 0';
  dmRoot.style.display = 'flex';
  dmRoot.style.gap = '12px';

  const list = document.createElement('div');
  list.id = 'dm-list';
  list.style.width = '220px';
  list.style.background = 'var(--panel)';
  list.style.padding = '10px';
  list.style.borderRadius = '10px';
  list.innerHTML = `<h4 style="margin:6px 0">Direct Messages</h4>`;

  const newForm = document.createElement('div');
  newForm.style.display = 'flex';
  newForm.style.gap = '6px';
  newForm.style.marginBottom = '8px';
  const input = document.createElement('input');
  input.placeholder = 'username...';
  input.style.flex = '1';
  const startBtn = document.createElement('button');
  startBtn.textContent = 'Start';
  newForm.appendChild(input);
  newForm.appendChild(startBtn);
  list.appendChild(newForm);

  const dmListBox = document.createElement('div');
  dmListBox.id = 'dm-list-box';
  dmListBox.style.display = 'flex';
  dmListBox.style.flexDirection = 'column';
  list.appendChild(dmListBox);

  const panel = document.createElement('div');
  panel.id = 'dm-panel';
  panel.style.flex = '1';
  panel.style.background = 'var(--panel)';
  panel.style.padding = '10px';
  panel.style.borderRadius = '10px';
  panel.innerHTML = `<div id="dm-header" style="display:flex;justify-content:space-between;margin-bottom:8px"><div id="dm-target">No conversation</div><button id="close-dm" style="display:none">Close</button></div><div id="dm-messages" style="height:320px;overflow:auto;background:#fff;border:1px solid #eee;padding:8px;border-radius:8px"></div><div id="dm-composer" style="margin-top:8px; display:none"><input id="dm-msg" placeholder="Message" style="width: calc(100% - 110px);"/><button id="dm-send" style="width:100px;">Send</button></div>`;

  dmRoot.appendChild(list);
  dmRoot.appendChild(panel);

  const chat = document.getElementById('chat');
  chat.parentNode.insertBefore(dmRoot, chat.nextSibling);

  return {
    listBox: dmListBox,
    input,
    startBtn,
    messagesDiv: panel.querySelector('#dm-messages'),
    composer: panel.querySelector('#dm-composer'),
    dmMsgInput: panel.querySelector('#dm-msg'),
    dmSendBtn: panel.querySelector('#dm-send'),
    headerTarget: panel.querySelector('#dm-target'),
    closeBtn: panel.querySelector('#close-dm')
  };
}

const ui = createDMUI();

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

function clearActiveDM() {
  activeDM = null;
  ui.messagesDiv.innerHTML = '';
  ui.headerTarget.textContent = 'No conversation';
  ui.composer.style.display = 'none';
  ui.closeBtn.style.display = 'none';
}

async function openDM(dmId, otherUid, otherName) {
  const user = auth.currentUser;
  if (!user) return;
  const metaSnap = await get(ref(db, `dms/${dmId}/meta`));
  if (!metaSnap.exists()) return;

  activeDM = { dmId, otherUid, otherName };
  ui.messagesDiv.innerHTML = '';
  ui.headerTarget.textContent = `Chat with ${otherName}`;
  ui.composer.style.display = 'flex';
  ui.closeBtn.style.display = 'inline-block';

  const msgsRef = ref(db, `dms/${dmId}/messages`);
  const msgsQuery = query(msgsRef, orderByChild('timestamp'));
  onChildAdded(msgsQuery, (snap) => {
    const m = snap.val();
    if (!m) return;
    const el = document.createElement('div');
    el.textContent = `${m.name}: ${m.text}`;
    ui.messagesDiv.appendChild(el);
    ui.messagesDiv.scrollTop = ui.messagesDiv.scrollHeight;
  });
}

ui.dmSendBtn.onclick = async () => {
  if (!activeDM) return;
  const text = ui.dmMsgInput.value.trim();
  if (!text) return;
  const u = auth.currentUser;
  if (!u) return;

  const messageObj = { uid: u.uid, name: u.displayName || 'Anon', text, timestamp: Date.now() };
  await push(ref(db, `dms/${activeDM.dmId}/messages`), messageObj);
  ui.dmMsgInput.value = '';
};

ui.closeBtn.onclick = clearActiveDM;

ui.startBtn.onclick = async () => {
  const other = ui.input.value.trim();
  if (!other) return;
  const otherUid = await getUidForUsername(other);
  if (!otherUid) return alert('User not found');
  const me = auth.currentUser;
  if (!me) return alert('Log in first');

  const dmId = dmIdFor(me.uid, otherUid);
  await ensureDMExists(dmId, me.uid, otherUid);
  ui.input.value = '';
  openDM(dmId, otherUid, other);
};

async function loadUserDMs() {
  const user = auth.currentUser;
  if (!user) return;
  ui.listBox.innerHTML = '';
  const snap = await get(ref(db, `user-dms/${user.uid}`));
  if (!snap.exists()) {
    ui.listBox.textContent = 'No conversations yet.';
    return;
  }
  const entries = Object.keys(snap.val() || {});
  for (let dmId of entries) {
    const metaSnap = await get(ref(db, `dms/${dmId}/meta`));
    if (!metaSnap.exists()) continue;
    const participants = Object.keys(metaSnap.val().participants || {});
    const otherUid = participants.find(id => id !== user.uid);
    const row = document.createElement('div');
    row.textContent = `DM with ${otherUid}`;
    row.style.cursor = 'pointer';
    row.onclick = () => openDM(dmId, otherUid, otherUid);
    ui.listBox.appendChild(row);
  }
}

onAuthStateChanged(auth, (user) => { if (user) loadUserDMs(); else { ui.listBox.innerHTML = 'Log in to see DMs'; clearActiveDM(); } });
setInterval(() => { if (auth.currentUser) loadUserDMs(); }, 10000);

console.log('DM system merged into script.js');
