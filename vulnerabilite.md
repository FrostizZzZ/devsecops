#Frontend
## Vulnérabilités trouvées

### 1. Faille XSS
// Dans frontend/src/App.js
'''js
const filtered = products.filter(p => {
  try {
    return eval(`p.name.toLowerCase().includes('${searchQuery}'.toLowerCase())`);
  } catch(e) {
    return false;
  }
});
'''

**Correction**
'''js
const filtered = products.filter(p =>
  p.name.toLowerCase().includes(searchQuery.toLowerCase())
);
'''

### 2. Clé API Stockée
// Dans frontend/src/App.js
'''js
const API_KEY = 'sk_live_41Hqp9K2eZvKYlo2C8xO3n4y5z6a7b8c9d0e1f2g3h4i5p';
'''

**Correction**

Stocker la clé coté server


### 3. Remote Code Execution côté navigateur

**Dans handleSearch() :**
'''js
return eval(`p.name.toLowerCase().includes('${searchQuery}'.toLowerCase())`);
'''

**Correction**
'''js
return p.name.toLowerCase().includes(searchQuery.toLowerCase());
'''

### 4. XSS permanente
'''js
dangerouslySetInnerHTML={{ __html: product.name }}
dangerouslySetInnerHTML={{ __html: review.comment }}
'''

**Correction**
Installer dompurify
'''js
import DOMPurify from "dompurify";
<h3 dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.name) }} />
'''

### 5. Logs sensibles dans la console

'''js
console.log('User data:', user);
console.log('API Key:', API_KEY);
console.log('JWT Token:', localStorage.getItem('token'));
'''
**Correction**
'''js
if (process.env.NODE_ENV === "development") {
  console.log('User data:', user);
}
'''


### 6. Stockage JWT non sécurisé dans localStorage

'''js
localStorage.setItem('token', data.token);
'''

**Correction**
'''js
const [token, setToken] = useState(null);
'''

#Backend
## Vulnérabilités trouvées

### 7. RCE

'''js
const searchCode = `db.products.filter(p => p.name.toLowerCase().includes('${query}'.toLowerCase()))`;
const results = eval(searchCode);
'''

**Correction**
'''js
const results = db.products.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase())
);
'''

### 8. Injection SQL

'''js
const query = `username = '${username}' AND password = '${password}'`;

const user = db.users.find(u => {
    if (username.includes("' OR '1'='1")) {
        return true;
    }
    return u.username === username && u.password === password;
});
'''

***Correction***
'''js
const bcrypt = require('bcrypt');

const hashedPassword = await bcrypt.hash(password, 10);
db.users.push({ username, password: hashedPassword, ... });

const user = db.users.find(u => u.username === username);
if (user && await bcrypt.compare(password, user.password)) {
}
'''

### 9. Path Traversal

'''js
const content = fs.readFileSync(`./uploads/${filename}`, 'utf8');
'''

***Correction***
'''js
const path = require('path');
const filePath = path.join(__dirname, 'uploads', path.basename(filename));
const content = fs.readFileSync(filePath, 'utf8');
'''

### 10. Debug endpoint

'''js
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
'''

***Correction***
Supprimer l'endpoint

### 11. JWT non expiré

'''js
app.use(session({
    secret: SESSION_SECRET,
    cookie: { secure: false, httpOnly: false }
}));
'''

***Correction***
'''js
app.use(session({
    secret: SESSION_SECRET,
    cookie: {
        secure: process.env.NODE_ENV === 'production', 
        httpOnly: true, 
        sameSite: 'Strict',
        maxAge: 24 * 60 * 60 * 1000 // 1 jour
    }
}));

const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
'''

### 12. Mots de passes stockés en clair

Les mots de passes sur la base de donnée sont stockés en clair

***Correction***
Mettre un hash sur les mots de passes de la base de donnée

### 13. CSRF

'''js
cors({
    origin: '*',
    credentials: true
})
'''

***Correction***
'''js
app.use(cors({
    origin: ['https://tonsite.com'],
    credentials: true
}));

'''js
cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "strict"
}
'''

### 14. Absence de vérification sur userId

'''js
const { userId, productId, quantity, creditCard } = req.body;
'''

***Correction***
'''js
if (!req.session.user) return res.status(403).json({error: "Not authenticated"});
}
'''


