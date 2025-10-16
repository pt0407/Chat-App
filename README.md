# 💬 Enhanced Chat App - Discord-Style

A feature-rich, real-time chat application with Discord-inspired UI, built with Node.js, Express, Socket.IO, and SQLite.

## ✨ Features Implemented

### 🔐 Authentication & Users
- ✅ Secure signup/login with bcrypt password hashing
- ✅ Case-insensitive usernames
- ✅ Auto-login with localStorage
- ✅ Username validation (3-20 characters)
- ✅ Password validation (minimum 4 characters)

### 💬 Messaging
- ✅ Real-time channel messages
- ✅ Real-time direct messages (DMs)
- ✅ Message history (last 500 messages)
- ✅ UTF-8 support (emojis work natively)
- ✅ Message character limit (2000)
- ✅ Typing indicators (channel & DM)
- ✅ Auto-scroll to latest message

### 📝 Message Formatting
- ✅ **Bold text**: `**text**` → **text**
- ✅ *Italic text*: `*text*` → *italic*
- ✅ ||Spoilers||: `||text||` → click to reveal
- ✅ @Mentions: `@username` → highlighted
- ✅ Emoji shortcodes: `:smile:` → 😊
- ✅ Emoji picker with common emojis

### 📢 Channels
- ✅ Public channels (anyone can join)
- ✅ Private channels (invite-only)
- ✅ Channel creation with privacy toggle
- ✅ Channel list with 🔒/# indicators
- ✅ Channel search functionality
- ✅ Join channel validation
- ✅ Channel membership tracking

### 🛡️ Channel Admin Actions
- ✅ Creator becomes admin automatically
- ✅ Invite users to private channels (admin only)
- ✅ Kick users from channels (admin only)
- ✅ Ban users from channels (admin only)
- ✅ Delete channels (creator only)
- ✅ Multi-admin support via `channel_admins` table
- ✅ Ban tracking via `channel_bans` table

### 👥 Friends System
- ✅ Send friend requests by username
- ✅ Accept/decline incoming requests
- ✅ View pending outgoing requests
- ✅ Friends list with DM shortcuts
- ✅ Friend request notifications (badge counter)
- ✅ Online status indicators for friends
- ✅ Only friends can DM each other

### 👤 User Profiles
- ✅ Bio (200 character limit)
- ✅ Status message (50 character limit)
- ✅ Last seen timestamp
- ✅ Online presence tracking
- ✅ Profile save functionality

### 🔔 Notifications
- ✅ Toast notifications for key actions
- ✅ Success/error/info notification types
- ✅ New DM notifications when not in DM view
- ✅ Friend request badge counter
- ✅ Auto-dismiss after 3 seconds

### 🎨 UI/UX (Discord-Style)
- ✅ Discord-inspired dark theme (default)
- ✅ Light theme option
- ✅ Theme persistence via localStorage
- ✅ Smooth animations and transitions
- ✅ Hover tooltips
- ✅ Tab navigation (Channels/Friends/Profile)
- ✅ Status indicators (online/offline)
- ✅ Message timestamps
- ✅ Channel/DM switcher
- ✅ Responsive design basics
- ✅ Custom scrollbars
- ✅ Modal dialogs
- ✅ Empty states with helpful messages

### 🔍 Search System
- ✅ Search channels by name (client-side)
- ✅ Search messages by keyword (server endpoint ready)
- ✅ Channel filter in real-time
- ✅ Case-insensitive search

## 📦 Installation

1. **Clone or download the files**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Start the server:**
   ```bash
   npm start
   ```
4. **Open your browser:**
   ```
   http://localhost:3000
   ```

## 🗂️ Database Schema

### Tables Created:
- `users` - User accounts with bio, status, lastSeen
- `messages` - Channel messages
- `channels` - Channel metadata with privacy and creator
- `channel_members` - Channel membership tracking
- `channel_admins` - Multi-admin support
- `channel_bans` - Ban list per channel
- `friends` - Friend relationships (pending/accepted/declined)
- `direct_messages` - Private DM history

## 🚀 Usage Guide

### Getting Started
1. **Sign up** with a username (3-20 chars) and password (4+ chars)
2. **Create or join channels** from the Channels tab
3. **Add friends** from the Friends tab
4. **Start chatting!**

### Channel Management
- **Public channel**: Uncheck "Private" when creating
- **Private channel**: Check "Private" - only invited users can join
- **Invite users**: Click the ➕ Invite button (admin only, private channels)
- **Admin actions**: Available to channel creator/admins

### Messaging Features
- **Format text**: Use `**bold**`, `*italic*`, or `||spoiler||`
- **Mention users**: Type `@username`
- **Add emojis**: Click 😀 button or type `:smile:`
- **See typing**: Watch for "User is typing..." indicator

### Friend System
1. **Send request**: Enter username in Friends tab
2. **Accept/Decline**: Check incoming requests
3. **Start DM**: Click 📨 DM button next to friend's name
4. **Online status**: Green dot = online, gray = offline

## 🎨 Customization

### Themes
- **Toggle theme**: Click 🌙/☀️ button in top-right
- **Default**: Dark theme (Discord-style)
- **Light mode**: Clean, modern light theme

### Color Scheme
Both themes use CSS custom properties defined in `:root` and `body.light`:
- `--bg`: Background color
- `--panel`: Panel/card background
- `--text`: Primary text color
- `--primary`: Accent color (buttons, links)
- `--border`: Border color

