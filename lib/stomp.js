/*
    stomp.js - STOMP Protocol in node.js

    Copyright (c) 2010, Benjamin W. Smith
    All rights reserved.

    Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or
      other materials provided with the distribution.
    * Neither the name of the author nor the names of its contributors may be used to endorse or promote products derived from this software
      without specific prior written permission.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
    LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
    COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
    (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
    HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
    ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

var net = require('net'),
    tls = require('tls'),
    sys = require('sys'),
    frame = require('./frame'),
    stomp_utils = require('./stomp-utils'),
    exceptions = require('./stomp-exceptions'),
    utils = new stomp_utils.StompUtils(),
    log = null;

function parse_command(data) {
    var command,
        this_string = data.toString('utf8', start=0, end=data.length);
    command = this_string.split('\n');
    return command[0];
};

function parse_headers(headers_str) {
    var these_headers = [],
        one_header = [],
        header_key = null,
        header_val = null,
        headers_split = headers_str.split('\n');

    for (var i = 0; i < headers_split.length; i++) {
        one_header = headers_split[i].split(':');
        if (one_header.length > 1) {
            header_key = one_header.shift();
            header_val = one_header.join(':');
            these_headers[header_key] = header_val;
        }
        else {
            these_headers[one_header[0]] = one_header[1];
        }
    }
    return these_headers;
};

function parse_frame(chunk) {
    var args = {},
        data = null,
        command = null,
        headers = null,
        body = null,
        headers_str = null;

    if (!utils.really_defined(chunk))
        return null;

    command = parse_command(chunk);
    data = chunk.slice(command.length + 1, chunk.length);
    data = data.toString('utf8', start=0, end=data.length);

    the_rest = data.split('\n\n');
    headers = parse_headers(the_rest[0]);
    body = the_rest[1];

    if ('content-length' in headers)
       headers['bytes_message'] = true;

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
    } else {
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
    if (socket.readyState == 'readOnly')
        socket.destroy();
    log.debug('disconnect called');
};

function send_command(stomp, command, headers, body, want_receipt) {
    var want_receipt = want_receipt || false;
    if (!utils.really_defined(headers))
        headers = {};

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

/**
 * Stomp - Client API
 * @param {Object} args
 */
function Stomp(args) {
    this.port = args['port'] || 61613;
    this.host = args['host'] || "127.0.0.1";
    this.debug = args['debug'];
    this.login = args['login'] || null;
    this.passcode = args['passcode'] || null;
    this.log = new StompLogging(this.debug);
    this._subscribed_to = {};
    this.session = null;
    this.ssl = args['ssl'] ? true : false;
    this.ssl_validate = args['ssl_validate'] ? true : false;
    this.ssl_options = args['ssl_options'] || {};
    this['client-id'] = args['client-id'] || null;
};

Stomp.prototype = new process.EventEmitter();

/**
 * Begin connection
 */
Stomp.prototype.connect = function() {
    var self = this;
    _connect(self);
};

/**
 * Handle frame based on type
 * @param {Object} Frame Object
 */
Stomp.prototype.handle_new_frame = function(this_frame) {
    var self = this;

    switch (this_frame.command) {
        case "MESSAGE":
            if (utils.really_defined(this_frame.headers['message-id']))
                self.emit('message', this_frame);
            break;
        case "CONNECTED":
            log.debug('Connected to STOMP');
            self.session = this_frame.headers['session'];
            self.emit('connected');
            break;
        case "RECEIPT":
            self.emit('receipt', this_frame.headers['receipt-id']);
            break;
        case "ERROR":
            self.emit('error', this_frame);
            break;
        default:
            console.log("Could not parse command: " + this_frame.command);
    }
};

/**
 * Disconnect from STOMP broker
 */
Stomp.prototype.disconnect = function() {
    _disconnect(this);
}

/**
 * Subscribe to destination (queue or topic)
 * @param {Object} headers
 */
Stomp.prototype.subscribe = function(headers) {
    var self = this;
    destination = headers['destination'];
    headers['session'] = self.session;
    send_command(this, 'SUBSCRIBE', headers);
    self._subscribed_to[destination] = true;
    self.log.debug('subscribed to: ' + destination + ' with headers ' + sys.inspect(headers));
};

/**
 * Unsubscribe from destination (queue or topic)
 * @param {Object} headers
 */
Stomp.prototype.unsubscribe = function(headers) {
    var self = this;
    destination = headers['destination'];
    headers['session'] = self.session;
    send_command(this, 'UNSUBSCRIBE', headers);
    self._subscribed_to[destination] = false;
    self.log.debug('no longer subscribed to: ' + destination);
};

/**
 * Acknowledge received message
 * @param {String} message id to acknowledge
 */
Stomp.prototype.ack = function(message_id) {
    var self = this;
    send_command(this, 'ACK', {'message-id': message_id});
    self.log.debug('acknowledged message: ' + message_id);
};

/**
 * Begin transaction
 * @return {String} generated transaction id
 */
Stomp.prototype.begin = function() {
    var self = this;
    transaction_id = Math.floor(Math.random()*99999999999).toString();
    send_command(this, 'BEGIN', {'transaction': transaction_id});
    self.log.debug('begin transaction: ' + transaction_id);
    return transaction_id;
};

/**
 * Commit transaction
 * @param {String} transaction id generated by stomp.Stomp.begin()
 */
Stomp.prototype.commit = function(transaction_id) {
    var self = this;
    send_command(this, 'COMMIT', {'transaction': transaction_id});
    self.log.debug('commit transaction: ' + transaction_id);
};

/**
 * Abort transaction
 * @param {String} transaction id generated by stomp.Stomp.begin()
 */
Stomp.prototype.abort = function(transaction_id) {
    var self = this;
    send_command(this, 'ABORT', {'transaction': transaction_id});
    self.log.debug('abort transaction: ' + transaction_id);
};

/**
 * Send MESSAGE to STOMP broker
 * @param {Object} headers required (destination is required)
 * @param {Bool} do you want a receipt of the message sent?
 * @return {Object} Frame object of message sent
 */
Stomp.prototype.send = function(headers, want_receipt) {
    var self = this;
    destination = headers['destination'];
    body = headers['body'] || null;
    delete headers['body'];
    headers['session'] = self.session;
    return send_command(this, 'SEND', headers, body, want_receipt)
};

module.exports.Stomp = Stomp;
