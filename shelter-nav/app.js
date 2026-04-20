// ================================================================
//  CONFIGURATION — הגדר את ה-API key שלך כאן
// ================================================================
const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';

// צופר / פיקוד העורף — endpoints לניסיון בסדר
const OREF_URLS = [
    'https://www.oref.org.il/WarningMessages/alert/alerts.json',
    'https://www.oref.org.il/warningMessages/alert/alerts.json',
];

// Proxy לעקיפת CORS בפיתוח מקומי (בפרודקשן — השתמש בבאקאנד)
const CORS_PROXY = 'https://corsproxy.io/?';

const POLL_INTERVAL_MS  = 3000;   // בדיקת אזעקות כל 3 שניות
const SHELTER_RADIUS_M  = 600;    // רדיוס חיפוש מקלטים (מטר)
const SHELTER_RADIUS2_M = 1500;   // רדיוס שני אם לא נמצא כלום

// ================================================================
//  State
// ================================================================
let map, directionsService, directionsRenderer;
let userMarker = null;
let userLocation  = null;   // { lat, lng }
let userAreaNames = [];     // שמות אזורים בעברית מ-reverse geocoding
let nearestShelter = null;
let shelterMarkers = [];
let isAlarmActive  = false;
let audioCtx       = null;
let pollTimer      = null;

// ================================================================
//  initMap — קולבק של Google Maps JS API
// ================================================================
window.initMap = function () {
    // בדיקת מפתח API
    if (GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
        document.getElementById('api-warning').classList.remove('hidden');
    } else {
        document.getElementById('api-warning').classList.add('hidden');
    }

    // מפה בסגנון כהה ממוקמת בישראל
    map = new google.maps.Map(document.getElementById('map'), {
        center:           { lat: 31.5, lng: 34.8 },
        zoom:             15,
        mapTypeId:        'roadmap',
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl:   false,
        gestureHandling:  'greedy',
        styles: [
            { elementType: 'geometry',            stylers: [{ color: '#1d2c4d' }] },
            { elementType: 'labels.text.fill',    stylers: [{ color: '#8ec3b9' }] },
            { elementType: 'labels.text.stroke',  stylers: [{ color: '#1a3646' }] },
            { featureType: 'road',               elementType: 'geometry',       stylers: [{ color: '#304a7d' }] },
            { featureType: 'road',               elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
            { featureType: 'poi',                elementType: 'geometry',       stylers: [{ color: '#283d6a' }] },
            { featureType: 'water',              elementType: 'geometry',       stylers: [{ color: '#0e1626' }] },
            { featureType: 'transit',            elementType: 'geometry',       stylers: [{ color: '#2f3948' }] },
            { featureType: 'administrative.land_parcel', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        ],
    });

    directionsService  = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        map,
        polylineOptions: { strokeColor: '#ff4444', strokeWeight: 7, strokeOpacity: 0.9 },
        suppressMarkers: false,
    });

    initGeolocation();
    startPolling();
    setupButtons();
};

// ================================================================
//  GPS / Geolocation
// ================================================================
function initGeolocation() {
    if (!navigator.geolocation) {
        setGpsStatus('GPS לא נתמך', 'err');
        return;
    }
    navigator.geolocation.watchPosition(onPosition, onGpsError, {
        enableHighAccuracy: true,
        maximumAge:  8000,
        timeout:    15000,
    });
}

function onPosition(pos) {
    const { latitude: lat, longitude: lng, accuracy } = pos.coords;
    userLocation = { lat, lng };

    setGpsStatus(`דיוק: ${Math.round(accuracy)} מ'`, 'on');
    updateUserMarker(userLocation);
    map.panTo(userLocation);

    // עדכן שמות אזורים לצורך התאמה עם אזעקות
    reverseGeocode(userLocation);
}

function onGpsError(err) {
    const msg = { 1: 'הרשאת מיקום נדחתה', 2: 'מיקום לא זמין', 3: 'GPS: פסק זמן' };
    setGpsStatus(msg[err.code] || 'שגיאת GPS', 'err');
}

