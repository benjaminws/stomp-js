var net = require('net'),
    sys = require('sys'),
    frame = require('./frame'),
    utils = require('./stomp-utils'),
    exceptions = require('./stomp-exceptions');

function Stomp(args) {
    this.socket = null;
    this.port = args['port'] || 61613;
    this.host = args['host'] || "127.0.0.1";
    this.socket_connected = false;
    this.debug = args['debug'];
    this.stomp_log = new StompLogging(this.debug);
    this.frame_object = new frame.Frame(this.stomp_log);
    this.utils = new StompUtils();
    this.connected_frame = null;
    this._subscribed_to = {};
};

Stomp.prototype = new process.EventEmitter();

Stomp.prototype.connect = function(headers) {
    var self = this;
    this.stomp_log.debug('Connecting to ' + this.host + ':' + this.port);
    socket = net.createConnection(this.port, this.host);
    socket.setEncoding('ascii');
//    socket.setTimeout(0);
    socket.setNoDelay(true);

    socket.addListener('connect', function() {
        self.stomp_log.debug('Connected to socket');
        self.connected_frame = self.frame_object.stomp_connect(self.socket);
    });

    socket.addListener('drain', function(data) {
        console.log("DRAIN_DATA: " + data);
    });

    socket.addListener('data', function(data) {
        var frames = data.split('\0\n');
        var reply_frame = null;
        var frame = null;
        while (frame = frames.shift()) {
            reply_frame = self.connected_frame.parse_frame(frame + '\0\n')
            self.handle_new_frame(reply_frame);
        }
    });
    socket.addListener('end', function() {
        self.stomp_log.debug('goodbye');
    });
    socket.addListener('error', function(error) {
        console.log('error: ' + error.stack);
    });
    socket.addListener('close', function(error) {
        self.stomp_log.debug('disconnected');
    });

    this.socket = socket;
};

Stomp.prototype.handle_new_frame = function(this_frame) {

    switch (this_frame.command) {
        case "MESSAGE":
            this.emit('message', this_frame);
            break;
        case "CONNECTED":
            this.emit('connected');
            break;
        case "RECEIPT":
            this.emit('receipt', this_frame.headers['receipt']);
            break;
        case "ERROR":
            this.emit('error', this_frame);
            break;
    }
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
    this.stomp_log.debug('subscribed to: ' + destination + ' with headers ' + sys.inspect(headers));

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
    extra = {};
    destination = headers['destination'];
    body = headers['body'] || null;
    extra['want_receipt'] = true;
    return this._send_command('SEND', headers, body)
};

Stomp.prototype._send_command = function(command, headers, body, the_rest) {

    if (!this.utils.really_defined(headers))
        headers = {};

    console.log("HEADERS: " + sys.inspect(headers));
    frame_conf = {
        'command': command,
        'headers': headers,
        'body': body
    };

    var this_frame = this.connected_frame.build_frame(frame_conf);
    var reply = this.connected_frame.send_frame(this_frame);

    if ('want_receipt' in the_rest) {
        console.log('want_receipt = true');
        return reply;
    }

    return this_frame;

};

module.exports.Stomp = Stomp;
