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
var cache = require('memory-cache'),
    config = require('../config/defaults'),
    log = require('./logger');


/**
 * Represents the cache layer of the service.
 * Abstracted here for "easy to modify" porpose.
 * Set other caching implementation when needed, just follow/define the interface provided here
 * because it is used in the rest of the app.
 */
module.exports = {
    // Special get which will check if the record is older than allowed `CACHE_TIME`.
    // If that is the case we return null which forces cache update by the logic implemented in `feed.js`.
    get: function (key) {
        var now = new Date().getTime(),
            mark = cache.get('timestamp_' + key);
        if (mark && (now - mark) > config.CACHE_TIME * 60 * 1000) {
            log.info('Forcing cache update for %s', key);
            return null;
        } else if (mark) {
            return cache.get(key);
        } else {
            return null;
        }
    },
    // We will timestamp puts to be able to track records age.
    put: function (key, val) {
        cache.put('timestamp_' + key, new Date().getTime());
        log.info('Cached for %d minute[s]', config.CACHE_TIME);
        return cache.put(key, val);
    }
};
