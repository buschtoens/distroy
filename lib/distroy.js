/**
 * Module dependencies.
 */
var Server = require("./server");

/**
 * Expose `Distroy`.
 * @type {Distroy}
 */
module.exports = Distroy;


function Distroy() {
  if(!(this instanceof Distroy)) return new Distroy;
  this.servers = {};
}

/**
 * Create and return a new http `Server`.
 * @param  {Number} port optional
 * @return {Server}
 */
Distroy.prototype.http = function(port) {
  port = parseInt(port, 10) || 80;
  return this.addServer("http", port);
};

/**
 * Create and return a new https `Server`.
 * @param  {Number} port optional
 * @return {Server}
 */
Distroy.prototype.tls =
Distroy.prototype.https = function(port) {
  port = parseInt(port, 10) || 443;
  return this.addServer("https", port);
};

/**
 * Create and return a new `Server`.
 * @param  {String} protocol
 * @param  {Number} port
 * @return {Server}
 */
Distroy.prototype.add =
Distroy.prototype.addServer = function(protocol, port) {
  if(port in this.servers) throw new Error("Port " + port + " is already in use");
  return this.servers[port] = new Server(this, protocol, port);
};

/**
 * Close and remove a `Server`.
 * @param  {Number}  port
 * @return {Distroy}      this
 */
Distroy.prototype.remove =
Distroy.prototype.removeServer = function(port) {
  if(port in this.servers) this.servers[port].close();
  return this;
};

/**
 * Get a `Server`.
 * @param  {Number}  port
 * @return {Distroy}      this
 */
Distroy.prototype.get =
Distroy.prototype.getServer = function(port) {
  if(port in this.servers) return this.servers[port];
  throw new Error("There is no server listening on " + port);
};