# Q'd Up, Music Co-streaming App

Q'd Up is a web-app that allows you and your friends to contribute to a shared queue that gets played through a single, 'Host' Spotify account.

Q'd Up was developed by Joel Aleman, Austin Benoit, and Caleb Warwick; a Tier 2 team competing in Crimson Code 2020.

## Using Q'd Up
Q'd Up makes use of API keys not publically available in this repo. To run your own instance of Q'd Up, you will have to create your own Firebase application and obtain your own information from the Firebase console in addition to your own Spotify API keys.

The sample file API_KEYS_SAMPLE.json lays out how the API keys need to be saved. Put your information into this file and rename it to API_KEYS.json and you will create your own instance of Q'd Up using your own Firebase database and your own Spotify developer API keys.

## How it Works

Q'd Up is a Node.js web-app accessed by the 'Host' who creates a 'Room' which generates a 4 letter room key that 'Guests' use to connect to the room and add songs to the queue. The rooms and their corresponding queues are hosted in Firebase, and the Spotify API is utilized to authenticate the host for playback on their device.

### OAuth2

To utilize the Spotify API, we required an Authentication Token from the Host's Spotify account, handled by the Node.js application's code.

### Firebase Server

The rooms and their corresponding song queues are stored a Firebase Realtime Database. The Room contains the host's Refresh Token (for persistant authentication purposes), the room key used to enter the room by Guests, and the shared song queue that Hosts and Guests alike can contribute to, which stores the Spotify track URI corresponding to each song.

### Spotify Web Playback API & SDK

The Spotify Web Playback API & SDK gave us access to modifying the Host's current playback. The site is utilized as a Spotify Connect device which streams the music directly through the browser.
