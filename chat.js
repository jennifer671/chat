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

function startGuest() {
  console.log("startGuest");
  const hostID = window.location.search.substring(1);
 // document.getElementById(
   // "urlbox"
 // ).innerHTML = `tu sei il guest nella stanza ${hostID}.`;
   const url = "https://jennifer671.github.io/chat?" + hostID;
    document.getElementById(
      "urlbox"
    ).innerHTML = `Tu sei il guest nella stanza ${hostID}. Un altro guest puo connettersi a questo url:<br><span style="white-space:nowrap; cursor: pointer; font-weight: bold" onclick="clipboardCopy('${url}')" title="Copy to Clipboard"><input title="Copy to Clipboard" type="text" value="${url}" id="urlTextBox">&nbsp;<b style="font-size: 125%">⧉</b></span>`;
  var guestId =  generateUniqueID();
  console.log("Id del guest" + guestId);
 
  const peer = new Peer(guestId, peerConfig);

  peer.on("error", function (err) {
    console.log("error in guest:", err);
  });

  peer.on("open", function (id) {
    startWebCam(function (mediaStream) {
      console.log("web cam aperta");

      addWebCamView("TU (lato guest)", mediaStream, false, id);

      // il guest risponde alla chiamata del Host
      console.log("chiama host");
      let videoElement = undefined;
      let alreadyAddedThisCall = false;

      const mediaConnection = peer.call(hostID, mediaStream);
      mediaConnection.on(
        "stream",
        function (hostStream) {
          if (!alreadyAddedThisCall) {
            alreadyAddedThisCall = true;
            console.log("Host risponde alla chiamata");
            videoElement = addWebCamView("Host",hostStream,true,mediaConnection.peer);
            console.log("id del Host connesso " + videoElement.id);
          } else {
            console.log("elimina i duplicati");
          }
        },

        function (err) {
          console.log("host stream failed with", err);
        }
      ); //mediaConnection.on('stream')

      console.log("connect data to host");
      const dataConnection = peer.connect(hostID);
      dataConnection.on("open", function () {
        console.log("data connection to host established");
        keepAlive(dataConnection);
      });
    }); // startWebCam
  }); // peer.on('open')
}


/*function startGuestToGuest() {
  console.log("inizializza chiamata tra Guest");
  var idGuestRemoti = remotePeerIdsGuest[1];
  const peer = new Peer(idGuestRemoti, peerConfig);
 
  var remoteStream = connections;// prendo lo stream del Guest 1
  
  peer.on("error", function (err) {
    console.log("error in guest:", err);
  });
  
  console.log("chiama Guest");

 /* let videoElement2 = undefined;
  let videoEsistente = false;
  const mediaConnection = peer.call(idGuestRemoti, remoteStream);
  
  mediaConnection.on("stram remoto", function (remoteStream) {
    
    if (!videoEsistente) {
      videoesistente = true;
      console.log("Guest risponde a guest");
      videoElement2 = addWebCamView("ospite Aggiunto", remoteStream, true, mediaConnection.peer);
    } else {
      console.log("elimina i duplicati");
    }

  });
  console.log("connessione dati con il guest ");
  const dataConnection = peer.connect(idGuestRemoti);
  dataConnection.on("open", function () {
    console.log("connessione con il guest stabilita");
    keepAlive(dataConnection);
  });*/
 /*peer.on("connection", function (dataConnection) {

    console.log("Connessione con i guest ");
    keepAlive(dataConnection);
  });
  peer.on(
    "call",
    function (mediaConnection) {
      console.log("Guest1 chiamato");
      //Risponde alla chiamata ottenendo il tuo video
      mediaConnection.answer(mediaStream);

      //chiude la chiamata se non supportato
      mediaConnection.on("close", function () {
        console.log("Il guest ha lasciato la chimata");
      });
      let chiamataGiaAggiunta = false;

      //quando il guest risponde aggiungi il suo stream
      mediaConnection.on("stream", function (remoteStream) {
        //console.log("id del guest " + guestStream.id);
        //connections.push(guestStream);
        if (!chiamataGiaAggiunta) {
          chiamataGiaAggiunta = true;
          console.log("Video del guest ottenuto.");
          videoElement = addWebCamView("Ospite", remoteStream, true, mediaConnection.peer
          );
          

        } else {
          console.log("Elimina il duplicato");
        }
        
      },
        function (err) {
          console.log("Stream con guest fallito con err: " + err);
        }
      );
    },
    function (err) {
      console.log("la chiamata con il guest e fallita con: " + err);
    }
  ); //peer on call


}*/



