const socket = io();

let username = '';
let currentChannel = '';
let authMode = 'login'; // 'login' or 'signup'
let currentDmUser = null;
let currentChannelIsPrivate = false;
let currentChannelCreator = null;

// Elements (ensure these IDs exist in your HTML)
const authCard = document.getElementById('authCard');
const authTitle = document.getElementById('authTitle');
const authForm = document.getElementById('authForm');
const authUsername = document.getElementById('authUsername');
const authPassword = document.getElementById('authPassword');
const switchAuthBtn = document.getElementById('switchAuthBtn');
const authSwitchText = document.getElementById('authSwitchText');

const appPanels = document.getElementById('appPanels');
const tabs = document.querySelectorAll('.tab');
const channelsTab = document.getElementById('channelsTab');
const friendsTab = document.getElementById('friendsTab');

const channelInput = document.getElementById('channelInput');
const enterChannelBtn = document.getElementById('enterChannelBtn');
const channelList = document.getElementById('channelList');
const refreshChannelsBtn = document.getElementById('refreshChannels');
const privateToggle = document.getElementById('privateToggle');

const inviteActions = document.getElementById('inviteActions');
const inviteUsername = document.getElementById('inviteUsername');
const inviteBtn = document.getElementById('inviteBtn');

const friendUsername = document.getElementById('friendUsername');
const sendFriendReqBtn = document.getElementById('sendFriendReqBtn');
const refreshFriendsBtn = document.getElementById('refreshFriends');
const incomingList = document.getElementById('incomingList');
const outgoingList = document.getElementById('outgoingList');
const pendingList = document.getElementById('pendingList'); // legacy, not used now
const friendsList = document.getElementById('friendsList');

const profileBio = document.getElementById('profileBio');
const profileStatus = document.getElementById('profileStatus');
const saveProfileBtn = document.getElementById('saveProfileBtn');

const welcomeBar = document.getElementById('welcomeBar');
const currentChannelBar = document.getElementById('currentChannelBar');
const chatWindow = document.getElementById('chatWindow');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

const dmBar = document.getElementById('dmBar');
const dmWindow = document.getElementById('dmWindow');
const dmInput = document.getElementById('dmInput');
const dmSendBtn = document.getElementById('dmSendBtn');

const themeToggle = document.getElementById('themeToggle');
const logoutBtn = document.getElementById('logoutBtn');

const toChannelChatBtn = document.getElementById('toChannelChatBtn');
const toDmChatBtn = document.getElementById('toDmChatBtn');

// Theme toggle
themeToggle?.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});
(function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') document.body.classList.add('dark');
})();

// Tabs
tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    tabs.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.tab;
    channelsTab.style.display = target === 'channelsTab' ? 'block' : 'none';
    friendsTab.style.display = target === 'friendsTab' ? 'block' : 'none';
  });
});

// Switch login/signup
switchAuthBtn.addEventListener('click', () => {
  authMode = authMode === 'login' ? 'signup' : 'login';
  authTitle.textContent = authMode === 'login' ? 'Login' : 'Sign up';
  authForm.querySelector('.primary').textContent = authMode === 'login' ? 'Login' : 'Sign up';
  authSwitchText.textContent = authMode === 'login' ? 'No account?' : 'Already have an account?';
  switchAuthBtn.textContent = authMode === 'login' ? 'Sign up' : 'Login';
});

// Auth submit
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const uname = authUsername.value.trim();
  const pwd = authPassword.value;
  if (!uname || !pwd) return;

  const route = authMode === 'login' ? '/login' : '/signup';
  const res = await fetch(route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: uname, password: pwd })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    alert(data.error || 'Authentication failed');
    return;
  }

  username = uname.toLowerCase();
  localStorage.setItem('username', username);
  socket.emit('joinUser', username);

  authCard.style.display = 'none';
  appPanels.style.display = 'block';
  welcomeBar.style.display = 'block';
  welcomeBar.textContent = `Welcome, ${username}`;
  logoutBtn.style.display = 'inline-block';

  await loadChannels();
  await loadFriends();
  await loadProfile();
});

