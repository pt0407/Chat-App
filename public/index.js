const socket = io();

let username = '';
let currentChannel = '';
let authMode = 'login';
let currentDmUser = null;
let currentChannelIsPrivate = false;
let currentChannelCreator = null;
let typingTimeout = null;
let dmTypingTimeout = null;
let onlineUsers = new Set();
let unreadDMs = 0;
let mentionPattern = /@(\w+)/g;

// Common emojis for picker
const commonEmojis = ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','👍','👎','👏','🙌','👋','🤚','✋','🖐️','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄','💋','🩸'];

// Emoji shortcodes
const emojiShortcodes = {
  ':smile:': '😊', ':joy:': '😂', ':heart:': '❤️', ':thumbsup:': '👍', ':thumbsdown:': '👎',
  ':fire:': '🔥', ':star:': '⭐', ':check:': '✅', ':x:': '❌', ':wave:': '👋',
  ':ok:': '👌', ':clap:': '👏', ':pray:': '🙏', ':eyes:': '👀', ':thinking:': '🤔',
  ':cry:': '😢', ':laugh:': '🤣', ':love:': '🥰', ':cool:': '😎', ':party:': '🥳'
};

// Elements
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
const profileTab = document.getElementById('profileTab');

const channelInput = document.getElementById('channelInput');
const enterChannelBtn = document.getElementById('enterChannelBtn');
const channelList = document.getElementById('channelList');
const refreshChannelsBtn = document.getElementById('refreshChannels');
const privateToggle = document.getElementById('privateToggle');
const channelSearch = document.getElementById('channelSearch');

const inviteModal = document.getElementById('inviteModal');
const inviteUsername = document.getElementById('inviteUsername');
const inviteBtn = document.getElementById('inviteBtn');
const sendInviteBtn = document.getElementById('sendInviteBtn');
const cancelInviteBtn = document.getElementById('cancelInviteBtn');

const friendUsername = document.getElementById('friendUsername');
const sendFriendReqBtn = document.getElementById('sendFriendReqBtn');
const refreshFriendsBtn = document.getElementById('refreshFriends');
const incomingList = document.getElementById('incomingList');
const outgoingList = document.getElementById('outgoingList');
const friendsList = document.getElementById('friendsList');
const friendsBadge = document.getElementById('friendsBadge');

const profileBio = document.getElementById('profileBio');
const profileStatus = document.getElementById('profileStatus');
const saveProfileBtn = document.getElementById('saveProfileBtn');

const welcomeBar = document.getElementById('welcomeBar');
const currentChannelBar = document.getElementById('currentChannelBar');
const channelName = document.getElementById('channelName');
const channelPrivacy = document.getElementById('channelPrivacy');
const channelActions = document.getElementById('channelActions');
const chatWindow = document.getElementById('chatWindow');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');

const dmBar = document.getElementById('dmBar');
const dmUsername = document.getElementById('dmUsername');
const dmStatus = document.getElementById('dmStatus');
const dmWindow = document.getElementById('dmWindow');
const dmInput = document.getElementById('dmInput');
const dmSendBtn = document.getElementById('dmSendBtn');
const dmTypingIndicator = document.getElementById('dmTypingIndicator');

const themeToggle = document.getElementById('themeToggle');
const logoutBtn = document.getElementById('logoutBtn');
const currentUser = document.getElementById('currentUser');
const userInfo = document.getElementById('userInfo');

const toChannelChatBtn = document.getElementById('toChannelChatBtn');
const toDmChatBtn = document.getElementById('toDmChatBtn');

const emojiBtn = document.getElementById('emojiBtn');
const dmEmojiBtn = document.getElementById('dmEmojiBtn');
const emojiPicker = document.getElementById('emojiPicker');
const emojiGrid = document.getElementById('emojiGrid');

const notification = document.getElementById('notification');

// Initialize emoji picker
function initEmojiPicker() {
  emojiGrid.innerHTML = '';
  commonEmojis.forEach(emoji => {
    const item = document.createElement('div');
    item.className = 'emoji-item';
    item.textContent = emoji;
    item.title = emoji;
    item.onclick = () => insertEmoji(emoji);
    emojiGrid.appendChild(item);
  });
}

