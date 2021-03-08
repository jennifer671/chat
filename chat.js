/*
 From https://github.com/morgan3d/misc/
 Created by Morgan McGuire in 2020
 Released into the public domain.
*/
"use strict";

/*
 There is no consistent way to detect a closed WebRTC
 connection, so we have to send keepalive messages. PeerJS
 has its own parameters for ping rates, but does not appear
 to use them at present on investigating the code.
*/
const KEEP_ALIVE_INTERVAL_MS = 0.25 * 1000;
const KEEP_ALIVE_MESSAGE = "KEEP_ALIVE";

// How many intervals can be missed before we drop connection
const MISSABLE_INTERVALS = 10;


var remotePeerIdsGuest = []; // id dei guest
var connections = []; // registrare lo strem delle persone connesse.
var contatore = 0; // contatore globale per contare le persone connesse.
var remotePeerId = [];

const peerConfig = {
  debug: 1 /*
    host: "peer.???.org",
    port: 9001,
    path: '/remoteplay',
    key: 'remoteplay'*/
};

function generateUniqueID() {
  const length = 8;
  const prefix = "xc";
  const number = (Math.random() + (performance.now() % 1000) / 1000) % 1;
  return prefix + number.toFixed(length).substring(2);
}

/* Milliseconds since epoch in UTC. Used for detecting when the last keepAlive
   was received. */
function now() {
  return new Date().getTime();
}

function startWebCam(callback) {
  console.log("startWebCam");
  if (!navigator.mediaDevices) {
    console.log("No media devices. Probably running without https");
    return;
  }

  navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: { width: 512, height: 512, facingMode: "user" }
    })
    .then(callback)
    .catch(function (err) {
      console.log(err);
    });
}

/* Returns the DOM element that was added */
function addWebCamView(caption, mediaStream, playAudio, id) {
  console.log("addWebCamView for " + caption);
  const videobox = document.getElementById("videobox");
  const frame = document.createElement("div");
  frame.className = "videoFrame";
  frame.id = "_" + id;
  frame.innerHTML = `<div style="width: 100%">${caption}</div><div class="warning">⚠</div>`;
  const video = document.createElement("video");
  video.setAttribute("autoplay", true);
  // video.setAttribute('controls', true);
  video.srcObject = mediaStream;
  video.muted = !playAudio;
  frame.appendChild(video);
  videobox.appendChild(frame);

  return frame;
}

/* Write to the clipboard. Hard-coded to the specific URL box */
function clipboardCopy(text) {
  const urlTextBox = document.getElementById("urlTextBox");
  urlTextBox.select();
  urlTextBox.setSelectionRange(0, 99999);
  document.execCommand("copy");
  setTimeout(function () {
    urlTextBox.blur();
  });
}

/* Perpetually send keep alive messages to this dataConnection, and listen for them
   coming back. getVideo() is a callback because the video may not be available right
   when the data connection is. */
