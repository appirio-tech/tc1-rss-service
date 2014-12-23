/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 *
 * @version 1.0
 * @author TCCODER
 */

/* jslint node: true */
/* jslint nomen: true */

'use strict';


/*!
 * Module dependencies
 */
var config = require('./config/defaults'),
    express = require('express'),
    app = express(),
    feed = require('./utils/feed'),
    log = require('./utils/logger');


// Define the endpoint.
app.get('/challenges/feed', function (req, res) {
    return feed(req, res);
});

// Listen for connections.
app.listen(config.PORT);
log.info('Service listening on port:', config.PORT);
