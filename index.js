// Import express framework - used to create web server and handle HTTP requests
const express = require('express')

// Import express-session - used to manage user sessions (store data across requests)
const session = require('express-session')

// Import cookie-parser - used to parse and manage cookies in requests/responses
const cookieParser = require('cookie-parser')

// Import express-validator - used to validate and sanitize form inputs
const { check, validationResult } = require('express-validator')

// Import formidable - used to handle file uploads in forms
const formidable = require('formidable')

// Import path - used to work with file and directory paths
const path = require('path')

// Import fs (file system) - used to read/write files
const fs = require('fs')

// Import Pool from pg (PostgreSQL) - used to create database connection pool
const {Pool} = require('pg')

// Import axios - used to make HTTP requests to external APIs
const axios = require('axios')

// Create Express application instance - this is the main app object
const app = express()

// ===== POSTGRESQL DATABASE SETUP =====

// Create PostgreSQL connection pool with database credentials
const pool = new Pool({
    user: 'postgres',              // Database username
    host: 'localhost',             // Database host (local machine)
    database: 'express_db',        // Name of the database to connect to
    password: 'your_password',          // Database password
    port: 5432,                    // PostgreSQL default port
})

// Test the database connection by running a simple query
pool.query('SELECT NOW()', (err, res) => {
    // If there's an error, log it to console
    if(err){
        console.error('Database connection error:', err)
    } else{
        // If successful, log the current timestamp from database
        console.log('Database connected successfully:', res.rows[0])
    }
})

// Create database tables if they don't already exist
const createTables = async () => {
  try {
    // Create 'users' table with columns for user information
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        record_id SERIAL PRIMARY KEY,              -- Auto-incrementing unique identifier for each record
        user_id INTEGER NOT NULL,                  -- User's ID (can have multiple records per user_id)
        name VARCHAR(100) NOT NULL,                -- User's name (max 100 characters)
        email VARCHAR(100) NOT NULL,               -- User's email (max 100 characters)
        age INTEGER,                               -- User's age (optional)
        status VARCHAR(20) DEFAULT 'active',       -- Record status (active/updated/deleted)
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- When record was created
      )
    `)

    // Create 'orders2' table with columns for order information
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders2 (
        o_record_id SERIAL PRIMARY KEY,            -- Auto-incrementing unique identifier for each order record
        order_id INTEGER NOT NULL,                 -- Order's ID (can have multiple records per order_id)
        user_id INTEGER NOT NULL,                  -- Foreign key linking to users table
        product VARCHAR(255) NOT NULL,             -- Product name
        quantity INTEGER NOT NULL,                 -- Number of items ordered
        total_price DECIMAL(10, 2) NOT NULL,       -- Total price (10 digits, 2 decimal places)
        status VARCHAR(20) DEFAULT 'active',       -- Order status (active/cancelled/etc)
        order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- When order was created
      )
    `)

    // Log success message
    console.log('Tables created successfully')
  } catch (err) {
    // Log any errors that occur during table creation
    console.error('Error creating tables:', err)
  }
}

// Execute the createTables function to initialize database
createTables()

// ===== MIDDLEWARE SETUP =====

// Parse incoming JSON data in request body
app.use(express.json())

// Parse URL-encoded form data (extended: true allows rich objects and arrays)
app.use(express.urlencoded({ extended: true }))

// Parse cookies attached to client requests
app.use(cookieParser())

// Configure session middleware to store session data
app.use(session({
  secret: '343ji43j4n3jn4jk3n',   // Secret key to sign session ID cookie (prevent tampering)
  resave: false,                   // Don't save session if unmodified
  saveUninitialized: true          // Save new sessions even if not modified
}))

