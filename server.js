var express = require('express');
var proxy = require('express-http-proxy');
var path = require('path');
var cors = require('cors');

var server = express();

var corsOptions = {
  origin: '*'
};

server.use(cors(corsOptions));

server.use(express.static(path.join(__dirname)));

var PORT = process.env.PORT || 3000;

server.listen(PORT, function () {
  console.log('Server listening on: ' + PORT);
});
