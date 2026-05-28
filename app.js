/* ==========================================================================
   VibeStream JavaScript Application Logic - Real Music Integration (iTunes Search API)
   ========================================================================== */

// --- 1. DYNAMIC CATEGORIES & POPULAR ARTISTS ---

// --- JSONP HELPER FOR CORS-BYPASS TO ITUNES ---
function fetchJsonp(url, callbackName) {
    return new Promise((resolve, reject) => {
        const uniqueCallback = callbackName + "_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
        
        window[uniqueCallback] = (data) => {
            resolve(data);
            cleanup();
        };

        const script = document.createElement("script");
        script.src = url + (url.indexOf("?") >= 0 ? "&" : "?") + "callback=" + uniqueCallback;
        script.id = uniqueCallback;
        script.onerror = (err) => {
            reject(err);
            cleanup();
        };

        document.body.appendChild(script);

        function cleanup() {
            delete window[uniqueCallback];
            const el = document.getElementById(uniqueCallback);
            if (el) el.remove();
        }
    });
}

// --- 1. MOCK ARTISTS DATABASE ---
const MOCK_ARTISTS = [
    {
        id: "art_eminem",
        name: "Eminem",
        listeners: "77,051,641 monthly listeners",
        image: "https://images.unsplash.com/photo-1601921004897-b7d582836990?q=80&w=400&auto=format&fit=crop",
        banner: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=1200&auto=format&fit=crop",
        verified: true
    },
    {
        id: "art_weeknd",
        name: "The Weeknd",
        listeners: "112,403,912 monthly listeners",
        image: "https://images.unsplash.com/photo-1598387181032-a3103a2db5b3?q=80&w=400&auto=format&fit=crop",
        banner: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=1200&auto=format&fit=crop",
        verified: true
    },
    {
        id: "art_billie",
        name: "Billie Eilish",
        listeners: "68,241,894 monthly listeners",
        image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=400&auto=format&fit=crop",
        banner: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?q=80&w=1200&auto=format&fit=crop",
        verified: true
    },
    {
        id: "art_miyagi",
        name: "Miyagi & Andy Panda",
        listeners: "8,924,103 monthly listeners",
        image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=400&auto=format&fit=crop",
        banner: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop",
        verified: true
    },
    {
        id: "art_ladygaga",
        name: "Lady Gaga",
        listeners: "55,201,394 monthly listeners",
        image: "https://images.unsplash.com/photo-1571315570376-791722880c85?q=80&w=400&auto=format&fit=crop",
        banner: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?q=80&w=1200&auto=format&fit=crop",
        verified: true
    },
    {
        id: "art_lanadelrey",
        name: "Lana Del Rey",
        listeners: "49,384,102 monthly listeners",
        image: "https://images.unsplash.com/photo-1526218626217-dc65a29bb444?q=80&w=400&auto=format&fit=crop",
        banner: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=1200&auto=format&fit=crop",
        verified: true
    },
    {
        id: "art_jony",
        name: "JONY",
        listeners: "5,831,042 monthly listeners",
        image: "https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=400&auto=format&fit=crop",
        banner: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1200&auto=format&fit=crop",
        verified: true
    }
];

// --- 2. GLOBAL STATE ---
let state = {
    currentUser: null, // { username: string, email: string }
    registeredUsers: [
        { email: "azamat@gmail.com", username: "Azamatismoilov", password: "1234" },
        { email: "murod@gmail.com", username: "Murodbek", password: "1234" },
        { email: "shahzod@gmail.com", username: "Shahzod", password: "1234" },
        { email: "malika@gmail.com", username: "Malika", password: "1234" }
    ],
    playlists: [], // { id, name, owner, songs: [] }
    friends: [
        { username: "Murodbek", isOnline: true, chatHistory: [] },
        { username: "Shahzod", isOnline: false, chatHistory: [] },
        { username: "Malika", isOnline: true, chatHistory: [] }
    ],
    playlistCounter: 0,
    activeView: "home", // home, search, artist, playlist, chat
    historyViews: ["home"],
    historyIndex: 0,
    
    // Song dynamic mapping cache
    songCache: {}, // songId -> songObject

    // Dynamic Lists loaded from iTunes
    homeLists: {
        trending: [],
        chill: [],
        workout: [],
        uzbek: [],
        newReleases: [],
        focus: []
    },
    
    // Auth Modal state
    authMode: "signup", // signup or login
    authTempEmail: "",
    authGeneratedOtp: "",

    // Active details views
    activeArtist: null,
    activePlaylist: null,
    activeChatFriend: null,

    // Song sharing
    songToShare: null,

    // Audio Playback
    playback: {
        currentSong: null,
        isPlaying: false,
        volume: 80,
        isMuted: false,
        isShuffle: false,
        isRepeat: false,
        queue: [], // Current view's playable songs
        queueIndex: -1
    }
};

// --- 3. DOM ELEMENTS ---
const el = {
    // Views
    viewHome: document.getElementById("view-home"),
    viewSearch: document.getElementById("view-search"),
    viewArtist: document.getElementById("view-artist"),
    viewPlaylist: document.getElementById("view-playlist"),
    viewChat: document.getElementById("view-chat"),
    viewContainer: document.getElementById("view-container"),

    // Navigation
    btnHome: document.getElementById("btn-home"),
    btnBack: document.getElementById("btn-back"),
    btnForward: document.getElementById("btn-forward"),
    globalSearchInput: document.getElementById("global-search-input"),
    clearSearchBtn: document.getElementById("clear-search-btn"),
    logoHome: document.getElementById("logo-home"),

    // Auth containers
    authLoggedOut: document.getElementById("auth-logged-out"),
    authLoggedIn: document.getElementById("auth-logged-in"),
    userDisplayName: document.getElementById("user-display-name"),
    btnUserMenu: document.getElementById("btn-user-menu"),
    userDropdown: document.getElementById("user-dropdown"),
    btnLogout: document.getElementById("btn-logout"),

    // Sidebar Playlists & Friends
    playlistsContainer: document.getElementById("playlists-container"),
    friendsContainer: document.getElementById("friends-container"),
    btnCreatePlaylist: document.getElementById("btn-create-playlist"),
    btnToggleFindFriend: document.getElementById("btn-toggle-find-friend"),
    friendSearchBox: document.getElementById("friend-search-box"),
    inputSearchFriend: document.getElementById("input-search-friend"),
    btnCloseFriendSearch: document.getElementById("btn-close-friend-search"),
    friendSearchResults: document.getElementById("friend-search-results"),

    // Lists in home view
    trendingSongsList: document.getElementById("trending-songs-list"),
    popularArtistsList: document.getElementById("popular-artists-list"),
    chillVibesList: document.getElementById("chill-vibes-list"),
    workoutList: document.getElementById("workout-list"),
    uzbekVibeList: document.getElementById("uzbek-vibe-list"),
    newReleasesList: document.getElementById("new-releases-list"),
    focusStudyList: document.getElementById("focus-study-list"),

    // Artist View elements
    artistProfileName: document.getElementById("artist-profile-name"),
    artistProfileListeners: document.getElementById("artist-profile-listeners"),
    artistBanner: document.getElementById("artist-banner"),
    artistPopularSongsList: document.getElementById("artist-popular-songs-list"),
    btnPlayArtist: document.getElementById("btn-play-artist"),
    btnFollowArtist: document.getElementById("btn-follow-artist"),

    // Playlist View elements
    playlistTitleDisplay: document.getElementById("playlist-title-display"),
    playlistOwner: document.getElementById("playlist-owner"),
    playlistSongsCount: document.getElementById("playlist-songs-count"),
    playlistSongsList: document.getElementById("playlist-songs-list"),
    playlistSongSearchInput: document.getElementById("playlist-song-search-input"),
    playlistSearchResults: document.getElementById("playlist-search-results"),
    btnPlayPlaylist: document.getElementById("btn-play-playlist"),
    btnDeletePlaylist: document.getElementById("btn-delete-playlist"),
    playlistCoverArt: document.getElementById("playlist-cover-art-container"),

    // Chat View elements
    chatFriendName: document.getElementById("chat-friend-name-premium"),
    chatMessagesContainer: document.getElementById("chat-messages-container-premium"),
    chatMessageInput: document.getElementById("chat-message-input-premium"),
    btnSendMessage: document.getElementById("btn-send-message-premium"),
    btnCloseChat: document.getElementById("btn-close-chat-premium"),

    // Bottom Player elements
    audio: document.getElementById("main-audio-element"),
    playerSongImg: document.getElementById("player-song-img"),
    playerSongTitle: document.getElementById("player-song-title"),
    playerSongArtist: document.getElementById("player-song-artist"),
    btnPlayerAddPlaylist: document.getElementById("btn-player-add-playlist"),
    btnPlayerShare: document.getElementById("btn-player-share"),
    
    btnShuffle: document.getElementById("btn-shuffle"),
    btnPrev: document.getElementById("btn-prev"),
    btnPlayPause: document.getElementById("btn-play-pause"),
    btnNext: document.getElementById("btn-next"),
    btnRepeat: document.getElementById("btn-repeat"),
    
    playerCurrentTime: document.getElementById("player-current-time"),
    playerDuration: document.getElementById("player-duration"),
    playerProgress: document.getElementById("player-progress"),
    playerProgressFill: document.getElementById("player-progress-fill"),
    
    btnMute: document.getElementById("btn-mute"),
    playerVolume: document.getElementById("player-volume"),
    playerVolumeFill: document.getElementById("player-volume-fill"),
    btnToggleFullscreen: document.getElementById("btn-toggle-fullscreen"),
    btnToggleQueue: document.getElementById("btn-toggle-queue"),

    // Expanded Fullscreen Player
    expandedPlayer: document.getElementById("expanded-player-view"),
    btnCloseExpanded: document.getElementById("btn-close-expanded"),
    expandedSongImg: document.getElementById("expanded-song-img"),
    expandedSongTitle: document.getElementById("expanded-song-title"),
    expandedSongArtist: document.getElementById("expanded-song-artist"),
    expandedCreditArtist: document.getElementById("expanded-credit-artist"),
    expandedCreditWriters: document.getElementById("expanded-credit-writers"),
    expandedCreditProducers: document.getElementById("expanded-credit-producers"),
    expandedQueueNextTitle: document.getElementById("expanded-queue-next-title"),
    expandedQueueNextArtist: document.getElementById("expanded-queue-next-artist"),
    
    expandedCurrentTime: document.getElementById("expanded-current-time"),
    expandedDuration: document.getElementById("expanded-duration"),
    expandedProgress: document.getElementById("expanded-progress"),
    expandedProgressFill: document.getElementById("expanded-progress-fill"),
    
    expandedBtnShuffle: document.getElementById("expanded-btn-shuffle"),
    expandedBtnPrev: document.getElementById("expanded-btn-prev"),
    expandedBtnPlayPause: document.getElementById("expanded-btn-play-pause"),
    expandedBtnNext: document.getElementById("expanded-btn-next"),
    expandedBtnRepeat: document.getElementById("expanded-btn-repeat"),

    // Modals
    modalOverlay: document.getElementById("modal-overlay"),
    authModal: document.getElementById("auth-modal"),
    authModalTitle: document.getElementById("auth-modal-title"),
    btnCloseAuthModal: document.getElementById("btn-close-auth-modal"),
    btnOpenSignup: document.getElementById("btn-open-signup"),
    btnOpenLogin: document.getElementById("btn-open-login"),
    
    authContainerSignup: document.getElementById("auth-container-signup"),
    authContainerLogin: document.getElementById("auth-container-login"),
    
    signupEmailInput: document.getElementById("signup-email"),
    signupEmailError: document.getElementById("signup-email-error"),
    signupUsernameInput: document.getElementById("signup-username"),
    signupUsernameError: document.getElementById("signup-username-error"),
    signupPasswordInput: document.getElementById("signup-password"),
    signupPasswordError: document.getElementById("signup-password-error"),
    btnSubmitSignup: document.getElementById("btn-submit-signup"),
    
    loginUsernameInput: document.getElementById("login-username"),
    loginUsernameError: document.getElementById("login-username-error"),
    loginPasswordInput: document.getElementById("login-password"),
    loginPasswordError: document.getElementById("login-password-error"),
    btnSubmitLogin: document.getElementById("btn-submit-login"),
    
    authFooterPrompt: document.getElementById("auth-footer-prompt"),
    btnToggleAuthMode: document.getElementById("btn-toggle-auth-mode"),
    
    renamePlaylistModal: document.getElementById("rename-playlist-modal"),
    inputPlaylistRename: document.getElementById("input-playlist-rename"),
    btnCancelRename: document.getElementById("btn-cancel-rename"),
    btnSaveRename: document.getElementById("btn-save-rename"),
    
    shareSongModal: document.getElementById("share-song-modal"),
    shareSongCover: document.getElementById("share-song-cover"),
    shareSongTitle: document.getElementById("share-song-title"),
    shareSongArtist: document.getElementById("share-song-artist"),
    shareFriendsListContainer: document.getElementById("share-friends-list-container"),
    btnCloseShare: document.getElementById("btn-close-share"),
    
    notificationContainer: document.getElementById("notification-container")
};

