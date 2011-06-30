/*
    frame.js - Frame object

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

/**
 * Frame - Object representation of a STOMP frame
 */
function Frame() {
    this.command = null;
    this.headers = null;
    this.body = null;
};

/**
 * Build frame based on arguments provided
 * @param {Object} arguments needed to build frame (command, headers, body?)
 * @param {Bool} Indicate that you wish to get a receipt (set receipt header)
 * @return {Object} Frame object
 */
Frame.prototype.build_frame = function(args, want_receipt) {
    var self = this,
        receipt_stamp = null;

    self.command = args['command'];
    self.headers = args['headers'];
    self.body = args['body'];

    if (want_receipt) {
        var _receipt = '';
        receipt_stamp = Math.floor(Math.random()*99999999999).toString();
        if (self.headers['session'] != undefined) {
            _receipt = receipt_stamp + "-" + self.headers['session'];
        }
        else {
            _receipt = receipt_stamp;
        }
        self.headers['receipt'] = _receipt;
    }
    return self;
};

/**
 * String representation of Frame object
 * @return {String} - Frame as string
 */
Frame.prototype.as_string = function() {
    var self = this,
        header_strs = [],
        frame = "",
        command = this.command,
        headers = this.headers,
        body = this.body;

    for (var header in headers) {
        header_strs.push(header + ':' + headers[header]);
    }

    frame += command + "\n";
    frame += header_strs.join("\n");
    frame += "\n\n";

    if(body)
        frame += body;

    frame += '\x00\n';

    return frame;
};

module.exports.Frame = Frame;