function insertEmoji(emoji) {
  const input = currentDmUser ? dmInput : messageInput;
  const cursorPos = input.selectionStart;
  const textBefore = input.value.substring(0, cursorPos);
  const textAfter = input.value.substring(cursorPos);
  input.value = textBefore + emoji + textAfter;
  input.focus();
  input.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length);
  emojiPicker.style.display = 'none';
}

emojiBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
});

dmEmojiBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
});

document.addEventListener('click', (e) => {
  if (!emojiPicker.contains(e.target) && e.target !== emojiBtn && e.target !== dmEmojiBtn) {
    emojiPicker.style.display = 'none';
  }
});

// Notification system
function showNotification(message, type = 'info') {
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.style.display = 'block';
  setTimeout(() => {
    notification.style.display = 'none';
  }, 3000);
}

// Theme toggle
themeToggle?.addEventListener('click', () => {
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  themeToggle.textContent = isLight ? '🌙' : '☀️';
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
});

(function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light') {
    document.body.classList.add('light');
    themeToggle.textContent = '🌙';
  } else {
    themeToggle.textContent = '☀️';
  }
})();

// Tabs
tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    tabs.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.tab;
    channelsTab.style.display = target === 'channelsTab' ? 'block' : 'none';
    friendsTab.style.display = target === 'friendsTab' ? 'block' : 'none';
    profileTab.style.display = target === 'profileTab' ? 'block' : 'none';
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
  try {
    const res = await fetch(route, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: uname, password: pwd })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      showNotification(data.error || 'Authentication failed', 'error');
      return;
    }

    username = uname.toLowerCase();
    localStorage.setItem('username', username);
    socket.emit('joinUser', username);

    authCard.style.display = 'none';
    appPanels.style.display = 'block';
    welcomeBar.style.display = 'block';
    welcomeBar.textContent = `Welcome back, ${username}! 👋`;
    logoutBtn.style.display = 'inline-block';
    userInfo.style.display = 'flex';
    currentUser.textContent = username;

    await loadChannels();
    await loadFriends();
    await loadProfile();
    
    showNotification(`Welcome, ${username}!`, 'success');
  } catch (err) {
    showNotification('Network error. Please try again.', 'error');
  }
});

// Auto login
(function autoLogin() {
  const savedUser = localStorage.getItem('username');
  if (savedUser) {
    username = savedUser.toLowerCase();
    socket.emit('joinUser', username);
    authCard.style.display = 'none';
    appPanels.style.display = 'block';
    welcomeBar.style.display = 'block';
    welcomeBar.textContent = `Welcome back, ${username}! 👋`;
    logoutBtn.style.display = 'inline-block';
    userInfo.style.display = 'flex';
    currentUser.textContent = username;
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
  userInfo.style.display = 'none';
  showNotification('Logged out successfully', 'info');
});

// Channel search
channelSearch?.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const items = channelList.querySelectorAll('.channel-item');
  items.forEach(item => {
    const name = item.textContent.toLowerCase();
    item.style.display = name.includes(query) ? 'flex' : 'none';
  });
});

// Channels
refreshChannelsBtn.addEventListener('click', loadChannels);

enterChannelBtn.addEventListener('click', async () => {
  const ch = channelInput.value.trim();
  if (!ch) return;

  const exists = await channelExists(ch);
  if (!exists) {
    try {
      const resp = await fetch('/channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: ch, creator: username, isPrivate: !!privateToggle.checked })
      });
      const data = await resp.json();
      if (!resp.ok) {
        showNotification(data.error || 'Failed to create channel', 'error');
        return;
      }
      showNotification(`Channel #${ch} created!`, 'success');
    } catch (err) {
      showNotification('Network error', 'error');
      return;
    }
  }

  try {
    const joinRes = await fetch('/channel/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: ch, username })
    });
    const joinData = await joinRes.json();
    if (!joinRes.ok || !joinData.success) {
      showNotification(joinData.error || 'Join failed', 'error');
      return;
    }

    await enterChannel(ch);
  } catch (err) {
    showNotification('Network error', 'error');
  }
});