// --- 4. TOAST NOTIFICATIONS ---
function showToast(message, duration = 6000) {
    const toast = document.createElement("div");
    toast.className = "toast-msg";
    toast.innerHTML = `<i class="fa-solid fa-bell"></i> <span>${message}</span>`;
    
    el.notificationContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add("fadeOut");
        setTimeout(() => toast.remove(), 500);
    }, duration);
}

// --- 5. LOCALSTORAGE PERSISTENCE ---
function saveToLocalStorage() {
    localStorage.setItem("vibestream_registered_users", JSON.stringify(state.registeredUsers));
    localStorage.setItem("vibestream_playlists", JSON.stringify(state.playlists));
    localStorage.setItem("vibestream_friends", JSON.stringify(state.friends));
    localStorage.setItem("vibestream_playlist_counter", state.playlistCounter);
    if (state.currentUser) {
        localStorage.setItem("vibestream_current_user", JSON.stringify(state.currentUser));
        // Async sync user profile data to kvdb
        syncCurrentUserToServer();
    } else {
        localStorage.removeItem("vibestream_current_user");
    }
}

async function loadFromLocalStorage() {
    const registered = localStorage.getItem("vibestream_registered_users");
    if (registered) state.registeredUsers = JSON.parse(registered);

    const pl = localStorage.getItem("vibestream_playlists");
    if (pl) state.playlists = JSON.parse(pl);

    const fr = localStorage.getItem("vibestream_friends");
    if (fr) state.friends = JSON.parse(fr);

    const counter = localStorage.getItem("vibestream_playlist_counter");
    if (counter) state.playlistCounter = parseInt(counter);

    const user = localStorage.getItem("vibestream_current_user");
    if (user) {
        state.currentUser = JSON.parse(user);
        updateAuthUI();
        // Initialize socket and conversations with Node.js server
        initSocketConnection();
        fetchConversations();
    }
}

// --- 6. NAVIGATION & VIEW SWITCHING ---
function navigateTo(viewName) {
    el.viewHome.classList.add("hidden");
    el.viewSearch.classList.add("hidden");
    el.viewArtist.classList.add("hidden");
    el.viewPlaylist.classList.add("hidden");
    el.viewChat.classList.add("hidden");

    el.btnHome.classList.remove("active");

    if (viewName === "home") {
        el.viewHome.classList.remove("hidden");
        el.btnHome.classList.add("active");
    } else if (viewName === "search") {
        el.viewSearch.classList.remove("hidden");
    } else if (viewName === "artist") {
        el.viewArtist.classList.remove("hidden");
        renderArtistProfile();
    } else if (viewName === "playlist") {
        el.viewPlaylist.classList.remove("hidden");
        renderPlaylistView();
    } else if (viewName === "chat") {
        el.viewChat.classList.remove("hidden");
        renderChatView();
    }

    if (viewName === "chat") {
        startChatPolling();
    } else {
        stopChatPolling();
    }

    state.activeView = viewName;

    if (state.historyViews[state.historyIndex] !== viewName) {
        state.historyViews = state.historyViews.slice(0, state.historyIndex + 1);
        state.historyViews.push(viewName);
        state.historyIndex = state.historyViews.length - 1;
    }
    updateNavButtons();
}

function updateNavButtons() {
    el.btnBack.disabled = state.historyIndex <= 0;
    el.btnForward.disabled = state.historyIndex >= state.historyViews.length - 1;
}

el.btnBack.addEventListener("click", () => {
    if (state.historyIndex > 0) {
        state.historyIndex--;
        const view = state.historyViews[state.historyIndex];
        navigateToViewDirect(view);
    }
});

el.btnForward.addEventListener("click", () => {
    if (state.historyIndex < state.historyViews.length - 1) {
        state.historyIndex++;
        const view = state.historyViews[state.historyIndex];
        navigateToViewDirect(view);
    }
});

function navigateToViewDirect(viewName) {
    el.viewHome.classList.add("hidden");
    el.viewSearch.classList.add("hidden");
    el.viewArtist.classList.add("hidden");
    el.viewPlaylist.classList.add("hidden");
    el.viewChat.classList.add("hidden");

    el.btnHome.classList.remove("active");

    if (viewName === "home") {
        el.viewHome.classList.remove("hidden");
        el.btnHome.classList.add("active");
    } else if (viewName === "search") {
        el.viewSearch.classList.remove("hidden");
    } else if (viewName === "artist") {
        el.viewArtist.classList.remove("hidden");
        renderArtistProfile();
    } else if (viewName === "playlist") {
        el.viewPlaylist.classList.remove("hidden");
        renderPlaylistView();
    } else if (viewName === "chat") {
        el.viewChat.classList.remove("hidden");
        renderChatView();
    }

    if (viewName === "chat") {
        startChatPolling();
    } else {
        stopChatPolling();
    }

    state.activeView = viewName;
    updateNavButtons();
}

// --- 7. UTILITY: DYNAMIC COLOR FROM STRING ---
function getRandomMutedColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 50%, 15%)`;
}

// --- 8. ITUNES SEARCH API INTEGRATION MAPPING ---
function mapItunesTrack(track) {
    const coverUrl = track.artworkUrl100 ? track.artworkUrl100.replace("100x100bb.jpg", "500x500bb.jpg") : "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=400&auto=format&fit=crop";
    const durationSec = Math.floor(track.trackTimeMillis / 1000) || 180;
    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;
    const durationStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    
    const trackId = "itunes_" + track.trackId;
    return {
        id: trackId,
        title: track.trackName,
        artist: track.artistName,
        artistId: "art_" + encodeURIComponent(track.artistName),
        album: track.collectionName || "Single",
        duration: durationStr,
        durationSec: durationSec,
        plays: (Math.floor(Math.random() * 900 + 100) * 100000).toLocaleString(),
        cover: coverUrl,
        audioUrl: track.previewUrl,
        bgColor: getRandomMutedColor(track.trackName + track.artistName),
        credits: {
            artist: track.artistName,
            writers: track.artistName + " Team",
            producers: track.primaryGenreName || "Universal Music Group"
        }
    };
}

function fetchTracksFromItunes(query, limit = 20) {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=${limit}`;
    return fetchJsonp(url, "itunesCallback")
        .then(data => {
            if (data && data.results) {
                const mapped = data.results.map(mapItunesTrack);
                mapped.forEach(song => {
                    state.songCache[song.id] = song;
                });
                return mapped;
            }
            return [];
        })
        .catch(err => {
            console.error("iTunes fetch error for query:", query, err);
            return [];
        });
}

