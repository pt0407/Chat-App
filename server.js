const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Database setup (SQLite) ---
const db = new sqlite3.Database('./chat.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE COLLATE NOCASE NOT NULL,
    password TEXT NOT NULL,
    bio TEXT DEFAULT '',
    status TEXT DEFAULT '',
    lastSeen INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT NOT NULL,
    user TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    creator TEXT NOT NULL,
    isPrivate INTEGER NOT NULL DEFAULT 0,
    createdAt INTEGER DEFAULT (strftime('%s', 'now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS channel_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT NOT NULL,
    username TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    UNIQUE(channel, username)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS channel_admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT NOT NULL,
    username TEXT NOT NULL,
    UNIQUE(channel, username)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS channel_bans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT NOT NULL,
    username TEXT NOT NULL,
    bannedBy TEXT NOT NULL,
    bannedAt INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(channel, username)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester TEXT NOT NULL,
    receiver TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending','accepted','declined')),
    createdAt INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(requester, receiver)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS direct_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender TEXT NOT NULL,
    receiver TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  )`);

  // Add index for message search
  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_text ON messages(text)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_dm_text ON direct_messages(text)`);
});

// Track online users
const onlineUsers = new Map(); // username -> socket.id

// --- Auth routes ---
app.post('/signup', (req, res) => {
  let { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  username = username.trim().toLowerCase();
  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: 'Username must be 3-20 characters' });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  const hashed = bcrypt.hashSync(password, 10);
  db.run(
    `INSERT INTO users (username, password) VALUES (?, ?)`,
    [username, hashed],
    function (err) {
      if (err) return res.status(400).json({ error: 'User already exists' });
      res.json({ success: true });
    }
  );
});

app.post('/login', (req, res) => {
  let { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  username = username.trim().toLowerCase();

  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (!row) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = bcrypt.compareSync(password, row.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    
    // Update last seen
    db.run(`UPDATE users SET lastSeen = ? WHERE username = ?`, [Date.now(), username]);
    
    res.json({ success: true, username });
  });
});

// --- Profiles ---
app.get('/profile', (req, res) => {
  const username = String(req.query.username || '').trim().toLowerCase();
  if (!username) return res.status(400).json({ error: 'Missing username' });
  db.get(`SELECT username, bio, status, lastSeen FROM users WHERE username=?`, [username], (err, row) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json(row || {});
  });
});

app.post('/profile', (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const bio = String(req.body.bio || '').substring(0, 200);
  const status = String(req.body.status || '').substring(0, 50);
  if (!username) return res.status(400).json({ error: 'Missing username' });

  db.run(`UPDATE users SET bio=?, status=? WHERE username=?`, [bio, status, username], function (err) {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json({ success: true });
  });
});

// --- Channels + Messages ---
app.get('/channels', (req, res) => {
  db.all(`SELECT name, isPrivate, creator FROM channels ORDER BY name ASC`, [], (err, rows) => {
    if (err) return res.status(500).json([]);
    res.json(rows.map(r => ({ name: r.name, isPrivate: !!r.isPrivate, creator: r.creator })));
  });
});

app.post('/channel', (req, res) => {
  const { name, creator, isPrivate } = req.body || {};
  const ch = String(name || '').trim();
  const user = String(creator || '').trim().toLowerCase();
  const priv = isPrivate ? 1 : 0;
  if (!ch || !user) return res.status(400).json({ error: 'Missing fields' });
  if (ch.length < 2 || ch.length > 50) {
    return res.status(400).json({ error: 'Channel name must be 2-50 characters' });
  }

  db.run(`INSERT INTO channels (name, creator, isPrivate) VALUES (?, ?, ?)`, [ch, user, priv], function (err) {
    if (err) return res.status(400).json({ error: 'Channel exists' });
    
    // Add creator as member and admin
    db.run(`INSERT OR IGNORE INTO channel_members (channel, username, role) VALUES (?, ?, 'admin')`, [ch, user]);
    db.run(`INSERT OR IGNORE INTO channel_admins (channel, username) VALUES (?, ?)`, [ch, user]);
    
    res.json({ success: true, channelId: this.lastID });
  });
});

