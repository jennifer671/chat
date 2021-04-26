/*
 From https://github.com/morgan3d/misc/
 Created by Morgan McGuire in 2020 R  eleased into the public domain.*/
'use strict';
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
var remotePeerIdsGuest = []; // Array dei guest connessi.
var peerList = []; // Array connessioni ricevute dal host. 
var contatore = 0;
let flagAudio = true;
let flagVideo = true;

function chiudi_finestra() {
  if (confirm("Vuoi chiudere la chiamata?")) {
    window.location.reload();
    console.log("chiuso");
  }
}

function muteAudio() {
  if (flagAudio === true) {
    if (confirm("Vuoi disattivare l'audio?")) {
      navigator.mediaDevices.getUserMedia({
        audio: {
          volume: 0.0
        }
      });
      flagAudio = false;
    }
  } else {
    if (confirm("Vuoi attivare l'audio?")) {
      navigator.mediaDevices.getUserMedia({
        audio: {
          volume: 1.0
        }
      });
      flagAudio = true;
    }
  }
}

function muteVideo() {
  if(flagVideo === true) {
    if (confirm("Vuoi disattivare il video?")) {
        navigator.mediaDevices.getUserMedia({
          video: {
            width: -512,
            height: -512,
          }
        });
     
        flagVideo = false; 
      } 
    } else {
      if (confirm("Vuoi attivare il video?")) {
        navigator.mediaDevices.getUserMedia({
          video: {
            width: 512,
            height: 512
          }
        });
        flagVideo = true;
      } 
  }
  

}
const peerConfig = {
  debug: 1
  /*host: 'localhost',
          port: 9000,
          path: '/myapp',
          key: 'peerjs'*/
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
  console.log("Sono nel keep alive");
  // Undefined until the first message comes in
  let lastTime = undefined;
  // Save the ID, which may become invalid if the connection fails
  const elementID = "_" + dataConnection.peer;
  const videoElement = document.getElementById(elementID); 
  if(videoElement === undefined) {
    console.log("Sono nell'if");
    videoElement.remove();
  }
  /*function ping() {
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
      //dataConnection.send(KEEP_ALIVE_MESSAGE);
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
  ping(dataConnection);*/
  
}
function startHost() {

  console.log("start Host");
  // genera l'id del Host
  const id = sessionStorage.getItem('id') || generateUniqueID();
  localStorage.setItem('id', id);
  /*var peer = new Peer(id, {
            secure: true,
            host: 'videodesk-ennesimo.herokuapp.com',
            port: 443,
            path: '/'
          }); // un peer puo' connettersi usando questo id*/

  const peer = new Peer(id, peerConfig);
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
    document.getElementById("box1").innerHTML = `<button onclick="chiudi_finestra();return false;" > Chiudi Chiamata 📞</button><a href="#"><button onclick= "muteAudio();" >On/Off Audio 🔊</button><button onclick= "muteVideo();" >On/Off Video 📷</button></a>`;

    // visualizza il video del HOST
    startWebCam(function (mediaStream) {
      addWebCamView("TU : HOST", mediaStream, false, id);
      let videoElement = undefined;
      //Emesso quando viene stabilita una nuova connessione dati da un peer remoto 
      // CONNETTI
      peer.on('connection', function (dataConnection) {
        console.log(" connessione dati con il GUEST stabilita ");
        //keepAlive(dataConnection);
        peerList.push(dataConnection.peer);
        console.log(" Connessioni con L'HOST " + peerList.length);
        //L'Host invia al guest una stringa contenente tutti gli id dei Guest che si connessi.
        dataConnection.on('open', function () {
          dataConnection.send(remotePeerIdsGuest);
        });// dataConnection.on
      }); // peer.on(connection)
      //Emesso quando un peer remoto tenta di chiamarti. L'emissione mediaConnection non è ancora attiva; devi prima rispondere alla chiamata
      // CHIAMA
      peer.on('call', function (mediaConnection) {
        console.log("GUEST chiamato");
        // rispondo alla call fornendo lo stram dell'HOST
        mediaConnection.answer(mediaStream);
        // chiudi 
        mediaConnection.on("close", function () {
          var idGuestUscente = mediaConnection.peer;
          console.log("Il guest " + idGuestUscente + " ha lasciato la chiamata");
          console.log("decrementa il numero di ospiti");
          peerList.pop();
          console.log("connessioni " + peerList.length);
          const videoElementUscente = document.getElementById("_" + mediaConnection.peer);
          videoElementUscente.parentNode.removeChild(videoElementUscente);
          videoElementUscente.remove();
          var indice = remotePeerIdsGuest.indexOf(mediaConnection.peer);
          if (indice > -1) {
            remotePeerIdsGuest.splice(indice, 1);
          }
          console.log("eliminato");
          console.log("id del Guest presenti nella call. " + remotePeerIdsGuest);
        });
        let callEsiste = false;
        // Quando il GUEST si connette aggiungi il suo stream
        mediaConnection.on('stream', function (guestStream) {
          if (!callEsiste) {
            callEsiste = true;
            console.log(" Video del GUEST trasmesso ");
            videoElement = addWebCamView("GUEST", guestStream, true, mediaConnection.peer);
            remotePeerIdsGuest.push(mediaConnection.peer);
            console.log("id del Guest che ha risposto alla call. " + remotePeerIdsGuest);
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
  ).innerHTML = `Tu sei il GUEST nella stanza ${hostID}. Un altro guest puo' connettersi a questo URL:<br><span style="white-space:nowrap; cursor: pointer; font-weight: bold" onclick="clipboardCopy('${url}')" title="Copy to Clipboard"><input title="Copy to Clipboard" type="text" value="${url}" id="urlTextBox">&nbsp;<b style="font-size: 125%">⧉</b></span>`;
  document.getElementById("box1").innerHTML = `<button onclick="chiudi_finestra();return false;" > Chiudi Chiamata 📞</button><a href="#"><button onclick= "muteAudio();" >On/Off Audio 🔊</button><button onclick= "muteVideo();" >On/Off Video 📷</button></a>`;
  var guestId = generateUniqueID();
  console.log("Id del guest" + guestId);
  /*var peer = new Peer(guestId, {
      secure: true,
      host: 'videodesk-ennesimo.herokuapp.com',
      port: 443,
      path: '/'
    });*/
  const peer = new Peer(guestId, peerConfig);
  // salvo l'oggetto peer nella mia sessione.
  sessionStorage.setItem('peer', peer);
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
      const dataConnection = peer.connect(hostID);
      dataConnection.on("open", function () {
        console.log("connessione dati con L'HOST stabilita");
        keepAlive(dataConnection);
        //ricevi id dei guest dal Host.
        dataConnection.on('data', function (data) {
          var idDeiGuest = data;
          for (var i = 0; i < idDeiGuest.length; i++) {
            var conta = i + 1;
            console.log("id del Guest n." + conta + ": ", idDeiGuest[i]);
          }
          //salvo gli id dei guest nella memoria locale.
          sessionStorage.setItem('idGuest', idDeiGuest);
          for (var i = 0; i < idDeiGuest.length; i++) {
            if (idDeiGuest[i] !== guestId) {
              console.log("inizializza una connessione tra i Guest");
              var guestID = idDeiGuest[i];
              console.log(" id del guest remoto 1 " + guestID);
              // definisco una nuova data Connection verso il Guest2.
              const dataConnection2 = peer.connect(guestID);
              dataConnection2.on("open", function () {
                console.log("Altra connessione stabilita");
               keepAlive(dataConnection2);
              });
              // crea l'evento call gestito dal Guest2.
              const mediaConnection2 = peer.call(guestID, mediaStream);
              let callEsiste = false;
              mediaConnection2.on("stream", function (guestStream2) {
                if (!callEsiste) {
                  callEsiste = true;
                  console.log("Host risponde alla chiamata");
                  videoElement = addWebCamView("GUEST AGGIUNTO", guestStream2, true, mediaConnection2.peer);
                } else {
                  console.log("elimina i duplicati");
                }
              },
                function (err) {
                  console.log("fallito", err);
                }
              ); //mediaConnection2.on('stream')
            }
          }
          // verifico la presenza di altri Guest.
          if (idDeiGuest[i] !== idDeiGuest[i + 1]) {
            // creo la cannessione e rispondo al evento call lanciata dal GUEST2.
            peer.on('connection', function (dataConnection2) {
              console.log(" connessione dati con il GUEST2 stabilita ");
              keepAlive(dataConnection2);
            });
            peer.on('call', function (mediaConnection2) {
              console.log("GUEST2 chiamato");
              // rispondo alla call fornendo lo stram dell'Guest1
              mediaConnection2.answer(mediaStream);
              let callEsiste = false;
              mediaConnection2.on('close', function () {
                console.log('guest left the call');
              });
              mediaConnection2.on('stream', function (guestStream) {
                if (!callEsiste) {
                  callEsiste = true;
                  console.log(" Video del GUEST trasmesso ");
                  videoElement = addWebCamView("GUEST", guestStream, true, mediaConnection2.peer);
                } else {
                  console.log("Elimina il duplicato");
                }
              },
                function (err) {
                  console.log("Stream del guest fallito ", err);
                });
            }); // mediaConnection2.on(Guest1)
          }
        });// dataConnection.send
      });
      // creo la cannessione e rispondo al evento call lanciata dal GUEST2.
      peer.on('connection', function (dataConnection2) {
        console.log(" connessione dati con il GUEST2 stabilita ");
        keepAlive(dataConnection2);
      });
      peer.on('call', function (mediaConnection2) {
        console.log("GUEST2 chiamato");
        // rispondo alla call fornendo lo stram dell'Guest1
        mediaConnection2.answer(mediaStream);
        let callEsiste = false;
        mediaConnection2.on('stream', function (guestStream) {
          if (!callEsiste) {
            callEsiste = true;
            console.log(" Video del GUEST trasmesso ");
            videoElement = addWebCamView("GUEST", guestStream, true, mediaConnection2.peer);
          } else {
            console.log("Elimina il duplicato");
          }
        },
          function (err) {
            console.log("Stream del guest fallito ", err);
          });
        mediaConnection2.on("close", function () {
          var idGuestUscente = mediaConnection.peer;
          console.log("Il guest " + idGuestUscente + " ha lasciato la chiamata");
          const videoElementUscente = document.getElementById("_" + mediaConnection2.peer);
          videoElementUscente.remove();
          var indice = remotePeerIdsGuest.indexOf(mediaConnection2.peer);
          if (indice > -1) {
            remotePeerIdsGuest.splice(indice, 1);
          }
          console.log("eliminato");
          
        });
      }); // mediaConnection2.on
      // decremento il numero di guest che lasciano la chiamata
    }); // startWebCam
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