// Custom middleware to log all incoming requests
const loggerMiddleware = (req, res, next) => {
  // Log HTTP method, path, and timestamp for each request
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`)
  // Call next() to pass control to next middleware/route handler
  next()
}
// Apply logger middleware to all routes
app.use(loggerMiddleware)

// Serve static files (CSS, images, JS) from 'public' directory
app.use(express.static('public'))

// Helper function to get the latest active record for each user_id
async function getLatestActiveUsers() {
  // Query uses DISTINCT ON to get only one record per user_id (the latest one)
  const { rows } = await pool.query(`
    SELECT DISTINCT ON (user_id) record_id, user_id, name, email, age, status, created_at
    FROM users
    ORDER BY user_id, record_id DESC
  `)
  // Return array of user records
  return rows
}

// Helper function to get all orders ordered by newest first
async function getLatestActiveOrders() {
  // Query orders table and sort by record_id in descending order (newest first)
  const { rows } = await pool.query(`
    SELECT record_id, order_id, user_id, product, quantity, total_price, status, order_date
    FROM orders2
    ORDER BY record_id DESC
  `)
  // Return array of order records
  return rows
}

// Set Pug as the template engine for rendering HTML views
app.set('view engine', 'pug')

// Set the directory where template files are located
app.set('views', './views')

// ===== ROUTES =====

// Route: Home page - displays links to all features
app.get('/', (req, res) => {
  // Send HTML response with navigation links to all application features
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

// Route: Simple hello world demonstration
app.get('/hello', (req, res) => {
  // Send plain text response
  res.send('Hello World!')
})

// Route: Demonstrate URL parameters - :name and :age are dynamic parameters
app.get('/params/:name/:age', (req, res) => {
  // Extract name and age from URL parameters using destructuring
  const { name, age } = req.params
  // Send HTML showing extracted parameters and query string
  res.send(`
    <h1>Request Parameters</h1>
    <p>Name: ${name}</p>
    <p>Age: ${age}</p>
    <p>Query string: ${JSON.stringify(req.query)}</p>
    <p>Try: /params/John/25?city=NYC</p>
  `)
})

// Route: Demonstrate different response types with status codes
app.get('/response-types', (req, res) => {
  // Send response with HTTP status 200 (OK) and HTML content
  res.status(200).send('<h1>Response with status 200</h1>')
})

// Route: Send empty response (only headers, no body)
app.get('/empty-response', (req, res) => {
  // End response without sending any data
  res.end()
})

// Route: Demonstrate 404 Not Found status code
app.get('/not-found-demo', (req, res) => {
  // Send 404 status with error message
  res.status(404).send('File not found')
})

// Route: Send JSON response (common for APIs)
app.get('/json', (req, res) => {
  // Convert JavaScript object to JSON and send as response
  res.json({ 
    username: 'Flavio',
    age: 30,
    skills: ['JavaScript', 'Node.js', 'Express']
  })
})

// Route: Demonstrate cookie management
app.get('/cookies', (req, res) => {
  // Set a simple cookie (username=Flavio)
  res.cookie('username', 'Flavio')
  // Set cookie with expiration time (maxAge in milliseconds = 15 minutes)
  res.cookie('theme', 'dark', { maxAge: 900000 })
  // Send HTML showing current cookies from request
  res.send(`
    <h1>Cookies Set!</h1>
    <p>Current cookies: ${JSON.stringify(req.cookies)}</p>
    <a href="/clear-cookies">Clear Cookies</a>
  `)
})

// Route: Clear all cookies
app.get('/clear-cookies', (req, res) => {
  // Delete username cookie from browser
  res.clearCookie('username')
  // Delete theme cookie from browser
  res.clearCookie('theme')
  // Send confirmation message
  res.send('<h1>Cookies Cleared!</h1><a href="/cookies">Go Back</a>')
})

// Route: Demonstrate HTTP headers manipulation
app.get('/headers', (req, res) => {
  // Read User-Agent header from incoming request
  const userAgent = req.header('User-Agent')
  // Set custom header in response
  res.set('X-Custom-Header', 'MyValue')
  // Set content type to HTML
  res.type('html')
  // Send HTML showing user agent
  res.send(`
    <h1>HTTP Headers</h1>
    <p>Your User-Agent: ${userAgent}</p>
    <p>Check response headers in DevTools!</p>
  `)
})

// Route: Demonstrate temporary redirect (302)
app.get('/redirect-example', (req, res) => {
  // Redirect user to /hello route
  res.redirect('/hello')
})

// Route: Demonstrate permanent redirect (301)
app.get('/permanent-redirect', (req, res) => {
  // Redirect with 301 status (tells browsers to cache the redirect)
  res.redirect(301, '/hello')
})

// Route: Demonstrate regex-based routing - matches any path containing 'post'
app.get(/post/, (req, res) => {
  // Send response showing matched path
  res.send(`<h1>Regex Route Matched!</h1><p>Path: ${req.path}</p>`)
})

// Route: Demonstrate template rendering with Pug
app.get('/template', (req, res) => {
  // Render 'about.pug' template with data passed to it
  res.render('about', { 
    name: 'Flavio',                          // Variable accessible in template
    title: 'Template Demo',                  // Another variable for template
    items: ['Item 1', 'Item 2', 'Item 3']   // Array passed to template
  })
})

// Custom middleware that adds data to request object
const specificMiddleware = (req, res, next) => {
  // Initialize locals object if it doesn't exist
  req.locals = req.locals || {}
  // Add custom data to request object
  req.locals.customData = 'Data from middleware'
  // Call next() to continue to route handler
  next()
}

// Route: Demonstrate route-specific middleware usage
app.get('/middleware-demo', specificMiddleware, (req, res) => {
  // Access data that was added by middleware
  res.send(`
    <h1>Middleware Demo</h1>
    <p>Data passed from middleware: ${req.locals.customData}</p>
  `)
})

// Route: Demonstrate file download
app.get('/download', (req, res) => {
  // Define file path using path.join to ensure cross-platform compatibility
  const filePath = path.join(__dirname, 'sample.txt')
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    // If not, create sample file with content
    fs.writeFileSync(filePath, 'This is a sample file for download.')
  }
  // Send file as download with custom filename
  res.download(filePath, 'downloaded-file.txt', (err) => {
    // Handle any errors during download
    if (err) {
      res.status(500).send('Error downloading file')
    }
  })
})

// Route: Demonstrate session management
app.get('/session-demo', (req, res) => {
  // Check if views counter exists in session
  if (req.session.views) {
    // Increment counter if it exists
    req.session.views++
  } else {
    // Initialize counter if it doesn't exist
    req.session.views = 1
  }
  // Store username in session
  req.session.username = 'SessionUser'
  
  // Display session data
  res.send(`
    <h1>Session Demo</h1>
    <p>Views: ${req.session.views}</p>
    <p>Username: ${req.session.username}</p>
    <a href="/session-demo">Refresh to increment</a>
  `)
})

// Route: Display validation form
app.get('/validation-form', (req, res) => {
  // Send HTML form for validation demonstration
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

// Route: Handle form validation
app.post('/validate', [
  // Validation rule: name must be at least 3 characters
  check('name').isLength({ min: 3 }).withMessage('Name must be at least 3 characters'),
  // Validation rule: email must be valid email format
  check('email').isEmail().withMessage('Must be a valid email'),
  // Validation rule: age must be numeric
  check('age').isNumeric().withMessage('Age must be numeric')
], (req, res) => {
  // Get validation results
  const errors = validationResult(req)
  // If there are validation errors
  if (!errors.isEmpty()) {
    // Return 422 status with error details
    return res.status(422).json({ errors: errors.array() })
  }
  
  // If validation passes, extract form data
  const { name, email, age } = req.body
  // Send success response
  res.send(`
    <h1>Validation Passed!</h1>
    <p>Name: ${name}</p>
    <p>Email: ${email}</p>
    <p>Age: ${age}</p>
  `)
})

// Route: Display sanitization form
app.get('/sanitization-form', (req, res) => {
  // Send HTML form with potentially unsafe data to demonstrate sanitization
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

// Route: Handle data sanitization
app.post('/sanitize', [
  // Sanitization: remove whitespace from beginning/end and escape HTML characters
  check('name').trim().escape(),
  // Sanitization: convert email to lowercase and remove dots from Gmail addresses
  check('email').normalizeEmail(),
  // Sanitization: remove whitespace and escape HTML to prevent XSS attacks
  check('comment').trim().escape()
], (req, res) => {
  // Extract sanitized data
  const { name, email, comment } = req.body
  // Display sanitized results
  res.send(`
    <h1>Sanitized Data</h1>
    <p>Name: ${name}</p>
    <p>Email: ${email}</p>
    <p>Comment: ${comment}</p>
  `)
})

// Route: Display regular form
app.get('/regular-form', (req, res) => {
  // Send basic HTML form
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

// Route: Handle regular form submission
app.post('/submit-form', (req, res) => {
  // Extract form data from request body
  const { username, password } = req.body
  // Display form data (password masked for security)
  res.send(`
    <h1>Form Submitted</h1>
    <p>Username: ${username}</p>
    <p>Password: ${'*'.repeat(password.length)}</p>
  `)
})

// Route: Display file upload form
app.get('/file-upload-form', (req, res) => {
  // Send HTML form with enctype for file uploads
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

// Route: Handle file upload
app.post('/upload-file', (req, res) => {
  // Create new formidable form instance to parse multipart data
  const form = new formidable.IncomingForm()
  
  // Parse the incoming form data
  form.parse(req, (err, fields, files) => {
    // Handle parsing errors
    if (err) {
      return res.status(500).send('Error uploading file')
    }
    
    // Extract uploaded file object
    const file = files.document
    // Display file information
    res.send(`
      <h1>File Uploaded!</h1>
      <p>File name: ${file.originalFilename}</p>
      <p>File size: ${file.size} bytes</p>
      <p>File type: ${file.mimetype}</p>
      <p>Description: ${fields.description}</p>
    `)
  })
})

// ===== POSTGRESQL ROUTES =====

// Route: View all users (shows latest active record per user_id)
app.get('/db/users', async (req, res) => {
  try {
    // Fetch all latest active user records
    const users = await getLatestActiveUsers()
    // Generate HTML table displaying all users
    res.send(`
      <link rel="stylesheet" href="/css/style.css">
      <h1>All Users</h1>
      <table border="1" cellpadding="10">
        <tr><th>Record ID</th><th>User ID</th><th>Name</th><th>Email</th><th>Age</th><th>Status</th><th>Created At</th><th>Actions</th></tr>
        ${users.map(user => `
          <tr>
            <td>${user.record_id}</td>
            <td>${user.user_id}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.age}</td>
            <td>${user.status}</td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td>
              <a href="/db/users/${user.user_id}">View</a> | 
              <a href="/db/users/${user.user_id}/edit">Edit</a> | 
              <a href="/db/users/${user.user_id}/delete">Delete</a> |
              <a href="/db/users/${user.user_id}/history">History</a>
            </td>
          </tr>
        `).join('')}
      </table>
      <br><a href="/db/users/add">Add New User</a> | <a href="/">Home</a>
    `)
  } catch (err) {
    // Handle database errors
    res.status(500).send('Error: ' + err.message)
  }
})

// Route: Display add user form
app.get('/db/users/add', (req, res) => {
  // Send HTML form to add new user
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

// Route: Handle add user form submission
app.post('/db/users/add',[
  // Validate name has at least 2 characters
  check('name').isLength({ min: 2 }).withMessage('Name must have at least 2 characters'),
  // Validate email format
  check('email').isEmail().withMessage('Email must be valid'),
  // Validate age is non-negative integer
  check('age').isInt({ min: 0 }).withMessage('Age must be a non-negative integer'),
], async (req, res) => {
  // Extract form data
  const { name, email, age } = req.body
  try {
    // Get the highest user_id from database
    const { rows } = await pool.query('SELECT MAX(user_id) as max_id FROM users')
    // Generate new user_id by incrementing max (or start with 1 if no users)
    const newUserId = (rows[0].max_id || 0) + 1

    // Insert new user record into database
    await pool.query(
      `INSERT INTO users (user_id, name, email, age, status) VALUES ($1, $2, $3, $4, 'active')`,
      [newUserId, name, email, age]
    )
    // Redirect to users list page
    res.redirect('/db/users')
  } catch (err) {
    // Handle database errors
    res.status(500).send('Error: ' + err.message)
  }
})

// Route: View single user details
app.get('/db/users/:user_id', async (req, res) => {
  try {
    // Extract user_id from URL parameter
    const userId = req.params.user_id
    // Query database for latest record of this user
    const { rows } = await pool.query(
      `SELECT * FROM users WHERE user_id = $1 ORDER BY record_id DESC LIMIT 1`,
      [userId]
    )
    // If user not found, return 404
    if (rows.length === 0) return res.status(404).send('User not found')
    // Get first (and only) row
    const user = rows[0]
    // Display user details
    res.send(`
      <link rel="stylesheet" href="/css/style.css">
      <h1>User Details</h1>
      <p><strong>Record ID:</strong> ${user.record_id}</p>
      <p><strong>User ID:</strong> ${user.user_id}</p>
      <p><strong>Name:</strong> ${user.name}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Age:</strong> ${user.age}</p>
      <p><strong>Status:</strong> ${user.status}</p>
      <p><strong>Created:</strong> ${new Date(user.created_at).toLocaleString()}</p>
      <br>
      <a href="/db/users/${user.user_id}/edit">Edit</a> | 
      <a href="/db/users/${user.user_id}/delete">Delete</a> | 
      <a href="/db/users">Back</a>
    `)
  } catch (err) {
    // Handle database errors
    res.status(500).send('Error: ' + err.message)
  }
})

// Route: Display edit user form
app.get('/db/users/:user_id/edit',  async (req, res) => {
  try {
    // Extract user_id from URL
    const userId = req.params.user_id
    // Fetch latest user record
    const { rows } = await pool.query(
      `SELECT * FROM users WHERE user_id = $1 ORDER BY record_id DESC LIMIT 1`,
      [userId]
    )
    // If user not found, return 404
    if (rows.length === 0) return res.status(404).send('User not found')
    // Get user data
    const user = rows[0]
    // Send form pre-filled with current user data
    res.send(`
      <link rel="stylesheet" href="/css/style.css">
      <h1>Edit User</h1>
      <form method="POST" action="/db/users/${user.user_id}/edit">
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
    // Handle database errors
    res.status(500).send('Error: ' + err.message)
  }
})