// --- 9. DYNAMIC LOADING ON STARTUP ---
function loadHomeContent() {
    // Show loaders
    const loader = `<div style="padding: 20px; color: var(--text-grey);"><i class="fa-solid fa-spinner fa-spin"></i> Yuklanmoqda...</div>`;
    el.trendingSongsList.innerHTML = loader;
    el.chillVibesList.innerHTML = loader;
    el.workoutList.innerHTML = loader;
    el.uzbekVibeList.innerHTML = loader;
    el.newReleasesList.innerHTML = loader;
    el.focusStudyList.innerHTML = loader;

    // Load Popular Artists (static cards)
    el.popularArtistsList.innerHTML = MOCK_ARTISTS.map(artist => `
        <div class="music-card artist-card" data-artist-id="${artist.id}">
            <div class="card-img-wrapper">
                <img src="${artist.image}" alt="${artist.name}">
                <button class="card-play-btn" data-artist-id="${artist.id}"><i class="fa-solid fa-play"></i></button>
            </div>
            <h4 class="card-title">${artist.name}</h4>
            <p class="card-desc">Artist</p>
        </div>
    `).join('');

    document.querySelectorAll(".artist-card").forEach(card => {
        card.addEventListener("click", () => {
            const artistId = card.getAttribute("data-artist-id");
            state.activeArtist = MOCK_ARTISTS.find(a => a.id === artistId);
            navigateTo("artist");
        });
    });

    // Parallel fetch from iTunes
    Promise.all([
        // 1. Trending: mix of Russian rap, Miyagi & hits
        fetchTracksFromItunes("Miyagi Endspiel", 10),
        // 2. Chill Vibes
        fetchTracksFromItunes("Lofi Chill Beats", 10),
        // 3. Workout Energy
        fetchTracksFromItunes("Gym Workout Power Hits", 10),
        // 4. Uzbek Vibe (Sevara Nazarkhan & Uzbek hits)
        fetchTracksFromItunes("Sevara Nazarkhan", 10),
        // 5. New Releases
        fetchTracksFromItunes("Pop Hits 2026", 10),
        // 6. Focus & Study
        fetchTracksFromItunes("Focus Study lofi acoustic", 10)
    ]).then(([trending, chill, workout, uzbek, newReleases, focus]) => {
        state.homeLists.trending = trending;
        state.homeLists.chill = chill;
        state.homeLists.workout = workout;
        state.homeLists.uzbek = uzbek;
        state.homeLists.newReleases = newReleases;
        state.homeLists.focus = focus;

        renderShelfList(el.trendingSongsList, trending);
        renderShelfList(el.chillVibesList, chill);
        renderShelfList(el.workoutList, workout);
        renderShelfList(el.uzbekVibeList, uzbek);
        renderShelfList(el.newReleasesList, newReleases);
        renderShelfList(el.focusStudyList, focus);
    });
}

function renderShelfList(container, songs) {
    if (songs.length === 0) {
        container.innerHTML = `<div style="padding: 20px; color: var(--text-grey);">Tarmoq xatosi yoki qo'shiqlar topilmadi.</div>`;
        return;
    }

    container.innerHTML = songs.map(song => `
        <div class="music-card song-card" data-song-id="${song.id}">
            <div class="card-img-wrapper">
                <img src="${song.cover}" alt="${song.title}">
                <button class="card-play-btn" data-song-id="${song.id}"><i class="fa-solid fa-play"></i></button>
            </div>
            <h4 class="card-title">${song.title}</h4>
            <p class="card-desc">${song.artist}</p>
        </div>
    `).join('');

    // Attach click events
    container.querySelectorAll(".song-card").forEach(card => {
        card.addEventListener("click", (e) => {
            const songId = card.getAttribute("data-song-id");
            if (e.target.closest(".card-play-btn")) {
                e.stopPropagation();
                // Set the current shelf as the queue
                state.playback.queue = songs;
                state.playback.queueIndex = songs.findIndex(s => s.id === songId);
                playSongById(songId);
            } else {
                state.playback.queue = songs;
                state.playback.queueIndex = songs.findIndex(s => s.id === songId);
                playSongById(songId);
                openExpandedPlayer();
            }
        });
    });
}


// --- 10. AUTHENTICATION MODULE ---
const KVDB_BUCKET = "vibestream_db_v3";
const KVDB_BASE = `https://kvdb.io/${KVDB_BUCKET}`;

// Helper: PUT to KVDB
async function kvdbPut(key, data) {
    try {
        const response = await fetch(`${KVDB_BASE}/${key}`, {
            method: "POST", // POST acts as upsert on kvdb.io
            body: JSON.stringify(data)
        });
        return response.ok;
    } catch (e) {
        console.error("KVDB Put Error:", e);
        return false;
    }
}

// Helper: GET from KVDB
async function kvdbGet(key) {
    try {
        const response = await fetch(`${KVDB_BASE}/${key}`);
        if (!response.ok) return null;
        const text = await response.text();
        return JSON.parse(text);
    } catch (e) {
        console.error("KVDB Get Error:", e);
        return null;
    }
}

// Helper: Sync current user's profile to server
async function syncCurrentUserToServer() {
    if (!state.currentUser) return;
    const userData = {
        email: state.currentUser.email,
        username: state.currentUser.username,
        password: state.currentUser.password,
        playlists: state.playlists,
        friends: state.friends
    };
    await kvdbPut(`user_${state.currentUser.username.toLowerCase()}`, userData);
}

function updateAuthUI() {
    if (state.currentUser) {
        el.authLoggedOut.classList.add("hidden");
        el.authLoggedIn.classList.remove("hidden");
        el.userDisplayName.textContent = state.currentUser.username;
        renderFriendsList();
    } else {
        el.authLoggedOut.classList.remove("hidden");
        el.authLoggedIn.classList.add("hidden");
        el.friendsContainer.innerHTML = `<div class="sidebar-item" style="color: var(--text-grey); font-size:13px; cursor:default; justify-content:center;">Do'stlar uchun tizimga kiring</div>`;
    }
}

function openAuthModal(mode = "signup") {
    state.authMode = mode;
    el.authModal.classList.remove("hidden");
    el.modalOverlay.classList.remove("hidden");
    
    // Hide both containers initially
    el.authContainerSignup.classList.add("hidden");
    el.authContainerLogin.classList.add("hidden");
    
    // Hide error messages
    el.signupEmailError.classList.add("hidden");
    el.signupUsernameError.classList.add("hidden");
    el.signupPasswordError.classList.add("hidden");
    el.loginUsernameError.classList.add("hidden");
    el.loginPasswordError.classList.add("hidden");
    
    // Clear values
    el.signupEmailInput.value = "";
    el.signupUsernameInput.value = "";
    el.signupPasswordInput.value = "";
    el.loginUsernameInput.value = "";
    el.loginPasswordInput.value = "";

    if (mode === "signup") {
        el.authModalTitle.textContent = "Sign up to start listening";
        el.authContainerSignup.classList.remove("hidden");
        el.authFooterPrompt.textContent = "Already have an account?";
        el.btnToggleAuthMode.textContent = "Log in";
    } else {
        el.authModalTitle.textContent = "Log in to VibeStream";
        el.authContainerLogin.classList.remove("hidden");
        el.authFooterPrompt.textContent = "Don't have an account?";
        el.btnToggleAuthMode.textContent = "Sign up";
    }
}

function closeAuthModal() {
    el.authModal.classList.add("hidden");
    el.modalOverlay.classList.add("hidden");
}

el.btnOpenSignup.addEventListener("click", () => openAuthModal("signup"));
el.btnOpenLogin.addEventListener("click", () => openAuthModal("login"));
el.btnCloseAuthModal.addEventListener("click", closeAuthModal);
el.modalOverlay.addEventListener("click", () => {
    closeAuthModal();
    el.renamePlaylistModal.classList.add("hidden");
    el.shareSongModal.classList.add("hidden");
});

el.btnToggleAuthMode.addEventListener("click", () => {
    if (state.authMode === "signup") {
        openAuthModal("login");
    } else {
        openAuthModal("signup");
    }
});

el.btnSubmitSignup.addEventListener("click", async () => {
    const email = el.signupEmailInput.value.trim();
    const username = el.signupUsernameInput.value.trim();
    const password = el.signupPasswordInput.value.trim();
    
    let hasError = false;
    
    if (!email || !email.includes("@")) {
        el.signupEmailError.textContent = "Iltimos, to'g'ri email kiriting!";
        el.signupEmailError.classList.remove("hidden");
        hasError = true;
    } else {
        el.signupEmailError.classList.add("hidden");
    }
    
    if (!username || username.length < 3) {
        el.signupUsernameError.textContent = "Username kamida 3 ta belgidan iborat bo'lsin!";
        el.signupUsernameError.classList.remove("hidden");
        hasError = true;
    } else {
        el.signupUsernameError.classList.add("hidden");
    }
    
    if (!password || password.length < 4) {
        el.signupPasswordError.textContent = "Parol kamida 4 ta belgidan iborat bo'lsin!";
        el.signupPasswordError.classList.remove("hidden");
        hasError = true;
    } else {
        el.signupPasswordError.classList.add("hidden");
    }
    
    if (hasError) return;
    
    showToast("Ro'yxatdan o'tkazilmoqda...");
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, password })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem("vibestream_token", data.token);
            
            state.currentUser = { email, username };
            state.playlists = [];
            state.friends = [];
            
            saveToLocalStorage();
            updateAuthUI();
            closeAuthModal();
            
            renderSidebarPlaylists();
            renderFriendsList();
            renderConversationsList();
            
            initSocketConnection();
            navigateTo("home");
            
            showToast(`Akkaunt yaratildi! Xush kelibsiz, ${username}!`);
        } else {
            const data = await response.json();
            el.signupUsernameError.textContent = data.error || "Ro'yxatdan o'tishda xatolik!";
            el.signupUsernameError.classList.remove("hidden");
        }
    } catch (err) {
        console.error("Signup backend error:", err);
        showToast("Tarmoq xatosi, serverni tekshiring.");
    }
});

el.btnSubmitLogin.addEventListener("click", async () => {
    const username = el.loginUsernameInput.value.trim();
    const password = el.loginPasswordInput.value.trim();
    
    let hasError = false;
    if (!username) {
        el.loginUsernameError.textContent = "Username kiriting!";
        el.loginUsernameError.classList.remove("hidden");
        hasError = true;
    } else {
        el.loginUsernameError.classList.add("hidden");
    }
    
    if (!password) {
        el.loginPasswordError.textContent = "Parol kiriting!";
        el.loginPasswordError.classList.remove("hidden");
        hasError = true;
    } else {
        el.loginPasswordError.classList.add("hidden");
    }
    
    if (hasError) return;
    
    showToast("Kirilmoqda...");
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem("vibestream_token", data.token);
            
            state.currentUser = {
                email: data.email,
                username: data.username
            };
            
            saveToLocalStorage();
            updateAuthUI();
            closeAuthModal();
            
            renderSidebarPlaylists();
            await fetchConversations();
            initSocketConnection();
            
            navigateTo("home");
            showToast(`Xush kelibsiz, ${data.username}!`);
        } else {
            const data = await response.json();
            el.loginPasswordError.textContent = data.error || "Username yoki parol noto'g'ri!";
            el.loginPasswordError.classList.remove("hidden");
        }
    } catch (err) {
        console.error("Login backend error:", err);
        showToast("Tarmoq xatosi, serverni tekshiring.");
    }
});

