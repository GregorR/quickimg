#!/usr/bin/env node
/*
 * Example data provider LibreOffice Remote for quickimg.
 *
 * Use: ./loi-preview.js [quickimg host] [remote path] [port]
 * Assumes LOI is on localhost:1599
 *
 * Copyright (c) 2013, Gregor Richards
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
 * REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 * INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
 * LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
 * OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
 * PERFORMANCE OF THIS SOFTWARE.
 */

// args
var protocol = "http";
if (process.argv[2]) {
    protocol = process.argv[2];
    if (protocol !== "https") protocol = "http";
}
var host = "localhost";
if (process.argv[3])
    host = process.argv[3];
var path = "/quickimg";
if (process.argv[4])
    path = process.argv[4];
var port = (protocol === "https") ? 443 : 80;
if (process.argv[5])
    port = +process.argv[5];

var http = require(protocol);
var net = require("net");
var querystring = require("querystring");

// data from/to Impress
var imData = "";
var imPin = Math.floor(Math.random() * 10000);
console.log("PIN: " + imPin);

var currentSlide = 0;
var slidePreviews = {};

// current server response and next server request function
var curRes = null;
var nextReq = null;

// end the current response
function endRes() {
    console.log("Response ended");
    curRes = null;
    if (nextReq !== null) {
        nextReq();
        nextReq = null;
    }
}

// show the current slide
function showSlide(slide) {
    function update() {
        var req = http.request({
            method: "POST",
            host: host,
            path: path + "/updata.php",
            port: port,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            }},
            function(res) {
                curRes = res;
                res.on("data", function(data) {
                    console.log(data.toString());
                });
                res.on("error", endRes);
                res.on("end", endRes);
            }
        );

        req.write(
            querystring.stringify({"data": slidePreviews[slide]})
        );
        req.end();
    }

    if (currentSlide in slidePreviews) {
        if (curRes !== null) {
            nextReq = update;
        } else {
            update();
        }
    }
}

// handler for Impress data
function handleImpress(data) {
    var cmd = data[0];
    console.log("Received " + cmd);

    if (cmd === "slide_updated") {
        currentSlide = +data[1];
        showSlide(currentSlide);

    } else if (cmd === "slide_preview") {
        var snum = +data[1];
        slidePreviews[snum] = data[2];
        if (snum === currentSlide) showSlide(currentSlide);

    }
}

// handler for Impress socket
var imSock = net.connect({port: 1599});
imSock.on("data", function(data) {
    imData += data.toString();
    var nlnl = imData.indexOf("\n\n");
    while (nlnl !== -1) {
        var data = imData.substring(0, nlnl);
        handleImpress(data.split("\n"));
        imData = imData.substring(nlnl + 2);
        nlnl = imData.indexOf("\n\n");
    }
});
imSock.on("end", function() {});

// connect
imSock.write("LO_SERVER_CLIENT_PAIR\nloi-preview\n" + imPin + "\n\n");
