/**
 * Module dependencies.
 */
var net = require("net")
  , EventEmitter = require("events").EventEmitter
  , inherits = require("util").inherits
  , sni = require("sni");

/**
 * Expose `Distroy`.
 * @type {Distroy}
 */
module.exports = Distroy;


/**
 * Create a new `Distroy` instance.
 * @param {String}   protocol
 * @param {Number}   port
 * @param {Function} listening optional
 */
inherits(Distroy, EventEmitter);
function Distroy(protocol, port, listening) {
  if(!(this instanceof Distroy)) return new Distroy(protocol, port, listening);
  EventEmitter.call(this);

  this.protocol = protocol;
  this.hosts = {};
  this.sockets = {};

  this.server = net.createServer()
    .on("connection", onConnection.bind(this))
    .on("error", onSocketError.bind(this))
    .once("listening", this.emit.bind(this, "listening"))
    .listen(isFinite(port) ? port : 3030, "localhost");

  if(listening) this.once("listening", listening);
}

/**
 * Check if `buf` starts with BADA55 C0FFEE.
 * @param  {Buffer}  buf
 * @return {Boolean}
 */
function checkMagicCode(buf) {
  return buf
      && buf.length >= 6
      && buf[0] === 0xBA
      && buf[1] === 0xDA
      && buf[2] === 0x55
      && buf[3] === 0xC0
      && buf[4] === 0xFF
      && buf[5] === 0xEE;
}

/**
 * Handle a new connection.
 * @param  {net.socket} socket
 */
function onConnection(socket) {
  var self = this;
  console.log("CONNECTION")
  socket.once("readable", function(data) {
    var data = socket.read();
    socket.unshift(data);

    if(socket.remoteAddress === "127.0.0.1" && checkMagicCode(data))
      return self.addServer(socket);

    self.proxy(socket, data);
  });
}

/**
 * Handle a Socket error.
 * @param  {net.Socket} socket
 * @param  {Error} error
 */
function onSocketError(socket, error) {
  socket.destroy();
  this.emit("error", error);
}

/**
 * Handle a host `close` event.
 * @param  {net.Socket} socket
 * @param  {String}     host
 * @param  {Boolean}    hadError
 */
function onHostClose(socket, host, hadError) {
  delete this.hosts[host];
  delete this.sockets[host];
}

/**
 * Add a server control socket.
 * @param  {net.Socket} socket
 */
Distroy.prototype.addServer = function(socket) {
  var data = socket.read();
  if(data.length < 11)
    return socket.emit("error", new Error("Not long enough."));

  var port = data.readUInt32BE(6)
    , host = data.slice(10).toString("utf8");

  if(host in this.hosts)
    return socket.emit("error", new Error("Host `" + host + "` is already in use."));

  this.hosts[host] = port;
  this.sockets[host] = socket;

  socket.once("close", onHostClose.bind(this, socket, host));
  socket.write("SUCCESS");
};

/**
 * Match the Host field in a HTTP header.
 * @type {RegExp}
 */
var httpHostRegExp = /^Host:\s+(.*)$/mi;

/**
 * Try to proxy a socket.
 * @param  {net.Socket} socket
 * @param  {Buffer} first
 */
Distroy.prototype.proxy = function(socket, first) {
  var host = null;

  switch(this.protocol) {
    case "http":
      var match = first.toString("utf8").match(httpHostRegExp);
      if(match && match[1])
        host = match[1];
      break;
    case "https":
    case "tls":
    case "ssl":
      var host = sni(first) || host;
      break;
  }

  if(!host)
    return socket.emit("error", new Error("Could not extract host."));
  if(!(host in this.hosts))
    return socket.emit("error", new Error("Host `" + host + "` is unknown."));

  socket.pipe(net.connect(this.hosts[host], "localhost")).pipe(socket);
};