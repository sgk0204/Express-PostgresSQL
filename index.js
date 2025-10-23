const express = require('express')
const session = require('express-session')
const cookieParser = require('cookie-parser')
const { check, validationResult } = require('express-validator')
const formidable = require('formidable')
const path = require('path')
const fs = require('fs')
const {Pool} = require('pg')

const app = express()

// POSTGRESQL SETUP
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'express_db',
    password: 'yourpassword',
    port: 5432,
})

//Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if(err){
        console.error('Database connection error:', err)
    } else{
        console.log('Database connected successfully:', res.rows[0])
    }
})

// Create tables if they don't exist
const createTables = async () => {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        age INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders2 (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        product VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    console.log('Tables created successfully')
  } catch (err) {
    console.error('Error creating tables:', err)
  }
}

createTables()



// ===== MIDDLEWARE SETUP =====
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(session({
  secret: '343ji43j4n3jn4jk3n',
  resave: false,
  saveUninitialized: true
}))

// Custom middleware example
const loggerMiddleware = (req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`)
  next()
}
app.use(loggerMiddleware)

// Serve static files
app.use(express.static('public'))

// Set view engine for templates
app.set('view engine', 'pug')
app.set('views', './views')

// ===== ROUTES =====

// 1. HOME - Hello World
app.get('/', (req, res) => {
  res.send(`
    <h1>Express + PostgreSQL Complete Project</h1>
    <h2>All Topics Covered:</h2>
    <ul>
      <li><a href="/hello">1. Hello World</a></li>
      <li><a href="/params/John/25">2. Request Parameters (Named)</a></li>
      <li><a href="/response-types">3. Response Types</a></li>
      <li><a href="/json">4. JSON Response</a></li>
      <li><a href="/cookies">5. Manage Cookies</a></li>
      <li><a href="/headers">6. HTTP Headers</a></li>
      <li><a href="/redirect-example">7. Redirects</a></li>
      <li><a href="/regex-test">8. Regex Routing</a></li>
      <li><a href="/template">9. Templates (Pug)</a></li>
      <li><a href="/middleware-demo">10. Middleware Demo</a></li>
      <li><a href="/download">11. Send Files</a></li>
      <li><a href="/session-demo">12. Sessions</a></li>
      <li><a href="/validation-form">13. Validation Form</a></li>
      <li><a href="/sanitization-form">14. Sanitization Form</a></li>
      <li><a href="/regular-form">15. Handle Forms</a></li>
      <li><a href="/file-upload-form">16. File Upload</a></li>
    </ul>

    <h2>PostgreSQL Operations:</h2>
    <ul>
      <li><a href="/db/users">View All Users</a></li>
      <li><a href="/db/users/add">Add User</a></li>
      <li><a href="/db/orders">View All Orders</a></li>
      <li><a href="/db/orders/add">Create Order</a></li>
      <li><a href="/db/search">Search Users</a></li>
    </ul>
  `)
})

// 2. HELLO WORLD
app.get('/hello', (req, res) => {
  res.send('Hello World!')
})

// 3. REQUEST PARAMETERS (Named Parameters)
app.get('/params/:name/:age', (req, res) => {
  const { name, age } = req.params
  res.send(`
    <h1>Request Parameters</h1>
    <p>Name: ${name}</p>
    <p>Age: ${age}</p>
    <p>Query string: ${JSON.stringify(req.query)}</p>
    <p>Try: /params/John/25?city=NYC</p>
  `)
})

// 4. RESPONSE TYPES (send, end, status)
app.get('/response-types', (req, res) => {
  res.status(200).send('<h1>Response with status 200</h1>')
})

app.get('/empty-response', (req, res) => {
  res.end()
})

app.get('/not-found-demo', (req, res) => {
  res.status(404).send('File not found')
})

// 5. JSON RESPONSE
app.get('/json', (req, res) => {
  res.json({ 
    username: 'Flavio',
    age: 30,
    skills: ['JavaScript', 'Node.js', 'Express']
  })
})

// 6. MANAGE COOKIES
app.get('/cookies', (req, res) => {
  res.cookie('username', 'Flavio')
  res.cookie('theme', 'dark', { maxAge: 900000 })
  res.send(`
    <h1>Cookies Set!</h1>
    <p>Current cookies: ${JSON.stringify(req.cookies)}</p>
    <a href="/clear-cookies">Clear Cookies</a>
  `)
})

app.get('/clear-cookies', (req, res) => {
  res.clearCookie('username')
  res.clearCookie('theme')
  res.send('<h1>Cookies Cleared!</h1><a href="/cookies">Go Back</a>')
})

// 7. HTTP HEADERS
app.get('/headers', (req, res) => {
  const userAgent = req.header('User-Agent')
  res.set('X-Custom-Header', 'MyValue')
  res.type('html')
  res.send(`
    <h1>HTTP Headers</h1>
    <p>Your User-Agent: ${userAgent}</p>
    <p>Check response headers in DevTools!</p>
  `)
})

// 8. REDIRECTS
app.get('/redirect-example', (req, res) => {
  res.redirect('/hello')
})

app.get('/permanent-redirect', (req, res) => {
  res.redirect(301, '/hello')
})

// 9. ROUTING WITH REGEX
app.get(/post/, (req, res) => {
  res.send(`<h1>Regex Route Matched!</h1><p>Path: ${req.path}</p>`)
})

// 10. TEMPLATES (Pug)
app.get('/template', (req, res) => {
  res.render('about', { 
    name: 'Flavio',
    title: 'Template Demo',
    items: ['Item 1', 'Item 2', 'Item 3']
  })
})

// 11. MIDDLEWARE DEMO
const specificMiddleware = (req, res, next) => {
  req.locals = req.locals || {}
  req.locals.customData = 'Data from middleware'
  next()
}

app.get('/middleware-demo', specificMiddleware, (req, res) => {
  res.send(`
    <h1>Middleware Demo</h1>
    <p>Data passed from middleware: ${req.locals.customData}</p>
  `)
})

// 12. SEND FILES (Download)
app.get('/download', (req, res) => {
  // Create a sample file if it doesn't exist
  const filePath = path.join(__dirname, 'sample.txt')
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, 'This is a sample file for download.')
  }
  res.download(filePath, 'downloaded-file.txt', (err) => {
    if (err) {
      res.status(500).send('Error downloading file')
    }
  })
})

// 13. SESSIONS
app.get('/session-demo', (req, res) => {
  if (req.session.views) {
    req.session.views++
  } else {
    req.session.views = 1
  }
  req.session.username = 'SessionUser'
  
  res.send(`
    <h1>Session Demo</h1>
    <p>Views: ${req.session.views}</p>
    <p>Username: ${req.session.username}</p>
    <a href="/session-demo">Refresh to increment</a>
  `)
})

// 14. VALIDATION
app.get('/validation-form', (req, res) => {
  res.send(`
    <h1>Validation Form</h1>
    <form method="POST" action="/validate">
      <label>Name (min 3 chars):</label><br>
      <input type="text" name="name"><br><br>
      
      <label>Email:</label><br>
      <input type="text" name="email"><br><br>
      
      <label>Age (0-110):</label><br>
      <input type="text" name="age"><br><br>
      
      <input type="submit" value="Submit">
    </form>
  `)
})

app.post('/validate', [
  check('name').isLength({ min: 3 }).withMessage('Name must be at least 3 characters'),
  check('email').isEmail().withMessage('Must be a valid email'),
  check('age').isNumeric().withMessage('Age must be numeric')
], (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() })
  }
  
  const { name, email, age } = req.body
  res.send(`
    <h1>Validation Passed!</h1>
    <p>Name: ${name}</p>
    <p>Email: ${email}</p>
    <p>Age: ${age}</p>
  `)
})

// 15. SANITIZATION
app.get('/sanitization-form', (req, res) => {
  res.send(`
    <h1>Sanitization Form</h1>
    <form method="POST" action="/sanitize">
      <label>Name:</label><br>
      <input type="text" name="name" value="  John  "><br><br>
      
      <label>Email:</label><br>
      <input type="text" name="email" value="JOHN@EXAMPLE.COM"><br><br>
      
      <label>Comment (try HTML):</label><br>
      <textarea name="comment"><script>alert('xss')</script>Hello</textarea><br><br>
      
      <input type="submit" value="Submit">
    </form>
  `)
})

app.post('/sanitize', [
  check('name').trim().escape(),
  check('email').normalizeEmail(),
  check('comment').trim().escape()
], (req, res) => {
  const { name, email, comment } = req.body
  res.send(`
    <h1>Sanitized Data</h1>
    <p>Name: ${name}</p>
    <p>Email: ${email}</p>
    <p>Comment: ${comment}</p>
  `)
})

// 16. HANDLE FORMS
app.get('/regular-form', (req, res) => {
  res.send(`
    <h1>Regular Form</h1>
    <form method="POST" action="/submit-form">
      <label>Username:</label><br>
      <input type="text" name="username"><br><br>
      
      <label>Password:</label><br>
      <input type="password" name="password"><br><br>
      
      <input type="submit" value="Submit">
    </form>
  `)
})

app.post('/submit-form', (req, res) => {
  const { username, password } = req.body
  res.send(`
    <h1>Form Submitted</h1>
    <p>Username: ${username}</p>
    <p>Password: ${'*'.repeat(password.length)}</p>
  `)
})

// 17. FILE UPLOAD
app.get('/file-upload-form', (req, res) => {
  res.send(`
    <h1>File Upload Form</h1>
    <form method="POST" action="/upload-file" enctype="multipart/form-data">
      <label>Document:</label><br>
      <input type="file" name="document"><br><br>
      
      <label>Description:</label><br>
      <input type="text" name="description"><br><br>
      
      <input type="submit" value="Upload">
    </form>
  `)
})

app.post('/upload-file', (req, res) => {
  const form = new formidable.IncomingForm()
  
  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(500).send('Error uploading file')
    }
    
    const file = files.document
    res.send(`
      <h1>File Uploaded!</h1>
      <p>File name: ${file.originalFilename}</p>
      <p>File size: ${file.size} bytes</p>
      <p>File type: ${file.mimetype}</p>
      <p>Description: ${fields.description}</p>
    `)
  })
})

// POSTGRESQL ROUTES

// 1. VIEW ALL USERS (select)
app.get('/db/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY id')
    res.send(`
      <link rel="stylesheet" href="/css/style.css">
      <h1>All Users</h1>
      <table border="1" cellpadding="10">
        <tr><th>ID</th><th>Name</th><th>Email</th><th>Age</th><th>Created At</th><th>Actions</th></tr>
        ${result.rows.map(user => `
          <tr>
            <td>${user.id}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.age}</td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td>
              <a href="/db/users/${user.id}">View</a> | 
              <a href="/db/users/${user.id}/edit">Edit</a> | 
              <a href="/db/users/${user.id}/delete">Delete</a>
            </td>
          </tr>
        `).join('')}
      </table>
      <br><a href="/db/users/add">Add New User</a> | <a href="/">Home</a>
    `)
  } catch (err) {
    res.status(500).send('Error: ' + err.message)
  }
})

// 2. ADD USER FORM (INSERT)
app.get('/db/users/add', (req, res) => {
  res.send(`
    <link rel="stylesheet" href="/css/style.css">
    <h1>Add New User</h1>
    <form method="POST" action="/db/users/add">
      <label>Name:</label>
      <input type="text" name="name" required><br>
      
      <label>Email:</label>
      <input type="email" name="email" required><br>
      
      <label>Age:</label>
      <input type="number" name="age" required><br>
      
      <input type="submit" value="Add User">
    </form>
    <br><a href="/db/users">Back to Users</a>
  `)
})

app.post('/db/users/add', async (req, res) => {
  const { name, email, age } = req.body
  try {
    await pool.query(
      'INSERT INTO users (name, email, age) VALUES ($1, $2, $3)',
      [name, email, age]
    )
    res.redirect('/db/users')
  } catch (err) {
    res.status(500).send('Error: ' + err.message)
  }
})


// 3. VIEW SINGLE USER (SELECT with WHERE)
app.get('/db/users/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).send('User not found')
    }
    const user = result.rows[0]
    res.send(`
      <link rel="stylesheet" href="/css/style.css">
      <h1>User Details</h1>
      <p><strong>ID:</strong> ${user.id}</p>
      <p><strong>Name:</strong> ${user.name}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Age:</strong> ${user.age}</p>
      <p><strong>Created:</strong> ${new Date(user.created_at).toLocaleString()}</p>
      <br>
      <a href="/db/users/${user.id}/edit">Edit</a> | 
      <a href="/db/users/${user.id}/delete">Delete</a> | 
      <a href="/db/users">Back</a>
    `)
  } catch (err) {
    res.status(500).send('Error: ' + err.message)
  }
})

// 4. EDIT USER (UPDATE)
app.get('/db/users/:id/edit', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).send('User not found')
    }
    const user = result.rows[0]
    res.send(`
      <link rel="stylesheet" href="/css/style.css">
      <h1>Edit User</h1>
      <form method="POST" action="/db/users/${user.id}/edit">
        <label>Name:</label>
        <input type="text" name="name" value="${user.name}" required><br>
        
        <label>Email:</label>
        <input type="email" name="email" value="${user.email}" required><br>
        
        <label>Age:</label>
        <input type="number" name="age" value="${user.age}" required><br>
        
        <input type="submit" value="Update User">
      </form>
      <br><a href="/db/users">Cancel</a>
    `)
  } catch (err) {
    res.status(500).send('Error: ' + err.message)
  }
})

app.post('/db/users/:id/edit', async (req, res) => {
  const { name, email, age } = req.body
  try {
    await pool.query(
      'UPDATE users SET name = $1, email = $2, age = $3 WHERE id = $4',
      [name, email, age, req.params.id]
    )
    res.redirect('/db/users')
  } catch (err) {
    res.status(500).send('Error: ' + err.message)
  }
})

// 5. DELETE USER (DELETE)
app.get('/db/users/:id/delete', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id])
    res.redirect('/db/users')
  } catch (err) {
    res.status(500).send('Error: ' + err.message)
  }
})

// 6. VIEW ALL ORDERS (with join)
app.get('/db/orders', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT orders2.id, users.name as user_name, orders2.product as product_name, 
             orders2.quantity, orders2.total_price, orders2.order_date
      FROM orders2
      JOIN users ON orders2.user_id = users.id
      ORDER BY orders2.order_date DESC
    `)
    res.send(`
      <link rel="stylesheet" href="/css/style.css">
      <h1>All Orders</h1>
      <table border="1" cellpadding="10">
        <tr><th>ID</th><th>User</th><th>Product</th><th>Quantity</th><th>Total</th><th>Date</th></tr>
        ${result.rows.map(order => `
          <tr>
            <td>${order.id}</td>
            <td>${order.user_name}</td>
            <td>${order.product_name}</td>
            <td>${order.quantity}</td>
            <td>$${order.total_price}</td>
            <td>${new Date(order.order_date).toLocaleDateString()}</td>
          </tr>
        `).join('')}
      </table>
      <br><a href="/db/orders/add">Create Order</a> | <a href="/">Home</a>
    `)
  } catch (err) {
    res.status(500).send('Error: ' + err.message)
  }
})


