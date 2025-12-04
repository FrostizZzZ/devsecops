
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5001;

const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

app.use(cors({
    origin: ['https://127.0.0.1:3000'],
    credentials: true
}));

cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "strict"
}

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production', 
        httpOnly: true, 
        sameSite: 'Strict',
        maxAge: 24 * 60 * 60 * 1000 
}));

const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });

// Connexion MongoDB (in-memory pour faciliter)
// En production, utiliser une vraie DB
const db = {};
db.users = [];
db.products = [];
db.orders = [];

// Données de test
db.users.push({
    id: 1,
    username: 'admin',
    email: 'admin@ecommerce.com',
    role: 'admin',
    apiKey: ADMIN_API_KEY,
    STRIPE_SECRET_KEY: STRIPE_SECRET_KEY
});

db.users.push({
    id: 2,
    username: 'user',
    password: 'user123',
    email: 'user@example.com',
    role: 'customer',
});

db.products = [
    { id: 1, name: 'Laptop HP', price: 799, stock: 10, category: 'electronics' },
    { id: 2, name: 'iPhone 14', price: 999, stock: 15, category: 'electronics' },
    { id: 3, name: 'T-Shirt Nike', price: 29, stock: 50, category: 'clothing' },
    { id: 4, name: 'Chaussures Adidas', price: 89, stock: 30, category: 'clothing' }
];

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

app.get('/api/products/search', (req, res) => {
    const query = req.query.q;

    try {
        const results = db.products.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase())
);
        res.json(results);
    } catch(e) {
        res.status(500).json({
            error: e.message,
        });
    }
});

app.post('/api/register', (req, res) => {
    const { username, password, email } = req.body;

    const newUser = {
        id: db.users.length + 1,
        username: username,
        password: password,
        email: email,
        role: 'customer'
    };
    
    db.users.push(newUser);
    
    res.json({
        success: true,
        message: 'Utilisateur créé',
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    const bcrypt = require('bcrypt');

    const hashedPassword = await bcrypt.hash(password, 10);
    db.users.push({ username, password: hashedPassword, ... });

    const user = db.users.find(u => u.username === username);
    if (user && await bcrypt.compare(password, user.password)) {
    }
    
    if (user) {
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                role: user.role
            },
            JWT_SECRET
        );
        
        req.session.user = user;
        
        res.json({
            success: true,
            token: token,
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'Identifiants incorrects'
        });
    }
});

app.get('/api/users', (req, res) => {
    res.json(db.users);
});

app.get('/api/users/:id', (req, res) => {
    const userId = req.params.id;

    const user = db.users.find(u => u.id == userId);

    if (user) {
        res.json(user);
    } else {
        res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
});

app.post('/api/products/:id/review', (req, res) => {
    const productId = parseInt(req.params.id);
    const { rating, comment } = req.body;

    const review = {
        id: Date.now(),
        productId: productId,
        rating: rating,
        comment: comment,
        date: new Date()
    };

    if (!db.reviews) db.reviews = [];
    db.reviews.push(review);

    res.json({
        success: true,
        review: review
    });
});

app.get('/api/products/:id/reviews', (req, res) => {
    const productId = parseInt(req.params.id);

    if (!db.reviews) db.reviews = [];

    const productReviews = db.reviews.filter(r => r.productId === productId);

    res.json(productReviews);
});

// Liste des produits
app.get('/api/products', (req, res) => {
    res.json(db.products);
});

app.post('/api/checkout', (req, res) => {
    const { userId, productId, quantity, creditCard } = req.body;

    const product = db.products.find(p => p.id == productId);
    
    if (!product) {
        return res.status(404).json({ message: 'Produit non trouvé' });
    }
    
    if (product.stock >= quantity) {
        product.stock -= quantity;
        
        const order = {
            id: db.orders.length + 1,
            userId: userId,
            productId: productId,
            quantity: quantity,
            total: product.price * quantity,
            date: new Date()
        };
        
        db.orders.push(order);
        
        res.json({
            success: true,
            order: order
        });
    } else {
        res.status(400).json({
            message: 'Stock insuffisant'
        });
    }
});

app.get('/api/admin/stats', (req, res) => {
    res.json({
        totalUsers: db.users.length,
        totalProducts: db.products.length,
        totalOrders: db.orders.length,
        users: db.users,
        orders: db.orders
    });
});

app.get('/api/files/:filename', (req, res) => {
    const filename = req.params.filename;
    const fs = require('fs');

    try {
        const path = require('path');
        const filePath = path.join(__dirname, 'uploads', path.basename(filename));
        const content = fs.readFileSync(filePath, 'utf8');
        res.send(content);
    } catch(e) {
        res.status(404).json({ message: 'Fichier non trouvé' });
    }
});

app.get('/api/debug', (req, res) => {
    res.json({
        env: process.env,
        secrets: {
            JWT_SECRET: JWT_SECRET,
            SESSION_SECRET: SESSION_SECRET,
            ADMIN_API_KEY: ADMIN_API_KEY,
            STRIPE_SECRET_KEY: STRIPE_SECRET_KEY
        },
        database: db
    });
});

// Route par défaut
app.get('/', (req, res) => {
    res.json({
        endpoints: [
            'GET /api/products',
            'GET /api/products/search?q=query',
            'POST /api/register',
            'POST /api/login',
            'GET /api/users',
            'GET /api/users/:id',
            'POST /api/products/:id/review',
            'POST /api/checkout',
            'GET /api/admin/stats',
            'GET /api/files/:filename',
            'GET /api/debug'
        ]
    });
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