el.btnUserMenu.addEventListener("click", (e) => {
    e.stopPropagation();
    el.userDropdown.classList.toggle("hidden");
});

document.addEventListener("click", () => {
    el.userDropdown.classList.add("hidden");
});

el.btnLogout.addEventListener("click", () => {
    state.currentUser = null;
    state.playlists = [];
    state.friends = [];
    localStorage.removeItem("vibestream_token");
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    saveToLocalStorage();
    updateAuthUI();
    renderSidebarPlaylists();
    renderFriendsList();
    navigateTo("home");
    showToast("Tizimdan chiqdingiz.");
});


// --- 11. AUDIO PLAYER CONTROLLER ---
function playSongById(songId) {
    const song = state.songCache[songId];
    if (!song) {
        console.error("Song not found in cache:", songId);
        return;
    }

    state.playback.currentSong = song;
    el.audio.src = song.audioUrl;
    el.audio.play().then(() => {
        state.playback.isPlaying = true;
        updatePlayerUI();
    }).catch(e => {
        console.log("Audio play error:", e);
        showToast("Ijro xatosi. Keyingi musiqaga o'tilmoqda...");
        playNext();
    });
}

function updatePlayerUI() {
    const song = state.playback.currentSong;
    if (!song) return;

    el.playerSongImg.innerHTML = `<img src="${song.cover}" alt="${song.title}">`;
    el.playerSongTitle.textContent = song.title;
    el.playerSongArtist.textContent = song.artist;
    
    if (state.playback.isPlaying) {
        el.btnPlayPause.innerHTML = `<i class="fa-solid fa-pause"></i>`;
        el.expandedBtnPlayPause.innerHTML = `<i class="fa-solid fa-pause"></i>`;
    } else {
        el.btnPlayPause.innerHTML = `<i class="fa-solid fa-play"></i>`;
        el.expandedBtnPlayPause.innerHTML = `<i class="fa-solid fa-play"></i>`;
    }

    el.expandedSongImg.src = song.cover;
    el.expandedSongTitle.textContent = song.title;
    el.expandedSongArtist.textContent = song.artist;

    if (song.credits) {
        el.expandedCreditArtist.textContent = song.credits.artist;
        el.expandedCreditWriters.textContent = song.credits.writers;
        el.expandedCreditProducers.textContent = song.credits.producers;
    }

    const nextSong = getNextSongInQueue();
    if (nextSong) {
        el.expandedQueueNextTitle.textContent = nextSong.title;
        el.expandedQueueNextArtist.textContent = nextSong.artist;
    } else {
        el.expandedQueueNextTitle.textContent = "Navbatda musiqa yo'q";
        el.expandedQueueNextArtist.textContent = "-";
    }

    const themeColor = song.bgColor || "#121212";
    el.expandedPlayer.style.background = `linear-gradient(to bottom, ${themeColor} 0%, #121212 90%)`;
}

function getNextSongInQueue() {
    const q = state.playback.queue;
    const idx = state.playback.queueIndex;
    if (q && q.length > 0 && idx >= 0 && idx < q.length - 1) {
        return q[idx + 1];
    }
    return null;
}

function getPrevSongInQueue() {
    const q = state.playback.queue;
    const idx = state.playback.queueIndex;
    if (q && q.length > 0 && idx > 0) {
        return q[idx - 1];
    }
    return null;
}

function togglePlayPause() {
    if (!state.playback.currentSong) {
        // play first song of trending
        if (state.homeLists.trending.length > 0) {
            state.playback.queue = state.homeLists.trending;
            state.playback.queueIndex = 0;
            playSongById(state.homeLists.trending[0].id);
        }
        return;
    }
    
    if (state.playback.isPlaying) {
        el.audio.pause();
        state.playback.isPlaying = false;
    } else {
        el.audio.play();
        state.playback.isPlaying = true;
    }
    updatePlayerUI();
}

el.btnPlayPause.addEventListener("click", togglePlayPause);
el.expandedBtnPlayPause.addEventListener("click", togglePlayPause);

function playNext() {
    if (state.playback.isShuffle && state.playback.queue.length > 0) {
        const randIdx = Math.floor(Math.random() * state.playback.queue.length);
        state.playback.queueIndex = randIdx;
        playSongById(state.playback.queue[randIdx].id);
    } else {
        const next = getNextSongInQueue();
        if (next) {
            state.playback.queueIndex++;
            playSongById(next.id);
        } else if (state.playback.isRepeat && state.playback.queue.length > 0) {
            state.playback.queueIndex = 0;
            playSongById(state.playback.queue[0].id);
        }
    }
}

function playPrev() {
    const prev = getPrevSongInQueue();
    if (prev) {
        state.playback.queueIndex--;
        playSongById(prev.id);
    }
}

el.btnNext.addEventListener("click", playNext);
el.expandedBtnNext.addEventListener("click", playNext);
el.btnPrev.addEventListener("click", playPrev);
el.expandedBtnPrev.addEventListener("click", playPrev);

el.btnShuffle.addEventListener("click", () => {
    state.playback.isShuffle = !state.playback.isShuffle;
    el.btnShuffle.classList.toggle("active", state.playback.isShuffle);
    el.expandedBtnShuffle.classList.toggle("active", state.playback.isShuffle);
});
el.expandedBtnShuffle.addEventListener("click", () => {
    state.playback.isShuffle = !state.playback.isShuffle;
    el.btnShuffle.classList.toggle("active", state.playback.isShuffle);
    el.expandedBtnShuffle.classList.toggle("active", state.playback.isShuffle);
});

el.btnRepeat.addEventListener("click", () => {
    state.playback.isRepeat = !state.playback.isRepeat;
    el.btnRepeat.classList.toggle("active", state.playback.isRepeat);
    el.expandedBtnRepeat.classList.toggle("active", state.playback.isRepeat);
});
el.expandedBtnRepeat.addEventListener("click", () => {
    state.playback.isRepeat = !state.playback.isRepeat;
    el.btnRepeat.classList.toggle("active", state.playback.isRepeat);
    el.expandedBtnRepeat.classList.toggle("active", state.playback.isRepeat);
});

el.audio.addEventListener("timeupdate", () => {
    if (!el.audio.duration) return;
    const progressPercent = (el.audio.currentTime / el.audio.duration) * 100;
    
    el.playerProgress.value = progressPercent;
    el.playerProgressFill.style.width = `${progressPercent}%`;
    el.expandedProgress.value = progressPercent;
    el.expandedProgressFill.style.width = `${progressPercent}%`;
    
    el.playerCurrentTime.textContent = formatTime(el.audio.currentTime);
    el.expandedCurrentTime.textContent = formatTime(el.audio.currentTime);
});

el.audio.addEventListener("loadedmetadata", () => {
    el.playerDuration.textContent = formatTime(el.audio.duration);
    el.expandedDuration.textContent = formatTime(el.audio.duration);
});

el.audio.addEventListener("ended", () => {
    if (state.playback.isRepeat) {
        el.audio.currentTime = 0;
        el.audio.play();
    } else {
        playNext();
    }
});

function seekAudio(e) {
    const seekTo = (e.target.value / 100) * el.audio.duration;
    el.audio.currentTime = seekTo;
}
el.playerProgress.addEventListener("input", seekAudio);
el.expandedProgress.addEventListener("input", seekAudio);

el.playerVolume.addEventListener("input", (e) => {
    const vol = e.target.value;
    state.playback.volume = vol;
    el.audio.volume = vol / 100;
    el.playerVolumeFill.style.width = `${vol}%`;
    
    if (vol == 0) {
        el.btnMute.innerHTML = `<i class="fa-solid fa-volume-xmark"></i>`;
    } else if (vol < 50) {
        el.btnMute.innerHTML = `<i class="fa-solid fa-volume-low"></i>`;
    } else {
        el.btnMute.innerHTML = `<i class="fa-solid fa-volume-high"></i>`;
    }
});

el.btnMute.addEventListener("click", () => {
    state.playback.isMuted = !state.playback.isMuted;
    el.audio.muted = state.playback.isMuted;
    if (state.playback.isMuted) {
        el.btnMute.innerHTML = `<i class="fa-solid fa-volume-xmark"></i>`;
        el.playerVolumeFill.style.width = `0%`;
    } else {
        el.playerVolumeFill.style.width = `${state.playback.volume}%`;
        if (state.playback.volume < 50) {
            el.btnMute.innerHTML = `<i class="fa-solid fa-volume-low"></i>`;
        } else {
            el.btnMute.innerHTML = `<i class="fa-solid fa-volume-high"></i>`;
        }
    }
});

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function openExpandedPlayer() {
    if (!state.playback.currentSong) return;
    el.expandedPlayer.classList.add("active");
}

function closeExpandedPlayer() {
    el.expandedPlayer.classList.remove("active");
}

el.btnToggleFullscreen.addEventListener("click", openExpandedPlayer);
el.btnCloseExpanded.addEventListener("click", closeExpandedPlayer);


// --- 12. GLOBAL SEARCH FUNCTIONALITY (ITUNES QUERY) ---
let searchTimeout = null;
el.globalSearchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    if (query === "") {
        el.clearSearchBtn.classList.add("hidden");
        navigateTo("home");
        return;
    }
    el.clearSearchBtn.classList.remove("hidden");
    navigateTo("search");

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const songResultsContainer = document.getElementById("search-songs-results");
        songResultsContainer.innerHTML = `<p style="grid-column: 1/-1; color: var(--text-grey); padding: 24px;"><i class="fa-solid fa-spinner fa-spin"></i> Musiqalar qidirilmoqda...</p>`;
        
        fetchTracksFromItunes(query, 25).then(matchedSongs => {
            const matchedArtists = MOCK_ARTISTS.filter(a => 
                a.name.toLowerCase().includes(query.toLowerCase())
            );
            renderSearchResults(matchedSongs, matchedArtists);
        });
    }, 400);
});

