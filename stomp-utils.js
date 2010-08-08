var sys = require('sys');


StompLogging = module.exports = function(should_debug) {
    this.should_debug = should_debug;
};

StompLogging.prototype.debug = function(message) {
    if (this.should_debug)
        console.log(message);
};
