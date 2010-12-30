var exceptions = require('./stomp-exceptions');
var sys = require('sys');

StompLogging = exports.StompLogging = function(should_debug) {
    this.should_debug = should_debug;
};

StompLogging.prototype.debug = function(message) {
    if (this.should_debug)
        console.log("debug: " + message);
};

StompLogging.prototype.warn = function(message) {
    console.log("warn: " + message);
};

StompLogging.prototype.error = function(message, die) {
    console.log("error: " + message);
    if (die)
        process.exit(1);
};

StompLogging.prototype.die = function(message) {
    self.error(message, true);
};

StompUtils = exports.StompUtils = function() {
    this.available_utils = [];
};

StompUtils.prototype.really_defined = function(var_to_test) {
    return !(var_to_test == null || var_to_test == undefined);
};

// Extend associative array
StompUtils.prototype.extend = function(destination, source) {
    for (var property in source)
        destination[property] = source[property];
    return destination;
};

/**
 * Queueing implementation, blatantly ripped off from:
 * http://safalra.com/web-design/javascript/queues/Queue.js
 * only really semantics have been changed.
 */
StompQueue = exports.StompQueue = function() {
    this.queue = [];
    this.queue_space = 0;
};

StompQueue.prototype.get_size = function() {
    return this.queue.length - this.queue_space;
};

StompQueue.prototype.is_empty = function() {
    return (this.queue.length == 0);
};

StompQueue.prototype.put = function(item) {
    this.queue.push(item);
};

StompQueue.prototype.get = function() {
    var item = undefined;

    if (this.queue.length) {
        item = this.queue[this.queue_space];

        if (++this.queue_space * 2 >= this.queue.length) {
            this.queue = this.queue.slice(this.queue_space);
            console.log("Queue: " + sys.inspect(this.queue));
            this.queue_space = 0;
        }
    }

    if (item == undefined)
        throw new QueueEmpty();

    return item;
};

StompQueue.prototype.get_oldest_item = function() {
    var item = undefined;

    if (this.queue.length)
        item = this.queue[this.queue_space];
    else
        throw new QueueEmpty();

    return item;
};