## 🔧 Admin Features

### Channel Admin Actions (via API)

**Kick a user:**
```javascript
POST /channel/kick
{
  "channel": "general",
  "admin": "admin_username",
  "target": "user_to_kick"
}
```

**Ban a user:**
```javascript
POST /channel/ban
{
  "channel": "general",
  "admin": "admin_username",
  "target": "user_to_ban"
}
```

**Delete channel:**
```javascript
POST /channel/delete
{
  "channel": "general",
  "username": "creator_username"
}
```

*Note: UI buttons for these actions can be added by extending the channel settings modal.*

## 🔍 Search Messages (API Ready)

Search is implemented server-side but not yet in UI:

```javascript
GET /search/messages?q=keyword&channel=optional_channel
```

Returns matching messages with context.

## 📱 Real-time Features

### Socket.IO Events

**Client → Server:**
- `joinUser(username)` - Join as user
- `joinChannel(channel)` - Join channel room
- `sendMessage({channel, message})` - Send channel message
- `typing({channel, user})` - Emit typing indicator
- `sendDirectMessage({to, message})` - Send DM
- `typingDm({to, from})` - DM typing indicator

**Server → Client:**
- `newMessage(msg)` - New channel message
- `userTyping(data)` - Someone is typing
- `directMessage(msg)` - New DM received
- `userTypingDm(data)` - DM typing indicator
- `userOnline(data)` - User came online
- `userOffline(data)` - User went offline
- `onlineUsers(array)` - Initial online users list

## 🐛 Bugs Fixed

1. ✅ **Missing HTML elements** - Added all referenced IDs
2. ✅ **Theme toggle UI** - Now properly updates button icon
3. ✅ **Channel creator tracking** - Properly stored and retrieved
4. ✅ **Empty state handling** - Friendly messages when lists are empty
5. ✅ **Error handling** - Network errors caught and displayed
6. ✅ **Input validation** - Length limits on all inputs
7. ✅ **Friend badge updates** - Properly shows pending count
8. ✅ **Online status sync** - Friends list updates when users go online/offline

## 🎯 Feature Checklist

### Fully Implemented ✅
- [x] Channel admin actions (kick, ban, delete)
- [x] Extended profiles (bio, status, lastSeen)
- [x] Role-based permissions (admin system)
- [x] Search system (server-side ready)
- [x] Notifications (toast system)
- [x] Typing indicators (channel & DM)
- [x] Emoji picker & shortcodes
- [x] Message formatting (bold, italic, spoiler, mentions)

### UI Integration Needed 🔨
- [ ] Search messages UI (endpoint exists)
- [ ] Admin action buttons in channel settings
- [ ] Avatar upload support
- [ ] Browser notifications (Notification API)
- [ ] Role badges display
- [ ] Full mobile responsive menu

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, Socket.IO
- **Database**: SQLite3
- **Security**: bcrypt for password hashing
- **Frontend**: Vanilla JavaScript, CSS3
- **Real-time**: Socket.IO for bidirectional communication

## 📝 API Endpoints

### Authentication
- `POST /signup` - Create account
- `POST /login` - Login

### Profile
- `GET /profile?username=` - Get profile
- `POST /profile` - Update profile

### Channels
- `GET /channels` - List all channels
- `POST /channel` - Create channel
- `POST /channel/join` - Join channel
- `POST /channel/invite` - Invite to private channel
- `POST /channel/kick` - Kick user (admin)
- `POST /channel/ban` - Ban user (admin)
- `POST /channel/delete` - Delete channel (creator)

### Messages
- `GET /messages?channel=` - Get channel messages
- `GET /search/messages?q=&channel=` - Search messages

### Friends
- `POST /friend-request` - Send friend request
- `POST /friend-accept` - Accept request
- `POST /friend-decline` - Decline request
- `GET /friends?username=` - Get friends list
- `GET /friends-pending-incoming?username=` - Incoming requests
- `GET /friends-pending-outgoing?username=` - Outgoing requests

### Direct Messages
- `GET /dm-history?me=&with=` - Get DM history

## 🔒 Security Features

- ✅ Password hashing with bcrypt (10 rounds)
- ✅ Case-insensitive username collation
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection (HTML escaping)
- ✅ Input validation and sanitization
- ✅ Message length limits
- ✅ Friend-only DM restrictions
- ✅ Channel privacy enforcement
- ✅ Admin-only actions
- ✅ Ban system for problematic users

## 🎨 Design Philosophy

This app follows Discord's design principles:
- **Dark-first**: Default dark theme with comfortable colors
- **Clear hierarchy**: Sidebar → Main content structure
- **Subtle animations**: Smooth transitions without distraction
- **Status awareness**: Online indicators, typing indicators
- **Contextual actions**: Buttons appear when relevant
- **Feedback**: Notifications for all important actions

## 📄 License

MIT License - Feel free to use and modify!

## 🤝 Contributing

Suggestions for improvement:
1. Add message reactions (👍, ❤️, etc.)
2. Voice channel support
3. File/image upload
4. Message editing/deletion
5. Channel categories
6. Server/guild system (multiple channel groups)
7. User roles with permissions
8. Rich embeds in messages
9. Message threads
10. Pin important messages

## 🙏 Credits

Built with inspiration from Discord's excellent UX design.
