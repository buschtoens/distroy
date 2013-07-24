/**
 * Module dependencies.
 */
var net = require("net")
  , EventEmitter = require("events").EventEmitter
  , inherits = require("util").inherits
  , sni = require("sni")
  , util = require("./util");

/**
 * Expose `Server`.
 * @type {Server}
 */
module.exports = Server;


/**
 * Server
 * @param {Distroy} distroy reference
 * @param {String}  protocol
 * @param {Number}  port
 * @extends {events.EventEmitter}
 */
inherits(Server, EventEmitter);
function Server(distroy, protocol, port) {
  if(!(this instanceof Server)) return new Server(distroy, protocol, port);
  if(!~["http", "https"].indexOf(protocol)) throw new Error("Wrong protocol: " + protocol);

  EventEmitter.call(this);

  this.distroy = distroy;
  this.protocol = protocol;
  this.port = port;
  this.hosts = {};
  this.sendRemoteAddress = false;
  this.server = net.createServer(onConnect.bind(this)).listen(this.port);
}

/**
 * Handle a new connection.
 * @param  {net.Socket} socket
 * @this {Server}
 * @private
 */
function onConnect(socket) {
  var self = this;
  socket.once("readable", function() {
    var buf = socket.read()
      , host;
    socket.unshift(buf);

    switch(self.protocol) {
      case "https":
        host = sni(buf);
        break;
      case "http":
        host = buf.toString("utf8").match(httpRegExp);
        if(host instanceof Array) host = host[1];
        break;
    }

    if(typeof host !== "string") {
      socket.emit("exception", new Error("Could not determine host from " + socket.remoteAddress), socket);
      socket.destroy();
      return;
    }

    self.proxy(socket, host);
  });
  socket.on("error", self.emit.bind(self, "exception"));
}

var httpRegExp = /^Host:\s+(.*)$/mi;

/**
 * Proxy a connection.
 * @param  {net.Socket} socket
 * @param  {String}     host
 * @return {Server}            this 
 */
Server.prototype.proxy = function(socket, host) {
  host = this.get(host);
  if(host === null) return;

  var connection;
  if(typeof host.path === "string")
    connection = net.createConnection(host.path);
  else if(typeof host.host === "string")
    connection = net.createConnection(util.defaultPort(this, host.port), host.host);
  else if(typeof host.port === "number")
    connection = net.createConnection("localhost", host.port);

  if(!connection) return socket.emit("exception", new Error("Could not establish a connection"), host);
  connection.on("error", this.emit.bind(this, "exception"));

  if(this.sendRemoteAddress) {
    connection.write(util.ipToBuffer(socket.remoteAddress));
    connection.write(util.portToBuffersocket.remotePort));
  }
  socket.pipe(connection).pipe(socket);

  return this;
};

/**
 * Wether to prepend the IP Address.
 * @param  {Boolean} send
 * @return {Server}       this
 */
Server.prototype.ip =
Server.prototype.sendIP = function(send) {
  if(typeof send === "undefined") this.sendRemoteAddress = true;
  else this.sendRemoteAddress = !!send;
  return this;
};

/**
 * Find a host.
 * @param  {String} host
 * @return {Object|null}
 */
Server.prototype.get =
Server.prototype.getHost = function(host) {
  var match;
  for(var key in this.hosts)
      match = this.hosts[key];

  if(match) return match;
  this.emit("exception", new Error("Could not find a host for " + host));
  return null;
};

/**
 * Add a host.
 * @param  {String} inHost
 * @param  {String} outHost
 * @param  {Number} outPort
 * @return {Server}         this
 */
Server.prototype.add =
Server.prototype.addHost = function(inHost, outHost, outPort) {
  var host = { key: inHost };
  if(arguments.length === 1) { // unix domain socket
    host.regex = util.extractHost(inHost);
    host.path = inHost;
  } else if(arguments.length === 2) {
    host.regex = util.extractHost(inHost);
    outPort = parseInt(outHost, 10);
    if(outPort) { // inHost, outPort
      host.host = "localhost";
      host.port = outPort;
    } else { // inHost, outHost/unix
      if((/\//).test(outHost)) { // inHost, unix
        host.path = outHost;
      } else { // inHost, outHost
        host.host = outHost;
        host.port = util.defaultPort(this);
      }
    }
  } else if(arguments.length === 3) { // inHost, outHost, outPort
    host.regex = util.extractHost(inHost);
    host.host = outHost;
    host.port = outPort;
  } else {
    throw new Error("Wrong arity for addHost(inHost, outHost, outPort)");
  }
  if(host.key in this.hosts) throw new Error("Host `" + host.key + "` alread exists");
  this.hosts[host.key] = host;
  return this;
};

/**
 * Remove a host.
 * @param  {String} key
 * @return {Server}     this
 */
Server.prototype.remove =
Server.prototype.removeHost = function(key) {
  delete this.hosts[key];
  return this;
};