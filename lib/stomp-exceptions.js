BrokerErrorResponse = exports.BrokerErrorResponse = function(value) {
    this.value = value;
    this.message = "Broker returned error: " + this.value;
};

BrokerErrorResponse.prototype.toString = function() {
    return this.messge + this.value;
};

QueueEmpty = exports.QueueEmpty = function() {
    this.name = "QueueEmpty";
    this.message = "Queue is Empty";
};

QueueEmpty.prototype.toString = function() {
    return this.message;
};
