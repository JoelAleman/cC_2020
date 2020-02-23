/**
 * This is an app developed based off of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 * 
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var bodyParser = require('body-parser');
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var firebase = require('firebase/app');

require("firebase/auth");
require("firebase/database");

var firebaseConfig = {
    apiKey: "AIzaSyA3pJzomx74Ta9WsGKbQEjnCLV6QQvky_w",
    authDomain: "cc2020-music.firebaseapp.com",
    databaseURL: "https://cc2020-music.firebaseio.com",
    projectId: "cc2020-music",
    storageBucket: "cc2020-music.appspot.com",
    messagingSenderId: "44903163873",
    appId: "1:44903163873:web:bd6742325538fb269094a0"
};

firebase.initializeApp(firebaseConfig);

var client_id = '7f051016830846079e5fdab0624ac11c'; // Your client id
var client_secret = '918581585b9e499e8122e7c6a0793b58'; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());

app.use(bodyParser.urlencoded({extended: true}));

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.post('/join_room', function(req, res) {
  var roomKey = req.body.RoomKey;

  var ref = firebase.database().ref('/rooms/');
    ref.once('value', function(snapshot) {
      snapshot.forEach(function(childSnapshot) {
        var compareKey = childSnapshot.val()['roomKey'];
        if(roomKey.localeCompare(compareKey) == 0)
        {
          // This is the room we need
          res.redirect('/#roomKey='+roomKey);
        }
      });
    });
});

function createRoom(access_token, callback)
{
  var roomKey = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var charactersLength = characters.length;

  roomKey = '';
  for (var i = 0; i < 4; i++) {
    roomKey += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  var hostID = access_token;
  
  var postData = {
      queue: null,
      hostID: hostID,
      roomKey: roomKey
  }

  var newPostKey = firebase.database().ref().child('rooms').push().key;
  var updates = {};
  updates['/rooms/' + newPostKey] = postData;

  firebase.database().ref().update(updates);

  callback(roomKey);
}

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        createRoom(access_token, function(roomKey) {
          // we can also pass the token to the browser to make requests from there
          res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token,
            roomKey: roomKey
          }));
        })

        
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

app.get('/add_song', function (req, res) {

  var songURI = req.query.songURI;
  var roomKey = req.query.roomKey;

  var access_token = req.query.access_token;

  console.log('Adding songURI ' + songURI + ' to room ' + roomKey);

  // A post entry
  var postData = {
      songURI: songURI
  };

  // Get the identifier associated with the room that matches the 4-letter key
  // add the songURi to that room's queue
  var ref = firebase.database().ref('/rooms/');
    ref.once('value', function(snapshot) {
      snapshot.forEach(function(childSnapshot) {
        var compareKey = childSnapshot.val()['roomKey'];
        if(roomKey.localeCompare(compareKey) == 0)
        {
          // This is the room we need
          var roomID = childSnapshot.key;
          console.log('adding to roomID ' + roomID);

          var newPostKey = firebase.database().ref().child('rooms/' + roomID).push().key;
          var updates = {};
          updates['/rooms/' + roomID + '/queue/' + newPostKey] = postData;
          firebase.database().ref().update(updates);
        }
      });
    });
  if(access_token)
  {
    res.redirect("/#roomKey=" + roomKey + "&access_token=" + access_token);
  }
  else
  {
    res.redirect("/#roomKey=" + roomKey);
  }
});

function addSong(songURI, roomKey, callback)
{
  console.log('Adding songURI ' + songURI + ' to room ' + roomKey);

  var postData = {
      songURI: songURI
  };

  // Get the identifier associated with the room that matches the 4-letter key
  // add the songURi to that room's queue
  var ref = firebase.database().ref('/rooms/');
    ref.once('value', function(snapshot) {
      snapshot.forEach(function(childSnapshot) {
        var compareKey = childSnapshot.val()['roomKey'];
        if(roomKey.localeCompare(compareKey) == 0)
        {
          // This is the room we need
          var roomID = childSnapshot.key;
          console.log('adding to roomID ' + roomID);

          var newPostKey = firebase.database().ref().child('rooms/' + roomID).push().key;
          var updates = {};
          updates['/rooms/' + roomID + '/queue/' + newPostKey] = postData;
          firebase.database().ref().update(updates);
          callback("newPostKey"); // Now a string literal as a bandage
        }
      });
    });
}

var HttpClient = function ()
{
  this.get = function(url, access_token, callback) {
    console.log("GET request: " + url);
    console.log("access token: " + access_token);
    var anHttpRequest = new XMLHttpRequest();
    anHttpRequest.onreadystatechange = function() {
      if (anHttpRequest.readyState == 4 && anHttpRequest.status == 200)
      {
        callback(anHttpRequest.responseText);
      }
      else
      {
        console.log("error with GET request");
      }
    }

    anHttpRequest.open("GET", url, true);
    anHttpRequest.setRequestHeader('Accept', 'application/json');
    anHttpRequest.setRequestHeader('Content-Type', 'application/json');
    anHttpRequest.setRequestHeader('Authorization', 'Bearer ' + access_token);
    anHttpRequest.send(null);
  }
}

app.get('/make_room', function (req, res) {
  
  var roomKey = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var charactersLength = characters.length;

  roomKey = '';
  for (var i = 0; i < 4; i++) {
    roomKey += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  // Guarantee the new room will have a unique room key
  // Fails because of sync issues
  /**
  var uniqueKeyFound = false;
  while(!uniqueKeyFound)
  {
    roomKey = '';
    for (var i = 0; i < 4; i++) {
      roomKey += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    var ref = firebase.database().ref('/rooms/');
    uniqueKeyFound = true;
    ref.once('value', function(snapshot) {
      snapshot.forEach(function(childSnapshot) {
        var compareKey = childSnapshot.val()['roomKey'];
        console.log('Comparing against key: ' + compareKey);
        if(roomKey.localeCompare(compareKey) == 0)
        {
          uniqueKeyFound = false;
          console.log('Duplicate key found: ' + roomKey);
        }
      });
    });
  }
  */

  var hostID = req.query.hostID;
  
  var postData = {
      queue: null,
      hostID: hostID,
      roomKey: roomKey
  }

  var newPostKey = firebase.database().ref().child('rooms').push().key;
  var updates = {};
  updates['/rooms/' + newPostKey] = postData;

  firebase.database().ref().update(updates);

  // the roomKey does not render on the page unless it is passed twice in this way.
  // something about it freaks out with it is the first argument
  res.redirect("/#access_token=" + hostID + "&roomKey=" + roomKey);
});