function updateUserMarker(loc) {
    if (!userMarker) {
        userMarker = new google.maps.Marker({
            position: loc,
            map,
            title: 'המיקום שלך',
            zIndex: 999,
            icon: {
                path:         google.maps.SymbolPath.CIRCLE,
                scale:        11,
                fillColor:    '#4285F4',
                fillOpacity:  1,
                strokeColor:  '#ffffff',
                strokeWeight: 3,
            },
        });
    } else {
        userMarker.setPosition(loc);
    }
}

// ================================================================
//  Reverse Geocoding — מה-GPS לשמות ישוב בעברית
// ================================================================
function reverseGeocode(loc) {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: loc, language: 'he' }, (results, status) => {
        if (status !== 'OK') return;

        const TYPES = [
            'locality', 'sublocality', 'sublocality_level_1',
            'neighborhood', 'administrative_area_level_2',
            'administrative_area_level_3',
        ];

        const names = new Set();
        results.forEach(r =>
            r.address_components.forEach(c => {
                if (c.types.some(t => TYPES.includes(t))) {
                    names.add(c.long_name.trim());
                    names.add(c.short_name.trim());
                }
            })
        );

        userAreaNames = [...names];
        console.log('[מגן] אזורי משתמש:', userAreaNames);
    });
}

// ================================================================
//  Alert Polling — בדיקת אזעקות מצופר / פיקוד העורף
// ================================================================
function startPolling() {
    setConnStatus('מחובר', 'on');
    checkAlerts();
    pollTimer = setInterval(checkAlerts, POLL_INTERVAL_MS);
}

async function checkAlerts() {
    for (const url of OREF_URLS) {
        try {
            // נסה ישירות, ואם נכשל — דרך CORS proxy
            const data = await fetchAlerts(url) ?? await fetchAlerts(CORS_PROXY + encodeURIComponent(url));
            if (data !== null) {
                handleAlertData(data);
                return;
            }
        } catch (_) { /* המשך לניסיון הבא */ }
    }

    // כל ה-endpoints נכשלו
    setConnStatus('שגיאת חיבור', 'err');
}

async function fetchAlerts(url) {
    const res = await fetch(url, {
        cache:   'no-store',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });

    if (!res.ok) return null;

    const text = await res.text();
    const clean = text.replace(/^\uFEFF/, '').trim();   // הסרת BOM

    if (!clean || clean === '[]') return { data: [] };  // אין אזעקות

    try {
        return JSON.parse(clean);
    } catch {
        return null;
    }
}

function handleAlertData(data) {
    setConnStatus('מחובר', 'on');

    const areas = Array.isArray(data.data) ? data.data : [];

    if (areas.length === 0) {
        // אין אזעקות
        setAlertStatus('אין אזעקות 🛡️', false);
        document.getElementById('status-bar').className = 'safe';

        if (isAlarmActive) {
            isAlarmActive = false;
            hideOverlay();
            stopAlarm();
        }
        return;
    }

    // יש אזעקות — בדוק אם באזור המשתמש
    setAlertStatus(`🚨 ${areas.slice(0, 3).join(', ')}`, true);
    document.getElementById('status-bar').className = 'danger';

    if (isUserInAlertZone(areas) && !isAlarmActive) {
        isAlarmActive = true;
        triggerAlarm(areas, data.title || 'אזעקה');
    }
}

function isUserInAlertZone(areas) {
    if (userAreaNames.length === 0) {
        // אין מיקום עדיין — הצג אזעקה לכל מקרה
        return areas.length > 0;
    }

    return areas.some(area =>
        userAreaNames.some(name => {
            const a = normalize(area);
            const n = normalize(name);
            return a === n || a.includes(n) || n.includes(a);
        })
    );
}

