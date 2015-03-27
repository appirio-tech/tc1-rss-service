/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 *
 * @version 1.0
 * @author TCCODER
 */

/* jslint node: true */
/* jslint nomen: true */

"use strict";


/*!
 * Module dependencies
 */
var config = require("./config/defaults"),
    express = require("express"),
    timeout = require("connect-timeout"),
    app = express(),
    feed = require("./utils/feed"),
    log = require("./utils/logger");

// Set a global request timeout
app.use(timeout(config.REQUEST_TIMEOUT + "s"));

// Define the endpoint.
app.get("/challenges/feed", feed);

// Generic error hanndler (primarily for timeout)
app.use(function (err, req, res, next) {
    res.status(err.status || 500).send(err.message || "Unexpected Error");
});

// Listen for connections.
app.listen(config.PORT);
log.info("Service listening on port:", config.PORT);
