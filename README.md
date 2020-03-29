# peerjs server - docker run
0. generate certificate using Let's Encrypt 
0. `sudo docker run -p 9000:9000 -d -v <local/cert>:/cert:ro  peerjs/peerjs-server --sslkey /cert/key.pem --sslcert /cert/cert.pem --port 9000`