async function channelExists(name) {
  const res = await fetch('/channels');
  const list = await res.json();
  return list.some(c => c.name === name);
}

async function loadChannels() {
  try {
    const res = await fetch('/channels');
    const list = await res.json();
    channelList.innerHTML = '';
    
    if (list.length === 0) {
      channelList.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:13px;">No channels yet. Create one!</div>';
      return;
    }
    
    list.forEach((c) => {
      const item = document.createElement('div');
      item.className = 'channel-item';
      if (c.name === currentChannel) item.classList.add('active');
      const lock = c.isPrivate ? '🔒' : '#';
      item.innerHTML = `<span>${lock} ${c.name}</span><div class="tooltip">Click to join #${c.name}</div>`;
      item.addEventListener('click', () => quickJoin(c.name));
      channelList.appendChild(item);
    });
  } catch (err) {
    showNotification('Failed to load channels', 'error');
  }
}

async function quickJoin(ch) {
  try {
    const joinRes = await fetch('/channel/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: ch, username })
    });
    const joinData = await joinRes.json();
    if (!joinRes.ok || !joinData.success) {
      showNotification(joinData.error || 'Join failed', 'error');
      return;
    }
    await enterChannel(ch);
  } catch (err) {
    showNotification('Network error', 'error');
  }
}

async function enterChannel(channel) {
  showChannelUi();
  currentChannel = channel;

  const meta = await fetchChannelMeta(channel);
  currentChannelIsPrivate = !!meta?.isPrivate;
  currentChannelCreator = meta?.creator || null;

  channelName.textContent = `# ${channel}`;
  channelPrivacy.textContent = currentChannelIsPrivate ? '🔒 Private' : '';
  channelActions.style.display = (currentChannelIsPrivate && currentChannelCreator === username) ? 'flex' : 'none';

  socket.emit('joinChannel', channel);
  chatWindow.innerHTML = '';
  await loadMessages(channel);
  channelInput.value = '';
  await loadChannels();
}

async function fetchChannelMeta(name) {
  try {
    const res = await fetch('/channels');
    const list = await res.json();
    const match = list.find(c => c.name === name);
    return { name, isPrivate: match?.isPrivate || false, creator: currentChannelCreator };
  } catch {
    return { name, isPrivate: false, creator: null };
  }
}

function showChannelUi() {
  toChannelChatBtn?.classList.add('active');
  toDmChatBtn?.classList.remove('active');
  currentChannelBar.style.display = 'flex';
  document.getElementById('composer').style.display = 'flex';
  typingIndicator.style.display = 'none';
  chatWindow.style.display = 'flex';
  dmBar.style.display = 'none';
  dmWindow.style.display = 'none';
  dmComposer.style.display = 'none';
  dmTypingIndicator.style.display = 'none';
  welcomeBar.style.display = 'none';
}

// Invite modal
inviteBtn?.addEventListener('click', () => {
  inviteModal.style.display = 'flex';
  inviteUsername.value = '';
  inviteUsername.focus();
});

cancelInviteBtn?.addEventListener('click', () => {
  inviteModal.style.display = 'none';
});

sendInviteBtn?.addEventListener('click', async () => {
  const target = inviteUsername.value.trim().toLowerCase();
  if (!target) return;
  if (!currentChannelIsPrivate || currentChannelCreator !== username) {
    showNotification('Not allowed', 'error');
    return;
  }

  try {
    const resp = await fetch('/channel/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: currentChannel, inviter: username, invitee: target })
    });
    const data = await resp.json();
    if (!resp.ok || !data.success) {
      showNotification(data.error || 'Invite failed', 'error');
      return;
    }
    inviteModal.style.display = 'none';
    showNotification(`Invited ${target} to #${currentChannel}`, 'success');
  } catch (err) {
    showNotification('Network error', 'error');
  }
});

// Messages (channel)
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

messageInput.addEventListener('input', () => {
  if (currentChannel) {
    socket.emit('typing', { channel: currentChannel, user: username });
  }
});

