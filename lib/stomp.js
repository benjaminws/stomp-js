// ## stomp
//
// The `Stomp` module provides you with a client interface for interacting with STOMP messaging brokers
//
// ### stomp.Stomp
//
// An instance of the `Stomp` object.  Initialized like so:
//
//     var stomp_args = {
//         port: 61613,
//         host: 'localhost',
//         debug: false,
//         login: 'guest',
//         passcode: 'guest',
//     };
//
//     var client = new stomp.Stomp(stomp_args);
//
// If debug is set to true, extra output will be printed to the console.

// ## Helpers to handle frames, and do parsing

var events = require('events'),
    net = require('net'),
    tls = require('tls'),
    sys = require('util'),
    util = require('util'),
    frame = require('./frame'),
    stomp_utils = require('./stomp-utils'),
    exceptions = require('./stomp-exceptions'),
    utils = new stomp_utils.StompUtils(),
    log = null;


function parse_command(data) {
    var command,
        this_string = data.toString('utf8', 0, data.length);
    command = this_string.split('\n');
    return command[0];
};

function parse_headers(raw_headers) {
    var headers = {},
        headers_split = raw_headers.split('\n');

    for (var i = 0; i < headers_split.length; i++) {
        var header = headers_split[i].split(':');
        if (header.length > 1) {
            var header_key = header.shift().trim();
            var header_val = header.join(':').trim();
            headers[header_key] = header_val;
            continue;
        }
        headers[header[0].trim()] = header[1].trim();
    }
    return headers;
};

function parse_frame(chunk) {
    var args = {},
        data = null,
        command = null,
        headers = null,
        body = null,
        headers_str = null;

    if (!utils.really_defined(chunk)) {
        return null;
    }

    command = parse_command(chunk);
    data = chunk.slice(command.length + 1, chunk.length);
    data = data.toString('utf8', 0, data.length);

    var the_rest = data.split('\n\n');
    headers = parse_headers(the_rest[0]);
    body = the_rest.slice(1, the_rest.length);

    if ('content-length' in headers) {
       headers['bytes_message'] = true;
    }

    args = {
        command: command,
        headers: headers,
        body: body
    }

    var this_frame = new frame.Frame();
    var return_frame = this_frame.build_frame(args);

    return return_frame;
};

function _connect(stomp) {
    log = stomp.log;

    if (stomp.ssl) {
        log.debug('Connecting to ' + stomp.host + ':' + stomp.port + ' using SSL');
        stomp.socket = tls.connect(stomp.port, stomp.host, stomp.ssl_options, function() {
            log.debug('SSL connection complete');
            if (!stomp.socket.authorized) {
                log.error('SSL is not authorized: '+stomp.socket.authorizationError);
                if (stomp.ssl_validate) {
                    _disconnect(stomp);
                    return;
                }
            }
            _setupListeners(stomp);
        });
    }
    else {
        log.debug('Connecting to ' + stomp.host + ':' + stomp.port);
        stomp.socket = new net.Socket();
        stomp.socket.connect(stomp.port, stomp.host);
        _setupListeners(stomp);
    }
}

function _setupListeners(stomp) {
    function _connected() {
        log.debug('Connected to socket');
        var headers = {};
        if (utils.really_defined(stomp.login) &&
            utils.really_defined(stomp.passcode)) {
            headers.login = stomp.login;
            headers.passcode = stomp.passcode;
        }
        if (utils.really_defined(stomp["client-id"])) {
            headers["client-id"] = stomp["client-id"];
        }
        if (utils.really_defined(stomp["vhost"])) {
            headers["host"] = stomp["vhost"];
        }
        stomp_connect(stomp, headers);
    }

    var socket = stomp.socket;

    socket.on('drain', function(data) {
        log.debug('draining');
    });

    var buffer = '';
    socket.on('data', function(chunk) {
        buffer += chunk;
        var frames = buffer.split('\0\n');

        // Temporary fix : NULL,LF is not a guranteed standard, the LF is optional, so lets deal with it.  (Rauls)
        if (frames.length == 1) {
            frames = buffer.split('\0');
        }

        if (frames.length == 1) return;
        buffer = frames.pop();

        var parsed_frame = null;
        var _frame = null;
        while (_frame = frames.shift()) {
            parsed_frame = parse_frame(_frame);
            stomp.handle_new_frame(parsed_frame);
        }
    });

    socket.on('end', function() {
        log.debug("end");
    });

    socket.on('error', function(error) {
        log.error(error.stack + 'error name: ' + error.name);
        stomp.emit("error", error);
    });

    socket.on('close', function(error) {
        log.debug('disconnected');
        if (error) {
            log.error('Disconnected with error: ' + error);
        }
        stomp.emit("disconnected", error);
    });

    if (stomp.ssl) {
        _connected();
    } else {
        socket.on('connect', _connected);
    }
};

