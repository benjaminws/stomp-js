var net = require('net');
require('./frame');
require('./stomp-utils');

Stomp = module.exports = function(port, host, debug) {
    this.port = port;
    this.host = host;
    this.socket_connected = false;
    this.debug = debug;
    this.stomp_log = new StompLogging(debug);
    this.frame = new Frame(this.stomp_log);
    this.connected_frame = null;
};

Stomp.prototype.connect = function() {

    this.stomp_log.debug('Connecting to ' + this.host + ':' + this.port);
    var client = net.createConnection(this.port, this.host);
    var _stomp = this;

    client.addListener('connect', function () {
        _stomp.stomp_log.debug('Connected to socket');
        _stomp.connected_frame = _stomp.frame.stomp_connect(client);
    });
    client.addListener('data', function (data) {
        _stomp.connected_frame.parse_frame(data);
    });
    client.addListener('end', function () {
        _stomp.stomp_log.debug('goodbye');
    });
    client.addListener('error', function (error) {
        console.log('error: ' + error);
    });
    client.addListener('close', function (error) {
        _stomp.stomp_log.debug('disconnected');
    });

};