function sendMessage() {
  let text = messageInput.value.trim();
  if (!text || !currentChannel) return;
  
  // Replace emoji shortcodes
  Object.keys(emojiShortcodes).forEach(code => {
    text = text.replace(new RegExp(escapeRegex(code), 'g'), emojiShortcodes[code]);
  });
  
  socket.emit('sendMessage', { channel: currentChannel, message: text });
  messageInput.value = '';
}

socket.on('newMessage', (msg) => {
  if (msg.channel !== currentChannel) return;
  renderMessage(chatWindow, msg.user, msg.text, msg.timestamp);
});

socket.on('userTyping', (data) => {
  if (data.channel === currentChannel && data.user !== username) {
    typingIndicator.textContent = `${data.user} is typing...`;
    typingIndicator.style.display = 'block';
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      typingIndicator.style.display = 'none';
    }, 3000);
  }
});

async function loadMessages(channel) {
  try {
    const res = await fetch(`/messages?channel=${encodeURIComponent(channel)}`);
    const list = await res.json();
    list.forEach(row => renderMessage(chatWindow, row.user, row.text, row.timestamp));
  } catch (err) {
    showNotification('Failed to load messages', 'error');
  }
}

// Friends
refreshFriendsBtn.addEventListener('click', loadFriends);

sendFriendReqBtn.addEventListener('click', async () => {
  const to = friendUsername.value.trim().toLowerCase();
  if (!to || to === username) {
    showNotification('Invalid username', 'error');
    return;
  }
  
  try {
    const res = await fetch('/friend-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: username, to })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showNotification(data.error || 'Request failed', 'error');
      return;
    }
    friendUsername.value = '';
    await loadFriends();
    showNotification(`Friend request sent to ${to}`, 'success');
  } catch (err) {
    showNotification('Network error', 'error');
  }
});

async function loadFriends() {
  try {
    // Incoming requests
    const incomingRes = await fetch(`/friends-pending-incoming?username=${encodeURIComponent(username)}`);
    const incoming = await incomingRes.json();
    incomingList.innerHTML = '';
    
    if (incoming.length === 0) {
      incomingList.className = 'friend-list empty-state';
      incomingList.textContent = 'No incoming requests';
    } else {
      incomingList.className = 'friend-list';
      incoming.forEach(req => {
        const item = document.createElement('div');
        item.className = 'friend-item';
        item.innerHTML = `<span><strong>${req.requester}</strong> wants to be friends</span>`;
        const actions = document.createElement('div');
        actions.className = 'actions';
        
        const acceptBtn = document.createElement('button');
        acceptBtn.className = 'primary';
        acceptBtn.textContent = 'Accept';
        acceptBtn.onclick = async () => {
          await acceptFriend(req.requester, req.receiver);
        };
        
        const declineBtn = document.createElement('button');
        declineBtn.className = 'secondary';
        declineBtn.textContent = 'Decline';
        declineBtn.onclick = async () => {
          await declineFriend(req.requester, req.receiver);
        };
        
        actions.appendChild(acceptBtn);
        actions.appendChild(declineBtn);
        item.appendChild(actions);
        incomingList.appendChild(item);
      });
    }

    // Outgoing requests
    const outgoingRes = await fetch(`/friends-pending-outgoing?username=${encodeURIComponent(username)}`);
    const outgoing = await outgoingRes.json();
    outgoingList.innerHTML = '';
    
    if (outgoing.length === 0) {
      outgoingList.className = 'friend-list empty-state';
      outgoingList.textContent = 'No pending requests';
    } else {
      outgoingList.className = 'friend-list';
      outgoing.forEach(req => {
        const item = document.createElement('div');
        item.className = 'friend-item';
        item.innerHTML = `<span>Waiting for <strong>${req.receiver}</strong></span>`;
        outgoingList.appendChild(item);
      });
    }

    // Friends list
    const friendsRes = await fetch(`/friends?username=${encodeURIComponent(username)}`);
    const friends = await friendsRes.json();
    friendsList.innerHTML = '';
    
    if (friends.length === 0) {
      friendsList.className = 'friend-list empty-state';
      friendsList.textContent = 'No friends yet. Send some requests!';
    } else {
      friendsList.className = 'friend-list';
      friends.forEach(f => {
        const other = f.requester === username ? f.receiver : f.requester;
        const item = document.createElement('div');
        item.className = 'friend-item';
        
        const statusDot = onlineUsers.has(other) ? 
          '<span class="status-indicator online"></span>' : 
          '<span class="status-indicator"></span>';
        
        item.innerHTML = `<span>${statusDot} <strong>${other}</strong></span>`;
        
        const actions = document.createElement('div');
        actions.className = 'actions';
        
        const dmBtn = document.createElement('button');
        dmBtn.className = 'secondary';
        dmBtn.textContent = '📨 DM';
        dmBtn.onclick = () => openDm(other);
        
        actions.appendChild(dmBtn);
        item.appendChild(actions);
        friendsList.appendChild(item);
      });
    }

    // Update badge
    const totalPending = incoming.length;
    if (totalPending > 0) {
      friendsBadge.textContent = totalPending;
      friendsBadge.style.display = 'inline-block';
    } else {
      friendsBadge.style.display = 'none';
    }
  } catch (err) {
    showNotification('Failed to load friends', 'error');
  }
}

