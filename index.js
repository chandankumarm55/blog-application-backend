const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer')
const uploadMiddlerware = multer({ dest: 'uploads/' })
const fs = require('fs')
const Post = require('./models/Post');
` `
dotenv.config();
const app = express();
app.use(cors({ credentials: true, origin: process.env.FrontEnd || '*' }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));


mongoose.connect(process.env.Mongo).then(() => {
    console.log("MongoDB connected");
}).catch(err => {
    console.error("MongoDB connection error:", err);
});

const saltRounds = 10;
const secret = 'dhfbsdjfbjdsfbjds';

app.post('/register', async(req, res) => {
    const { username, password } = req.body;
    try {
        const usernameExists = await User.findOne({ username });
        if (!usernameExists) {
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            const user = await User.create({
                username,
                password: hashedPassword
            });
            res.status(200).json({ requestData: user });
        } else {
            res.status(400).json({ message: 'Username already taken' });
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({ Error: error.message });
    }
});

app.post('/login', async(req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (user) {
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (passwordMatch) {
                jwt.sign({
                        username,
                        id: user._id
                    },
                    secret, {},
                    (err, token) => {
                        if (err) throw err;
                        res.cookie('token', token).json({ token, message: 'Login successful', user });
                    }
                );
            } else {
                res.status(401).json({ message: 'Incorrect username or password' });
            }
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/profile', (req, res) => {
    const { token } = req.cookies;
    jwt.verify(token, secret, {}, (err, info) => {

        if (err) throw err;
        res.json(info)
    })
    return res.json(req.cookies);
});


app.post('/logout', (req, res) => {
    res.cookie('token', '').json('ok')
})

app.post('/post', uploadMiddlerware.single('file'), async(req, res) => {
    try {
        const { originalname, path } = req.file;
        const parts = originalname.split('.');
        const ext = parts[parts.length - 1];
        const newPath = path + '.' + ext;
        fs.renameSync(path, newPath);

        const { token } = req.cookies;
        jwt.verify(token, secret, {}, async(err, info) => {
            if (err) {
                console.error('Error verifying token:', err);
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { title, summary, content } = req.body;

            const post = await Post.create({
                title,
                summary,
                content,
                cover: newPath,
                author: info.id,
            });

            res.json(post);
        });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.get('/post', async(req, res) => {
    try {
        const posts = await Post.find()
            .populate('author', ['username'])
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/post/:id', async(req, res) => {
    const { id } = req.params;
    post = await Post.findById(id).populate('author', ['username']);
    res.json({ post })
})

app.put('/post', uploadMiddlerware.single('file'), async(req, res) => {
    let newPath = ''
    if (req.file) {
        const { originalname, path } = req.file
        const parts = originalname.split('.');
        const ext = parts[parts.length - 1];
        newPath = path + '.' + ext;
        fs.renameSync(path, newPath);
    }
    const { token } = req.cookies;
    jwt.verify(token, secret, {}, async(err, info) => {
        if (err) throw err;
        const { id, title, summary, content } = req.body;
        const postDoc = await Post.findById(id);
        const isAuthor = postDoc.author == info.id;
        if (!isAuthor) {
            return res.status(400).json({ message: 'Your not a owner of this post' })
            throw 'Your not a owner of this post'
        }
        await postDoc.updateOne({
            title,
            summary,
            content,
            cover: newPath ? newPath : postDoc.cover
        })
        return res.json({ message: 'Updated Succsufulyy' })
    })

})

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server is running at Port Number ${port}`);
});
