var exceptions = require('./stomp-exceptions');
var sys = require('util');

var StompLogging = exports.StompLogging = function(should_debug) {
    this.should_debug = should_debug;
};

StompLogging.prototype.debug = function(message) {
    if (this.should_debug) {
        console.log("debug: " + message);
    }
};

StompLogging.prototype.warn = function(message) {
    console.log("warn: " + message);
};

StompLogging.prototype.error = function(message, die) {
    console.log("error: " + message);
    if (die) {
        process.exit(1);
    }
};

StompLogging.prototype.die = function(message) {
    this.error(message, true);
};

var StompUtils = exports.StompUtils = function() {
    this.available_utils = [];
};

StompUtils.prototype.really_defined = function(var_to_test) {
    return !(var_to_test == null || var_to_test == undefined);
};

StompUtils.prototype.extend = function(destination, source) {
    for (var property in source) {
        destination[property] = source[property];
    }
    return destination;
};