function stomp_connect(stomp, headers) {
    var _frame = new frame.Frame(),
        args = {},
        headers = headers || {};

    args['command'] = 'CONNECT';
    args['headers'] = headers;

    var frame_to_send = _frame.build_frame(args);

    send_frame(stomp, frame_to_send);
};

function _disconnect(stomp) {
    var socket = stomp.socket;
    socket.end();

    if (socket.readyState == 'readOnly') {
        socket.destroy();
    }

    log.debug('disconnect called');
};

function send_command(stomp, command, headers, body, want_receipt) {
    var want_receipt = want_receipt || false;

    if (!utils.really_defined(headers)) {
        headers = {};
    }

    var args = {
        'command': command,
        'headers': headers,
        'body': body
    };

    var _frame = new frame.Frame();
    var this_frame = _frame.build_frame(args, want_receipt);
    send_frame(stomp, this_frame);

    return this_frame;
};

function send_frame(stomp, _frame) {
    var socket = stomp.socket;
    var frame_str = _frame.as_string();

    if (socket.write(frame_str) === false) {
        log.debug('Write buffered');
    }

    return true;
};

//
// ## Stomp - Client API
//
// Takes an argument object
//
function Stomp(args) {
    events.EventEmitter.call(this);

    this.port = args['port'] || 61613;
    this.host = args['host'] || '127.0.0.1';
    this.debug = args['debug'];
    this.login = args['login'] || null;
    this.passcode = args['passcode'] || null;
    this.log = new stomp_utils.StompLogging(this.debug);
    this._subscribed_to = {};
    this.session = null;
    this.ssl = args['ssl'] ? true : false;
    this.ssl_validate = args['ssl_validate'] ? true : false;
    this.ssl_options = args['ssl_options'] || {};
    this['client-id'] = args['client-id'] || null;
    if(typeof args.vhost !== 'undefined'){
        this.vhost = args['vhost'] ;
    }
};

// ## Stomp is an EventEmitter
util.inherits(Stomp, events.EventEmitter);

// ## Stomp.connect()
//
// **Begin connection**
//
Stomp.prototype.connect = function() {
    _connect(this);
};

// ## Stomp.is_a_message(frame)
//
// **Test that `Frame` is a message**
//
// Takes a `Frame` object
//
Stomp.prototype.is_a_message = function(this_frame) {
    return (this_frame.headers !== null && utils.really_defined(this_frame.headers['message-id']))
}

// ## Stomp.should_run_message_callback
//
// **Handle any registered message callbacks**
//
// Takes a `Frame` object
//
Stomp.prototype.should_run_message_callback = function(this_frame) {
    var subscription = this._subscribed_to[this_frame.headers.destination];
    if (this_frame.headers.destination !== null && subscription !== null) {
        if (subscription.enabled && subscription.callback !== null && typeof(subscription.callback) == 'function') {
            subscription.callback(this_frame.body, this_frame.headers);
        }
    }
}

