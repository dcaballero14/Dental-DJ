const express = require('express');
const request = require('request');
const querystring = require('querystring');
const bodyParser = require('body-parser');
const path = require('path');

const CLIENT_ID = process.env.a10269c181e742ad940a2a76efee3ca1;
const CLIENT_SECRET = process.env.64e60604c70041afa0793f940f4311f3;
const REDIRECT_URI = process.env.https://dental-dj.onrender.com/callback || 'https://dental-dj.onrender.com/callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET env vars.");
}

let access_token = '';
let refresh_token = '';
let token_expiration = 0;

function isTokenExpired() {
  return Date.now() > token_expiration;
}

function refreshAccessToken(callback) {
  if (!refresh_token) {
    console.error('No refresh token available');
    return callback(new Error('No refresh token'));
  }
  const authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    headers: {
      'Authorization': 'Basic ' + (Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
    },
    json: true
  };
  console.log('Attempting to refresh Spotify access token...');
  request.post(authOptions, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      access_token = body.access_token;
      token_expiration = Date.now() + (body.expires_in * 1000);
      console.log('Access token refreshed successfully.');
      callback(null);
    } else {
      console.error('Error refreshing token:', error || body);
      callback(error || body);
    }
  });
}

app.get('/login', (req, res) => {
  const scope = 'user-read-playback-state user-modify-playback-state user-read-currently-playing';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: scope,
      redirect_uri: REDIRECT_URI
    }));
});

app.get('/callback', (req, res) => {
  const code = req.query.code || null;
  const authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
      code: code,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code'
    },
    headers: {
      'Authorization': 'Basic ' + (Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
    },
    json: true
  };

  request.post(authOptions, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      access_token = body.access_token;
      refresh_token = body.refresh_token;
      token_expiration = Date.now() + (body.expires_in * 1000);
      console.log('Spotify Auth Successful. Access Token received.');
      res.redirect('/');
    } else {
      console.error('Spotify Auth Failed:', error || body);
      res.send('Authentication failed!');
    }
  });
});

function ensureValidToken(req, res, next) {
  if (!access_token) return res.status(401).json({ error: 'No access token. Login at /login' });
  if (isTokenExpired()) {
    console.log('Access token expired. Refreshing...');
    refreshAccessToken((err) => {
      if (err) return res.status(401).json({ error: 'Failed to refresh token' });
      next();
    });
  } else {
    next();
  }
}

app.get('/now-playing', ensureValidToken, (req, res) => {
  const options = {
    url: 'https://api.spotify.com/v1/me/player/currently-playing',
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };
  request.get(options, (error, response, body) => {
    if (!error && response.statusCode === 200 && body.item) {
      res.json({
        title: body.item.name,
        artist: body.item.artists.map(a => a.name).join(', '),
        albumArt: body.item.album.images[0].url
      });
    } else {
      console.error('Now Playing Error:', error || body);
      res.json({ title: '', artist: '', albumArt: '' });
    }
  });
});

app.get('/queue', ensureValidToken, (req, res) => {
  const options = {
    url: 'https://api.spotify.com/v1/me/player/queue',
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };
  request.get(options, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      const queue = (body.queue || []).map(track => ({
        name: track.name,
        albumArt: track.album.images[0].url
      }));
      res.json(queue);
    } else {
      console.error('Queue Error:', error || body);
      res.json([]);
    }
  });
});

app.get('/search', ensureValidToken, (req, res) => {
  const query = req.query.query;
  if (!query) return res.json([]);
  const searchOptions = {
    url: `https://api.spotify.com/v1/search?type=track&limit=5&q=${encodeURIComponent(query)}`,
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };
  request.get(searchOptions, (error, response, body) => {
    if (!error && body.tracks && body.tracks.items.length > 0) {
      const results = body.tracks.items.map(track => ({
        name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        uri: track.uri
      }));
      res.json(results);
    } else {
      console.error('Search Error:', error || body);
      res.json([]);
    }
  });
});

app.post('/add-to-queue', ensureValidToken, (req, res) => {
  const uri = req.body.uri;
  if (!uri) return res.status(400).send('No track URI provided');

  const addOptions = {
    url: `https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(uri)}`,
    headers: { 'Authorization': 'Bearer ' + access_token },
    json: true
  };

  request.post(addOptions, (error, response, body) => {
    if (!error && (response.statusCode === 200 || response.statusCode === 204)) {
      console.log('Song added to queue:', uri);
      res.sendStatus(200);
    } else {
      console.error('Add-to-Queue Error:', error || body);
      res.sendStatus(400);
    }
  });
});

const PORT = process.env.PORT || 8888;
app.listen(PORT, () => {
  console.log(`Server running with REDIRECT_URI: ${REDIRECT_URI}`);
});