// 7. CREATE ORDER 
app.get('/db/orders/add', async (req, res) => {
  try {
    const users = await pool.query('SELECT * FROM users')
    res.send(`
      <link rel="stylesheet" href="/css/style.css">
      <h1>Create New Order</h1>
      <form method="POST" action="/db/orders/add">
        <label>User:</label>
        <select name="user_id" required>
          ${users.rows.map(user => `<option value="${user.id}">${user.name}</option>`).join('')}
        </select><br>
        
        <label>Product:</label>
        <input type="text" name="product" required><br>
        
        <label>Quantity:</label>
        <input type="number" name="quantity" min="1" required><br>
        
        <label>Total Price:</label>
        <input type="number" step="0.01" name="total_price" min="0" required><br>
        
        <input type="submit" value="Create Order">
      </form>
      <br><a href="/db/orders">Back</a>
    `)
  } catch (err) {
    res.status(500).send('Error: ' + err.message)
  }
})

app.post('/db/orders/add', async (req, res) => {
  const { user_id, product, quantity, total_price } = req.body
  try {
    await pool.query(
      'INSERT INTO orders2 (user_id, product, quantity, total_price) VALUES ($1, $2, $3, $4)',
      [user_id, product, quantity, total_price]
    )
    res.redirect('/db/orders')
  } catch (err) {
    res.status(500).send('Error: ' + err.message)
  }
})

