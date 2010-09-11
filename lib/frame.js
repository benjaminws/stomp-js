var sys = require('sys'),
    utils = require('./stomp-utils'),
    exceptions = require('./stomp-exceptions');

Frame = module.exports = function(logger) {
    this.me = Math.floor(Math.random()*10000000+1);
    this.sock = null;
    this.command = null;
    this.headers = null;
    this.body = null;
    this.reply = null;
    this.session = null;
    this.stomp_log = logger;
    this.rqueue = new StompQueue();
    this.iqueue = new IntermediateQueue();
    this.utils = new StompUtils();
};

Frame.prototype.stomp_connect = function(client) {
    var self = this,
        args = {},
        headers = {}
        next_frame = null;

    this.sock = client;
    args['command'] = 'CONNECT';
    args['headers'] = headers;
    frame_to_send = this.build_frame(args, true);
    parsed_frame = this.send_frame(frame_to_send);
    this.stomp_log.debug('Connected to STOMP');
    this.stomp_log.debug('headers: ' + sys.inspect(this.headers));
    if ('session' in this.headers)
        this.session = this.headers['session'];

    return this;
};

Frame.prototype.build_frame = function(args, want_receipt) {
    var self = this,
        receipt_stamp = null;

    this.command = args['command'];
    this.headers = args['headers'];
    this.body = args['body'];

    if (want_receipt) {
        receipt_stamp = Math.floor(Math.random()*10000000+1);
        if (this.session != null) {
            this.headers['receipt'] = receipt_stamp + "-" + this.session;
        }
        else {
            this.headers['receipt'] = receipt_stamp + "-";
        }
    }
    return this;
};

Frame.prototype.as_string = function() {
    var self = this,
        header_strs = Array(),
        frame = null,
        command = this.command,
        headers = this.headers,
        body = this.body;

    for (var header in headers) {
        header_strs.push(header + ':' + headers[header] + '\n');
    }

    frame = command + '\n' + header_strs.join('\n') + '\n\n' + body + '\x00';

    return frame;
};

Frame.prototype.send_frame = function(frame) {
    self = this;
    this.sock.write(frame.as_string());

    if ('receipt' in frame.headers)
        return this.get_reply();

};

Frame.prototype.parse_frame = function(data) {
    var self = this,
        args = [],
        headers_str = null;

    if (!this.utils.really_defined(data))
        return null;

    this.command = this.parse_command(data);
    var _data = data.slice(this.command.length + 1, data.length);
    _data = _data.toString('utf8', start=0, end=_data.length);

    the_rest = _data.split('\n\n');
    this.headers = this.parse_headers(the_rest[0]);
    this.body = the_rest[1];

    if ('content-length' in this.headers)
        this.headers['bytes_message'] = true;

    if (this.command == 'ERROR')
        throw new BrokerErrorResponse(this.body);

    args['command'] = this.command;
    args['headers'] = this.headers;
    args['body'] = this.body;

    this_frame = new Frame(this.sock);
    return_frame = this_frame.build_frame(args);
    return return_frame;
};

Frame.prototype.parse_headers = function(headers_str) {
    var these_headers = new Array(),
        one_header = new Array(),
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

Frame.prototype.parse_command = function(data) {
    var command,
        this_string = data.toString('utf8', start=0, end=data.length);
    command = this_string.split('\n');
    return command[0];
};

Frame.prototype.get_reply = function() {
    var self = this;

    while (true) {
        try {
            return self.rqueue.get()
        }
        catch (error) {
            if (error.name == "QueueEmpty") {
                this_frame = self.reply;
                if (!self.utils.really_defined(this_frame))
                    return null;
                if (this_frame.command == "MESSAGE")
                    return self.iqueue.put(this_frame);
                else
                    return self.rqueue.put(this_frame);
            }
        }
    }
};

Frame.prototype.get_message = function() {
    var self = this;

    while (true) {
        this_frame = this.rqueue.get()
        if (!this.utils.really_defined(this_frame))
            return null;
        if (this_frame.command == "MESSAGE")
            return frame;
        else
           this.rqueue.put(this_frame);
    }
};
