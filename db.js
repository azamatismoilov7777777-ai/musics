const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_FILE = path.join(__dirname, 'db.json');

// SHA-256 password hashing
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Helper to load db
function loadDB() {
    if (!fs.existsSync(DB_FILE)) {
        // Initial DB structure
        const initial = {
            users: [
                { email: "azamat@gmail.com", username: "Azamatismoilov", passwordHash: hashPassword("1234"), friends: ["Murodbek", "Shahzod", "Malika"], online: false, lastActive: Date.now() },
                { email: "murod@gmail.com", username: "Murodbek", passwordHash: hashPassword("1234"), friends: ["Azamatismoilov"], online: false, lastActive: Date.now() },
                { email: "shahzod@gmail.com", username: "Shahzod", passwordHash: hashPassword("1234"), friends: ["Azamatismoilov"], online: false, lastActive: Date.now() },
                { email: "malika@gmail.com", username: "Malika", passwordHash: hashPassword("1234"), friends: ["Azamatismoilov"], online: false, lastActive: Date.now() }
            ],
            messages: []
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
        return initial;
    }
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error("DB Load error:", e);
        return { users: [], messages: [] };
    }
}

// Helper to save db
function saveDB(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("DB Save error:", e);
    }
}

module.exports = {
    hashPassword,
    
    getUser: (username) => {
        const db = loadDB();
        return db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    },
    
    createUser: (email, username, password) => {
        const db = loadDB();
        if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
            return null; // Username exists
        }
        const newUser = {
            email,
            username,
            passwordHash: hashPassword(password),
            friends: [],
            online: false,
            lastActive: Date.now()
        };
        db.users.push(newUser);
        saveDB(db);
        return newUser;
    },
    
    addFriend: (username, friendUsername) => {
        const db = loadDB();
        const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
        const friend = db.users.find(u => u.username.toLowerCase() === friendUsername.toLowerCase());
        if (!user || !friend) return false;
        
        if (!user.friends.some(f => f.toLowerCase() === friendUsername.toLowerCase())) {
            user.friends.push(friend.username);
        }
        if (!friend.friends.some(f => f.toLowerCase() === username.toLowerCase())) {
            friend.friends.push(user.username);
        }
        saveDB(db);
        return true;
    },
    
    saveMessage: (sender, receiver, content, type = "text", songId = null) => {
        const db = loadDB();
        const newMsg = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            sender,
            receiver,
            content,
            type,
            songId,
            timestamp: Date.now()
        };
        db.messages.push(newMsg);
        saveDB(db);
        return newMsg;
    },
    
    getMessages: (user1, user2) => {
        const db = loadDB();
        const u1 = user1.toLowerCase();
        const u2 = user2.toLowerCase();
        return db.messages.filter(m => 
            (m.sender.toLowerCase() === u1 && m.receiver.toLowerCase() === u2) ||
            (m.sender.toLowerCase() === u2 && m.receiver.toLowerCase() === u1)
        ).sort((a, b) => a.timestamp - b.timestamp);
    },
    
    updateUserStatus: (username, online) => {
        const db = loadDB();
        const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (user) {
            user.online = online;
            user.lastActive = Date.now();
            saveDB(db);
        }
    },
    
    getConversations: (username) => {
        const db = loadDB();
        const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (!user) return [];
        
        return user.friends.map(fName => {
            const friendObj = db.users.find(u => u.username.toLowerCase() === fName.toLowerCase());
            const messages = db.messages.filter(m => 
                (m.sender.toLowerCase() === username.toLowerCase() && m.receiver.toLowerCase() === fName.toLowerCase()) ||
                (m.sender.toLowerCase() === fName.toLowerCase() && m.receiver.toLowerCase() === username.toLowerCase())
            ).sort((a, b) => b.timestamp - a.timestamp); // latest first
            
            return {
                username: friendObj ? friendObj.username : fName,
                online: friendObj ? friendObj.online : false,
                lastActive: friendObj ? friendObj.lastActive : Date.now(),
                lastMessage: messages.length > 0 ? messages[0] : null
            };
        });
    }
};
