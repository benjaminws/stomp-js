var sys = require('sys');

function Frame() {
    this.connected = false;
    this.sock = '';
    this.command = '';
    this.headers = '';
    this.body = '';

    this.stomp_connect = function (sock) {
        this.sock = sock;
        this.connected = true;
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
        this.command = args['command'];
        this.headers = args['headers'];
        this.body = args['body'];
        if (want_receipt) {
           receipt_stamp = Math.floor(Math.random()*10000000+1);
            this.headers['receipt'] = "-"
           console.log(want_receipt);
        }
        return this;
    };

    this.as_string = function() {
        command = this.command;
        headers = this.headers;
        body = this.body;
        header_strs = Array();

        for (var header in headers) {
            header_strs.push(header + ':' + headers[header] + '\n');
        }

        frame = command + '\n' + header_strs.join() + '\n' + body + '\x00';

        return frame;
    };

    this.send_frame = function(frame) {
        this.sock.write(frame.as_string());
    };
};

module.exports = Frame;
