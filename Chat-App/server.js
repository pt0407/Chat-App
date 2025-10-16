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
  // Case-insensitive usernames
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE COLLATE NOCASE NOT NULL,
    password TEXT NOT NULL,
    bio TEXT DEFAULT '',
    status TEXT DEFAULT ''
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT NOT NULL,
    user TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  )`);

  // Channels with creator and privacy
  db.run(`CREATE TABLE IF NOT EXISTS channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    creator TEXT NOT NULL,
    isPrivate INTEGER NOT NULL DEFAULT 0
  )`);

  // Channel members (for private channels and membership tracking)
  db.run(`CREATE TABLE IF NOT EXISTS channel_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel TEXT NOT NULL,
    username TEXT NOT NULL,
    UNIQUE(channel, username)
  )`);

  // Friends with explicit requester/receiver and status
  db.run(`CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester TEXT NOT NULL,
    receiver TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending','accepted','declined')),
    UNIQUE(requester, receiver)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS direct_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender TEXT NOT NULL,
    receiver TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  )`);
});

// --- Auth routes ---
app.post('/signup', (req, res) => {
  let { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  username = username.trim().toLowerCase();

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
    res.json({ success: true, username });
  });
});

// --- Profiles ---
app.get('/profile', (req, res) => {
  const username = String(req.query.username || '').trim().toLowerCase();
  if (!username) return res.status(400).json({ error: 'Missing username' });
  db.get(`SELECT username, bio, status FROM users WHERE username=?`, [username], (err, row) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json(row || {});
  });
});

app.post('/profile', (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const bio = String(req.body.bio || '');
  const status = String(req.body.status || '');
  if (!username) return res.status(400).json({ error: 'Missing username' });

  db.run(`UPDATE users SET bio=?, status=? WHERE username=?`, [bio, status, username], function (err) {
    if (err) return res.status(500).json({ error: 'Server error' });
    res.json({ success: true });
  });
});

// --- Channels + Messages ---
const channelsCache = new Set(); // for quick discoverability

// Discoverable channels (public only unless member)
app.get('/channels', (req, res) => {
  // Return channel names and privacy
  db.all(`SELECT name, isPrivate FROM channels ORDER BY name ASC`, [], (err, rows) => {
    if (err) return res.status(500).json([]);
    res.json(rows.map(r => ({ name: r.name, isPrivate: !!r.isPrivate })));
  });
});

// Create channel
app.post('/channel', (req, res) => {
  const { name, creator, isPrivate } = req.body || {};
  const ch = String(name || '').trim();
  const user = String(creator || '').trim().toLowerCase();
  const priv = isPrivate ? 1 : 0;
  if (!ch || !user) return res.status(400).json({ error: 'Missing fields' });

  db.run(`INSERT INTO channels (name, creator, isPrivate) VALUES (?, ?, ?)`, [ch, user, priv], function (err) {
    if (err) return res.status(400).json({ error: 'Channel exists' });
    // Add creator as member for private channels
    db.run(`INSERT OR IGNORE INTO channel_members (channel, username) VALUES (?, ?)`, [ch, user]);
    channelsCache.add(ch);
    res.json({ success: true });
  });
});

// Invite to private channel (admin/creator only)
app.post('/channel/invite', (req, res) => {
  const { channel, inviter, invitee } = req.body || {};
  const ch = String(channel || '').trim();
  const inv = String(inviter || '').trim().toLowerCase();
  const rec = String(invitee || '').trim().toLowerCase();
  if (!ch || !inv || !rec) return res.status(400).json({ error: 'Missing fields' });

  db.get(`SELECT creator, isPrivate FROM channels WHERE name=?`, [ch], (err, row) => {
    if (err || !row) return res.status(400).json({ error: 'Channel not found' });
    if (!row.isPrivate) return res.status(400).json({ error: 'Channel is public' });

    // Only creator can invite (simple admin model). Extend later to channel_admins table.
    if (row.creator !== inv) return res.status(403).json({ error: 'Not channel admin' });

    db.run(`INSERT OR IGNORE INTO channel_members (channel, username) VALUES (?, ?)`, [ch, rec], function (err2) {
      if (err2) return res.status(500).json({ error: 'Server error' });
      res.json({ success: true });
    });
  });
});

// Join channel (with privacy checks)
app.post('/channel/join', (req, res) => {
  const { channel, username } = req.body || {};
  const ch = String(channel || '').trim();
  const user = String(username || '').trim().toLowerCase();
  if (!ch || !user) return res.status(400).json({ error: 'Missing fields' });

  db.get(`SELECT isPrivate FROM channels WHERE name=?`, [ch], (err, row) => {
    if (err || !row) return res.status(400).json({ error: 'Channel not found' });
    if (row.isPrivate) {
      db.get(`SELECT 1 FROM channel_members WHERE channel=? AND username=?`, [ch, user], (err2, m) => {
        if (err2) return res.status(500).json({ error: 'Server error' });
        if (!m) return res.status(403).json({ error: 'Not a member' });
        res.json({ success: true });
      });
    } else {
      // Public: add membership passively for organization
      db.run(`INSERT OR IGNORE INTO channel_members (channel, username) VALUES (?, ?)`, [ch, user]);
      res.json({ success: true });
    }
  });
});

// Messages history per channel
app.get('/messages', (req, res) => {
  const channel = (req.query.channel || '').trim();
  if (!channel) return res.json([]);
  db.all(
    `SELECT channel, user, text, timestamp FROM messages WHERE channel = ? ORDER BY timestamp ASC`,
    [channel],
    (err, rows) => {
      if (err) return res.status(500).json([]);
      res.json(rows);
    }
  );
});

// --- Friends API (fixed flow) ---
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

// Only receiver can accept/decline
app.post('/friend-accept', (req, res) => {
  const requester = String(req.body.from || '').trim().toLowerCase();
  const receiver = String(req.body.to || '').trim().toLowerCase();
  const actor = String(req.body.actor || '').trim().toLowerCase(); // who performs the action
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

// --- DM history (only show if friends) ---
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
      if (!ok) return res.json([]); // not friends: hide history
      db.all(
        `SELECT sender, receiver, text, timestamp
         FROM direct_messages
         WHERE (sender=? AND receiver=?) OR (sender=? AND receiver=?)
         ORDER BY timestamp ASC`,
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
    if (username && username.trim()) socket.username = username.trim().toLowerCase();
    // optional: emit discoverable channels
    db.all(`SELECT name FROM channels ORDER BY name ASC`, [], (err, rows) => {
      socket.emit('channelsUpdated', (rows || []).map(r => r.name));
    });
  });

  socket.on('createChannel', ({ name, isPrivate }) => {
    const ch = String(name || '').trim();
    const creator = socket.username;
    const priv = isPrivate ? 1 : 0;
    if (!ch || !creator) return;

    db.run(`INSERT INTO channels (name, creator, isPrivate) VALUES (?, ?, ?)`, [ch, creator, priv], function (err) {
      if (err) return;
      db.run(`INSERT OR IGNORE INTO channel_members (channel, username) VALUES (?, ?)`, [ch, creator]);
      channelsCache.add(ch);
      io.emit('channelsUpdated', Array.from(channelsCache));
    });
  });

  socket.on('joinChannel', (channelName) => {
    const ch = (channelName || '').trim();
    if (!ch) return;
    db.get(`SELECT isPrivate FROM channels WHERE name=?`, [ch], (err, row) => {
      if (err || !row) return;
      if (row.isPrivate) {
        db.get(`SELECT 1 FROM channel_members WHERE channel=? AND username=?`, [ch, socket.username], (err2, m) => {
          if (err2 || !m) return; // not allowed
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
    const text = (message || '').trim(); // UTF-8: emojis supported naturally
    if (!ch || !text) return;

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

  // Direct messages (only if friends)
  socket.on('sendDirectMessage', ({ to, message }) => {
    const receiver = String(to || '').trim().toLowerCase();
    const text = String(message || '').trim();
    if (!receiver || !text) return;

    db.get(
      `SELECT 1 FROM friends 
       WHERE status='accepted' AND (
         (requester=? AND receiver=?) OR (requester=? AND receiver=?)
       )`,
      [socket.username, receiver, receiver, socket.username],
      (err, ok) => {
        if (err || !ok) return; // not friends: ignore
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

        for (const [id, s] of io.of('/').sockets) {
          if (s.username === receiver) {
            s.emit('directMessage', msg);
          }
        }
        socket.emit('directMessage', msg);
      }
    );
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
