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
require("dotenv").load();


/**
 * Represents service configuration.
 */
module.exports = {
    // Environment
    PORT: process.env.PORT || 3333,
    CACHE_TIME: process.env.CACHE_TIME || 5, //minutes
    REQUEST_TIMEOUT: process.env.REQUEST_TIMEOUT || 25, //inbound timeout in seconds
    API_TIMEOUT: process.env.API_TIMEOUT || 20, //outbound TC API timeout in seconds
    API_HOST: process.env.API_HOST || "http://api.topcoder.com",
    PAGE_SIZE: process.env.PAGE_SIZE || 51,
    DESC_TRUNC_LENGTH: process.env.DESC_TRUNC_LENGTH || 500,
    FEED_OPTIONS: {
        // See https://github.com/dylang/node-rss#feedoptions
        // for possible options and more info how to use them.
        // We set here only the required options.
        // Add/edit as needed and map them to the .env file.
        title: process.env.FEED_TITLE,
        description: process.env.FEED_DESC,
        feed_url: process.env.FEED_URL,
        site_url: process.env.FEED_SITE_URL
    },
    // Other
    //
    // Whitelist of all query parameters supported by the endpoint.
    // Not listed here will be filtered out.
    queryParamsSupported: ["type", "track", "contestType", "list", "challengeType", "platforms", "technologies"],
    // Allowed values for the `type` query parameter. (note: all is omitted here on purpose)
    validTracks: ["design", "develop", "data"],
    // Allowed values for the `list` query parameter.
    validLists: ["open", "active", "past", "upcoming"]

};
