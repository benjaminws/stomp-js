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

        command = this.parse_command(data);
        data = data.slice(command.len+1)
        headers_str, body = data.split("\n\n");
        headers = this.parse_headers(headers_str);

        args['command'] = command;
        args['headers'] = headers;
        args['body'] = body;

        this_frame = Frame(sock);
        this_frame.build_frame(args);
    };

};

module.exports = Frame;