const normalize = s => s.replace(/[\u0591-\u05C7]/g, '').replace(/['"]/g, '').trim().toLowerCase();

// ================================================================
//  Alarm — הפעלת אזעקה
// ================================================================
function triggerAlarm(areas, title) {
    playAlarm();
    showOverlay(areas, title);

    if (userLocation) findNearestShelter(userLocation);
}

function showOverlay(areas, title) {
    document.getElementById('alert-title').textContent       = title;
    document.getElementById('alert-areas-text').textContent  = 'אזורים: ' + areas.slice(0, 6).join(' | ');
    document.getElementById('shelter-searching').style.display = 'flex';
    document.getElementById('shelter-result').classList.add('hidden');
    document.getElementById('shelter-none').classList.add('hidden');
    document.getElementById('alert-overlay').classList.remove('hidden');
}

function hideOverlay() {
    document.getElementById('alert-overlay').classList.add('hidden');
    document.getElementById('status-bar').className = 'safe';
    clearShelterMarkers();
    directionsRenderer?.setDirections({ routes: [] });
}

// ================================================================
//  Shelter Search — חיפוש מקלט קרוב
// ================================================================
function findNearestShelter(loc) {
    const svc = new google.maps.places.PlacesService(map);
    const queries = [
        { keyword: 'מקלט', radius: SHELTER_RADIUS_M },
        { keyword: 'ממד',  radius: SHELTER_RADIUS_M },
        { keyword: 'מקלט', radius: SHELTER_RADIUS2_M },
        { keyword: 'bomb shelter', radius: SHELTER_RADIUS2_M },
    ];

    tryNextQuery(svc, loc, queries, 0);
}

function tryNextQuery(svc, loc, queries, idx) {
    if (idx >= queries.length) {
        // לא נמצא כלום
        document.getElementById('shelter-searching').style.display = 'none';
        document.getElementById('shelter-none').classList.remove('hidden');
        return;
    }

    const q = queries[idx];
    svc.nearbySearch(
        { location: loc, radius: q.radius, keyword: q.keyword, language: 'he' },
        (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
                const sorted = results.sort((a, b) =>
                    distanceBetween(loc, a.geometry.location) -
                    distanceBetween(loc, b.geometry.location)
                );
                nearestShelter = sorted[0];
                showShelterInfo(nearestShelter, loc);
                markShelters(sorted.slice(0, 6));
                navigateTo(nearestShelter.geometry.location);
            } else {
                tryNextQuery(svc, loc, queries, idx + 1);
            }
        }
    );
}

function distanceBetween(locA, locB) {
    const a = new google.maps.LatLng(locA.lat, locA.lng);
    const b = locB instanceof google.maps.LatLng ? locB : new google.maps.LatLng(locB.lat, locB.lng);
    return google.maps.geometry.spherical.computeDistanceBetween(a, b);
}

function showShelterInfo(shelter, userLoc) {
    const dist    = Math.round(distanceBetween(userLoc, shelter.geometry.location));
    const distTxt = dist < 1000 ? `${dist} מ'` : `${(dist / 1000).toFixed(1)} ק"מ`;
    const walkMin = Math.max(1, Math.ceil(dist / 72));   // ~72 מ'/דקה
    const walkTxt = walkMin <= 1 ? 'פחות מדקה הליכה' : `${walkMin} דק' הליכה`;

    document.getElementById('shelter-name-text').textContent = shelter.name || 'מקלט ציבורי';
    document.getElementById('shelter-dist').textContent      = distTxt;
    document.getElementById('shelter-walk').textContent      = `⏱️ ${walkTxt}`;

    document.getElementById('shelter-searching').style.display = 'none';
    document.getElementById('shelter-result').classList.remove('hidden');
}

function markShelters(shelters) {
    clearShelterMarkers();

    shelters.forEach((s, i) => {
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">
                <path d="M16 0C7.2 0 0 7.2 0 16c0 11.6 16 28 16 28S32 27.6 32 16C32 7.2 24.8 0 16 0z"
                      fill="${i === 0 ? '#cc0000' : '#e67300'}"/>
                <text x="16" y="23" font-size="14" text-anchor="middle" fill="white">🏠</text>
            </svg>`;
        const icon = {
            url:        'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
            scaledSize: new google.maps.Size(32, 44),
            anchor:     new google.maps.Point(16, 44),
        };

        const marker = new google.maps.Marker({ position: s.geometry.location, map, title: s.name, icon, zIndex: 500 });

        const info = new google.maps.InfoWindow({
            content: `<div style="direction:rtl;padding:4px 6px;font-family:Arial">
                          <b>${s.name}</b><br>
                          <small style="color:#666">${s.vicinity || ''}</small>
                      </div>`,
        });
        marker.addListener('click', () => info.open(map, marker));

        shelterMarkers.push(marker);
    });
}

function clearShelterMarkers() {
    shelterMarkers.forEach(m => m.setMap(null));
    shelterMarkers = [];
}

// ================================================================
//  Navigation — ניווט למקלט
// ================================================================
function navigateTo(destination) {
    if (!userLocation) return;

    directionsService.route(
        { origin: userLocation, destination, travelMode: google.maps.TravelMode.WALKING },
        (result, status) => {
            if (status === google.maps.DirectionsStatus.OK) {
                directionsRenderer.setDirections(result);
                // מרכז את המפה על המסלול
                const bounds = new google.maps.LatLngBounds();
                result.routes[0].legs[0].steps.forEach(s => {
                    bounds.extend(s.start_location);
                    bounds.extend(s.end_location);
                });
                map.fitBounds(bounds, { top: 80, bottom: 260, left: 20, right: 20 });
            }
        }
    );
}

function openInGoogleMaps() {
    if (!nearestShelter || !userLocation) return;
    const sl  = nearestShelter.geometry.location;
    const url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/` +
                `${sl.lat()},${sl.lng()}/@${sl.lat()},${sl.lng()},17z/data=!4m2!4m1!3e2`;
    window.open(url, '_blank');
}

// ================================================================
//  Alarm Sound — סירנה עם Web Audio API
// ================================================================
function playAlarm() {
    try {
        stopAlarm();
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        function tone(freq, start, dur) {
            const osc  = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime + start);
            osc.frequency.linearRampToValueAtTime(freq * 0.65, audioCtx.currentTime + start + dur);
            gain.gain.setValueAtTime(0.25, audioCtx.currentTime + start);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + start + dur);
            osc.start(audioCtx.currentTime + start);
            osc.stop(audioCtx.currentTime + start + dur);
        }

        // 6 גלי סירנה
        for (let i = 0; i < 6; i++) {
            tone(880, i * 0.7,       0.5);
            tone(660, i * 0.7 + 0.4, 0.3);
        }
    } catch (e) {
        console.warn('[מגן] שמע לא זמין:', e.message);
    }
}

function stopAlarm() {
    if (audioCtx) {
        audioCtx.close().catch(() => {});
        audioCtx = null;
    }
}

// ================================================================
//  Buttons
// ================================================================
function setupButtons() {
    document.getElementById('btn-navigate').addEventListener('click', () => {
        if (nearestShelter) navigateTo(nearestShelter.geometry.location);
        else if (userLocation) findNearestShelter(userLocation);
    });

    document.getElementById('btn-gmaps').addEventListener('click', openInGoogleMaps);

    document.getElementById('btn-dismiss').addEventListener('click', () => {
        isAlarmActive = false;
        hideOverlay();
        stopAlarm();
    });
}

// ================================================================
//  Status helpers
// ================================================================
function setGpsStatus(text, cls) {
    document.getElementById('gps-text').textContent = text;
    const dot = document.getElementById('gps-dot');
    dot.className = `dot ${cls}`;
    if (cls === 'on') dot.classList.add('pulse');
}

function setAlertStatus(text, isAlert) {
    document.getElementById('alert-text').textContent = text;
    document.getElementById('alert-icon').textContent = isAlert ? '🚨' : '🛡️';
}

function setConnStatus(text, cls) {
    document.getElementById('conn-text').textContent = text;
    document.getElementById('conn-dot').className    = `dot ${cls}`;
}
