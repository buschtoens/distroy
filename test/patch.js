var patch = require("../lib/patch")
  , net = require("net")
  , https = require("https")
  , fs = require("fs");

// This is probably THE most ugliest code I've ever written
var responseRegExp = /^([0-9a-z-]{36}) (.*)$/i;
var host = net.createServer(function(socket) {
  var i = 0;
  socket.setEncoding("utf8");
  socket.on("data", function(data) {
    switch(i) {
      case 0: socket.write("SUCCESS"); break;
      default: socket.write(data.match(responseRegExp)[1] + " " + JSON.stringify({
        peername: { address: "peer-address", port: 1234 },
        sockname: { address: "sock-address", port: 1234 }
      }));
    }
    i++;
  });
}).listen(0).address().port;

var ssl = {
  cert: fs.readFileSync(__dirname + "/ssl/cert.pem"),
  key: fs.readFileSync(__dirname + "/ssl/key.pem")
};

// The utlimate test: HTTPS (and therefore SPDY too)
var server = https.createServer(ssl, function(req, res) {
    console.log(req.socket.remoteAddress + ":" + req.socket.remotePort);
    res.end("Fuck yeah!");
  }).on("error", console.log);
patch(host, server, true).listen("address");