// Auto login if stored
(function autoLogin() {
  const savedUser = localStorage.getItem('username');
  if (savedUser) {
    username = savedUser.toLowerCase();
    socket.emit('joinUser', username);
    authCard.style.display = 'none';
    appPanels.style.display = 'block';
    welcomeBar.style.display = 'block';
    welcomeBar.textContent = `Welcome, ${username}`;
    logoutBtn.style.display = 'inline-block';
    loadChannels();
    loadFriends();
    loadProfile();
  }
})();

// Logout
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('username');
  username = '';
  currentChannel = '';
  currentDmUser = null;
  chatWindow.innerHTML = '';
  dmWindow.innerHTML = '';
  currentChannelBar.style.display = 'none';
  document.getElementById('composer').style.display = 'none';
  hideDmUi();
  appPanels.style.display = 'none';
  authCard.style.display = 'block';
  logoutBtn.style.display = 'none';
});

// Channels
refreshChannelsBtn.addEventListener('click', loadChannels);

// Create or join channel
enterChannelBtn.addEventListener('click', async () => {
  const ch = channelInput.value.trim();
  if (!ch) return;

  // If channel doesn't exist, create (respect privacy toggle)
  const exists = await channelExists(ch);
  if (!exists) {
    const resp = await fetch('/channel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: ch, creator: username, isPrivate: !!privateToggle.checked })
    });
    const data = await resp.json();
    if (!resp.ok) return alert(data.error || 'Failed to create channel');
  }

  // Attempt join with server privacy checks
  const joinRes = await fetch('/channel/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel: ch, username })
  });
  const joinData = await joinRes.json();
  if (!joinRes.ok || !joinData.success) return alert(joinData.error || 'Join failed');

  await enterChannel(ch);
});

async function channelExists(name) {
  const res = await fetch('/channels');
  const list = await res.json();
  return list.some(c => c.name === name);
}

async function loadChannels() {
  const res = await fetch('/channels');
  const list = await res.json();
  channelList.innerHTML = '';
  list.forEach((c) => {
    const item = document.createElement('div');
    item.className = 'channel-item';
    const lock = c.isPrivate ? '🔒' : '🌐';
    item.innerHTML = `<span>${lock} #${c.name}</span><div class="tooltip">Click to join #${c.name}</div>`;
    item.addEventListener('click', () => quickJoin(c.name));
    channelList.appendChild(item);
  });
}

async function quickJoin(ch) {
  const joinRes = await fetch('/channel/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel: ch, username })
  });
  const joinData = await joinRes.json();
  if (!joinRes.ok || !joinData.success) return alert(joinData.error || 'Join failed');
  await enterChannel(ch);
}

async function enterChannel(channel) {
  showChannelUi();
  currentChannel = channel;

  // Fetch channel meta to control invite UI
  const meta = await fetchChannelMeta(channel);
  currentChannelIsPrivate = !!meta?.isPrivate;
  currentChannelCreator = meta?.creator || null;

  currentChannelBar.textContent = `Channel: #${channel} ${currentChannelIsPrivate ? '(private)' : ''}`;
  inviteActions.style.display = (currentChannelIsPrivate && currentChannelCreator === username) ? 'flex' : 'none';

  socket.emit('joinChannel', channel);
  chatWindow.innerHTML = '';
  await loadMessages(channel);
  channelInput.value = '';
  await loadChannels();
}

async function fetchChannelMeta(name) {
  // Fetch via channels list then single query fallback
  const res = await fetch('/channels');
  const list = await res.json();
  // Quick meta from list (privacy only)
  const match = list.find(c => c.name === name);
  // For creator, fetch directly via SQL-less endpoint (not provided), emulate by caching server-side if needed
  // As a workaround, set creator unknown; invite UI will be hidden unless you were the creator on creation path
  // If you want exact creator, add GET /channel/:name that returns creator and isPrivate.
  return { name, isPrivate: match?.isPrivate || false, creator: currentChannelCreator };
}

