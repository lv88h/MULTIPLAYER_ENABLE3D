const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Connect to MongoDB
mongoose.connect('mongodb://localhost/3d_game_db', { useNewUrlParser: true, useUnifiedTopology: true });

// User model
const User = mongoose.model('User', {
    username: String,
    password: String,
    position: {
        x: Number,
        y: Number,
        z: Number
    }
});

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('register', async ({ username, password }) => {
        try {
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                socket.emit('registerResult', { success: false, message: 'Username already exists' });
            } else {
                const hashedPassword = await bcrypt.hash(password, 10);
                const newUser = new User({
                    username,
                    password: hashedPassword,
                    position: { x: 35, y: 0, z: 0 }
                });
                await newUser.save();
                socket.emit('registerResult', { success: true });
            }
        } catch (error) {
            console.error('Registration error:', error);
            socket.emit('registerResult', { success: false, message: 'Registration failed' });
        }
    });

    socket.on('login', async ({ username, password }) => {
        try {
            const user = await User.findOne({ username });
            if (user && await bcrypt.compare(password, user.password)) {
                socket.username = username;
                socket.emit('loginResult', { 
                    success: true, 
                    user: { username, position: user.position } 
                });
            } else {
                socket.emit('loginResult', { success: false, message: 'Invalid credentials' });
            }
        } catch (error) {
            console.error('Login error:', error);
            socket.emit('loginResult', { success: false, message: 'Login failed' });
        }
    });

    socket.on('savePosition', async (position) => {
        if (socket.username) {
            try {
                await User.findOneAndUpdate({ username: socket.username }, { position });
            } catch (error) {
                console.error('Save position error:', error);
            }
        }
    });
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
