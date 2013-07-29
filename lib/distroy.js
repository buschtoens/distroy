/**
 * Module dependencies.
 */
var net = require("net")
  , EventEmitter = require("events").EventEmitter
  , inherits = require("util").inherits;
var Router = require("./router");

/**
 * Expose `Distroy`.
 * @type {Distroy}
 */
module.exports = Distroy;


/**
 * Create a new `Distroy` instance.
 * @param {Number}   port optional
 * @param {Function} cb   optional
 */
inherits(EventEmitter, Distroy);
function Distroy(port, cb) {
  if(!(this instanceof Distroy)) return new Distroy(port);
  this.server = net.createServer()
    .on("connection", onConnection.bind(this))
    .listen(isFinite(port) ? port : 3030, "localhost", cb);
}

function onConnection(socket) {
  var self = this;
  socket.once("data", function(data) {
    var req = parse(socket, data);
    if(data.port && data.host)
      self.addServer(socket, data.port, data.host);
  });
}

function onSocketError(socket, error) {
  socket.destroy();
  this.emit("error", error);
}

Distroy.prototype.addServer = function(socket, port, host) {
  if(!(port in this.hosts)) {
    respond(socket, { error: "No host running on port " + port });
    socket.destroy();
    return false;
  }
  if(!this.hosts[port].router.register(host, socket)) {
    respond(socket, { error: "Could not register host " + host });
    socket.destroy();
    return false;
  }

  socket.once("error", onSocketError.bind(this, socket));
  socket.on("data", onSocketData.bind(this, socket));

  return true;
};


Distroy.prototype.http = function(port, router) {
  if(!port && !router)
    port = 80, router = new Router("http");
  else if(port)
    if(port instanceof Router)
      router = port, port = 80;
    else
      router = new Router("http");

  return this.addHost(port, router);
};
Distroy.prototype.https = function(port, router) {
  if(!port && !router)
    port = 443, router = new Router("https");
  else if(port)
    if(port instanceof Router)
      router = port, port = 443;
    else
      router = new Router("https");

  return this.addHost(port, router);
};
Distroy.prototype.addHost = function(port, router) {
  if(port in this.hosts)
    throw new Error("Port `" + port + "` is already taken.");

  var host = this.hosts[port] = { server: net.createServer(), router: router };
  host.server
    .on("error", onServerError.bind(this, host))
    .on("connection", host.router.route.bind(host.router))
    .listen(port);
};
Distroy.prototype.removeHost = function(port) {
  if(!(port in this.hosts))
    throw new Error("There is no host on port `" + port + "`.");

  var host = this.hosts[port];
  host.server.close();
};
Distroy.prototype.getHost = function(port) {
  return this.hosts[port];
};