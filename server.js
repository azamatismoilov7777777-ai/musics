const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const JWT_SECRET = 'vibestream-chat-secret-key-12345';
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use(express.static(__dirname));

// JWT Authentication Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: "Token topilmadi" });
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Yaroqsiz token" });
        req.user = user;
        next();
    });
}

// REST APIs
// 1. Auth routes
app.post('/api/auth/register', (req, res) => {
    const { email, username, password } = req.body;
    if (!email || !username || !password) {
        return res.status(400).json({ error: "Hamma maydonlarni to'ldiring!" });
    }
    
    const existing = db.getUser(username);
    if (existing) {
        return res.status(400).json({ error: "Bu username allaqachon band!" });
    }
    
    const newUser = db.createUser(email, username, password);
    if (!newUser) {
        return res.status(500).json({ error: "Xatolik yuz berdi" });
    }
    
    const token = jwt.sign({ username: newUser.username, email: newUser.email }, JWT_SECRET);
    res.json({ token, username: newUser.username, email: newUser.email });
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username va parolni kiriting!" });
    }
    
    const user = db.getUser(username);
    if (!user) {
        return res.status(400).json({ error: "Foydalanuvchi topilmadi!" });
    }
    
    if (user.passwordHash !== db.hashPassword(password)) {
        return res.status(400).json({ error: "Noto'g'ri parol!" });
    }
    
    const token = jwt.sign({ username: user.username, email: user.email }, JWT_SECRET);
    res.json({ token, username: user.username, email: user.email });
});

// 2. User search (Protected)
app.get('/api/users/search', authenticateToken, (req, res) => {
    const query = req.query.q || '';
    if (!query) return res.json(null);
    
    const user = db.getUser(query);
    if (user) {
        res.json({
            username: user.username,
            online: user.online,
            lastActive: user.lastActive
        });
    } else {
        res.json(null);
    }
});

// 3. Add Friend (Protected)
app.post('/api/users/add-friend', authenticateToken, (req, res) => {
    const { friendUsername } = req.body;
    const success = db.addFriend(req.user.username, friendUsername);
    if (success) {
        res.json({ success: true });
    } else {
        res.status(400).json({ error: "Do'st qo'shib bo'lmadi" });
    }
});

// 4. Get Conversations (Protected)
app.get('/api/conversations', authenticateToken, (req, res) => {
    const list = db.getConversations(req.user.username);
    res.json(list);
});

// 5. Get Messages (Protected)
app.get('/api/messages/:friendUsername', authenticateToken, (req, res) => {
    const list = db.getMessages(req.user.username, req.params.friendUsername);
    res.json(list);
});

// Online Sockets Dictionary
const activeSockets = {}; // username.toLowerCase() -> socketId

// Socket.IO Connection Middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error("Token topilmadi"));
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error("Yaroqsiz token"));
        socket.user = decoded;
        next();
    });
});

io.on('connection', (socket) => {
    const username = socket.user.username;
    console.log(`User connected: ${username}`);
    
    activeSockets[username.toLowerCase()] = socket.id;
    db.updateUserStatus(username, true);
    
    // Broadcast status change to all connected clients
    socket.broadcast.emit('statusUpdate', {
        username: username,
        online: true,
        lastActive: Date.now()
    });
    
    // Listen for private messages
    socket.on('privateMessage', ({ recipient, content, type, songId }) => {
        const savedMsg = db.saveMessage(username, recipient, content, type, songId);
        
        // Emits to sender socket
        socket.emit('message', savedMsg);
        
        // Emits to recipient socket if online
        const recipientSocketId = activeSockets[recipient.toLowerCase()];
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('message', savedMsg);
        }
    });

    // Listen for typing notifications
    socket.on('typing', ({ recipient, isTyping }) => {
        const recipientSocketId = activeSockets[recipient.toLowerCase()];
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('typing', {
                sender: username,
                isTyping
            });
        }
    });
    
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${username}`);
        delete activeSockets[username.toLowerCase()];
        db.updateUserStatus(username, false);
        
        // Broadcast status change to all connected clients
        io.emit('statusUpdate', {
            username: username,
            online: false,
            lastActive: Date.now()
        });
    });
});

server.listen(PORT, () => {
    console.log(`VibeStream Backend server running on http://localhost:${PORT}`);
});