function showChannelUi() {
  toChannelChatBtn?.classList.add('active');
  toDmChatBtn?.classList.remove('active');
  currentChannelBar.style.display = 'block';
  document.getElementById('composer').style.display = 'grid';
  dmBar.style.display = 'none';
  dmWindow.style.display = 'none';
  dmComposer.style.display = 'none';
}

// Invite to private channel (only creator)
inviteBtn?.addEventListener('click', async () => {
  const target = inviteUsername.value.trim().toLowerCase();
  if (!target) return;
  if (!currentChannelIsPrivate || currentChannelCreator !== username) return alert('Not allowed');

  const resp = await fetch('/channel/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel: currentChannel, inviter: username, invitee: target })
  });
  const data = await resp.json();
  if (!resp.ok || !data.success) return alert(data.error || 'Invite failed');
  inviteUsername.value = '';
  alert(`Invited ${target} to #${currentChannel}`);
});

// Messages (channel)
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !currentChannel) return;
  // Emojis: just text, UTF-8
  socket.emit('sendMessage', { channel: currentChannel, message: text });
  messageInput.value = '';
}
socket.on('newMessage', (msg) => {
  if (msg.channel !== currentChannel) return;
  renderMessage(chatWindow, msg.user, msg.text, msg.timestamp);
});

async function loadMessages(channel) {
  const res = await fetch(`/messages?channel=${encodeURIComponent(channel)}`);
  const list = await res.json();
  list.forEach(row => renderMessage(chatWindow, row.user, row.text, row.timestamp));
}

// Friends
refreshFriendsBtn.addEventListener('click', loadFriends);
sendFriendReqBtn.addEventListener('click', async () => {
  const to = friendUsername.value.trim().toLowerCase();
  if (!to || to === username) return alert('Invalid username');
  const res = await fetch('/friend-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: username, to })
  });
  const data = await res.json();
  if (!res.ok || !data.success) return alert(data.error || 'Request failed');
  friendUsername.value = '';
  await loadFriends();
});

async function loadFriends() {
  const incomingRes = await fetch(`/friends-pending-incoming?username=${encodeURIComponent(username)}`);
  const incoming = await incomingRes.json();
  incomingList.innerHTML = '';
  incoming.forEach(req => {
    const item = document.createElement('div');
    item.className = 'friend-item';
    item.innerHTML = `<span>${req.requester} → ${req.receiver}</span>`;
    const actions = document.createElement('div');
    actions.className = 'actions';
    const acceptBtn = document.createElement('button');
    acceptBtn.className = 'primary';
    acceptBtn.textContent = 'Accept';
    acceptBtn.onclick = async () => {
      const res = await fetch('/friend-accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: req.requester, to: req.receiver, actor: username })
      });
      const data = await res.json();
      if (!res.ok || !data.success) return alert(data.error || 'Accept failed');
      loadFriends();
    };
    const declineBtn = document.createElement('button');
    declineBtn.className = 'secondary';
    declineBtn.textContent = 'Decline';
    declineBtn.onclick = async () => {
      const res = await fetch('/friend-decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: req.requester, to: req.receiver, actor: username })
      });
      const data = await res.json();
      if (!res.ok || !data.success) return alert(data.error || 'Decline failed');
      loadFriends();
    };
    actions.appendChild(acceptBtn);
    actions.appendChild(declineBtn);
    item.appendChild(actions);
    incomingList.appendChild(item);
  });

  const outgoingRes = await fetch(`/friends-pending-outgoing?username=${encodeURIComponent(username)}`);
  const outgoing = await outgoingRes.json();
  outgoingList.innerHTML = '';
  outgoing.forEach(req => {
    const item = document.createElement('div');
    item.className = 'friend-item';
    item.innerHTML = `<span>Waiting: ${req.requester} → ${req.receiver}</span>`;
    outgoingList.appendChild(item);
  });

  const friendsRes = await fetch(`/friends?username=${encodeURIComponent(username)}`);
  const friends = await friendsRes.json();
  friendsList.innerHTML = '';
  friends.forEach(f => {
    const other = f.requester === username ? f.receiver : f.requester;
    const item = document.createElement('div');
    item.className = 'friend-item';
    item.innerHTML = `<span>${other}</span>`;
    const actions = document.createElement('div');
    actions.className = 'actions';
    const dmBtn = document.createElement('button');
    dmBtn.className = 'secondary';
    dmBtn.textContent = 'DM';
    dmBtn.onclick = () => openDm(other);
    actions.appendChild(dmBtn);
    item.appendChild(actions);
    friendsList.appendChild(item);
  });
}

