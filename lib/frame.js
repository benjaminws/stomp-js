require('sys');
require('./stomp-utils');
require('./stomp-exceptions');


Frame = module.exports = function(logger) {
    this.connected = false;
    this.sock = null;
    this.command = null;
    this.headers = null;
    this.body = null;
    this.stomp_log = logger;
};

Frame.prototype.stomp_connect = function(client) {
    this.connected = true;
    this.sock = client;
    var args = {};
    var headers = {};

    args['command'] = 'CONNECT';
    args['headers'] = headers;
    frame_to_send = this.build_frame(args);
    this.send_frame(frame_to_send);
    this.stomp_log.debug('Connected to STOMP');
    return this;
};

Frame.prototype.build_frame = function(args, want_receipt) {
    this.command = args['command'];
    this.headers = args['headers'];
    this.body = args['body'];
    var receipt_stamp = null;

    if (want_receipt) {
       receipt_stamp = Math.floor(Math.random()*10000000+1);
       this.headers['receipt'] = this.session['session'] + '-' + receipt_stamp;
       this.stomp_log.debug(want_receipt);
    }

    return this;
};

Frame.prototype.as_string = function() {
    var header_strs = Array(),
        frame = null,
        command = this.command,
        headers = this.headers,
        body = this.body;

    for (var header in headers) {
        this.stomp_log.debug(header);
        header_strs.push(header + ':' + headers[header] + '\n');
    }

    frame = command + '\n' + header_strs.join('\n') + '\n\n' + body + '\x00';

    return frame;
};

Frame.prototype.send_frame = function(frame) {
    this.sock.write(frame.as_string());

    if ('receipt' in frame.headers) {
        return this.get_reply();
    }
};

Frame.prototype.parse_frame = function(data) {
    var args = [],
        headers_str = null;

    this.command = this.parse_command(data);
    var _data = data.slice(this.command.length + 1, data.length);
    _data = _data.toString('utf8', start=0, end=_data.length);

    the_rest = _data.split('\n\n');
    this.headers = this.parse_headers(the_rest[0]);
    this.body = the_rest[1];

    if ('content-length' in this.headers)
        this.headers['bytes_message'] = true;

    if (this.command == 'ERROR') {
        throw new BrokerErrorResponse(this.body);
    }

    args['command'] = this.command;
    args['headers'] = this.headers;
    args['body'] = this.body;

    this_frame = new Frame(this.sock);
    return this_frame.build_frame(args);

};

Frame.prototype.parse_headers = function(headers_str) {

    var these_headers = Array(),
        one_header = Array(),
        headers_split = headers_str.split('\n');

    for (var i = 0; i < headers_split.length; i++) {
        one_header = headers_split[i].split(':');

        if (one_header.length > 1) {
            var header_key = one_header.shift();
            var header_val = one_header.join(':');
            these_headers[header_key] = header_val;
        }
        else {
            these_headers[one_header[0]] = one_header[1];
        }

    }

    return these_headers;

};

Frame.prototype.parse_command = function(data) {

    var command,
        this_string = data.toString('ascii', start=0, end=data.length);
    command = this_string.split('\n');
    return command[0];

};