// Route: Handle user update (creates new record with status='updated')
app.post('/db/users/:user_id/edit', [
  // Validate form inputs
  check('name').isLength({ min: 2 }).withMessage('Name must have at least 2 characters'),
  check('email').isEmail().withMessage('Email must be valid'),
  check('age').isInt({ min: 0 }).withMessage('Age must be a non-negative integer'),
], async (req, res) => {
  // Extract user_id from URL
  const userId = req.params.user_id
  // Extract updated data from form
  const { name, email, age } = req.body
  try {
    // Insert new record with same user_id but updated data and status='updated'
    // This maintains history of changes
    await pool.query(
      `INSERT INTO users (user_id, name, email, age, status)
       VALUES ($1, $2, $3, $4, 'updated')`,
      [userId, name, email, age]
    )
    // Redirect to users list
    res.redirect('/db/users')
  } catch (err) {
    // Handle database errors
    res.status(500).send('Error: ' + err.message)
  }
})

// Route: Delete user (creates new record with status='deleted')
app.get('/db/users/:user_id/delete', async (req, res) => {
  try {
    // Extract user_id from URL
    const userId = req.params.user_id
    // Fetch current user data
    const { rows } = await pool.query(
      `SELECT * FROM users WHERE user_id = $1 ORDER BY record_id DESC LIMIT 1`,
      [userId]
    )
    // If user not found, return 404
    if (rows.length === 0) return res.status(404).send('User not found')
    const user = rows[0]

    // Insert new record with status='deleted' to maintain history
    // Soft delete - data is not actually removed
    await pool.query(
      `INSERT INTO users (user_id, name, email, age, status)
       VALUES ($1, $2, $3, $4, 'deleted')`,
      [userId, user.name, user.email, user.age]
    )
    // Redirect to users list
    res.redirect('/db/users')
  } catch (err) {
    // Handle database errors
    res.status(500).send('Error: ' + err.message)
  }
})