async function acceptFriend(from, to) {
  try {
    const res = await fetch('/friend-accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, actor: username })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showNotification(data.error || 'Accept failed', 'error');
      return;
    }
    await loadFriends();
    showNotification(`You and ${from} are now friends!`, 'success');
  } catch (err) {
    showNotification('Network error', 'error');
  }
}

async function declineFriend(from, to) {
  try {
    const res = await fetch('/friend-decline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, actor: username })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showNotification(data.error || 'Decline failed', 'error');
      return;
    }
    await loadFriends();
    showNotification('Friend request declined', 'info');
  } catch (err) {
    showNotification('Network error', 'error');
  }
}

// Profile
saveProfileBtn?.addEventListener('click', async () => {
  const bio = profileBio.value;
  const status = profileStatus.value;
  
  try {
    const res = await fetch('/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, bio, status })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      showNotification(data.error || 'Save failed', 'error');
      return;
    }
    showNotification('Profile updated!', 'success');
  } catch (err) {
    showNotification('Network error', 'error');
  }
});

async function loadProfile() {
  try {
    const res = await fetch(`/profile?username=${encodeURIComponent(username)}`);
    const data = await res.json();
    profileBio.value = data?.bio || '';
    profileStatus.value = data?.status || '';
  } catch (err) {
    console.error('Failed to load profile');
  }
}

// Direct messages
toChannelChatBtn?.addEventListener('click', () => {
  if (currentChannel) showChannelUi();
});

toDmChatBtn?.addEventListener('click', () => {
  if (currentDmUser) showDmUi();
});

function openDm(otherUser) {
  currentDmUser = otherUser;
  dmUsername.textContent = `@ ${otherUser}`;
  dmStatus.className = 'status-indicator ' + (onlineUsers.has(otherUser) ? 'online' : '');
  showDmUi();
  loadDmHistory(otherUser);
}

function showDmUi() {
  toChannelChatBtn?.classList.remove('active');
  toDmChatBtn?.classList.add('active');
  currentChannelBar.style.display = 'none';
  document.getElementById('composer').style.display = 'none';
  typingIndicator.style.display = 'none';
  chatWindow.style.display = 'none';
  dmBar.style.display = 'block';
  dmWindow.style.display = 'flex';
  dmComposer.style.display = 'flex';
  dmTypingIndicator.style.display = 'none';
  welcomeBar.style.display = 'none';
}

function hideDmUi() {
  dmBar.style.display = 'none';
  dmWindow.style.display = 'none';
  dmComposer.style.display = 'none';
  dmTypingIndicator.style.display = 'none';
}

dmSendBtn.addEventListener('click', sendDm);
dmInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendDm();
});

dmInput.addEventListener('input', () => {
  if (currentDmUser) {
    socket.emit('typingDm', { to: currentDmUser, from: username });
  }
});