app.post('/channel/invite', (req, res) => {
  const { channel, inviter, invitee } = req.body || {};
  const ch = String(channel || '').trim();
  const inv = String(inviter || '').trim().toLowerCase();
  const rec = String(invitee || '').trim().toLowerCase();
  if (!ch || !inv || !rec) return res.status(400).json({ error: 'Missing fields' });

  db.get(`SELECT creator, isPrivate FROM channels WHERE name=?`, [ch], (err, row) => {
    if (err || !row) return res.status(400).json({ error: 'Channel not found' });
    if (!row.isPrivate) return res.status(400).json({ error: 'Channel is public' });

    // Check if inviter is admin
    db.get(`SELECT 1 FROM channel_admins WHERE channel=? AND username=?`, [ch, inv], (err2, admin) => {
      if (err2 || !admin) return res.status(403).json({ error: 'Not channel admin' });

      db.run(`INSERT OR IGNORE INTO channel_members (channel, username) VALUES (?, ?)`, [ch, rec], function (err3) {
        if (err3) return res.status(500).json({ error: 'Server error' });
        res.json({ success: true });
      });
    });
  });
});

app.post('/channel/join', (req, res) => {
  const { channel, username } = req.body || {};
  const ch = String(channel || '').trim();
  const user = String(username || '').trim().toLowerCase();
  if (!ch || !user) return res.status(400).json({ error: 'Missing fields' });

  // Check if banned
  db.get(`SELECT 1 FROM channel_bans WHERE channel=? AND username=?`, [ch, user], (errBan, banned) => {
    if (errBan) return res.status(500).json({ error: 'Server error' });
    if (banned) return res.status(403).json({ error: 'You are banned from this channel' });

    db.get(`SELECT isPrivate FROM channels WHERE name=?`, [ch], (err, row) => {
      if (err || !row) return res.status(400).json({ error: 'Channel not found' });
      
      if (row.isPrivate) {
        db.get(`SELECT 1 FROM channel_members WHERE channel=? AND username=?`, [ch, user], (err2, m) => {
          if (err2) return res.status(500).json({ error: 'Server error' });
          if (!m) return res.status(403).json({ error: 'Private channel - invite required' });
          res.json({ success: true });
        });
      } else {
        db.run(`INSERT OR IGNORE INTO channel_members (channel, username) VALUES (?, ?)`, [ch, user]);
        res.json({ success: true });
      }
    });
  });
});

// Kick user (admin only)
app.post('/channel/kick', (req, res) => {
  const { channel, admin, target } = req.body || {};
  const ch = String(channel || '').trim();
  const adm = String(admin || '').trim().toLowerCase();
  const tgt = String(target || '').trim().toLowerCase();
  if (!ch || !adm || !tgt) return res.status(400).json({ error: 'Missing fields' });

  db.get(`SELECT 1 FROM channel_admins WHERE channel=? AND username=?`, [ch, adm], (err, isAdmin) => {
    if (err || !isAdmin) return res.status(403).json({ error: 'Not channel admin' });

    db.run(`DELETE FROM channel_members WHERE channel=? AND username=?`, [ch, tgt], function (err2) {
      if (err2) return res.status(500).json({ error: 'Server error' });
      res.json({ success: true });
    });
  });
});

// Ban user (admin only)
app.post('/channel/ban', (req, res) => {
  const { channel, admin, target } = req.body || {};
  const ch = String(channel || '').trim();
  const adm = String(admin || '').trim().toLowerCase();
  const tgt = String(target || '').trim().toLowerCase();
  if (!ch || !adm || !tgt) return res.status(400).json({ error: 'Missing fields' });

  db.get(`SELECT 1 FROM channel_admins WHERE channel=? AND username=?`, [ch, adm], (err, isAdmin) => {
    if (err || !isAdmin) return res.status(403).json({ error: 'Not channel admin' });

    // Remove from members and add to bans
    db.run(`DELETE FROM channel_members WHERE channel=? AND username=?`, [ch, tgt]);
    db.run(`INSERT OR IGNORE INTO channel_bans (channel, username, bannedBy) VALUES (?, ?, ?)`, 
      [ch, tgt, adm], 
      function (err2) {
        if (err2) return res.status(500).json({ error: 'Server error' });
        res.json({ success: true });
      }
    );
  });
});

// Delete channel (creator only)
app.post('/channel/delete', (req, res) => {
  const { channel, username } = req.body || {};
  const ch = String(channel || '').trim();
  const user = String(username || '').trim().toLowerCase();
  if (!ch || !user) return res.status(400).json({ error: 'Missing fields' });

  db.get(`SELECT creator FROM channels WHERE name=?`, [ch], (err, row) => {
    if (err || !row) return res.status(400).json({ error: 'Channel not found' });
    if (row.creator !== user) return res.status(403).json({ error: 'Only creator can delete channel' });

    db.run(`DELETE FROM channels WHERE name=?`, [ch]);
    db.run(`DELETE FROM channel_members WHERE channel=?`, [ch]);
    db.run(`DELETE FROM channel_admins WHERE channel=?`, [ch]);
    db.run(`DELETE FROM channel_bans WHERE channel=?`, [ch]);
    db.run(`DELETE FROM messages WHERE channel=?`, [ch]);
    
    res.json({ success: true });
  });
});