// Route: View user history (all records for a user_id)
app.get('/db/users/:user_id/history', async (req, res) => {
  try {
    // Extract user_id from URL
    const userId = req.params.user_id
    // Validate user_id is a number
    if (isNaN(userId)) return res.status(400).send('Invalid user ID');
    // Fetch ALL records for this user_id (including updated/deleted)
    const { rows } = await pool.query(
      `SELECT record_id, user_id, name, email, age, status, created_at
       FROM users
       WHERE user_id = $1
       ORDER BY record_id DESC`,
      [userId]
    );
    // If no records found, return 404
    if (rows.length === 0) return res.status(404).send('User not found')

    // Group records by user_id (in this case all have same user_id)
    const grouped = rows.reduce((acc, user) => {
      // If user_id not in accumulator, create empty array
      if (!acc[user.user_id]) acc[user.user_id] = []
      // Add user record to array
      acc[user.user_id].push(user)
      return acc
    }, {})

    // Start building HTML table
    let html = `
      <link rel="stylesheet" href="/css/style.css">
      <h1>User History for User ID: ${userId}</h1>
      <table border="1" cellpadding="10">
        <tr>
          <th>Record ID</th>
          <th>Name</th>
          <th>Email</th>
          <th>Age</th>
          <th>Status</th>
          <th>Created At</th>
        </tr>
    `;

    // Loop through each record and add table row
    rows.forEach(user => {
      html += `
        <tr>
          <td>${user.record_id}</td>
          <td>${user.name}</td>
          <td>${user.email}</td>
          <td>${user.age}</td>
          <td>${user.status}</td>
          <td>${new Date(user.created_at).toLocaleString()}</td>
        </tr>
      `;
    });

    // Close table and add navigation links
    html += `
      </table>
      <br><a href="/db/users">Back to Users</a> | <a href="/">Home</a>
    `;

    // Send complete HTML response
    res.send(html);
  } catch (err) {
    // Handle database errors
    res.status(500).send('Error: ' + err.message);
  }
});