// ## Stomp.handle\_new_frame(frame)
//
// **Handle frame based on type. Emit events when needed.**
//
// Takes a `Frame` object
//
Stomp.prototype.handle_new_frame = function(this_frame) {
    switch (this_frame.command) {
        case "MESSAGE":
            if (this.is_a_message(this_frame)) {
                this.should_run_message_callback(this_frame);
                this.emit('message', this_frame);
            }
            break;
        case "CONNECTED":
            log.debug('Connected to STOMP');
            this.session = this_frame.headers['session'];
            this.emit('connected');
            break;
        case "RECEIPT":
            this.emit('receipt', this_frame.headers['receipt-id']);
            break;
        case "ERROR":
            this.emit('error', this_frame);
            break;
        default:
            console.log("Could not parse command: " + this_frame.command);
    }
};

//
// ## Stomp.disconnect()
//
// **Disconnect from STOMP broker**
//
Stomp.prototype.disconnect = function() {
    _disconnect(this);
}

//
// ## Stomp.subscribe(headers, callback)
//
// **Subscribe to destination (queue or topic)**
//
// Takes a header object
//
// Takes a callback function
//
Stomp.prototype.subscribe = function(headers, callback) {
    var destination = headers['destination'];
    headers['session'] = this.session;
    send_command(this, 'SUBSCRIBE', headers);

    /**
    / Maybe we could subscribe to mulitple queues?
    / if (destination instanceof Array) {
    /   for (var = i; i < 0; i++) {
    /     this._subscribed_to[destination[i]] = { enabled: true, callback: callback };
    /   }
    / }
    / else {
    /     this._subscribed_to[destination] = { enabled: true, callback: callback };
    / }
    /
    */

    this._subscribed_to[destination] = { enabled: true, callback: callback };
    this.log.debug('subscribed to: ' + destination + ' with headers ' + sys.inspect(headers));
};

//
// ## Stomp.unsubscribe(headers)
//
// **Unsubscribe from destination (queue or topic)**
//
// Takes a header object
//
Stomp.prototype.unsubscribe = function(headers) {
    var destination = headers['destination'];
    headers['session'] = this.session;
    send_command(this, 'UNSUBSCRIBE', headers);
    this._subscribed_to[destination].enabled = false;
    this.log.debug('no longer subscribed to: ' + destination);
};

//
// ## Stomp.ack(message_id)
//
// **Acknowledge received message**
//
// Takes a string representing the message id to ack
//
Stomp.prototype.ack = function(message_id) {
    send_command(this, 'ACK', {'message-id': message_id});
    this.log.debug('acknowledged message: ' + message_id);
};

//
// ## Stomp.begin()
//
// **Begin transaction**
//
// Return a string representing the generated transaction id
//
Stomp.prototype.begin = function() {
    var transaction_id = Math.floor(Math.random()*99999999999).toString();
    send_command(this, 'BEGIN', {'transaction': transaction_id});
    this.log.debug('begin transaction: ' + transaction_id);
    return transaction_id;
};

//
// ## Stomp.commit(transaction_id)
//
// **Commit transaction**
//
// Takes a string representing the transaction id generated by stomp.Stomp.begin()
//
Stomp.prototype.commit = function(transaction_id) {
    send_command(this, 'COMMIT', {'transaction': transaction_id});
    this.log.debug('commit transaction: ' + transaction_id);
};

//
// ## Stomp.abort(transaction_id)
//
// **Abort transaction**
//
// Takes a string representing the transaction id generated by stomp.Stomp.begin()
//
Stomp.prototype.abort = function(transaction_id) {
    send_command(this, 'ABORT', {'transaction': transaction_id});
    this.log.debug('abort transaction: ' + transaction_id);
};

//
// ## Stomp.send(headers, want_receipt)
//
// **Send MESSAGE to STOMP broker**
//
// Takes a header object (destination is required)
//
// Takes a boolean requesting receipt of the sent message
//
// Returns a `Frame` object representing the message sent
//
Stomp.prototype.send = function(headers, want_receipt) {
    var destination = headers['destination'],
    body = headers['body'] || null;
    delete headers['body'];
    headers['session'] = this.session;
    return send_command(this, 'SEND', headers, body, want_receipt)
};

module.exports.Stomp = Stomp;
