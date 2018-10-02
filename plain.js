const port = 3000;
const express = require('express');
const cheerio = require('cheerio');
const request = require('request');
const app = express();

// helper for url validation
const validateUrl = (value) => /^(?:(?:https?|ftp):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/.test(value);
// helper to get title from url
const getTitleFromUrl = (url, cb) => {
    // do a request with the url
    request(url, function (err, resp, body) {
        // load DOM into cheerio to fetch title from it
        $ = cheerio.load(body);
        // trigger callback when loadding has finished
        cb($('title').text());
    });
}
// helper for request invalid uri issue
const addHttpToUrl = (url) => {
    if (!url.includes("http")) {
        url = "http://" + url;
    }
    return url;
}
// helper for success response with title || titles
const successCallback = (res, title) => {
    res.status(200).send(`<html>
            <head></head>
            <body>
            
                <h1> Following are the titles of given websites: </h1>
            
                <ul>
                   ${title}
                </ul>
            </body>
            </html>`);
    return;
}

// middlerware to handle invalid urls
app.use((req, res, next) => {
    req.body = {
        hasSingleAddress: true,
        urls: []
    };
    if (!req.query || !req.query.address) {
        // return not a valid url
        var str = "Not a valid url";

        res.status(404).send(`<html><body><li> ${str} - NO RESPONSE </li></body></html>`);
        return;
    } else if (typeof (req.query.address) == "object") {
        // case there are multiple addresses
        let urls = "";
        // set object to be used for later purpose not a good practice.
        req.body = {
            hasSingleAddress: false,
            urls: req.query.address
        };
        // loop through all addresses and check if all are correct.
        req.query.address.map((value) => {
            if (!validateUrl(value)) {
                urls += `<li> ${value} - NO RESPONSE </li>`;
            }
        });
        // return all invalid urls
        if (urls.length > 0) {
            res.status(404).send(`<html><body>${urls}</body></html>`);
            return;
        }
    } else if (!validateUrl(req.query.address)) {
        // return single invalid url
        res.status(404).send(`<html><body><li> ${req.query.address} - NO RESPONSE </li></body></html>`);
        return;
    }
    next();
});

app.get('/I/want/title/', (req, res) => {
    if (req.body.hasSingleAddress) {
        getTitleFromUrl(addHttpToUrl(req.query.address), (title) => {
            successCallback(res, `<li>${title}</li>`);
        });
    } else {
        let numberOfResponseToCome = req.body.urls.length;
        let titles = "";
        req.body.urls.map((uri) => {
            getTitleFromUrl(addHttpToUrl(uri), (title) => {
                titles += `<li>${title}</li>`;
                numberOfResponseToCome--;
                if (numberOfResponseToCome === 0) {
                    successCallback(res, titles);
                }
            })
        });
    }
});

app.listen(port, (err, res) => {
    if (err) {
        console.log("server couldn't start ", err);
    }
    console.log("Server is listen at " + port);
});