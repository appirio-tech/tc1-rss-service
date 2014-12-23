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
require('dotenv').load();


/**
 * Represents service configuration.
 */
module.exports = {
    // Environment
    PORT: process.env.PORT || 3333,
    CACHE_TIME: process.env.CACHE_TIME,
    API_TIMEOUT: process.env.API_TIMEOUT,
    API_HOST: process.env.API_HOST,
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
    queryParamsSupported: ['type', 'listType', 'challengeType', 'platforms', 'technologies'],
    // Allowed values for the `type` query parameter.
    validTypes: ['design', 'develop', 'data'],
    // Allowed values for the `listType` query parameter.
    validListTypes: ['active', 'past', 'upcoming']
};
