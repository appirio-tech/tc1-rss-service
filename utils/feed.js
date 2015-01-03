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
var config = require('../config/defaults'),
    RSS = require('rss'),
    _ = require('lodash'),
    request = require('request'),
    log = require('./logger'),
    cache = require('./cache');


/**
 *
 *
 * @param {Object} req Express's request object
 * @param {Object} res Express's response object
 * @api public
 */
module.exports = function (req, res) {

    var
    // Let's pick and work with only the supported query parameters.
    // Needed to secure us from other and protect the cache indexing.
        whiteListedQuery = _.pick(req.query, config.queryParamsSupported),
        // Serialize the query as it is used for key indexing the cache.
        serializedQuery = JSON.stringify(whiteListedQuery),
        // Flag if the request was processed.
        processed = false,
        // Flag if the request timeout.
        timeout = false,
        // The rss content generator.
        feed = new RSS(config.FEED_OPTIONS);

    log.info('Processing request for query: %s', serializedQuery);

    /*!
     * API timeout handler function.
     */
    _.delay(function () {
        // Make sure the request is still pending.
        // Otherwise do nothing.
        if (!processed) {
            timeout = true;
            log.info('API timeout triggered after %d seconds', config.API_TIMEOUT);
            res.status(202).send('');
        }
    }, config.API_TIMEOUT * 1000);

    /**
     * HTTP[S] request helper function. Reduces boilerplate code.
     *
     * @param {String} url The url to request
     * @param {Function} fn Callback
     * @api private
     */
    function requestFromTC_API(url, fn) {
        request({
            url: url,
            json: true,
            //timeout: config.API_TIMEOUT * 1000
        }, function (err, rsp, body) {
            // Do nothing if timeout alredy triggered.
            if (err || rsp.statusCode !== 200) {
                log.error('Request FAILED.', err || rsp.statusCode);
                res.status((rsp && rsp.statusCode) || 500).end();
                processed = true;
            } else {
                log.info('Request OK.', rsp.statusCode);
                fn(rsp, body);
            }
        });
    }

    // Setting the appropriate Content-Type of the response.
    res.set('Content-Type', 'text/xml; charset=utf-8');

    // Check if serving from cache is possible.
    // If so serve the cached response otherwise make API call.
    var cached_rsp = cache.get(serializedQuery);
    if (cached_rsp) {
        // Cache available.
        log.info('Serving response from cache...');
        res.send(cached_rsp);
        processed = true;
        // Notify.
        log.info('Request with query %s processed', serializedQuery);
    } else {
        // Cache not available.
        log.info('No cached response available. Using TC API...');

        // Default -> will return all challenges including `data science`.
        if (_.isEmpty(whiteListedQuery) || !whiteListedQuery.contestType || whiteListedQuery.contestType == 'all') {
            var url_challenges = config.API_HOST + '/v2/challenges?pageIndex=1&pageSize=2147483647',
                url_data = config.API_HOST + '/v2/data/marathon/challenges?pageIndex=1&pageSize=2147483647',
                combined;

            if (whiteListedQuery.list) {
                url_challenges += '&listType=' + whiteListedQuery.list;
                url_data += '&listType=' + whiteListedQuery.list;
            }

            log.info('GET %s', url_challenges);

            requestFromTC_API(url_challenges, function (challenges_rsp, challenges_body) {
                // Store the results returned.
                combined = challenges_body.data;

                // To get the data challenges too we need 2nd call to the `/data` endpoint.
                // After that we serve combined results.
                log.info('GET %s', url_data);

                requestFromTC_API(url_data, function (data_rsp, data_body) {
                    log.info('Combining, sorting and building feed from %d challenges', combined.length + data_body.data.length);

                    // Combine
                    _.each(data_body.data, function (data_challenge) {
                        // The `/data` endpoint uses different response structure
                        // so we need to manually translate.
                        combined.push({
                            challengeName: data_challenge.fullName,
                            problemId: data_challenge.problemId,
                            roundId: data_challenge.roundId,
                            postingDate: data_challenge.startDate
                        });
                    });

                    // Sort and iterate data to create feed items.
                    _.chain(combined)
                        .sortBy('postingDate')
                        .reverse()
                        .each(function (challenge) {
                            feed.item({
                                title: challenge.challengeName,
                                url: (challenge.problemId ?
                                    ('https://community.topcoder.com/longcontest/?module=ViewProblemStatement&rd=' + challenge.roundId + '&pm=' + challenge.problemId) :
                                    ('https://www.topcoder.com/challenge-details/' + challenge.challengeId + '/?type=' + challenge.challengeCommunity)),
                                guid: challenge.challengeId || challenge.problemId,
                                date: challenge.postingDate
                            });
                        });
                    // Get the XML
                    var feed_body = feed.xml();
                    // Respond.
                    if (!timeout) {
                        res.send(feed_body);
                    } else {
                        log.info('Storing response in cache...');
                    }
                    // Update cache and done flag.
                    cache.put(serializedQuery, feed_body);
                    processed = true;
                    // Notify.
                    log.info('Request with query %s processed', serializedQuery);
                });
            });
        } else {
            // Some query parameters present.
            // To be able to decide what to serve we need `type` and `listType` to be valid and present.
            // Let's validate them.
            if (_.contains(config.validTracks, whiteListedQuery.contestType) && _.contains(config.validLists, whiteListedQuery.list)) {
                // Valid and present.
                // Data challenges need different handling again.
                if (whiteListedQuery.contestType == 'data') {
                    // Handle `data science` requests.
                    var url_marathon = config.API_HOST + '/v2/data/marathon/challenges?listType=' + whiteListedQuery.list + '&pageIndex=1&pageSize=2147483647';

                    log.info('GET %s', url_marathon);

                    requestFromTC_API(url_marathon, function (marathon_rsp, marathon_body) {
                        log.info('Sorting and building feed from %d challenges', marathon_body.data.length);

                        // Sort and iterate data to create feed items.
                        _.chain(marathon_body.data)
                            .sortBy('startDate')
                            .reverse()
                            .each(function (challenge) {
                                feed.item({
                                    title: challenge.fullName,
                                    url: 'https://community.topcoder.com/longcontest/?module=ViewProblemStatement&rd=' + challenge.roundId + '&pm=' + challenge.problemId,
                                    guid: challenge.problemId,
                                    date: challenge.startDate
                                });
                            });
                        // Get the XML
                        var feed_body = feed.xml();
                        // Respond.
                        if (!timeout) {
                            res.send(feed_body);
                        } else {
                            log.info('Storing response in cache...');
                        }
                        // Update cache and done flag.
                        cache.put(serializedQuery, feed_body);
                        processed = true;
                        // Notify.
                        log.info('Request with query %s processed', serializedQuery);
                    });
                } else {
                    // All other types.
                    var url_others = config.API_HOST + '/v2/challenges/' + whiteListedQuery.list +
                        '?type=' + whiteListedQuery.contestType +
                        '&pageIndex=1&pageSize=2147483647' +
                        (whiteListedQuery.challengeType ? ('&challengeType=' + whiteListedQuery.challengeType) : '') +
                        (whiteListedQuery.technologies ? ('&technologies=' + whiteListedQuery.technologies) : '') +
                        (whiteListedQuery.platforms ? ('&platforms=' + whiteListedQuery.platforms) : '');

                    log.info('GET %s', url_others);

                    requestFromTC_API(url_others, function (others_rsp, others_body) {
                        log.info('Sorting and building feed from %d challenges', others_body.data.length);

                        // Sort and iterate data to create feed items.
                        _.chain(others_body.data)
                            .sortBy('registrationStartDate')
                            .reverse()
                            .each(function (challenge) {
                                feed.item({
                                    title: challenge.challengeName,
                                    url: 'https://www.topcoder.com/challenge-details/' + challenge.challengeId + '/?type=' + challenge.challengeCommunity,
                                    guid: challenge.challengeId,
                                    date: challenge.registrationStartDate
                                });
                            });
                        // Get the XML
                        var feed_body = feed.xml();
                        // Respond.
                        if (!timeout) {
                            res.send(feed_body);
                        } else {
                            log.info('Storing response in cache...');
                        }
                        // Update cache and done flag.
                        cache.put(serializedQuery, feed_body);
                        processed = true;
                        // Notify.
                        log.info('Request with query %s processed', serializedQuery);
                    });
                }
            } else {
                // Not valid.
                res.status(400).send(
                    '<?xml version="1.0" encoding="UTF-8"?>' +
                    '<text>' +
                    '<para>Invalid parameters</para>' +
                    '</text>'
                );
                processed = true;
                // Notify.
                log.error('Request with query %s handled but is invalid', serializedQuery);
            }
        }
    }
};
