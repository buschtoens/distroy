/**
 * Module dependencies.
 */
var net = require("net")
  , tls = require("tls")
  , uuid = require("uuid")
  , quevent = require("quevent");

/**
 * Expose `patch`.
 * @type {Function}
 */
module.exports = patch;

/**
 * Patch a `net.Server`.
 * @param  {Number}     port
 * @param  {net.Server} server
 * @param  {Boolean}    waitForAddress
 * @return {net.Server}
 */
function patch(port, server, waitForAddress) {
  if(!isFinite(port))
    throw new Error("`port` needs to be a `Number`.");
  if(!(server instanceof net.Server))
    throw new Error("`server` needs to be an instance of `net.Server`.");

  var isTls = server instanceof tls.Server;

  server.listen = listen.bind(server, server.listen.bind(server), port);

  if(waitForAddress && !isTls) // no need to wait when using TLS, Handshake takes longer.
    quevent(server).quevent.queue("connection", true);
  server.on("connection", onConnection, false);

  return server;
}

/**
 * Patched listener.
 * @param  {Function} _listen
 * @param  {Number}   port
 * @param  {String}   domain
 * @param  {Function} cb       optional
 * @return {net.Server}
 */
function listen(_listen, port, domain, cb) {
  _listen(3000, "localhost", onListening.bind(this, port, domain, cb));
  return this;
}

/**
 * Tell the host about the new server and verify the connection.
 * @param  {Number}   port
 * @param  {String}   domain
 * @param  {Function} cb     optional
 */
function onListening(port, domain, cb) {
  var self = this;
  self._host = net.connect(port, "localhost")
    .once("connect", function() {
      this.write(domain + " " + self.address().port);
    })
    .once("data", function(data) {
      if(data !== "SUCCESS")
        return self.emit("error", new Error(data));

      this.on("data", onHostData.bind(self));
      if(cb) cb();
    })
    .once("error", onHostError.bind(self));
  self._host.setEncoding("utf8");
}

/**
 * When the host fucks up.
 * @param  {Error} error
 */
function onHostError(error) {
  this.emit("error", error);
  this.close();
}

/**
 * RegExp for parsing a host response.
 * @type {RegExp}
 */
var responseRegExp = /^([0-9a-z-]{36}) (.*)$/i;

/**
 * When the host sends some data over.
 * @param  {String} data
 */
function onHostData(data) {
  var match = data.match(responseRegExp);
  if(match instanceof Array)
    this.emit(match[1], this._host, JSON.parse(match[2]));
  else
    this.emit("host", this._host, data);
}

/**
 * Request data from the host.
 * @param  {String}   query
 * @param  {Function} cb    optional
 */
function requestHost(query, cb) {
  var id = uuid.v4();
  this.once(id, cb);
  this._host.write(id + " " + query);
}

/**
 * When a new connection is established.
 * @param  {net.Socket} socket
 * @param  {Function}   done   optional
 */
function onConnection(socket, done) {
  getAddress.call(this, socket, done);
}

/**
 * Retrieve the origional connection information.
 * @param  {net.Socket} socket
 * @param  {Function}   cb
 */
function getAddress(socket, cb) {
  socket._peername = {};
  socket._sockname = {};
  requestHost.call(this, "INFO", function(host, data) {
    socket._peername = data.peername;
    socket._sockname = data.sockname;
    if(cb) cb();
  });
}