el.clearSearchBtn.addEventListener("click", () => {
    el.globalSearchInput.value = "";
    el.clearSearchBtn.classList.add("hidden");
    navigateTo("home");
});

function renderSearchResults(songs, artists) {
    const songResultsContainer = document.getElementById("search-songs-results");
    const artistResultsContainer = document.getElementById("search-artists-results");
    
    if (songs.length === 0) {
        songResultsContainer.innerHTML = `<p style="grid-column: 1/-1; color: var(--text-grey); padding:24px;">Musiqa topilmadi.</p>`;
    } else {
        songResultsContainer.innerHTML = `
            <div style="grid-column: 1/-1; margin-bottom: 12px;"><h3>Qo'shiqlar</h3></div>
            ${songs.map(song => `
                <div class="song-row song-search-item" data-song-id="${song.id}">
                    <div class="col-num"><i class="fa-solid fa-music"></i></div>
                    <div class="col-title">
                        <img src="${song.cover}" alt="">
                        <div class="col-title-meta">
                            <span>${song.title}</span>
                            <span>${song.artist}</span>
                        </div>
                    </div>
                    <div class="col-album">${song.album || "-"}</div>
                    <div class="col-duration">${song.duration}</div>
                    <div class="col-actions">
                        <button class="action-icon-btn btn-row-share" data-song-id="${song.id}"><i class="fa-regular fa-paper-plane"></i></button>
                        <button class="action-icon-btn btn-row-add-pl" data-song-id="${song.id}"><i class="fa-solid fa-plus"></i></button>
                    </div>
                </div>
            `).join('')}
        `;
    }

    if (artists.length === 0) {
        artistResultsContainer.innerHTML = ``;
    } else {
        artistResultsContainer.innerHTML = `
            <div style="grid-column: 1/-1; margin-bottom: 12px; margin-top:24px;"><h3>Artistlar</h3></div>
            <div class="horizontal-scroll">
                ${artists.map(art => `
                    <div class="music-card artist-card" data-artist-id="${art.id}">
                        <div class="card-img-wrapper">
                            <img src="${art.image}" alt="">
                        </div>
                        <h4 class="card-title">${art.name}</h4>
                        <p class="card-desc">Artist</p>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Attach event handlers
    document.querySelectorAll(".song-search-item").forEach(row => {
        row.addEventListener("click", (e) => {
            const songId = row.getAttribute("data-song-id");
            if (e.target.closest(".btn-row-share")) {
                e.stopPropagation();
                openShareModal(songId);
            } else if (e.target.closest(".btn-row-add-pl")) {
                e.stopPropagation();
                addSongToActiveOrFirstPlaylist(songId);
            } else {
                state.playback.queue = songs;
                state.playback.queueIndex = songs.findIndex(s => s.id === songId);
                playSongById(songId);
            }
        });
    });

    document.querySelectorAll(".artist-card").forEach(card => {
        card.addEventListener("click", () => {
            const artistId = card.getAttribute("data-artist-id");
            state.activeArtist = MOCK_ARTISTS.find(a => a.id === artistId);
            navigateTo("artist");
        });
    });
}


// --- 13. ARTIST VIEW RENDER (DYNAMIC FETCH) ---
function renderArtistProfile() {
    const artist = state.activeArtist;
    if (!artist) return;

    el.artistProfileName.textContent = artist.name;
    el.artistProfileListeners.textContent = artist.listeners;
    el.artistBanner.style.backgroundImage = `url(${artist.banner})`;
    
    el.artistPopularSongsList.innerHTML = `<p style="padding:16px; color: var(--text-grey);"><i class="fa-solid fa-spinner fa-spin"></i> Musiqalar yuklanmoqda...</p>`;

    fetchTracksFromItunes(artist.name, 15).then(artistSongs => {
        if (artistSongs.length === 0) {
            el.artistPopularSongsList.innerHTML = `<p style="padding:16px; color: var(--text-grey);">Qo'shiqlar topilmadi.</p>`;
            return;
        }

        el.artistPopularSongsList.innerHTML = artistSongs.map((song, idx) => `
            <div class="song-row artist-song-row" data-song-id="${song.id}">
                <div class="col-num">${idx + 1}</div>
                <div class="col-title">
                    <img src="${song.cover}" alt="">
                    <div class="col-title-meta">
                        <span>${song.title}</span>
                        <span>${song.artist}</span>
                    </div>
                </div>
                <div class="col-plays">${song.plays}</div>
                <div class="col-duration">${song.duration}</div>
                <div class="col-actions">
                    <button class="action-icon-btn btn-row-share" data-song-id="${song.id}"><i class="fa-regular fa-paper-plane"></i></button>
                    <button class="action-icon-btn btn-row-add-pl" data-song-id="${song.id}"><i class="fa-solid fa-plus"></i></button>
                </div>
            </div>
        `).join('');

        el.btnPlayArtist.onclick = () => {
            if (artistSongs.length > 0) {
                state.playback.queue = artistSongs;
                state.playback.queueIndex = 0;
                playSongById(artistSongs[0].id);
            }
        };

        document.querySelectorAll(".artist-song-row").forEach(row => {
            row.addEventListener("click", (e) => {
                const songId = row.getAttribute("data-song-id");
                if (e.target.closest(".btn-row-share")) {
                    e.stopPropagation();
                    openShareModal(songId);
                } else if (e.target.closest(".btn-row-add-pl")) {
                    e.stopPropagation();
                    addSongToActiveOrFirstPlaylist(songId);
                } else {
                    state.playback.queue = artistSongs;
                    state.playback.queueIndex = artistSongs.findIndex(s => s.id === songId);
                    playSongById(songId);
                }
            });
        });
    });
}

el.btnFollowArtist.addEventListener("click", () => {
    const isFollowing = el.btnFollowArtist.textContent === "Following";
    if (isFollowing) {
        el.btnFollowArtist.textContent = "Follow";
        el.btnFollowArtist.style.backgroundColor = "transparent";
        el.btnFollowArtist.style.color = "white";
    } else {
        el.btnFollowArtist.textContent = "Following";
        el.btnFollowArtist.style.backgroundColor = "white";
        el.btnFollowArtist.style.color = "black";
    }
});


// --- 14. PLAYLIST CREATION & LOGIC ---
el.btnCreatePlaylist.addEventListener("click", () => {
    state.playlistCounter++;
    const playlistId = `playlist_${Date.now()}`;
    const ownerName = state.currentUser ? state.currentUser.username : "Azamatismoilov";
    
    const newPlaylist = {
        id: playlistId,
        name: `My Playlist #${state.playlistCounter}`,
        owner: ownerName,
        songs: []
    };

    state.playlists.push(newPlaylist);
    saveToLocalStorage();
    renderSidebarPlaylists();

    state.activePlaylist = newPlaylist;
    navigateTo("playlist");
    showToast(`"${newPlaylist.name}" yaratildi!`);
});

function renderSidebarPlaylists() {
    if (state.playlists.length === 0) {
        el.playlistsContainer.innerHTML = `<div class="sidebar-item" style="color: var(--text-grey); font-size:13px; cursor:default; justify-content:center;">Hali playlist yaratilmagan</div>`;
        return;
    }

    el.playlistsContainer.innerHTML = state.playlists.map(pl => `
        <div class="sidebar-item playlist-sidebar-item" data-playlist-id="${pl.id}">
            <div class="item-art">
                <i class="fa-solid fa-music"></i>
            </div>
            <div class="item-meta">
                <span class="item-title">${pl.name}</span>
                <span class="item-subtitle">Playlist &bull; ${pl.songs.length} ta musiqa</span>
            </div>
        </div>
    `).join('');

    document.querySelectorAll(".playlist-sidebar-item").forEach(item => {
        item.addEventListener("click", () => {
            const playlistId = item.getAttribute("data-playlist-id");
            state.activePlaylist = state.playlists.find(p => p.id === playlistId);
            navigateTo("playlist");
        });
    });
}

function renderPlaylistView() {
    const pl = state.activePlaylist;
    if (!pl) return;

    el.playlistTitleDisplay.textContent = pl.name;
    el.playlistOwner.textContent = pl.owner;
    el.playlistSongsCount.textContent = `${pl.songs.length} ta qo'shiq`;
    
    if (pl.songs.length > 0) {
        el.playlistCoverArt.innerHTML = `<img src="${pl.songs[0].cover}" alt="Playlist Cover">`;
    } else {
        el.playlistCoverArt.innerHTML = `<i class="fa-solid fa-music"></i>`;
    }

    if (pl.songs.length === 0) {
        el.playlistSongsList.innerHTML = `<p style="padding: 24px; color: var(--text-grey);">Ushbu pleylistda hozircha qo'shiqlar yo'q. Quyidan qidirib qo'shing.</p>`;
    } else {
        el.playlistSongsList.innerHTML = pl.songs.map((song, idx) => `
            <div class="song-row playlist-song-row" data-song-id="${song.id}">
                <div class="col-num">${idx + 1}</div>
                <div class="col-title">
                    <img src="${song.cover}" alt="">
                    <div class="col-title-meta">
                        <span>${song.title}</span>
                        <span>${song.artist}</span>
                    </div>
                </div>
                <div class="col-album">${song.album || "-"}</div>
                <div class="col-duration">${song.duration}</div>
                <div class="col-actions">
                    <button class="action-icon-btn btn-row-share" data-song-id="${song.id}"><i class="fa-regular fa-paper-plane"></i></button>
                    <button class="action-icon-btn btn-row-delete" data-song-id="${song.id}"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </div>
        `).join('');
    }

    el.btnPlayPlaylist.onclick = () => {
        if (pl.songs.length > 0) {
            state.playback.queue = pl.songs;
            state.playback.queueIndex = 0;
            playSongById(pl.songs[0].id);
        } else {
            showToast("Pleylist bo'sh, ijro etish uchun qo'shiq qo'shing.");
        }
    };

    el.btnDeletePlaylist.onclick = () => {
        if (confirm(`Haqiqatdan ham "${pl.name}" playlistini o'chirmoqchimisiz?`)) {
            state.playlists = state.playlists.filter(p => p.id !== pl.id);
            saveToLocalStorage();
            renderSidebarPlaylists();
            navigateTo("home");
            showToast("Playlist o'chirildi.");
        }
    };

    document.querySelectorAll(".playlist-song-row").forEach(row => {
        row.addEventListener("click", (e) => {
            const songId = row.getAttribute("data-song-id");
            if (e.target.closest(".btn-row-share")) {
                e.stopPropagation();
                openShareModal(songId);
            } else if (e.target.closest(".btn-row-delete")) {
                e.stopPropagation();
                removeSongFromPlaylist(pl.id, songId);
            } else {
                state.playback.queue = pl.songs;
                state.playback.queueIndex = pl.songs.findIndex(s => s.id === songId);
                playSongById(songId);
            }
        });
    });

    el.playlistSongSearchInput.value = "";
    el.playlistSearchResults.innerHTML = "";
}

// Rename Playlist
el.playlistTitleDisplay.addEventListener("click", () => {
    const pl = state.activePlaylist;
    if (!pl) return;

    el.inputPlaylistRename.value = pl.name;
    el.renamePlaylistModal.classList.remove("hidden");
    el.modalOverlay.classList.remove("hidden");
});

el.btnCancelRename.addEventListener("click", () => {
    el.renamePlaylistModal.classList.add("hidden");
    el.modalOverlay.classList.add("hidden");
});

el.btnSaveRename.addEventListener("click", () => {
    const newName = el.inputPlaylistRename.value.trim();
    if (!newName) return;

    state.activePlaylist.name = newName;
    const plIdx = state.playlists.findIndex(p => p.id === state.activePlaylist.id);
    if (plIdx !== -1) {
        state.playlists[plIdx].name = newName;
    }

    saveToLocalStorage();
    renderSidebarPlaylists();
    renderPlaylistView();
    
    el.renamePlaylistModal.classList.add("hidden");
    el.modalOverlay.classList.add("hidden");
    showToast("Playlist nomi o'zgartirildi!");
});

// Search and add inside playlist
let playlistSearchTimeout = null;
el.playlistSongSearchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    if (query === "") {
        el.playlistSearchResults.innerHTML = "";
        return;
    }

    clearTimeout(playlistSearchTimeout);
    playlistSearchTimeout = setTimeout(() => {
        el.playlistSearchResults.innerHTML = `<p style="font-size: 13px; color: var(--text-grey); padding: 8px;"><i class="fa-solid fa-spinner fa-spin"></i> Musiqalar qidirilmoqda...</p>`;
        
        fetchTracksFromItunes(query, 10).then(matched => {
            if (matched.length === 0) {
                el.playlistSearchResults.innerHTML = `<p style="font-size: 13px; color: var(--text-grey); padding: 8px;">Qo'shiq topilmadi.</p>`;
                return;
            }

            el.playlistSearchResults.innerHTML = matched.map(song => `
                <div class="playlist-add-row">
                    <div class="song-add-meta">
                        <img src="${song.cover}" alt="">
                        <div class="song-add-text">
                            <span class="song-add-title">${song.title}</span>
                            <span class="song-add-artist">${song.artist}</span>
                        </div>
                    </div>
                    <button class="btn-add-to-playlist-action" data-song-id="${song.id}">Add</button>
                </div>
            `).join('');

            document.querySelectorAll(".btn-add-to-playlist-action").forEach(btn => {
                btn.addEventListener("click", () => {
                    const songId = btn.getAttribute("data-song-id");
                    addSongToPlaylist(state.activePlaylist.id, songId);
                });
            });
        });
    }, 400);
});

