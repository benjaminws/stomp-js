BrokerErrorResponse = exports.BrokerErrorResponse = function(value) {

    this.value = value;
    this.message = "Broker returned error: " + this.value
    console.error(this.message + this.value);

};

