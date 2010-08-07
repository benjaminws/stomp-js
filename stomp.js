var net = require('net');
var Frame = require('./frame');

function Stomp(port, host) {
    var port = port,
        host = host,
        frame = new Frame();

    this.connect = function() {

        console.log('Connecting to ' + host + ':' + port);
        client = net.createConnection(port, host);

        client.addListener('connect', function () {
            console.log('connected to socket');
            connected_frame = frame.stomp_connect(client);
        });
        client.addListener('data', function (data) {
            console.log("Got: " + data);
            connected_frame.parse_frame(data);
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
//stomp = new Stomp(61613, 'localhost');
//stomp.connect();

module.exports = Stomp;