function addSongToPlaylist(playlistId, songId) {
    const playlist = state.playlists.find(p => p.id === playlistId);
    const song = state.songCache[songId];
    if (!playlist || !song) return;

    if (playlist.songs.some(s => s.id === songId)) {
        showToast("Bu musiqa pleylistga allaqachon qo'shilgan!");
        return;
    }

    playlist.songs.push(song);
    saveToLocalStorage();
    renderSidebarPlaylists();
    renderPlaylistView();
    showToast(`"${song.title}" pleylistga qo'shildi!`);
}

function removeSongFromPlaylist(playlistId, songId) {
    const playlist = state.playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    playlist.songs = playlist.songs.filter(s => s.id !== songId);
    saveToLocalStorage();
    renderSidebarPlaylists();
    renderPlaylistView();
    showToast("Musiqa pleylistdan olib tashlandi.");
}

function addSongToActiveOrFirstPlaylist(songId) {
    if (state.playlists.length === 0) {
        el.btnCreatePlaylist.click();
    }
    const targetPl = state.activePlaylist || state.playlists[0];
    addSongToPlaylist(targetPl.id, songId);
}

el.btnPlayerAddPlaylist.addEventListener("click", () => {
    if (!state.playback.currentSong) {
        showToast("Avval musiqa ijro eting.");
        return;
    }
    addSongToActiveOrFirstPlaylist(state.playback.currentSong.id);
});


// --- 15. FRIENDS & REAL-TIME DIRECT MESSAGING SYSTEM ---
const BACKEND_URL = "http://localhost:3000";
let socket = null;
let typingTimeout = null;

// Initialize socket connection
function initSocketConnection() {
    const token = localStorage.getItem("vibestream_token");
    if (!token || !state.currentUser) {
        if (socket) {
            socket.disconnect();
            socket = null;
        }
        return;
    }

    if (socket) return; // Already connected

    socket = io(BACKEND_URL, {
        auth: { token }
    });

    socket.on('connect', () => {
        console.log("Connected to VibeStream Chat Socket");
    });

    socket.on('message', (msg) => {
        const friendUsername = msg.sender.toLowerCase() === state.currentUser.username.toLowerCase() 
            ? msg.receiver 
            : msg.sender;
            
        let friend = state.friends.find(f => f.username.toLowerCase() === friendUsername.toLowerCase());
        if (!friend) {
            friend = {
                username: friendUsername,
                chatHistory: [],
                online: true
            };
            state.friends.push(friend);
            saveToLocalStorage();
            renderFriendsList();
            renderConversationsList();
        }

        friend.chatHistory = friend.chatHistory || [];
        if (!friend.chatHistory.some(m => m.id === msg.id)) {
            friend.chatHistory.push(msg);
            saveToLocalStorage();
            
            if (state.activeChatFriend && state.activeChatFriend.username.toLowerCase() === friendUsername.toLowerCase()) {
                renderChatMessages();
            } else if (msg.sender.toLowerCase() !== state.currentUser.username.toLowerCase()) {
                if (msg.type === "text") {
                    showToast(`"${friendUsername}": ${msg.content}`);
                } else if (msg.type === "song") {
                    showToast(`"${friendUsername}" sizga musiqa yubordi!`);
                }
            }
            renderConversationsList();
        }
    });

    socket.on('statusUpdate', ({ username, online, lastActive }) => {
        const friend = state.friends.find(f => f.username.toLowerCase() === username.toLowerCase());
        if (friend) {
            friend.online = online;
            friend.lastActive = lastActive;
            saveToLocalStorage();
            renderFriendsList();
            renderConversationsList();
            
            if (state.activeChatFriend && state.activeChatFriend.username.toLowerCase() === username.toLowerCase()) {
                updateActiveChatHeaderStatus();
            }
        }
    });

    socket.on('typing', ({ sender, isTyping }) => {
        if (state.activeChatFriend && state.activeChatFriend.username.toLowerCase() === sender.toLowerCase()) {
            const typingIndicator = document.getElementById("chat-typing-indicator");
            const typingText = document.getElementById("chat-typing-text");
            if (typingIndicator && typingText) {
                if (isTyping) {
                    typingIndicator.classList.remove("hidden");
                    typingText.textContent = `${sender} yozmoqda...`;
                } else {
                    typingIndicator.classList.add("hidden");
                }
            }
        }
    });

    socket.on('connect_error', (err) => {
        console.warn("Socket connection failed:", err.message);
    });

    socket.on('disconnect', () => {
        console.log("Disconnected from VibeStream Chat Socket");
    });
}

// Fetch conversations from server
async function fetchConversations() {
    const token = localStorage.getItem("vibestream_token");
    if (!token) return;
    try {
        const res = await fetch(`${BACKEND_URL}/api/conversations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const list = await res.json();
            list.forEach(item => {
                let localFriend = state.friends.find(f => f.username.toLowerCase() === item.username.toLowerCase());
                if (localFriend) {
                    localFriend.online = item.online;
                    localFriend.lastActive = item.lastActive;
                    if (item.lastMessage) {
                        localFriend.chatHistory = localFriend.chatHistory || [];
                        if (!localFriend.chatHistory.some(m => m.id === item.lastMessage.id)) {
                            localFriend.chatHistory.push(item.lastMessage);
                        }
                    }
                } else {
                    state.friends.push({
                        username: item.username,
                        online: item.online,
                        lastActive: item.lastActive,
                        chatHistory: item.lastMessage ? [item.lastMessage] : []
                    });
                }
            });
            saveToLocalStorage();
            renderFriendsList();
            renderConversationsList();
        }
    } catch (e) {
        console.warn("Failed to fetch conversations:", e);
    }
}

// Fetch chat history with active friend
async function fetchChatHistory(friendUsername) {
    const token = localStorage.getItem("vibestream_token");
    if (!token) return;
    try {
        const res = await fetch(`${BACKEND_URL}/api/messages/${friendUsername}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const history = await res.json();
            const friend = state.friends.find(f => f.username.toLowerCase() === friendUsername.toLowerCase());
            if (friend) {
                friend.chatHistory = history;
                saveToLocalStorage();
                if (state.activeChatFriend && state.activeChatFriend.username.toLowerCase() === friendUsername.toLowerCase()) {
                    renderChatMessages();
                }
            }
        }
    } catch (e) {
        console.warn(`Failed to fetch messages for ${friendUsername}:`, e);
    }
}