// 8. SEARCH USERS (LIKE query)
app.get('/db/search', (req, res) => {
  res.send(`
    <link rel="stylesheet" href="/css/style.css">
    <h1>Search Users</h1>
    <form method="GET" action="/db/search/results">
      <label>Search by name:</label>
      <input type="text" name="query" required>
      <input type="submit" value="Search">
    </form>
    <br><a href="/">Home</a>
  `)
})

app.get('/db/search/results', async (req, res) => {
  const { query } = req.query
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE name ILIKE $1',
      [`%${query}%`]
    )
    res.send(`
      <link rel="stylesheet" href="/css/style.css">
      <h1>Search Results for "${query}"</h1>
      <table border="1" cellpadding="10">
        <tr><th>ID</th><th>Name</th><th>Email</th><th>Age</th></tr>
        ${result.rows.map(user => `
          <tr>
            <td>${user.id}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.age}</td>
          </tr>
        `).join('')}
      </table>
      <p>Found ${result.rows.length} user(s)</p>
      <br><a href="/db/search">New Search</a> | <a href="/">Home</a>
    `)
  } catch (err) {
    res.status(500).send('Error: ' + err.message)
  }
})


app.post('/api/create', (req, res) => {
  res.json({ message: 'POST request' })
})

app.put('/api/update', (req, res) => {
  res.json({ message: 'PUT request' })
})

app.delete('/api/delete', (req, res) => {
  res.json({ message: 'DELETE request' })
})

app.patch('/api/patch', (req, res) => {
  res.json({ message: 'PATCH request' })
})

// 404 Handler
app.use((req, res) => {
  res.status(404).send('<h1>404 - Page Not Found</h1><a href="/">Go Home</a>')
})

// START SERVER
const PORT = 3000
app.listen(PORT, () => {
  console.log(`Server ready on http://localhost:${PORT}`)
})