// Profiles
saveProfileBtn?.addEventListener('click', async () => {
  const bio = profileBio.value;
  const status = profileStatus.value;
  const res = await fetch('/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, bio, status })
  });
  const data = await res.json();
  if (!res.ok || !data.success) return alert(data.error || 'Save failed');
  alert('Profile updated');
});

async function loadProfile() {
  const res = await fetch(`/profile?username=${encodeURIComponent(username)}`);
  const data = await res.json();
  profileBio.value = data?.bio || '';
  profileStatus.value = data?.status || '';
}

// Direct messages
toChannelChatBtn?.addEventListener('click', showChannelUi);
toDmChatBtn?.addEventListener('click', () => { if (currentDmUser) showDmUi(); });

function openDm(otherUser) {
  currentDmUser = otherUser;
  dmBar.textContent = `Direct messages with @${otherUser}`;
  showDmUi();
  loadDmHistory(otherUser);
}

function showDmUi() {
  toChannelChatBtn?.classList.remove('active');
  toDmChatBtn?.classList.add('active');
  currentChannelBar.style.display = 'none';
  document.getElementById('composer').style.display = 'none';
  dmBar.style.display = 'block';
  dmWindow.style.display = 'block';
  dmComposer.style.display = 'grid';
  dmWindow.innerHTML = '';
}

function hideDmUi() {
  dmBar.style.display = 'none';
  dmWindow.style.display = 'none';
  dmComposer.style.display = 'none';
}

dmSendBtn.addEventListener('click', sendDm);
dmInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendDm(); });

function sendDm() {
  const text = dmInput.value.trim();
  if (!text || !currentDmUser) return;
  socket.emit('sendDirectMessage', { to: currentDmUser, message: text });
  dmInput.value = '';
}

socket.on('directMessage', (msg) => {
  if (!currentDmUser || (msg.sender !== currentDmUser && msg.receiver !== currentDmUser)) return;
  const who = msg.sender === username ? 'You' : msg.sender;
  renderMessage(dmWindow, who, msg.text, msg.timestamp);
});

async function loadDmHistory(other) {
  const res = await fetch(`/dm-history?with=${encodeURIComponent(other)}&me=${encodeURIComponent(username)}`);
  const list = await res.json();
  dmWindow.innerHTML = '';
  list.forEach(row => {
    const who = row.sender === username ? 'You' : row.sender;
    renderMessage(dmWindow, who, row.text, row.timestamp);
  });
}

// Render helper
function renderMessage(container, author, text, timestamp) {
  const el = document.createElement('div');
  el.className = 'message';
  const time = new Date(timestamp || Date.now());
  const hh = time.getHours().toString().padStart(2,'0');
  const mm = time.getMinutes().toString().padStart(2,'0');
  el.innerHTML = `
    <span class="author">${escapeHtml(author)}</span>
    <span class="time">${hh}:${mm}</span>
    <div class="text">${escapeHtml(text)}</div>
  `;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

// Utils
function escapeHtml(s) {
  const map = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' };
  return s.replace(/[&<>"']/g, (m)=>map[m]);
}
