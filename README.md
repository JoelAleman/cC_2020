# Q'd Up, Music Co-streaming App

Q'd Up is a Web-app that creates a room in Google firebase where you and your friends can upload songs to a spotify queue hosted on a main phone.

## How it Works

Q'd up is hosted on a Firebase Web-app accessed by the 'Host' who creates a 'Room' which generates a 4 Letter code which 'Guests' connect to and add songs to the Firebase queue.

### OAuth2

To utilize the Spotify API, we required an Authentication Token from the Host's Spotify account. We used a node.js server to do this complete the Authentication.

### Firebase Server

The song queue is hosted on a Firebase server. Hosts use the Web interface to create a Room. The Room contains the Hosts Access Token all songs that are added to the queue by Guests. Songs are stored using their Spotify URI.

### Spotify Web Playback API & SDK

The Spotify Web Playback API & SDK gave us access to modifying the Hosts current playback. The Site is utilized as a spotify connect device which streams the music directly.

### Team Members
Joel Aleman, Austin Benoit, Caleb Warwick - Tier 2 Team
