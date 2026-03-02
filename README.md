# 📹 Confera

A real-time video conferencing application built with React, Node.js, Socket.io, and WebRTC.

## 🌟 Features

### ✅ Authentication
- Email/password login and signup
- JWT token-based authentication
- Secure password hashing with bcrypt
- Protected routes

### ✅ Video Conferencing
- Real-time peer-to-peer video calls
- Multi-user support (unlimited participants)
- Camera ON/OFF toggle (Alt+V)
- Microphone ON/OFF toggle (Alt+A)
- Responsive grid layout
- Connection status indicators
- Auto-cleanup when users leave
- Mirror effect for own video

### ✅ Meeting Management
- Generate unique session codes
- Join meetings with code
- Copy meeting code to clipboard with feedback
- Participant counter (clickable)
- Participants panel with connection status
- Leave meeting functionality (Alt+L)
- Keyboard shortcuts support

### ✅ User Experience
- Loading states with spinner
- Error handling with friendly messages
- Toast notifications for join/leave events
- Visual indicators for muted camera/mic
- Hover effects and animations
- Modern gradient design
- Enter key support for joining
- Keyboard shortcuts (Alt+V, Alt+A, Alt+P, Alt+L)
- Participants panel (Alt+P)

## 🚀 Quick Start

### Prerequisites
- Node.js installed
- MongoDB running
- Modern web browser (Chrome, Firefox, Edge, Safari)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd "Meeting App"
```

2. **Install backend dependencies**
```bash
cd backend
npm install
```

3. **Install frontend dependencies**
```bash
cd ../frontend
npm install
```

4. **Configure environment variables**
Create `backend/.env`:
```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
PORT=5000
```

### Running the Application

**Both servers are currently running:**

- **Frontend**: http://localhost:5175/
- **Backend**: http://localhost:5000/

**To start manually:**

1. **Start Backend** (in backend folder):
```bash
node server.js
```

2. **Start Frontend** (in frontend folder):
```bash
npm run dev
```

## 🎮 How to Use

### Starting a Meeting
1. Open http://localhost:5175/
2. Login or create an account
3. Click "🎥 Start New Session"
4. Share the meeting code with others

### Joining a Meeting
1. Open http://localhost:5175/
2. Login or create an account
3. Enter the meeting code
4. Click "Join Session" or press Enter

### During the Meeting
- **Toggle Camera**: Click "📷 Camera ON/OFF" or press Alt+V
- **Toggle Microphone**: Click "🎤 Mic ON/OFF" or press Alt+A
- **View Participants**: Click "👥 Participants" or press Alt+P
- **Leave Meeting**: Click "🚪 Leave" or press Alt+L
- **Copy Code**: Click "Copy" button next to meeting code

### Keyboard Shortcuts
- **Alt+V** - Toggle camera on/off
- **Alt+A** - Toggle microphone on/off
- **Alt+P** - Show/hide participants panel
- **Alt+L** - Leave meeting (with confirmation)

## 🏗️ Architecture

### Frontend Stack
- **React** - UI framework
- **Vite** - Build tool and dev server
- **Socket.io-client** - Real-time communication
- **WebRTC** - Peer-to-peer video/audio

### Backend Stack
- **Node.js** - Runtime environment
- **Express** - Web framework
- **Socket.io** - WebSocket server
- **MongoDB** - Database
- **JWT** - Authentication
- **bcrypt** - Password hashing

### WebRTC Infrastructure
- **STUN Servers**: 
  - stun.l.google.com:19302
  - stun1.l.google.com:19302
- **TURN Servers**: 
  - openrelay.metered.ca:80
  - openrelay.metered.ca:443

## 📁 Project Structure

```
Meeting App/
├── backend/
│   ├── server.js           # Main server file
│   ├── authRoutes.js       # Authentication routes
│   ├── db.js              # Database connection
│   ├── user.js            # User model
│   ├── .env               # Environment variables
│   └── package.json       # Backend dependencies
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx      # Login page
│   │   │   ├── Signup.jsx     # Signup page
│   │   │   ├── Dashboard.jsx  # Dashboard page
│   │   │   └── Meeting.jsx    # Meeting room
│   │   ├── styles/
│   │   │   ├── login.css
│   │   │   └── dashboard.css
│   │   ├── App.jsx        # Main app component
│   │   └── main.jsx       # Entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json       # Frontend dependencies
│
├── QUICK_START.md         # Quick start guide
├── FEATURES_IMPLEMENTED.md # Complete feature list
├── MEETING_TROUBLESHOOTING.md # Debugging guide
└── README.md             # This file
```

## 🔧 Technical Details

### WebRTC Connection Flow
1. User joins room via Socket.io
2. Socket.io notifies other users
3. Peer creates offer (SDP)
4. Offer sent to remote peer
5. Remote peer creates answer
6. Answer sent back
7. ICE candidates exchanged
8. Peer-to-peer connection established
9. Media streams flow directly between peers

### Socket.io Events
- `join-room` - User joins a meeting room
- `existing-users` - List of users already in room
- `user-joined` - New user joined notification
- `offer` - WebRTC offer exchange
- `answer` - WebRTC answer exchange
- `ice-candidate` - ICE candidate exchange
- `user-left` - User disconnected notification

### State Management
- React hooks (useState, useRef, useEffect)
- Local state for UI controls
- Refs for peer connections and streams
- Socket.io for real-time synchronization

## 🐛 Debugging

### Browser Console Logs
Open browser console (F12) to see detailed logs:
- 🟢 User events
- 📤 Outgoing messages
- 📥 Incoming messages
- 🧊 ICE candidates
- 🎥 Media tracks
- 🔌 Connection states

### Backend Logs
Check terminal for server-side events:
- ✅ User connections
- 👤 Room joins
- 📤 Message relays
- ❌ Disconnections

### Common Issues
See `MEETING_TROUBLESHOOTING.md` for detailed solutions.

## 🎨 UI/UX Features

### Dashboard
- Gradient title with modern design
- Large "Start New Session" button
- Session code input with validation
- Disabled state for empty input
- Enter key support
- Hover animations

### Meeting Room
- Responsive grid layout
- Participant counter badge
- Connection status indicators
- Mirror effect for own video
- Visual mute indicators
- Loading spinner
- Error messages
- Copy confirmation feedback

## 📊 Performance

- Peer-to-peer connections (no server bandwidth usage)
- Efficient ICE candidate gathering
- Automatic cleanup on disconnect
- Optimized video rendering
- Minimal state updates

## 🔒 Security

- JWT token authentication
- Password hashing with bcrypt
- Protected API routes
- Secure WebSocket connections
- Input validation
- XSS prevention

## 🌐 Browser Support

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Edge 80+
- ✅ Safari 13+
- ✅ Opera 67+

## 📱 Device Support

- ✅ Desktop (Windows, Mac, Linux)
- ✅ Laptop
- ✅ Tablet (with camera/mic)
- ⚠️ Mobile (basic support, needs optimization)

## 🚀 Deployment

### Production Considerations
- Use HTTPS (required for WebRTC)
- Configure CORS properly
- Use environment variables
- Set up proper TURN servers
- Implement rate limiting
- Add monitoring and logging
- Optimize bundle size
- Enable compression

### Recommended Hosting
- **Frontend**: Vercel, Netlify, or AWS S3 + CloudFront
- **Backend**: Heroku, AWS EC2, or DigitalOcean
- **Database**: MongoDB Atlas
- **TURN Server**: Twilio, Xirsys, or self-hosted

## 📈 Future Enhancements

### Planned Features
- [ ] Screen sharing
- [ ] Chat messaging
- [ ] Participant list panel
- [ ] User profile pictures
- [ ] Recording functionality
- [ ] Virtual backgrounds
- [ ] Reactions/emojis
- [ ] Raise hand feature
- [ ] Meeting history
- [ ] Scheduled meetings
- [ ] Meeting passwords
- [ ] Waiting room
- [ ] Host controls
- [ ] Grid/speaker view toggle
- [ ] Picture-in-picture mode
- [ ] Network quality indicator
- [ ] Bandwidth optimization

### Settings Panel (Planned)
- [ ] Profile picture management
- [ ] Username change
- [ ] Display name change
- [ ] Audio/video device selection
- [ ] Video quality settings
- [ ] Notification preferences

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- WebRTC for peer-to-peer technology
- Socket.io for real-time communication
- React team for the amazing framework
- MongoDB for the database
- Open source community

## 📞 Support

For issues and questions:
1. Check `MEETING_TROUBLESHOOTING.md`
2. Check `QUICK_START.md`
3. Open browser console for logs
4. Check backend terminal logs

## 🎉 Current Status

✅ **Fully Functional**
- Both servers running
- Video/audio working
- Multi-user support
- Camera/mic controls
- Modern UI/UX
- Comprehensive logging

🚀 **Ready to Use**
Open http://localhost:5175/ and start your first meeting!

---

Made with ❤️ using React, Node.js, and WebRTC
