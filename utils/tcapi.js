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
var config = require("../config/defaults"),
    _ = require("lodash"),
    async = require("async"),
    request = require("request"),
    log = require("./logger"),
    cache = require("./cache");

/**
 * base URLs for TC API
 */
var url_standardChallenges = config.API_HOST + "/v2/challenges",
    url_dataScience = config.API_HOST + "/v2/data/marathon/challenges",
    defaultQs = {
        pageIndex: 1,
        pageSize: config.PAGE_SIZE
    };
    
/**
 * HTTP[S] request helper function
 *
 * @private
 * @param {string} url The url to request
 * @param {object} query 
 * @param {function} fn Callback
 */
var requestFromTC_API = function (url, query, callback) {
    log.info("Calling API %s %j", url, query);
    
    var cachedKey = "TC" + url + JSON.stringify(query),
        cachedResponse = cache.get(cachedKey);
        
    if (cachedResponse) {
        // Cache available.
        log.info("Serving response from cache...");
        callback(null, cachedResponse);
    } else {
        //request.debug = true;
        request({
            url: url,
            qs: query,
            useQuerystring: true,
            json: true,
            timeout: config.API_TIMEOUT * 1000
        }, function (err, rsp, body) {
            if (err || rsp.statusCode !== 200) {
                log.error('Request FAILED.', err || rsp.statusCode);
                callback(err || "HTTP error " + rsp.statusCode);
            } else {
                log.info('Request OK.', rsp.statusCode);
                cache.put(cachedKey, body);
                callback(null, body);
            }
        });
    }
}


/**
 * Performs a cache-first request to the topcoder API
 *
 * @param {string} list supported lists: "open", "active", "past", "upcoming"
 * @param {object} query 
 * @param {funciton} callback success callback
 */
exports.getStandardChallenges = function (list, query, callback) {
    var url = url_standardChallenges + "/" + list,
        queryWithDefaults = _.merge(query || {}, defaultQs);
    
    requestFromTC_API(url, queryWithDefaults, function (err, queryResult) {
        if (err) {
            callback(err);
        } else {
            async.map(queryResult.data
                ,function (item, callback) {
                    //fetch challenge details and merge the results into the current item
                    var detailUrl = url_standardChallenges + "/" + item.challengeId;
                    requestFromTC_API(detailUrl, null, function (err, detailsResult) {
                        if (err) {
                            callback(err);
                        } else {
                            callback(null, _.merge(item, detailsResult));
                        }
                    });
                }
                ,function(err, detailResult) {
                    if (err) {
                        callback(err);
                    } else {
                        queryResult.data = detailResult;
                        callback(null, queryResult);
                    }
                }
            );
        }
        
    });
}


/**
 * Performs a cache-first request to the topcoder "data" API for marathon matches
 *
 * @param {object} query 
 * @param {funciton} callback success callback
 */
exports.getDataScienceChallenges = function (query, callback) {
    var queryWithDefaults = _.merge(query || {}, defaultQs);
    
    requestFromTC_API(url_dataScience, queryWithDefaults, function (err, body) {
        if (err) {
            callback(err);
        } else {
            // normalize the return data so it can be consued by the feed builder
            // more consistenly with the standard challenge data
            body.data = _.map(body.data, function (rec) {
                return {
                    challengeName: rec.fullName,
                    problemId: rec.problemId,
                    roundId: rec.roundId,
                    registrationStartDate: rec.startDate
                };
            });
            callback(null, body);
        }
    });
}