function keepAlive(dataConnection) {
  // Undefined until the first message comes in
  let lastTime = undefined;

  // Save the ID, which may become invalid if the connection fails
  const elementID = "_" + dataConnection.peer;

  function ping() {
    const currentTime = now();
    if (
      lastTime &&
      currentTime - lastTime > MISSABLE_INTERVALS * KEEP_ALIVE_INTERVAL_MS
    ) {
      // The other side seems to have dropped connection
      console.log(
        "lost connection. ",
        (currentTime - lastTime) / 1000,
        "seconds without a keepAlive message."
      );
      const videoElement = document.getElementById(elementID);
      if (videoElement) {
        videoElement.remove();
      }
      // Ending the iterative callback chain should allow garbage collection to occur
      // and destroy all resources
    } else {
      // console.log('sent KEEP_ALIVE message');
      dataConnection.send(KEEP_ALIVE_MESSAGE);

      // Show or hide the connection warning as appropriate. Note that the element might not exist
      // right at the beginning of the connection.
      const connectionIsBad =
        lastTime && currentTime - lastTime >= 2 * KEEP_ALIVE_INTERVAL_MS;

      const warningElement = document.querySelector(
        "#" + elementID + " .warning"
      );
      if (warningElement) {
        warningElement.style.visibility = connectionIsBad
          ? "visible"
          : "hidden";
      }

      // Schedule the next ping
      setTimeout(ping, KEEP_ALIVE_INTERVAL_MS);
    }
  }

  // Do not put these in dataConnection.on or they can fail due to a race condition
  // with initialization and never run.
  dataConnection.on("data", function (data) {
    if (data === KEEP_ALIVE_MESSAGE) {
      lastTime = now();
    }
    // console.log('received data', data);
  });

  // Start the endless keepAlive process
  ping(dataConnection);
}
function startHost() {
  console.log("start Host");
  // genera l'id del Host
  const id = localStorage.getItem('id') || generateUniqueID();
  localStorage.setItem('id', id);
  var peer = new Peer(id, peerConfig); // un peer puo' connettersi usando questo id
  // imposta i parametri per gli eventi tra i peer 
  peer.on('errore', function (err) {
    console.log("errore nel Host:", err);
  });
  // Emesso quando viene stabilita una connessione con il peerHost 
  // APRI 
  peer.on('open', function (id) {
    console.log("L'Id peer dell' HOST : " + id);
    const url = "https://jennifer671.github.io/chat?" + id;
    document.getElementById("urlbox"
    ).innerHTML = `Tu sei l' HOST. Un guest puo' connettersi a questo URL :<br><span style="white-space:nowrap; cursor: pointer; font-weight: bold" onclick="clipboardCopy('${url}')" title="Copy to Clipboard"><input title="Copy to Clipboard" type="text" value="${url}" id="urlTextBox">&nbsp;<b style="font-size: 125%">⧉</b></span>`;
    // visualizza il video del HOST
    startWebCam(function (mediaStream) {
      addWebCamView("TU : HOST", mediaStream, false, id);
      let videoElement = undefined;
      //Emesso quando viene stabilita una nuova connessione dati da un peer remoto 
      // CONNETTI
      peer.on('connection', function (dataConnection) {
        console.log(" connessione dati con il GUEST stabilita ");
        keepAlive(dataConnection);
      }); // peer.on(connection)
      //Emesso quando un peer remoto tenta di chiamarti. L'emissione mediaConnectionnon è ancora attiva; devi prima rispondere alla chiamata
      // CHIAMA
      peer.on('call', function (mediaConnection) {
        console.log("GUEST chiamato");
        // rispondo alla call fornendo lo stram dell'HOST
        mediaConnection.answer(mediaStream);
        // chiudi 
        mediaConnection.on("close", function () {
          console.log("Il guest ha lasciato la chiamata");
          console.log("decrementa il numero di ospiti");
          var variabile = connections.length;
          contatore = contatore - 1;
          if (contatore < variabile) {
            connections.pop();
            console.log("Nuovo numero ospiti " + contatore);
            console.log("connessioni " + connections.length);
          }
        });
        let callEsiste = false;
        // Quando il GUEST si connette aggiungi il suo stream
        var remoteStream;
        mediaConnection.on('stream', function (guestStream) {
          if (!callEsiste) {
            callEsiste = true;
            remoteStream = guestStream;
            console.log(" Video del GUEST trasmesso ");
            console.log(" remote Stream " + remoteStream)
            videoElement = addWebCamView("GUEST", guestStream, true, mediaConnection.peer);
            remotePeerIdsGuest.push(videoElement.id.slice(1, 11));
            console.log("id del Guest che ha risposto alla call. " + remotePeerIdsGuest);
            connections.push(remoteStream);
            console.log("connessione" + connections);

            for (var i = 0; i < connections.length; i++) { // Creo un ciclo in cui conto il numero di guest che si collegano con L'host
              if (contatore < connections.length) {
                contatore++;
              }
            }
            console.log("N. ospiti " + contatore);// conto il numero di guest che l'host ha chiamato.

            if (contatore > 1) {
              var idRemoto = remotePeerIdsGuest[remotePeerIdsGuest.length - 1];
              var remoteStream = connections[connections.length - 1];
              console.log(" Inizializa connessione con i GUEST ");
              console.log(" ultimo id che si e' connesso : " + idRemoto);
              let callEx = false;
              let videoElement2 = undefined;
              ///////////////////////////////////////////////////////////
              //////// codice stamattina ////////
              peer.on('connection',function(dataConnection2){
                console.log('connessione dati con il guest Stabilita');
                keepAlive(dataConnection2);
              });
              peer.on('call', function(mediaConnection2){
                console.log("Altro guest chiamato");
                // rispondo alla call con il mediaStram Del guest remoto
                mediaConnection2.answer(mediaStream);
                mediaConnection2.on('close', function(){
                  console.log("il guest ha lasciato la chiamata 2");
                });
                mediaConnection2.on('stram',function(remoteStream){
                  if(!callEx) {
                    videoElement2 = addWebCamView('altro ospite', remoteStream,true, mediaConnection2.peer);
                  } 
                });// mediaConnection2.on 
              });// peer.on call 2
        }

              //const mediaConnection2 = peer.call(idRemoto, mediaStream);
              
              // mediaConnection.on('stream', function (remoteStream) {
              //console.log("1");
              //videoElement = addWebCamView("Guest", remoteStream, true, mediaConnection2.peer);

              //});
              /*mediaConnection2.answer(mediaStream);
              console.log("connessione dati con il GUEST stabilita");
              const dataConnection = peer.connect(idRemoto);
              dataConnection.on("open", function () {
                console.log("data connection to host established");
                keepAlive(dataConnection);
              });*/

            
          } else {
            console.log("Elimina il duplicato");
          }
        },
          function (err) {
            console.log("Stream del guest fallito ", err);
          });
      },
        function (err) {
          console.log("chiamata con il guest fallita ", err);
        }


      ); // peer.on(call)
    }); // startWebCam
  });// peer.on(open)
}