// Route: View all orders with user information
app.get('/db/orders', async (req, res) => {
  try {
    // Complex query: Join orders with users to show user names
    // Uses DISTINCT ON to get latest active record for each order_id
    const orders = await pool.query(`
      SELECT DISTINCT ON (o.user_id) o.o_record_id AS o_record_id, o.order_id, o.user_id, u.name AS user_name,
             o.product, o.quantity, o.total_price, o.status, o.order_date
      FROM (
        SELECT DISTINCT ON (order_id) o_record_id, order_id, user_id, product, quantity, total_price, status, order_date
        FROM orders2
        WHERE status = 'active'
        ORDER BY order_id, o_record_id DESC
      ) o
      JOIN (
        SELECT DISTINCT ON (user_id) record_id, user_id, name
        FROM users
        WHERE status = 'active'
        ORDER BY user_id, record_id DESC
      ) u ON o.user_id = u.user_id
      ORDER BY o.user_id, o.order_date DESC
    `)

    // Display orders in HTML table
    res.send(`
      <link rel="stylesheet" href="/css/style.css">
      <h1>All Orders</h1>
      <table border="1" cellpadding="10">
        <tr><th>O Record ID</th><th>Order ID</th><th>User ID</th><th>Product</th><th>Quantity</th><th>Total</th><th>Status</th><th>Date</th><th>History</th></tr>
        ${orders.rows.map(order => `
          <tr>
            <td>${order.o_record_id}</td>
            <td>${order.order_id}</td>
            <td>${order.user_id}</td>
            <td>${order.product}</td>
            <td>${order.quantity}</td>
            <td>${order.total_price}</td>
            <td>${order.status}</td>
            <td>${new Date(order.order_date).toLocaleDateString()}</td>
            <td>
              <a href="/db/orders/user/${order.user_id}/history">History</a>
            </td>

          </tr>
        `).join('')}
      </table>
      <br><a href="/db/orders/add">Create Order</a> | <a href="/">Home</a>
    `)
  } catch (err) {
    // Handle database errors
    res.status(500).send('Error: ' + err.message)
  }
})

