const darkModeToggle = document.getElementById('darkModeToggle');
const confirmation = document.getElementById('confirmation');
const searchInput = document.getElementById('song-search');
const searchResults = document.getElementById('search-results');

darkModeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
});

function showConfirmation() {
  confirmation.classList.add('show');
  setTimeout(() => confirmation.classList.remove('show'), 2000);
}

async function fetchNowPlaying() {
  try {
    const response = await fetch('/now-playing');
    if (!response.ok) throw new Error('Failed to fetch Now Playing');
    const data = await response.json();
    document.getElementById('song-title').innerText = data.title || 'Nothing Playing';
    document.getElementById('artist').innerText = data.artist || '';
    document.getElementById('album-cover').src = data.albumArt || '';
  } catch (err) {
    console.error('Error fetching Now Playing:', err);
  }
}

async function fetchQueue() {
  try {
    const response = await fetch('/queue');
    if (!response.ok) throw new Error('Failed to fetch Queue');
    const data = await response.json();
    const queueList = document.getElementById('queue-list');
    queueList.innerHTML = '';
    data.forEach(track => {
      const img = document.createElement('img');
      img.src = track.albumArt;
      img.alt = track.name;
      queueList.appendChild(img);
    });
  } catch (err) {
    console.error('Error fetching Queue:', err);
  }
}

async function searchSongs(query) {
  if (!query) {
    searchResults.style.display = 'none';
    return;
  }
  try {
    const response = await fetch('/search?query=' + encodeURIComponent(query));
    if (!response.ok) throw new Error('Search failed');
    const data = await response.json();
    searchResults.innerHTML = '';
    data.forEach(track => {
      const div = document.createElement('div');
      div.textContent = `${track.name} - ${track.artist}`;
      div.addEventListener('click', async () => {
        await addSongToQueue(track.uri);
        searchResults.style.display = 'none';
        searchInput.value = '';
      });
      searchResults.appendChild(div);
    });
    searchResults.style.display = data.length > 0 ? 'block' : 'none';
  } catch (err) {
    console.error('Search error:', err);
  }
}

async function addSongToQueue(uri) {
  try {
    const response = await fetch('/add-to-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri })
    });
    if (response.ok) {
      showConfirmation();
    } else {
      console.error('Failed to add song to queue');
    }
  } catch (err) {
    console.error('Add-to-queue error:', err);
  }
}

searchInput.addEventListener('input', () => searchSongs(searchInput.value));

setInterval(() => {
  fetchNowPlaying();
  fetchQueue();
}, 10000);

fetchNowPlaying();
fetchQueue();