function startGuest() {
  console.log("StartGuest");
  const hostID = window.location.search.substring(1);
  const url = "https://jennifer671.github.io/chat?" + hostID;
  document.getElementById(
    "urlbox"
  ).innerHTML = `Tu sei il guest nella stanza ${hostID}. Un altro guest puo connettersi a questo url:<br><span style="white-space:nowrap; cursor: pointer; font-weight: bold" onclick="clipboardCopy('${url}')" title="Copy to Clipboard"><input title="Copy to Clipboard" type="text" value="${url}" id="urlTextBox">&nbsp;<b style="font-size: 125%">⧉</b></span>`;
  var guestId = generateUniqueID();
  console.log("Id del guest" + guestId);
  const peer = new Peer(guestId, peerConfig);

  peer.on("error", function (err) {
    console.log("error in guest:", err);
  });
  // APRI 
  peer.on("open", function (id) {
    startWebCam(function (mediaStream) {
      console.log("web cam aperta");
      addWebCamView("GUEST", mediaStream, false, id);
      // il guest risponde alla chiamata del Host
      console.log("chiama host");
      let videoElement = undefined;
      let alreadyAddedThisCall = false;
      // imposta i parametri per inizializzare lo stream
      const mediaConnection = peer.call(hostID, mediaStream);
      mediaConnection.on("stream", function (hostStream) {
        if (!alreadyAddedThisCall) {
          alreadyAddedThisCall = true;
          console.log("Host risponde alla chiamata");
          videoElement = addWebCamView("HOST", hostStream, true, mediaConnection.peer);
          console.log("id del Host connesso " + videoElement.id.slice(1, 11));
        } else {
          console.log("elimina i duplicati");
        }
      },
        function (err) {
          console.log("host stream failed with", err);
        }
      ); //mediaConnection.on('stream')
      console.log("cconnessione dati con L'HOST stabilita");
      const dataConnection = peer.connect(hostID);
      dataConnection.on("open", function () {
        console.log("data connection to host established");
        keepAlive(dataConnection);
      });
    }); // startWebCam
    ////////////////////////////////////////////////////////////////////
    if (contatore > 1) {
      console.log("0");
      var idRemoto = remotePeerIdsGuest[remotePeerIdsGuest.length - 1];
      const mediaConnection2 = peer.call(idRemoto, mediaStream);
      mediaConnection2.on('stream', function (remoteStream) {
        console.log("1");
        videoElement2 = addWebCamView("Guest", remoteStream, true, mediaConnection2.peer);
        /////////////////////////////////////////////////////////////////////////////////////////////
      });// mediaConnection2.on
      console.log("connessione dati Stabilita");
      const dataConnection2 = peer.connect(idRemoto);
      dataConnection2.on('open', function(){
        console.log('connessione dati stabilita');
        keepAlive(dataConnection2);
      });
    }
  }); // peer.on('open')
}

function main() {
  document.getElementById("urlbox").style.visibility = "visible";
  if (window.location.search !== "") {
    startGuest();
  } else {
    startHost();
  }

}
