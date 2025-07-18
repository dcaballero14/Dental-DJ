const express = require('express');
const path = require('path');
const axios = require('axios');
const session = require('express-session');
const app = express();

// Spotify credentials - Replace with your actual Spotify credentials
const clientId = 'a10269c181e742ad940a2a76efee3ca1';  // Replace with your actual Spotify Client ID
const clientSecret = '64e60604c70041afa0793f940f4311f3';  // Replace with your actual Spotify Client Secret
const redirectUri = 'https://dental-dj.onrender.com/callback';  // Ensure this matches exactly in Spotify Developer Dashboard

// Define the port variable (use environment variable for production or fallback to 10000)
const port = process.env.PORT || 10000;

// Middleware for session handling
app.use(session({
  secret: 'your-secret-key',  // Keep this secret safe for production
  resave: false,
  saveUninitialized: true
}));

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));

// Serve static files from 'public' folder (e.g., CSS, images, JS)
app.use(express.static('public'));

// Route to serve the homepage (index.html)
app.get('/', (req, res) => {
  console.log('Session Access Token:', req.session.accessToken);  // Debugging: log the access token stored in session
  if (req.session.accessToken) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));  // Serve the main interface if the access token is set
  } else {
    res.redirect('/login');  // Redirect to login page if there's no access token
  }
});

// Route to serve the login page (login.html)
app.get('/login', (req, res) => {
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=user-read-playback-state user-read-currently-playing`;
  res.redirect(authUrl);  // Redirect to Spotify for login
});

// Callback route after successful login with Spotify
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  console.log('Received code:', code);  // Debugging: log the received code

  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded'
  };
  const body = `grant_type=authorization_code&code=${code}&redirect_uri=${redirectUri}&client_id=${clientId}&client_secret=${clientSecret}`;

  try {
    const response = await axios.post(tokenUrl, body, { headers });
    const { access_token, refresh_token } = response.data;
    console.log('Access token received:', access_token);  // Debugging: log the access token

    req.session.accessToken = access_token;  // Store the access token in session
    req.session.refreshToken = refresh_token; // Store the refresh token in session
    res.redirect('/');  // Redirect to home page after successful login
  } catch (error) {
    console.error('Error fetching access token', error);
    res.status(500).send('Authentication failed');
  }
});

// /now_playing route - Get currently playing track
app.get('/now_playing', async (req, res) => {
  const accessToken = req.session.accessToken;

  if (!accessToken) {
    return res.status(401).send('Unauthorized');
  }

  try {
    const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (response.data && response.data.item) {
      const track = response.data.item;
      res.json({
        isPlaying: true,
        name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        albumArt: track.album.images[0]?.url || ''
      });
    } else {
      res.json({ isPlaying: false });
    }
  } catch (error) {
    console.error('Error fetching currently playing track', error);
    res.status(500).send('Failed to fetch currently playing track');
  }
});

// /search route - Search for a song
app.get('/search', async (req, res) => {
  const { query, accessToken } = req.query;

  try {
    const response = await axios.get(`https://api.spotify.com/v1/search`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      params: {
        q: query,
        type: 'track',
        limit: 5
      }
    });
    res.json(response.data.tracks.items);
  } catch (error) {
    console.error('Error searching tracks', error);
    res.status(500).send('Failed to search for tracks');
  }
});

// /add_to_queue route - Add a track to the queue
app.get('/add_to_queue', async (req, res) => {
  const { trackUri, accessToken } = req.query;

  try {
    await axios.post(`https://api.spotify.com/v1/me/player/queue?uri=${trackUri}`, {}, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    res.send({ status: 'success' });
  } catch (error) {
    console.error('Error adding track to queue', error);
    res.status(500).send('Failed to add track to queue');
  }
});

// Error handling middleware (catch any unhandled routes)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// Start the server on the correct port
app.listen(port, () => {
  console.log(`✅ Server is running at http://127.0.0.1:${port}`);
});


