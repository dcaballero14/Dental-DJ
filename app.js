const express = require('express');
const session = require('express-session');
const app = express();

// Middleware to handle sessions
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

// Middleware to parse form data
app.use(express.urlencoded({ extended: true })); // To parse form data from POST requests

// Serve static files from 'public' folder (e.g., CSS, images, JS)
app.use(express.static('public'));

// Define the port variable
const port = process.env.PORT || 10000; // Use dynamic port from environment or fallback to 10000

// Route to serve the homepage (index.html)
app.get('/', (req, res) => {
  if (req.session.accessToken) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.redirect('/login');
  }
});

// Route to serve the login page (login.html)
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// POST route to handle login form submission
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Hardcoded credentials for testing
  if (username === 'admin' && password === 'password123') {
    req.session.accessToken = 'your-access-token';  // Store the token in the session
    res.redirect('/');  // Redirect to home page after successful login
  } else {
    res.send('Invalid username or password.');
  }
});

// Start the server on the correct port
app.listen(port, () => {
  console.log(`✅ Server running at http://127.0.0.1:${port}`);
});