// For now, this function automatically adds the top search result
// to the queue, and doesn't present a menu for selection.
app.post('/search', function(req, res) {
  var searchTerm = req.body.searchTerm;
  var type = "track";
  var market = "US";
  var limit = "5";
  var offset = "0";
  searchTerm.split(" ").join("%%20");
  searchTerm.split("&").join("%%26");
  searchTerm.split(",").join("%%2");

  searchTerm = searchTerm.replace(/ /g, "%20");
  searchTerm = searchTerm.replace(/&/g, "%26");
  searchTerm = searchTerm.replace(/,/g, "%2");

  var url = "https://api.spotify.com/v1/search?q="+searchTerm+"&type="+type+"&market="+market+"&limit="+limit+"&offset="+offset;

  var roomKey = req.query.roomKey;

  // get the access token of the room given the roomKey
  var ref = firebase.database().ref('/rooms/');
  ref.once('value', function(snapshot) {
    snapshot.forEach(function(childSnapshot) {
      var compareKey = childSnapshot.val()['roomKey'];
      if(roomKey.localeCompare(compareKey) == 0)
      {
        var access_token = childSnapshot.val()['hostID'];
        var client = new HttpClient();
        client.get(url, access_token, function(response) {
          var json = JSON.stringify(eval("(" + response + ")"));
          console.log(json);
          var track = json[0][1]['uri'];
          addSong(track, roomKey, function(songRef) {
            // could do something with the reference to the song if desired
          });
          // app.set('json spaces', 4);
          // res.json(response);
        });
      }
    });
  });
});

console.log('Listening on 8888');
app.listen(8888);
