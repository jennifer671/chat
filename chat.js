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
      mediaConnection.on("close", function () {
        var idGuestUscente1 = mediaConnection.peer;
        console.log("Il guest " + idGuestUscente1 + " ha lasciato la chiamata");
        const videoElementUscente = document.getElementById("_" + mediaConnection.peer);
        videoElementUscente.remove();
        var indice = remotePeerIdsGuest.indexOf(mediaConnection.peer);
        if (indice > -1) {
          remotePeerIdsGuest.splice(indice, 1);
        }
        console.log("eliminato");
        console.log("id del Guest presenti nella call. " + remotePeerIdsGuest);
      });
      const dataConnection = peer.connect(hostID);
      dataConnection.on("open", function () {
        console.log("connessione dati con L'HOST stabilita");
        //keepAlive(dataConnection);
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
              });
              // crea l'evento call gestito dal Guest2.
              const mediaConnection2 = peer.call(guestID, mediaStream);
              let callEsiste = false;
              mediaConnection2.on("stream", function (guestStream2) {
                if (!callEsiste) {
                  callEsiste = true;
                  console.log("Host risponde alla chiamata");
                  videoElement = addWebCamView("GUEST", guestStream2, true, mediaConnection2.peer);
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
              //keepAlive(dataConnection2);
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
            }); // mediaConnection2.on(Guest1)
          }
        });// dataConnection.send
      });
      // creo la cannessione e rispondo al evento call lanciata dal GUEST2.
      peer.on('connection', function (dataConnection2) {
        console.log(" connessione dati con il GUEST2 stabilita ");
        //keepAlive(dataConnection2);
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
          var idGuestUscente2 = mediaConnection2.peer;
          console.log("Il guest " + idGuestUscente2 + " ha lasciato la chiamata");
          const videoElementUscente = document.getElementById("_" + mediaConnection2.peer);
          videoElementUscente.remove();
          var indice = remotePeerIdsGuest.indexOf(mediaConnection2.peer);
          if (indice > -1) {
            remotePeerIdsGuest.splice(indice, 1);
          }
          console.log("eliminato");
          console.log("id del Guest presenti nella call. " + remotePeerIdsGuest);
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