function startHost() {
  // crea una nuova connessione
  console.log("start Host");
  const id = localStorage.getItem("id") || generateUniqueID();
  localStorage.setItem("id", id);
  var peer = new Peer(id, peerConfig);
 
  //Apro connessione. stampa peer id dell host

  peer.on("open", function (id) {
    console.log("My peer ID is: " + id);

    const url = "https://jennifer671.github.io/chat?" + id;
    document.getElementById(
      "urlbox"
    ).innerHTML = `Tu sei l host. Un guest puo connettersi a questo url:<br><span style="white-space:nowrap; cursor: pointer; font-weight: bold" onclick="clipboardCopy('${url}')" title="Copy to Clipboard"><input title="Copy to Clipboard" type="text" value="${url}" id="urlTextBox">&nbsp;<b style="font-size: 125%">⧉</b></span>`;
    //Inizializzo webcam
    
    startWebCam(function (mediaStream) {
      
      addWebCamView("Tu", mediaStream, false, id);
      let videoElement = undefined;
      
      peer.on("connection", function (dataConnection) {
        
        console.log("Connessione con il guest stabilita.");
        keepAlive(dataConnection);
      });
      peer.on(
        "call",
        function (mediaConnection) {
          console.log("Guest chiamato");
          //Risponde alla chiamata ottenendo il tuo video
          mediaConnection.answer(mediaStream);

          //chiude la chiamata se non supportato
          mediaConnection.on("close", function () {
          console.log("Il guest ha lasciato la chiamata");
          console.log("decrementa il numero di ospiti");
            var variabile = connections.length;
             contatore = contatore - 1 ;
             if(contatore < variabile){
                connections.pop();
                console.log("Nuovo numero ospiti " + contatore);
                console.log("connessioni " + connections.length);
              }

          });
          let chiamataGiaAggiunta = false;
          
          //quando il guest risponde aggiungi il suo stream
          mediaConnection.on("stream", function (guestStream) {
            //console.log("id del guest " + guestStream.id);
            //connections.push(guestStream);
            if (!chiamataGiaAggiunta) {
              chiamataGiaAggiunta = true; 
              console.log("Video del guest ottenuto.");
              videoElement = addWebCamView("Ospite", guestStream, true, mediaConnection.peer
              );
              remotePeerIdsGuest.push(videoElement.id.slice(1,11));
              console.log("id del guest che ha risposto alla call" + remotePeerIdsGuest);
              connections.push(guestStream);
              console.log("connessione" + connections);
              for (var i = 0; i < 8; i++) { // Creo un ciclo in cui conto il numero di guest che si collegano con L'host
                if (connections.length > 0) {
                  contatore++;
                }
                return console.log("N. ospiti " + contatore);// conto il numero di guest che l'host ha chiamato.
              }

            } else {
              console.log("Elimina il duplicato");
            }
            if (contatore > 1) {
              startGuestToGuest(); // inizializzo la chiamata tra i guest
            }
          },
            function (err) {
              console.log("Stream con guest fallito con err: " + err);
            }
          );
        },
        function (err) {
          console.log("la chiamata con il guest e fallita con: " + err);
        }
      ); //peer on call
    }); // start webcam
  }); //peer on Open
}

function main() {
  document.getElementById("urlbox").style.visibility = "visible";
  if (window.location.search !== "") {
    startGuest();
  } else {
    startHost();
  }

}
