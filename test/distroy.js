var Distroy = require("../lib/distroy");

Distroy(3030)
  .http(80, Distroy.Router("http"))
  .https(443, Distroy.Router("https"));