// Route: Display add order form
app.get('/db/orders/add', async (req, res) => {
  try {
    // Use Promise.all to fetch users and countries concurrently (parallel execution)
    const [usersResult, countriesResponse] = await Promise.all([
      // Query 1: Fetch all users from database
      pool.query(`
        SELECT DISTINCT ON (user_id) user_id, name, record_id, status
        FROM users 
        ORDER BY user_id, record_id DESC
      `),
      // Query 2: Fetch countries from external API
      axios.get('https://restcountries.com/v3.1/all?fields=name').catch(apiError => {
            // If API fails, log error and return null instead of crashing
            console.error("Could not fetch countries from API:", apiError.message);
            return null; 
        })
    ]);
    
    // Filter out deleted users
    const users = usersResult.rows.filter(user => user.status !== 'deleted');
    // Initialize empty countries array
    let countries = [];

    // Check if API response is valid
    if (countriesResponse && Array.isArray(countriesResponse.data)) {
      // Sort countries alphabetically by common name
      countries = countriesResponse.data.sort((a, b) => 
        a.name.common.localeCompare(b.name.common)
      );
    } else {
        // Log if no country data received
        console.log("No country data received from API or the response was invalid.");
    }
    
    // Send HTML form with user dropdown and country dropdown
    res.send(`
      <link rel="stylesheet" href="/css/style.css">
      <h1>Create New Order</h1>
      <form method="POST" action="/db/orders/add">
        <label>User ID - User - Record ID:</label>
        <select name="user_id" required>
          ${users.map(user => `<option value="${user.user_id}">${user.user_id} - ${user.name} - ${user.record_id}</option>`).join('')}
        </select><br>
        
        <label>Country:</label>
        <select name="country" required>
            <option value="">-- Select a Country --</option>
            ${countries.map(country => `<option value="${country.name.common}">${country.name.common}</option>`).join('')}
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
    // Handle any errors
    res.status(500).send('Error: ' + err.message)
  }
})

// Route: Handle add order form submission
app.post('/db/orders/add',[
  // Validate user_id is an integer
  check('user_id').isInt().withMessage('User ID must be an integer'),
  // Validate product field is not empty
  check('product').notEmpty().withMessage('Product is required'),
  // Validate quantity is at least 1
  check('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  // Validate total_price is non-negative decimal
  check('total_price').isFloat({ min: 0 }).withMessage('Total price must be non-negative'),
], async (req, res) => {
  // Extract form data
  const { user_id, product, quantity, total_price } = req.body
  try {
    // Get highest order_id from database
    const { rows } = await pool.query('SELECT MAX(order_id) as max_id FROM orders2')
    // Generate new order_id by incrementing max
    const newOrderId = (rows[0].max_id || 0) + 1

    // Insert new order into database
    await pool.query(
      `INSERT INTO orders2 (order_id, user_id, product, quantity, total_price, status)
       VALUES ($1, $2, $3, $4, $5, 'active')`,
      [newOrderId, user_id, product, quantity, total_price]
    )
    // Redirect to orders list
    res.redirect('/db/orders')
  } catch (err) {
    // Handle database errors
    res.status(500).send('Error: ' + err.message)
  }
})

// Route: View order history for specific user
app.get('/db/orders/user/:user_id/history', async (req, res) => {
  try {
    // Extract user_id from URL parameter
    const userId = req.params.user_id;
    // Validate user_id is numeric
    if (isNaN(userId)) return res.status(400).send('Invalid user ID');

    // Fetch all orders for this user
    const { rows } = await pool.query(
      `SELECT o_record_id, order_id, product, quantity, total_price, status, order_date
       FROM orders2
       WHERE user_id = $1
       ORDER BY o_record_id DESC`,
      [userId]
    );
    // If no orders found, return 404
    if (rows.length === 0) return res.status(404).send('No orders found for this user');

    // Group orders by order_id
    const grouped = rows.reduce((acc, order) => {
      // If order_id not in accumulator, create empty array
      if (!acc[order.order_id]) acc[order.order_id] = [];
      // Add order to array
      acc[order.order_id].push(order);
      return acc;
    }, {});

    // Build HTML table
    let html = `
      <link rel="stylesheet" href="/css/style.css">
      <h1>Order History for User ID: ${userId}</h1>
      <table border="1" cellpadding="10">
        <tr>
          <th>O Record ID</th>
          <th>Order ID</th>
          <th>Product</th>
          <th>Quantity</th>
          <th>Total Price</th>
          <th>Status</th>
          <th>Order Date</th>
        </tr>
    `;

    // Add table row for each order
    rows.forEach(order => {
      html += `
        <tr>
          <td>${order.o_record_id}</td>
          <td>${order.order_id}</td>
          <td>${order.product}</td>
          <td>${order.quantity}</td>
          <td>${order.total_price}</td>
          <td>${order.status}</td>
          <td>${new Date(order.order_date).toLocaleString()}</td>
        </tr>
      `;
    });

    // Close table and add navigation links
    html += `
      </table>
      <br><a href="/db/orders">Back to Orders</a> | <a href="/">Home</a>
    `;

    // Send complete HTML
    res.send(html);
  } catch (err) {
    // Handle database errors
    res.status(500).send('Error: ' + err.message);
  }
});

// Route: Display search form
app.get('/db/search', (req, res) => {
  // Send search form HTML
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

// Route: Handle search and display results
app.get('/db/search/results', async (req, res) => {
  // Extract search query from URL query string
  const { query } = req.query
  try {
    // Search for users with names matching query (case-insensitive)
    // ILIKE is PostgreSQL's case-insensitive LIKE operator
    // %${query}% means query can appear anywhere in the name
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (user_id) record_id, user_id, name, email, age, status
      FROM users
      WHERE name ILIKE $1
      ORDER BY user_id, record_id DESC
    `, [`%${query}%`])

    // Display search results in table
    res.send(`
      <link rel="stylesheet" href="/css/style.css">
      <h1>Search Results for "${query}"</h1>
      <table border="1" cellpadding="10">
        <tr><th>Record ID</th><th>User ID</th><th>Name</th><th>Email</th><th>Age</th><th>Status</th></tr>
        ${rows.map(user => `
          <tr>
            <td>${user.record_id}</td>
            <td>${user.user_id}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.age}</td>
            <td>${user.status}</td>
          </tr>
        `).join('')}
      </table>
      <p>Found ${rows.length} user(s)</p>
      <br><a href="/db/search">New Search</a> | <a href="/">Home</a>
    `)
  } catch (err) {
    // Handle database errors
    res.status(500).send('Error: ' + err.message)
  }
})

// Route: Handle POST requests to /api/create
app.post('/api/create', (req, res) => {
  // Send JSON response indicating POST method was used
  res.json({ message: 'POST request' })
})

// Route: Handle PUT requests to /api/update
app.put('/api/update', (req, res) => {
  // Send JSON response indicating PUT method was used
  res.json({ message: 'PUT request' })
})

// Route: Handle DELETE requests to /api/delete
app.delete('/api/delete', (req, res) => {
  // Send JSON response indicating DELETE method was used
  res.json({ message: 'DELETE request' })
})

// Route: Handle PATCH requests to /api/patch
app.patch('/api/patch', (req, res) => {
  // Send JSON response indicating PATCH method was used
  res.json({ message: 'PATCH request' })
})

// 404 Handler - catches all unmatched routes
app.use((req, res) => {
  // Send 404 status with error message for any route not defined above
  res.status(404).send('<h1>404 - Page Not Found</h1><a href="/">Go Home</a>')
})

// Start the Express server
const PORT = 3000  // Define port number (3000 is common for development)
app.listen(PORT, () => {
  // Log message when server successfully starts
  console.log(`Server ready on http://localhost:${PORT}`)
})