var net = require('net');
var Frame = require('./frame');

function Stomp(port, host) {
    this.port = port;
    this.host = host;
    this.frame = new Frame();

    this.connect = function() {
        port = this.port;
        host = this.host;
        console.log('Connecting to ' + host + ':' + port);
        net.createConnection(function (port, host) {
            stream.on('connect', function () {
                console.log('connected');
                this.frame.connect(stream);
            });
            stream.on('data', function (data) {
                stream.write(data);
            });
            stream.on('end', function () {
                stream.write('goodbye\r\n');
                stream.end();
            });
        });
    };
}
stomp = new Stomp(61613, 'localhost');

console.dir(stomp.connect());

module.exports = Stomp;
