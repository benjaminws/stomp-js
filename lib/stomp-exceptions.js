var QueueEmpty = exports.QueueEmpty = function() {
    this.name = "QueueEmpty";
    this.message = "Queue is Empty";
};

QueueEmpty.prototype.toString = function() {
    return this.message;
};