// Render Conversations List in Left Pane
function renderConversationsList() {
    const listContainer = document.getElementById("recent-conversations-list");
    if (!listContainer) return;

    if (state.friends.length === 0) {
        listContainer.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-grey); font-size:12px;">Suhbatlar mavjud emas</div>`;
        return;
    }

    const sortedFriends = [...state.friends].sort((a, b) => {
        const lastA = a.chatHistory && a.chatHistory.length > 0 ? new Date(a.chatHistory[a.chatHistory.length - 1].timestamp).getTime() : 0;
        const lastB = b.chatHistory && b.chatHistory.length > 0 ? new Date(b.chatHistory[b.chatHistory.length - 1].timestamp).getTime() : 0;
        return lastB - lastA;
    });

    listContainer.innerHTML = sortedFriends.map(friend => {
        const isActive = state.activeChatFriend && state.activeChatFriend.username.toLowerCase() === friend.username.toLowerCase() ? "active" : "";
        const isOnline = friend.online ? "online" : "offline";
        
        let lastMsgText = "Yozishma yo'q";
        let lastMsgTime = "";
        if (friend.chatHistory && friend.chatHistory.length > 0) {
            const lastMsg = friend.chatHistory[friend.chatHistory.length - 1];
            if (lastMsg.type === "text") {
                lastMsgText = lastMsg.content;
            } else if (lastMsg.type === "song") {
                lastMsgText = "🎵 Musiqa ulashdi";
            }
            if (lastMsg.timestamp) {
                const date = new Date(lastMsg.timestamp);
                lastMsgTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
        }

        return `
            <div class="conv-item-premium ${isActive}" data-friend-name="${friend.username}">
                <div class="conv-avatar-premium">
                    <i class="fa-solid fa-user-ninja"></i>
                    <span class="conv-status-badge-premium ${isOnline}"></span>
                </div>
                <div class="conv-meta-premium">
                    <div class="conv-title-row-premium">
                        <h4>${friend.username}</h4>
                        <span class="conv-time-premium">${lastMsgTime}</span>
                    </div>
                    <span class="conv-last-msg-premium">${lastMsgText}</span>
                </div>
            </div>
        `;
    }).join('');

    listContainer.querySelectorAll(".conv-item-premium").forEach(row => {
        row.addEventListener("click", () => {
            const friendName = row.getAttribute("data-friend-name");
            openChatWithFriend(friendName);
        });
    });
}

function openChatWithFriend(friendUsername) {
    state.activeChatFriend = state.friends.find(f => f.username.toLowerCase() === friendUsername.toLowerCase());
    if (!state.activeChatFriend) return;

    const emptyState = document.getElementById("chat-empty-state");
    const chatContainer = document.getElementById("chat-container-premium");
    if (emptyState) emptyState.classList.add("hidden");
    if (chatContainer) chatContainer.classList.remove("hidden");

    renderConversationsList();

    const headerName = document.getElementById("chat-friend-name-premium");
    if (headerName) headerName.textContent = state.activeChatFriend.username;
    updateActiveChatHeaderStatus();

    renderChatMessages();
    fetchChatHistory(state.activeChatFriend.username);
    
    navigateTo("chat");
}

