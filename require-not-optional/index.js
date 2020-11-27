const mongodb = require("mongodb");

module.exports = (module) => {
  if (module === "mongodb") {
    return mongodb;
  } else {
    var e = new Error("Cannot find module '" + module + "'");
    e.code = "MODULE_NOT_FOUND";
    throw e;
  }
};