app.get('/messages', (req, res) => {
  const channel = (req.query.channel || '').trim();
  if (!channel) return res.json([]);
  db.all(
    `SELECT channel, user, text, timestamp FROM messages WHERE channel = ? ORDER BY timestamp ASC LIMIT 500`,
    [channel],
    (err, rows) => {
      if (err) return res.status(500).json([]);
      res.json(rows);
    }
  );
});

// Search messages
app.get('/search/messages', (req, res) => {
  const query = String(req.query.q || '').trim();
  const channel = String(req.query.channel || '').trim();
  if (!query) return res.json([]);

  const sql = channel 
    ? `SELECT channel, user, text, timestamp FROM messages WHERE channel=? AND text LIKE ? ORDER BY timestamp DESC LIMIT 50`
    : `SELECT channel, user, text, timestamp FROM messages WHERE text LIKE ? ORDER BY timestamp DESC LIMIT 50`;
  
  const params = channel ? [channel, `%${query}%`] : [`%${query}%`];

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json([]);
    res.json(rows);
  });
});

// --- Friends API ---
app.post('/friend-request', (req, res) => {
  const requester = String(req.body.from || '').trim().toLowerCase();
  const receiver = String(req.body.to || '').trim().toLowerCase();
  if (!requester || !receiver || requester === receiver) return res.status(400).json({ error: 'Invalid request' });

  db.get(`SELECT id FROM users WHERE username=?`, [receiver], (err, row) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (!row) return res.status(400).json({ error: 'User not found' });

    db.run(`INSERT OR IGNORE INTO friends (requester, receiver, status) VALUES (?, ?, 'pending')`,
      [requester, receiver],
      function (err2) {
        if (err2) return res.status(400).json({ error: 'Request failed' });
        res.json({ success: true });
      }
    );
  });
});

app.post('/friend-accept', (req, res) => {
  const requester = String(req.body.from || '').trim().toLowerCase();
  const receiver = String(req.body.to || '').trim().toLowerCase();
  const actor = String(req.body.actor || '').trim().toLowerCase();
  if (!requester || !receiver || !actor) return res.status(400).json({ error: 'Missing fields' });
  if (actor !== receiver) return res.status(403).json({ error: 'Only receiver can accept' });

  db.run(`UPDATE friends SET status='accepted' WHERE requester=? AND receiver=?`, [requester, receiver], function (err) {
    if (err || !this.changes) return res.status(400).json({ error: 'Accept failed' });
    res.json({ success: true });
  });
});

app.post('/friend-decline', (req, res) => {
  const requester = String(req.body.from || '').trim().toLowerCase();
  const receiver = String(req.body.to || '').trim().toLowerCase();
  const actor = String(req.body.actor || '').trim().toLowerCase();
  if (!requester || !receiver || !actor) return res.status(400).json({ error: 'Missing fields' });
  if (actor !== receiver) return res.status(403).json({ error: 'Only receiver can decline' });

  db.run(`UPDATE friends SET status='declined' WHERE requester=? AND receiver=?`, [requester, receiver], function (err) {
    if (err || !this.changes) return res.status(400).json({ error: 'Decline failed' });
    res.json({ success: true });
  });
});

app.get('/friends', (req, res) => {
  const username = String(req.query.username || '').trim().toLowerCase();
  if (!username) return res.json([]);
  db.all(
    `SELECT requester, receiver FROM friends 
     WHERE status='accepted' AND (requester=? OR receiver=?)`,
    [username, username],
    (err, rows) => {
      if (err) return res.status(500).json([]);
      res.json(rows);
    }
  );
});

app.get('/friends-pending-incoming', (req, res) => {
  const username = String(req.query.username || '').trim().toLowerCase();
  if (!username) return res.json([]);
  db.all(
    `SELECT requester, receiver FROM friends 
     WHERE status='pending' AND receiver=?`,
    [username],
    (err, rows) => {
      if (err) return res.status(500).json([]);
      res.json(rows);
    }
  );
});

app.get('/friends-pending-outgoing', (req, res) => {
  const username = String(req.query.username || '').trim().toLowerCase();
  if (!username) return res.json([]);
  db.all(
    `SELECT requester, receiver FROM friends 
     WHERE status='pending' AND requester=?`,
    [username],
    (err, rows) => {
      if (err) return res.status(500).json([]);
      res.json(rows);
    }
  );
});

