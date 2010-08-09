var exceptions = require('./stomp-exceptions');

StompLogging = exports.StompLogging = function(should_debug) {
    this.should_debug = should_debug;
};

StompLogging.prototype.debug = function(message) {
    if (this.should_debug)
        console.log("debug: " + message);
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
            console.log(this.queue);
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

IntermediateQueue = exports.IntermediateQueue = function() {
    this._queue = new StompQueue();
};

IntermediateQueue.prototype.put = function(frame) {
    if (!"destination" in frame.headers)
        return;
    this._queue.put(frame);
}

IntermediateQueue.prototype.get = function(frame) {
    try {
        this._queue.get();
    }
    catch (error) {
        if (error.name == "QueueName") {
            return frame.parse_frame();
        }
    }
}
