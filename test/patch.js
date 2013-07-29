var patch = require("../lib/patch")
  , net = require("net")
  , https = require("https")
  , fs = require("fs");

// This is probably THE most ugliest code I've ever written
var ssl = {
  cert: fs.readFileSync(__dirname + "/ssl/cert.pem"),
  key: fs.readFileSync(__dirname + "/ssl/key.pem")
};

// The utlimate test: HTTPS (and therefore SPDY too)
var server = https.createServer(ssl, function(req, res) {
    console.log(req.socket.remoteAddress + ":" + req.socket.remotePort);
    res.end("Fuck yeah!");
  }).on("error", console.log);
patch(server, true).listen(3000, "localhost");