function sendDm() {
  let text = dmInput.value.trim();
  if (!text || !currentDmUser) return;
  
  // Replace emoji shortcodes
  Object.keys(emojiShortcodes).forEach(code => {
    text = text.replace(new RegExp(escapeRegex(code), 'g'), emojiShortcodes[code]);
  });
  
  socket.emit('sendDirectMessage', { to: currentDmUser, message: text });
  dmInput.value = '';
}

socket.on('directMessage', (msg) => {
  if (!currentDmUser || (msg.sender !== currentDmUser && msg.receiver !== currentDmUser)) {
    // Show notification for new DM
    if (msg.sender !== username && msg.receiver === username) {
      showNotification(`New DM from ${msg.sender}`, 'info');
      unreadDMs++;
    }
    return;
  }
  const who = msg.sender === username ? 'You' : msg.sender;
  renderMessage(dmWindow, who, msg.text, msg.timestamp);
});

socket.on('userTypingDm', (data) => {
  if (data.from === currentDmUser) {
    dmTypingIndicator.textContent = `${data.from} is typing...`;
    dmTypingIndicator.style.display = 'block';
    clearTimeout(dmTypingTimeout);
    dmTypingTimeout = setTimeout(() => {
      dmTypingIndicator.style.display = 'none';
    }, 3000);
  }
});

async function loadDmHistory(other) {
  try {
    const res = await fetch(`/dm-history?with=${encodeURIComponent(other)}&me=${encodeURIComponent(username)}`);
    const list = await res.json();
    dmWindow.innerHTML = '';
    list.forEach(row => {
      const who = row.sender === username ? 'You' : row.sender;
      renderMessage(dmWindow, who, row.text, row.timestamp);
    });
  } catch (err) {
    showNotification('Failed to load DM history', 'error');
  }
}

// Message rendering with formatting
function renderMessage(container, author, text, timestamp) {
  const el = document.createElement('div');
  el.className = 'message';
  
  const time = new Date(timestamp || Date.now());
  const hh = time.getHours().toString().padStart(2, '0');
  const mm = time.getMinutes().toString().padStart(2, '0');
  
  const header = document.createElement('div');
  header.className = 'message-header';
  
  const authorSpan = document.createElement('span');
  authorSpan.className = 'author';
  authorSpan.textContent = author;
  
  const timeSpan = document.createElement('span');
  timeSpan.className = 'time';
  timeSpan.textContent = `${hh}:${mm}`;
  
  header.appendChild(authorSpan);
  header.appendChild(timeSpan);
  
  const textDiv = document.createElement('div');
  textDiv.className = 'text';
  textDiv.innerHTML = formatMessage(text);
  
  el.appendChild(header);
  el.appendChild(textDiv);
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
  
  // Add click handlers for spoilers
  el.querySelectorAll('.spoiler').forEach(spoiler => {
    spoiler.addEventListener('click', () => {
      spoiler.classList.toggle('revealed');
    });
  });
}

// Message formatting
function formatMessage(text) {
  let formatted = escapeHtml(text);
  
  // Bold: **text**
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Italic: *text*
  formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Spoiler: ||text||
  formatted = formatted.replace(/\|\|(.+?)\|\|/g, '<span class="spoiler">$1</span>');
  
  // Mentions: @username
  formatted = formatted.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
  
  return formatted;
}

// Socket.IO event handlers
socket.on('userOnline', (data) => {
  onlineUsers.add(data.username);
  updateOnlineStatus();
});

socket.on('userOffline', (data) => {
  onlineUsers.delete(data.username);
  updateOnlineStatus();
});

socket.on('onlineUsers', (users) => {
  onlineUsers = new Set(users);
  updateOnlineStatus();
});

function updateOnlineStatus() {
  // Update friends list status indicators
  loadFriends();
  
  // Update DM status if viewing a DM
  if (currentDmUser) {
    dmStatus.className = 'status-indicator ' + (onlineUsers.has(currentDmUser) ? 'online' : '');
  }
}

// Utility functions
function escapeHtml(s) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return s.replace(/[&<>"']/g, (m) => map[m]);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\function hideDmUi() {
  dmBar.style.display = 'none';
  dmWindow.style');
}

// Initialize
initEmojiPicker();
