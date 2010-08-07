var sys = require('sys');

function Frame() {
    var connected = false,
        sock = '',
        command = '',
        headers = '',
        body = '';

    this.stomp_connect = function (client) {
        connected = true;
        sock = client;
        var args = Array();
        var headers = Array();

        args['command'] = 'CONNECT';
        args['headers'] = headers;
        frame_to_send = this.build_frame(args);
        this.send_frame(frame_to_send);
        console.log('connected to stomp');
        return this;
    };

    this.build_frame = function(args, want_receipt) {
        command = args['command'];
        headers = args['headers'];
        body = args['body'];
        if (want_receipt) {
           receipt_stamp = Math.floor(Math.random()*10000000+1);
           this.headers['receipt'] = "-"
           console.log(want_receipt);
        }
        return this;
    };

    this.as_string = function() {
        header_strs = Array();

        for (var header in headers) {
            header_strs.push(header + ':' + headers[header] + '\n');
        }

        frame = command + '\n' + header_strs.join() + '\n' + body + '\x00';

        return frame;
    };

    this.send_frame = function(frame) {
        console.dir(sock);
        sock.write(frame.as_string());
    };

    this.parse_frame = function(data) {
        args = Array();
        headers = Array();
        headers_str = '';
        body = '';

        console.dir("Data: " + data);
        command = this.parse_command(data);
        var _data = data.slice(command.length + 1, data.length);
        _data = _data.toString('utf8', start=0, end=_data.length);

        the_rest = _data.split("\n\n");
        headers = this.parse_headers(the_rest[0]);
        body = the_rest[1];

        args['command'] = command;
        args['headers'] = headers;
        args['body'] = body;

        console.dir(args);
        this_frame = new Frame(sock);
        return this_frame.build_frame(args);

    };

    this.parse_headers = function(headers_str) {

        my_headers = Array();
        headers_split = headers_str.split("\n");
        for (var i = 0; i < headers_split.length; i++) {
            header = headers_split[i].split(":", 1);
            my_headers[header[0]] = header[1];
        }

        return my_headers;

    };

    this.parse_command = function(data) {

        this_string = data.toString('ascii', start=0, end=data.length);
        command = this_string.split("\n");
        console.log("Command: " + command[0]);
        return command[0];

    };

};

module.exports = Frame;
