var net = require('net'),
    sys = require('sys'),
    frame = require('./frame'),
    utils = require('./stomp-utils'),
    exceptions = require('./stomp-exceptions');

function Stomp(port, host, debug) {
    this.socket = null;
    this.port = port || 61613;
    this.host = host || "127.0.0.1";
    this.socket_connected = false;
    this.debug = debug;
    this.stomp_log = new StompLogging(debug);
    this.frame_object = new Frame(this.stomp_log);
    this.utils = new StompUtils();
    this.connected_frame = null;
    this._subscribed_to = [];
}

Stomp.prototype = new process.EventEmitter();

Stomp.prototype.connect = function(headers) {
    var self = this;
    this.stomp_log.debug('Connecting to ' + this.host + ':' + this.port);
    socket = net.createConnection(this.port, this.host);
    socket.setTimeout(0);
    socket.setNoDelay(true);

    socket.addListener('connect', function () {
        self.stomp_log.debug('Connected to socket');
        self.connected_frame = self.frame_object.stomp_connect(self.socket);
    });

    socket.addListener('data', function (data) {
        var reply_frame = self.connected_frame.parse_frame(data)
        if ('session' in reply_frame.headers)
            self.connected_frame.session = reply_frame.headers['session'];

        switch (reply_frame.command) {
            case "CONNECTED":
                self.emit('connected');
                break;
            case "MESSAGE":
                self.emit('message', reply_frame);
                break;
            case "RECEIPT":
                self.emit('receipt', reply_frame.headers['receipt']);
                break;
            case "ERROR":
                self.emit('error', reply_frame);
                break;
        }
    });
    socket.addListener('end', function () {
        self.stomp_log.debug('goodbye');
    });
    socket.addListener('error', function (error) {
        console.log('error: ' + error.stack);
    });
    socket.addListener('close', function (error) {
        self.stomp_log.debug('disconnected');
    });

    this.socket = socket;
};

Stomp.prototype.disconnect = function() {

    this.socket.end();
    if (this.socket.readyState == 'readOnly')
        this.socket.destroy();

}

Stomp.prototype.subscribe = function(headers, callback) {

    destination = headers['destination'];
    this._send_command('SUBSCRIBE', headers);
    this._subscribed_to[destination] = callback;
    this.stomp_log.debug('subscribed to: ' + destination);

};

Stomp.prototype.unsubscribe = function(headers) {

    destination = headers['destination'];
    this._send_command('UNSUBSCRIBE', headers);
    this._subscribed_to[destination] = null;
    this.stomp_log.debug('no longer subscribed to: ' + destination);

};

Stomp.prototype.ack = function(message_id) {

    this._send_command('ACK', {'message-id': message_id});
    this.stomp_log.debug('acknowledged message: ' + message_id);

};

Stomp.prototype.send = function(headers) {

    destination = headers['destination'];
    headers['want_receipt'] = true;

    return this._send_command('SEND', headers)
};

Stomp.prototype._send_command = function(command, headers, extra) {

    if (!this.utils.really_defined(headers))
        headers = [];

    frame_conf = {
        'command': command,
        'headers': headers
    };

    this_frame = this.connected_frame.build_frame(frame_conf);
    reply = this.connected_frame.send_frame(this_frame);

    if ('want_receipt' in headers)
        return reply;

    return this_frame;

};

module.exports.Stomp = Stomp;
