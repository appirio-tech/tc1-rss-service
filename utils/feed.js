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
var _ = require("lodash"),
    async = require("async");
    
var config = require("../config/defaults"),
    log = require("./logger"),
    cache = require("./cache"),
    rssUtil = require("./rssutil.js"),
    tcapi = require("./tcapi");
    
/**
 * Default error response XML
 */
var _invalidRequestXML = '<?xml version="1.0" encoding="UTF-8"?><text><para>Invalid parameters</para></text>';

/**
 * Query normalization: whitelisting, defaulting, etc
 * Both the "track" and "contestType" (for backwards compat) paramaters are synomyms to "type" 
 * which is used for two purposes:
 * It is passed in to the /v2/challenges API verbatim, 
 * but also the "all" and "data" values hold special control flow meaning
 * A value can be passed in any of these three fields, but precedence is applied
 * 
 * This function also applies a whitelist to protect from unsupported query params,
 * as well as defaulting a "list" value of "active" if none is supplied
 * 
 * @private
 * @param {object} query
 * @return {object}
 */
var _normalizeQuery = function (query) {
    // whitelisting
    var normalizedQuery = _.pick(query, config.queryParamsSupported);
    
    // type
    normalizedQuery.type = normalizedQuery.type || normalizedQuery.track || normalizedQuery.contestType || "all";
    normalizedQuery = _.omit(normalizedQuery, ["contestType", "track"]);
    
    // list: default and collapse
    if (!_.has(normalizedQuery, "list") || _.isEmpty(normalizedQuery.list)) {
        normalizedQuery.list = "active";
    } else if (_.isArray(normalizedQuery.list) && _.size(normalizedQuery.list > 1)) {
        normalizedQuery.list = _.first(normalizedQuery.list);
    }
    
    return normalizedQuery;
};

/**
 * Handle the request for challenge/feed RSS XML
 *
 * @param {Object} req Express's request object
 * @param {Object} res Express's response object
 * @param {function} next 
 * @api public
 */
module.exports = function (req, res, next) {

    var normalizedQuery = _normalizeQuery(req.query),
        serializedQuery = JSON.stringify(normalizedQuery);

    log.info("Processing request for query: %s", serializedQuery);
    
    /**
     * Send the response only if it has not already timedout
     * 
     * @private
     * @param {string | object} body
     * @param {number=} code optional status code
     * @param {string=} mimeType optional mime type
     */
    var _sendResponse = function (body, code, mimeType) {
        if (req.timedout) {
            next({timeout: true, message:"request timed out before feed could be sent as response"});
        } else {
            if (code) {
                res.status(code);
            }
            if (mimeType) {
                res.type("xml");
            }
            res.send(body);
        }
    };
        
    /**
     * Given an initialize array of TC challenge data, 
     * build the feed items, and add the XML to the response and cache
     * 
     * @private
     * @param {Array.<object>} data an array of data items returned from the TC API
     */
    var _returnFeed = function (data) {
        var rssXML = rssUtil.buildFeedXML(data);
        
        _sendResponse(rssXML, null, "xml");
        
        cache.put(serializedQuery, rssXML);
        log.info("Request with query %s processed", serializedQuery);
    };

    /**
     * Generic Error Handler
     */
    var _returnError = function (message, err) {
        log.error(message, err);
        _sendResponse("Internal Error while building feed", 500);
    };

    // Check if serving from cache is possible.
    // If so serve the cached response otherwise make API call.
    var cached_rsp = cache.get(serializedQuery);
    if (cached_rsp) {
        // Cache available.
        log.info("Serving response from cache...");
        _sendResponse(cached_rsp, null, "xml");
    } else {
        // Cache not available.
        log.info("No cached response available. Using TC API...");

        // Default -> will return all challenges including `data science`.
        // The "list" query param will be honored, but platforms and tecnologies,
        // but technologies and platforms are not supported in "all" mode
        if (_.isEmpty(normalizedQuery) || _.isEmpty(normalizedQuery.type) || normalizedQuery.type === "all") {
            async.parallel([
                function(callback){
                    tcapi.getStandardChallenges(normalizedQuery.list, null, callback);
                },
                function(callback){
                    tcapi.getDataScienceChallenges({listType: normalizedQuery.list}, callback);
                }
            ],
            // combine the results
            function(err, results) {
                if (err) {
                    _returnError("Failed to retrive COMBINED challenges from TC", err);
                    return true;
                } else {
                    _returnFeed(results[0].data.concat(results[1].data));                    
                }
            });
            
        } else {
            // Some query parameters present.
            // To be able to decide what to serve we need `type` and `listType` to be valid and present.
            if (_.contains(config.validTracks, normalizedQuery.type) &&
                _.contains(config.validLists, normalizedQuery.list)) {
                
                // Valid and present.
                // Data challenges need different handling again.
                if (normalizedQuery.type == "data") {
                    tcapi.getDataScienceChallenges({listType: normalizedQuery.list}, function (err, body) {
                        if (err) {
                            _returnError("Failed to retrieve data challenges from TC", err);
                            return true;
                        } else {
                            _returnFeed(body.data);                    
                        }
                    });
                } else {
                    // All other types.
                    var query = _.omit(normalizedQuery, "list");
                    tcapi.getStandardChallenges(normalizedQuery.list, query, function (err, body) {
                        if (err) {
                            _returnError("Failed to retrieve standard challenges from TC", err);
                            return true;
                        } else {
                            _returnFeed(body.data);                    
                        }
                    });
                }
            } else {
                // Not valid.
                _sendResponse(_invalidRequestXML, 400, "xml");
                // Notify.
                log.error("Request with query %s handled but is invalid", serializedQuery);
                return true;
            }
        }
    }
};
