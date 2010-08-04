var net = require('net');
var Frame = require('./frame');

function Stomp(port, host) {
    this.port = port;
    this.host = host;
    this.frame = new Frame();

    this.connect = function() {
        port = this.port;
        host = this.host;
        frame = this.frame;

        console.log('Connecting to ' + host + ':' + port);
        client = net.createConnection(port, host);
        console.dir(client);

        client.addListener('connect', function () {
            console.log('connected to socket');
            connected_frame = frame.stomp_connect(client);
            console.dir(connected_frame);
        });
        client.addListener('data', function (data) {
            console.log("Got: " + data);
            console.dir(connected_frame);
        });
        client.addListener('end', function () {
            console.log('goodbye');
        });
        client.addListener('error', function (error) {
            console.log(error);
            console.log("error");
        });
        client.addListener('close', function (error) {
            console.log("disconnected");
        });
    };
}
stomp = new Stomp(61613, 'localhost');
stomp.connect();

console.dir(stomp);

module.exports = Stomp;
