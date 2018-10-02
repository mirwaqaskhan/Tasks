const port = 3000;
const express = require('express');
const cheerio = require('cheerio');
const rp = require('request-promise');
const Q = require('q');
const app = express();

var rpOptions = {
    uri: '',
    transform: function (body) {
        return cheerio.load(body);
    }
};

// helper for url validation
const validateUrl = (value) => /^(?:(?:https?|ftp):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/.test(value);
// helper to get title from url
const getTitleFromUrl = (url) => {
    // do a request with the url
    rpOptions.uri = url;
    // return request promise
    return rp(rpOptions);
}
// helper for request invalid uri issue
const addHttpToUrl = (url) => {
    if (!url.includes("http")) {
        url = "http://" + url;
    }
    return url;
}
// helper for success response with title || titles
const successHandler = (res, title) => {
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

// helper for success response with title || titles
const failureHandler = (res, title) => {
    res.status(404).send(`<html>
            <body>
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
        failureHandler(res, "Not a valid url");
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
            failureHandler(res, urls);
            return;
        }
    } else if (!validateUrl(req.query.address)) {
        // return single invalid url
        failureHandler(res, `<li> ${req.query.address} - NO RESPONSE </li>`);
        return;
    }
    next();
});

app.get('/I/want/title/', (req, res) => {
    if (req.body.hasSingleAddress) {
        getTitleFromUrl(addHttpToUrl(req.query.address)).then(function ($) {
            successHandler(res, `<li>${$('title').text()}</li>`);
        }).catch(function (err) {
            failureHandler(res, `<li>No Title found for Url</li>`);
        });
    } else {
        let titles = "";
        let promisesArray = [];
        req.body.urls.map((uri) => {
            promisesArray.push(getTitleFromUrl(addHttpToUrl(uri)));
        });
        Q.all(promisesArray)
            .then((qResponse) => {
                if (qResponse) {
                    qResponse.map(tl => titles += `<li>${tl('title').text()}</li>`);
                    successHandler(res, titles);
                }
            }, (error) => {
                // All of the promises were rejected.
                if (error) {
                    failureHandler(res, "Not a valid url");
                }
            });
    }
});

app.listen(port, (err, res) => {
    if (err) {
        console.log("server couldn't start ", err);
    }
    console.log("Server is listen at " + port);
});