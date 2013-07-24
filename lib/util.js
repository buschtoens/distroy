/**
 * Shortcut.
 */
var exports = module.exports;

exports.ipToBuffer = function(ip) {
  return new Buffer(ip.split(".").map(function(dec) { return parseInt(dec, 10) }));
};
exports.portToBuffer = function(port) {
  var buf = new Buffer(2);
  buf.writeUInt16BE(parseInt(port, 10), 0);
  return buf;
};

/**
 * Get the default port.
 * @param  {Server} server
 * @param  {Number} port   Prefered port
 * @return {Number}
 */
exports.defaultPort = function(server, port) {
  port = parseInt(port, 10) || null;
  if(port) return port;
  switch(server.protocol) {
    case "http": return 80;
    case "https": return 443;
  }
}

/**
 * Extarct a Host RegExp.
 * @param  {String} str
 * @return {RegExp|null}
 * @throws {Error} If there are no hosts to extract
 */
exports.extractHost = function(str) {
  var hosts = str.match(hostRegExp);
  if(hosts === null) throw new Error("Could not find hosts in " + str);
  
  hosts = ("(" + hosts[0] + ")")
    .replace(deliRegExp, "|")
    .replace(/\./g, "\\.")
    .replace(/\*{2,}/g, ".+")
    .replace(/\*/g, "[^.]+");
  
  return new RegExp(hosts, "i");
}

var hostRegExp = /(?:[,|:; ]?(?:[a-z0-9-*]+\.)*[a-z*]+)+$/mig
  , deliRegExp =    /[,|:; ]/gi;