// --- DM history ---
app.get('/dm-history', (req, res) => {
  const me = String(req.query.me || '').trim().toLowerCase();
  const other = String(req.query.with || '').trim().toLowerCase();
  if (!me || !other) return res.json([]);

  db.get(
    `SELECT 1 FROM friends 
     WHERE status='accepted' AND (
       (requester=? AND receiver=?) OR (requester=? AND receiver=?)
     )`,
    [me, other, other, me],
    (err, ok) => {
      if (err) return res.status(500).json([]);
      if (!ok) return res.json([]);
      
      db.all(
        `SELECT sender, receiver, text, timestamp
         FROM direct_messages
         WHERE (sender=? AND receiver=?) OR (sender=? AND receiver=?)
         ORDER BY timestamp ASC LIMIT 500`,
        [me, other, other, me],
        (err2, rows) => {
          if (err2) return res.status(500).json([]);
          res.json(rows);
        }
      );
    }
  );
});

// --- Socket.IO ---
io.on('connection', (socket) => {
  socket.username = 'Anonymous';

  socket.on('joinUser', (username) => {
    if (username && username.trim()) {
      socket.username = username.trim().toLowerCase();
      onlineUsers.set(socket.username, socket.id);
      
      // Broadcast user online
      io.emit('userOnline', { username: socket.username });
      
      // Send list of online users to new user
      socket.emit('onlineUsers', Array.from(onlineUsers.keys()));
      
      // Update last seen
      db.run(`UPDATE users SET lastSeen = ? WHERE username = ?`, [Date.now(), socket.username]);
    }
  });

  socket.on('joinChannel', (channelName) => {
    const ch = (channelName || '').trim();
    if (!ch) return;
    
    db.get(`SELECT isPrivate FROM channels WHERE name=?`, [ch], (err, row) => {
      if (err || !row) return;
      
      if (row.isPrivate) {
        db.get(`SELECT 1 FROM channel_members WHERE channel=? AND username=?`, [ch, socket.username], (err2, m) => {
          if (err2 || !m) return;
          socket.join(ch);
        });
      } else {
        db.run(`INSERT OR IGNORE INTO channel_members (channel, username) VALUES (?, ?)`, [ch, socket.username]);
        socket.join(ch);
      }
    });
  });

  socket.on('sendMessage', ({ channel, message }) => {
    const ch = (channel || '').trim();
    const text = (message || '').trim();
    if (!ch || !text || text.length > 2000) return;

    const msg = {
      channel: ch,
      user: socket.username,
      text,
      timestamp: Date.now()
    };

    db.run(
      `INSERT INTO messages (channel, user, text, timestamp) VALUES (?, ?, ?, ?)`,
      [msg.channel, msg.user, msg.text, msg.timestamp]
    );

    io.to(ch).emit('newMessage', msg);
  });

  socket.on('typing', ({ channel, user }) => {
    const ch = (channel || '').trim();
    if (!ch) return;
    socket.to(ch).emit('userTyping', { channel: ch, user: socket.username });
  });

  socket.on('sendDirectMessage', ({ to, message }) => {
    const receiver = String(to || '').trim().toLowerCase();
    const text = String(message || '').trim();
    if (!receiver || !text || text.length > 2000) return;

    db.get(
      `SELECT 1 FROM friends 
       WHERE status='accepted' AND (
         (requester=? AND receiver=?) OR (requester=? AND receiver=?)
       )`,
      [socket.username, receiver, receiver, socket.username],
      (err, ok) => {
        if (err || !ok) return;
        
        const msg = {
          sender: socket.username,
          receiver,
          text,
          timestamp: Date.now()
        };

        db.run(
          `INSERT INTO direct_messages (sender, receiver, text, timestamp) VALUES (?, ?, ?, ?)`,
          [msg.sender, msg.receiver, msg.text, msg.timestamp]
        );

        // Send to receiver if online
        const receiverSocketId = onlineUsers.get(receiver);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('directMessage', msg);
        }
        
        // Echo back to sender
        socket.emit('directMessage', msg);
      }
    );
  });

  socket.on('typingDm', ({ to, from }) => {
    const receiver = String(to || '').trim().toLowerCase();
    if (!receiver) return;
    
    const receiverSocketId = onlineUsers.get(receiver);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('userTypingDm', { from: socket.username });
    }
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.username);
    
    // Broadcast user offline
    io.emit('userOffline', { username: socket.username });
    
    // Update last seen
    db.run(`UPDATE users SET lastSeen = ? WHERE username = ?`, [Date.now(), socket.username]);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