function updateActiveChatHeaderStatus() {
    const statusText = document.getElementById("chat-friend-status-premium");
    if (!statusText || !state.activeChatFriend) return;

    if (state.activeChatFriend.online) {
        statusText.textContent = "online";
        statusText.className = "chat-status-premium online";
    } else {
        const lastActiveTime = state.activeChatFriend.lastActive 
            ? new Date(state.activeChatFriend.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            : "";
        statusText.textContent = lastActiveTime ? `offline, oxirgi faollik: ${lastActiveTime}` : "offline";
        statusText.className = "chat-status-premium offline";
    }
}

// Add friend via API
async function addFriendViaAPI(friendUsername) {
    const token = localStorage.getItem("vibestream_token");
    if (!token) return;
    try {
        const res = await fetch(`${BACKEND_URL}/api/users/add-friend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ friendUsername })
        });
        if (res.ok) {
            showToast(`"${friendUsername}" do'stlar ro'yxatiga qo'shildi!`);
            await fetchConversations();
            openChatWithFriend(friendUsername);
        } else {
            const data = await res.json();
            showToast(data.error || "Do'st qo'shib bo'lmadi");
        }
    } catch (e) {
        console.warn("Failed to add friend via API:", e);
        showToast("Xatolik yuz berdi");
    }
}

// Render Friends list in sidebar
function renderFriendsList() {
    if (!state.currentUser) return;
    
    const container = document.getElementById("friends-container");
    if (!container) return;

    if (state.friends.length === 0) {
        container.innerHTML = `<div class="sidebar-item" style="color: var(--text-grey); font-size:13px; cursor:default; justify-content:center;">Do'stlar ro'yxati bo'sh</div>`;
        return;
    }
    
    container.innerHTML = state.friends.map(friend => {
        return `
            <div class="sidebar-item friend-item" data-friend-name="${friend.username}">
                <div class="item-art" style="position:relative;">
                    <i class="fa-solid fa-user-ninja"></i>
                    <span style="position:absolute; bottom:-2px; right:-2px; width:8px; height:8px; border-radius:50%; background:${friend.online ? '#00ffff' : '#666'}; border:1px solid #000;"></span>
                </div>
                <div class="item-meta">
                    <span class="item-title">${friend.username}</span>
                    <span class="item-subtitle">${friend.online ? 'online' : 'offline'}</span>
                </div>
            </div>
        `;
    }).join('');

    container.querySelectorAll(".friend-item").forEach(row => {
        row.addEventListener("click", () => {
            const friendName = row.getAttribute("data-friend-name");
            openChatWithFriend(friendName);
        });
    });
}

// Setup Event Listeners for Chat page
function setupChatEventListeners() {
    const chatSearchInput = document.getElementById("chat-user-search-input");
    const chatSearchResults = document.getElementById("chat-user-search-results");

    if (chatSearchInput && chatSearchResults) {
        let chatSearchTimeout = null;
        chatSearchInput.addEventListener("input", (e) => {
            const query = e.target.value.trim();
            if (!query) {
                chatSearchResults.classList.add("hidden");
                chatSearchResults.innerHTML = "";
                return;
            }

            if (chatSearchTimeout) clearTimeout(chatSearchTimeout);
            chatSearchTimeout = setTimeout(async () => {
                const token = localStorage.getItem("vibestream_token");
                if (!token) return;
                try {
                    const res = await fetch(`${BACKEND_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const user = await res.json();
                        chatSearchResults.classList.remove("hidden");
                        if (user) {
                            if (user.username.toLowerCase() === state.currentUser.username.toLowerCase()) {
                                chatSearchResults.innerHTML = `<div style="padding:10px; font-size:12px; color:var(--text-grey);">O'zingizni qo'sha olmaysiz</div>`;
                                return;
                            }
                            const isAlreadyFriend = state.friends.some(f => f.username.toLowerCase() === user.username.toLowerCase());
                            chatSearchResults.innerHTML = `
                                <div class="chat-search-item-premium">
                                    <span>${user.username}</span>
                                    ${isAlreadyFriend ? 
                                        `<button class="btn-add-chat-friend-premium" style="background:#555; color:#fff;" disabled>Do'st</button>` : 
                                        `<button class="btn-add-chat-friend-premium" id="btn-add-searched-friend" data-username="${user.username}"><i class="fa-solid fa-plus"></i> Qo'shish</button>`
                                    }
                                </div>
                            `;
                            const addBtn = document.getElementById("btn-add-searched-friend");
                            if (addBtn) {
                                addBtn.addEventListener("click", async () => {
                                    const uname = addBtn.getAttribute("data-username");
                                    await addFriendViaAPI(uname);
                                    chatSearchInput.value = "";
                                    chatSearchResults.classList.add("hidden");
                                });
                            }
                        } else {
                            chatSearchResults.innerHTML = `<div style="padding:10px; font-size:12px; color:#ff4a4a;">Foydalanuvchi topilmadi</div>`;
                        }
                    }
                } catch (e) {
                    console.error("Chat user search error:", e);
                    chatSearchResults.innerHTML = `<div style="padding:10px; font-size:12px; color:#ff4a4a;">Qidiruvda xatolik yuz berdi</div>`;
                }
            }, 300);
        });
    }

    // Sidebar Friend Search
    if (el.btnToggleFindFriend) {
        el.btnToggleFindFriend.addEventListener("click", () => {
            if (!state.currentUser) {
                openAuthModal("signup");
                return;
            }
            el.friendSearchBox.classList.toggle("hidden");
            el.inputSearchFriend.value = "";
            el.friendSearchResults.innerHTML = "";
        });
    }

    if (el.btnCloseFriendSearch) {
        el.btnCloseFriendSearch.addEventListener("click", () => {
            el.friendSearchBox.classList.add("hidden");
        });
    }

    if (el.inputSearchFriend) {
        let friendSearchDebounce = null;
        el.inputSearchFriend.addEventListener("input", (e) => {
            const query = e.target.value.trim();
            if (query === "") {
                el.friendSearchResults.innerHTML = "";
                return;
            }

            if (friendSearchDebounce) clearTimeout(friendSearchDebounce);

            friendSearchDebounce = setTimeout(async () => {
                if (!state.currentUser) return;
                
                el.friendSearchResults.innerHTML = `<div style="font-size:11px; padding: 4px; color:var(--text-grey);"><i class="fa-solid fa-spinner fa-spin"></i> Qidirilmoqda...</div>`;
                
                const token = localStorage.getItem("vibestream_token");
                if (!token) return;

                try {
                    const res = await fetch(`${BACKEND_URL}/api/users/search?q=${encodeURIComponent(query)}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const user = await res.json();
                        if (user) {
                            if (user.username.toLowerCase() === state.currentUser.username.toLowerCase()) {
                                el.friendSearchResults.innerHTML = `<div style="font-size:11px; padding: 4px; color:var(--text-grey);">O'zingizni do'st qilib qo'sha olmaysiz</div>`;
                                return;
                            }
                            const isAlreadyFriend = state.friends.some(f => f.username.toLowerCase() === user.username.toLowerCase());
                            el.friendSearchResults.innerHTML = `
                                <div class="search-result-item" style="display:flex; justify-content:space-between; align-items:center; padding: 6px 4px; border-bottom:1px solid rgba(255,255,255,0.05);">
                                    <span class="search-result-name" style="color:#fff; font-size:13px;">${user.username}</span>
                                    ${isAlreadyFriend ? 
                                        `<span style="color:var(--text-grey); font-size:11px;">Allaqachon do'st</span>` : 
                                        `<button class="btn-add-friend-action" id="btn-sidebar-add-friend" data-username="${user.username}" style="background:var(--spotify-green); border:none; color:#000; padding:2px 8px; border-radius:12px; cursor:pointer; font-size:11px; font-weight:bold;"><i class="fa-solid fa-plus"></i> Qo'shish</button>`
                                    }
                                </div>
                            `;

                            const addBtn = document.getElementById("btn-sidebar-add-friend");
                            if (addBtn) {
                                addBtn.addEventListener("click", async () => {
                                    const uname = addBtn.getAttribute("data-username");
                                    await addFriendViaAPI(uname);
                                    el.friendSearchBox.classList.add("hidden");
                                });
                            }
                        } else {
                            el.friendSearchResults.innerHTML = `<div style="font-size:11px; padding: 4px; color:#ff4a4a;">Kiritilgan username noto'g'ri (topilmadi)!</div>`;
                        }
                    } else {
                        el.friendSearchResults.innerHTML = `<div style="font-size:11px; padding: 4px; color:#ff4a4a;">Kiritilgan username noto'g'ri (topilmadi)!</div>`;
                    }
                } catch (err) {
                    console.error("Search friend error:", err);
                    el.friendSearchResults.innerHTML = `<div style="font-size:11px; padding: 4px; color:#ff4a4a;">Kiritilgan username noto'g'ri (topilmadi)!</div>`;
                }
            }, 300);
        });
    }

    // Chat Message Input and Send Button
    const inputField = document.getElementById("chat-message-input-premium");
    const sendBtn = document.getElementById("btn-send-message-premium");
    const closeChatBtn = document.getElementById("btn-close-chat-premium");

    if (inputField) {
        inputField.addEventListener("input", () => {
            if (!state.activeChatFriend || !socket) return;
            
            socket.emit("typing", { recipient: state.activeChatFriend.username, isTyping: true });
            
            if (typingTimeout) clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                socket.emit("typing", { recipient: state.activeChatFriend.username, isTyping: false });
            }, 2000);
        });

        inputField.addEventListener("keydown", (e) => {
            if (e.key === "Enter") sendMessage();
        });
    }

    if (sendBtn) {
        sendBtn.addEventListener("click", sendMessage);
    }

    if (closeChatBtn) {
        closeChatBtn.addEventListener("click", () => {
            state.activeChatFriend = null;
            const emptyState = document.getElementById("chat-empty-state");
            const chatContainer = document.getElementById("chat-container-premium");
            if (emptyState) emptyState.classList.remove("hidden");
            if (chatContainer) chatContainer.classList.add("hidden");
            navigateTo("home");
        });
    }
}

// Render chat messages
function renderChatMessages() {
    const friend = state.activeChatFriend;
    if (!friend) return;

    const msgContainer = document.getElementById("chat-messages-container-premium");
    if (!msgContainer) return;

    if (!friend.chatHistory || friend.chatHistory.length === 0) {
        msgContainer.innerHTML = `<div style="text-align: center; color: var(--text-grey); font-size: 13px; margin-top: 48px;">Yozishmani boshlash uchun xabar yuboring yoki qo'shiq ulashing!</div>`;
        return;
    }

    msgContainer.innerHTML = friend.chatHistory.map(msg => {
        const isMe = msg.sender.toLowerCase() === state.currentUser.username.toLowerCase();
        
        let timeStr = "";
        if (msg.timestamp) {
            const date = new Date(msg.timestamp);
            timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        let contentHtml = "";
        if (msg.type === "text") {
            contentHtml = `<div>${msg.content}</div>`;
        } else if (msg.type === "song") {
            const song = state.songCache[msg.songId];
            if (song) {
                contentHtml = `
                    <div style="font-style: italic; font-size:12px; margin-bottom:4px; opacity:0.8;">Musiqa ulashdi:</div>
                    <div class="shared-song-card">
                        <img src="${song.cover}" alt="">
                        <div class="shared-song-meta">
                            <span class="shared-song-title">${song.title}</span>
                            <span class="shared-song-artist">${song.artist}</span>
                        </div>
                        <button class="btn-play-shared" data-song-id="${song.id}"><i class="fa-solid fa-play"></i></button>
                    </div>
                `;
            } else {
                contentHtml = `<div>Musiqa ulashildi (Yuklanmoqda...)</div>`;
                fetchTracksFromItunesById(msg.songId);
            }
        }

        return `
            <div class="msg-bubble ${isMe ? 'sent' : 'received'}">
                ${contentHtml}
                <span class="msg-time">${timeStr}</span>
            </div>
        `;
    }).join('');

    msgContainer.querySelectorAll(".btn-play-shared").forEach(btn => {
        btn.addEventListener("click", () => {
            const songId = btn.getAttribute("data-song-id");
            playSongById(songId);
        });
    });

    msgContainer.scrollTop = msgContainer.scrollHeight;
}

// Fetch iTunes Tracks Cache
async function fetchTracksFromItunesById(songId) {
    if (state.songCache[songId]) return;
    try {
        const res = await fetch(`https://itunes.apple.com/lookup?id=${songId}`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            const track = mapItunesTrack(data.results[0]);
            state.songCache[songId] = track;
            if (state.activeView === "chat") {
                renderChatMessages();
            }
        }
    } catch (e) {
        console.error("Fetch single track error:", e);
    }
}

// Send Message
function sendMessage() {
    const inputElement = document.getElementById("chat-message-input-premium");
    if (!inputElement) return;
    const text = inputElement.value.trim();
    if (!text || !state.activeChatFriend || !state.currentUser || !socket) return;

    socket.emit("privateMessage", {
        recipient: state.activeChatFriend.username,
        content: text,
        type: "text"
    });

    inputElement.value = "";
    
    if (typingTimeout) clearTimeout(typingTimeout);
    socket.emit("typing", { recipient: state.activeChatFriend.username, isTyping: false });
}

el.btnSendMessage.addEventListener("click", sendMessage);
el.chatMessageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
});

el.btnCloseChat.addEventListener("click", () => {
    navigateTo("home");
});


// --- 16. SHARING MUSIC (Instagram Style) ---
function openShareModal(songId) {
    if (!state.currentUser) {
        openAuthModal("signup");
        return;
    }

    const song = state.songCache[songId];
    if (!song) return;

    state.songToShare = song;
    el.shareSongCover.src = song.cover;
    el.shareSongTitle.textContent = song.title;
    el.shareSongArtist.textContent = song.artist;
    
    if (state.friends.length === 0) {
        el.shareFriendsListContainer.innerHTML = `<p style="font-size:12px; color:var(--text-grey); text-align:center; padding:12px;">Ulashish uchun avval biror do'st qo'shing.</p>`;
    } else {
        el.shareFriendsListContainer.innerHTML = state.friends.map(friend => `
            <div class="share-friend-row">
                <div class="share-friend-info">
                    <div class="share-friend-avatar"><i class="fa-solid fa-user-ninja"></i></div>
                    <span class="share-friend-name">${friend.username}</span>
                </div>
                <button class="btn-send-share-action" data-friend-name="${friend.username}">Send</button>
            </div>
        `).join('');

        document.querySelectorAll(".btn-send-share-action").forEach(btn => {
            btn.addEventListener("click", () => {
                const fname = btn.getAttribute("data-friend-name");
                shareSongToFriend(fname, song.id);
            });
        });
    }

    el.shareSongModal.classList.remove("hidden");
    el.modalOverlay.classList.remove("hidden");
}

async function shareSongToFriend(friendUsername, songId) {
    const friend = state.friends.find(f => f.username === friendUsername);
    const song = state.songCache[songId];
    if (!friend || !state.currentUser || !song) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const shareMsg = {
        id: `msg_${Date.now()}`,
        sender: state.currentUser.username,
        type: "song",
        songId: songId,
        timestamp: time
    };

    friend.chatHistory = friend.chatHistory || [];
    friend.chatHistory.push(shareMsg);
    
    saveToLocalStorage();
    el.shareSongModal.classList.add("hidden");
    el.modalOverlay.classList.add("hidden");
    showToast(`Qo'shiq "${friendUsername}"ga yuborildi!`);
    
    const chatKey = `chat_${[state.currentUser.username.toLowerCase(), friendUsername.toLowerCase()].sort().join("_")}`;
    await kvdbPut(chatKey, friend.chatHistory);
    notifyRecipient(friendUsername);
}

el.btnPlayerShare.addEventListener("click", () => {
    if (!state.playback.currentSong) {
        showToast("Avval musiqa ijro eting.");
        return;
    }
    openShareModal(state.playback.currentSong.id);
});

el.btnCloseShare.addEventListener("click", () => {
    el.shareSongModal.classList.add("hidden");
    el.modalOverlay.classList.add("hidden");
});


// --- 17. INITIALIZATION ---
function init() {
    loadFromLocalStorage();
    
    // Load Dynamic Content from iTunes
    loadHomeContent();

    renderSidebarPlaylists();
    setupChatEventListeners();
    
    el.audio.volume = state.playback.volume / 100;
    el.playerVolume.value = state.playback.volume;
    el.playerVolumeFill.style.width = `${state.playback.volume}%`;

    el.btnHome.addEventListener("click", () => {
        el.globalSearchInput.value = "";
        el.clearSearchBtn.classList.add("hidden");
        navigateTo("home");
    });
    el.logoHome.addEventListener("click", () => {
        el.globalSearchInput.value = "";
        el.clearSearchBtn.classList.add("hidden");
        navigateTo("home");
    });

    el.playerCurrentTime.textContent = "0:00";
    el.playerDuration.textContent = "0:00";
    
    navigateTo("home");
    
    // Start background poller for inbox and chats (every 5 seconds)
    setInterval(pollInboxAndChats, 5000);
    
    // Polling placeholders (using Socket.IO for real-time instead)
}
function startChatPolling() {}
function stopChatPolling() {}
function pollInboxAndChats() {}

window.onload = init;
