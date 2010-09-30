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
    this.log = new StompLogging(this.debug);
    this.utils = new StompUtils();
    this.rqueue = new StompQueue();
    this.iqueue = new IntermediateQueue();
    this.frame = new frame.Frame(this.log, this.rqueue);
    this.poll_id = null;
    this._subscribed_to = {};
};

Stomp.prototype = new process.EventEmitter();

Stomp.prototype.connect = function(headers) {
    var self = this;
    this.log.debug('Connecting to ' + this.host + ':' + this.port);
    socket = net.createConnection(this.port, this.host);
    socket.setEncoding('ascii');
    socket.setTimeout(0);
    socket.setNoDelay(true);

    socket.addListener('connect', function() {
        self.log.debug('Connected to socket');
	self._stomp_connect(headers);
    });

    socket.addListener('drain', function() {

    });

    socket.addListener('data', function(data) {
        var frames = data.split('\0\n');
        var reply_frame = null;
        var frame = null;
        while (frame = frames.shift()) {
	    parsed_frame = self.frame.parse_frame(frame + '\0\n');
            if (self.frame.session) {
                self.rqueue.put(parsed_frame);
	    }
            else {
		self.log.debug("wasn't connected");
		self.handle_new_frame(parsed_frame);
	    }
        }
    });
    socket.addListener('end', function() {
        self.log.debug('goodbye');
    });
    socket.addListener('error', function(error) {
        console.log('error: ' + error.stack);
    });
    socket.addListener('close', function(error) {
        self.log.debug('disconnected');
    });

    this.socket = socket;
};

Stomp.prototype._stomp_connect = function(headers) {
    var self = this,
        headers = {},
        parsed_frame = null,
        frame_to_send = null;

    args = {
        command: 'CONNECT',
	headers: headers
    };
    frame_to_send = this.frame.build_frame(args);
    this.send_frame(frame_to_send);
    this.log.debug('Connected to STOMP');

};

Stomp.prototype.send_frame = function(frame_to_send) {
    try {
        this.socket.write(frame_to_send.as_string());
    }
    catch (error) {
        this.log.error("write error");
	this.send_frame(frame_to_send);
    }
};

Stomp.prototype.handle_new_frame = function(this_frame) {
    var self = this;

    switch (this_frame.command) {
        case "MESSAGE":
            this.emit('message', this_frame);
            break;
        case "CONNECTED":
	    this.frame.session = this_frame.headers['session'];
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
    if (this.poll_id)
        clearTimeout(this.poll_id);

}

Stomp.prototype.subscribe = function(headers, callback) {

    destination = headers['destination'];
    headers['session-id'] = this.frame.session;
    this._send_command('SUBSCRIBE', headers);
    this._subscribed_to[destination] = callback;
    this.log.debug('subscribed to: ' + destination + ' with headers ' + sys.inspect(headers));
    this.poll();

};

Stomp.prototype.unsubscribe = function(headers) {

    destination = headers['destination'];
    this._send_command('UNSUBSCRIBE', headers);
    this._subscribed_to[destination] = null;
    this.log.debug('no longer subscribed to: ' + destination);

};

Stomp.prototype.ack = function(message_id) {

    this._send_command('ACK', {'message-id': message_id});
    this.log.debug('acknowledged message: ' + message_id);

};

Stomp.prototype.poll = function() {
    var self = this;
    try {
        while (queued_frame = self.rqueue.get()) {
            self.handle_new_frame(queued_frame);
	}
    }
    catch(error) {
        if (error.name = "QueueEmpty") {
            this.poll_id = setTimeout(function(){self.poll()}, 100);
	}
    }
};

Stomp.prototype.send = function(headers) {

    destination = headers['destination'];
    body = headers['body'] || null;
    headers['want_receipt'] = true;

    return this._send_command('SEND', headers, body)
};

Stomp.prototype._send_command = function(command, headers, body) {

    if (!this.utils.really_defined(headers))
        headers = {};

    frame_conf = {
        'command': command,
        'headers': headers,
        'body': body
    };

    var this_frame = this.frame.build_frame(frame_conf);
    var reply = this.send_frame(this_frame);

    if ('want_receipt' in headers)
        return reply;

    return this_frame;

};

module.exports.Stomp = Stomp;
