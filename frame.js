function Frame() {
    this.connected = false;

    this.connect = function (sock) {
        this.connected = true;
        console.log('connected');
    };
};

module.exports = Frame;
