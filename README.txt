Apartment hunt briefing (Oct 2026 move)
=======================================

This folder is a self-contained website. No build step, no API keys.

How to open
-----------
1) Easiest: double-click index.html (or drag it into Chrome / Firefox / Safari).
   Listings are embedded in listings-data.js so the map and cards work from a file:// URL.

2) Optional local server (helpful if a browser blocks map tiles or fonts on file://):

     cd apartment-hunt-site
     python3 -m http.server 8000

   Then visit http://localhost:8000/

What to zip / email
-------------------
Zip the whole apartment-hunt-site folder (index.html, styles.css, app.js,
listings.json, listings-data.js, this README). Send the zip. Do not send only
index.html.

Data goes stale
---------------
Rents, unit numbers, EV stalls, and availability were captured 31 August 2026.
Assume anything can be gone by the time you tour. Re-check the listing, income
limits (Polaris LIHTC, AVA MFTE), parking fees, and charging in writing.

Map
---
Leaflet from unpkg CDN + OpenStreetMap tiles. Needs a network connection for
the map, fonts, and tiles. The rest of the page still reads offline.
