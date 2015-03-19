/*
 * Copyright (C) 2014 TopCoder Inc., All Rights Reserved.
 *
 * @version 1.0
 * @author TCCODER
 */

/* jslint node: true */
/* jslint nomen: true */

"use strict";

var RSS = require("rss"),
    _ = require("lodash"),
    moment = require("moment"),
    htmlSanitize = require("sanitize-html"),
    htmlTruncate = require("html-truncate");

var config = require("../config/defaults");
    
/**
 * Default Date Format
 */
var _dateFormat = function (date) {
    return moment(date).format("YYYY-MM-DD HH:mm Z");
};

/**
 * Truncate given HTML in a "tag safe" way, but first sanitize it to get rid of all but a core set of HTML tags
 */
var _truncAndSanitizeHtml = function (html, truncLength) {
    return htmlTruncate(htmlSanitize(html), truncLength);
};
    
/**
 * Do the heavy lifting of formatting challenge data into something that can be jammed into an RSS feed
 */
var _buildChallengeInfoBlurb = function (challenge) {
    var html = "",
        templateString = "<div><%- key %>: <%- value %></div>",
        template = _.template(templateString);
    
    if (challenge.detailedRequirements) {
        html += _truncAndSanitizeHtml(challenge.detailedRequirements, config.DESC_TRUNC_LENGTH);
        html += "<br />";
    }
    if (challenge.platforms) {
        html += template({key: "Platforms", value: challenge.platforms.join(" / ")});
    }
    if (challenge.technologies) {
        html += template({key: "Technologies", value: challenge.technologies.join(" / ")});
    }
    if (challenge.firstPlacePrize || challenge.totalPrize) {
        html += template({key: "Prize", value: challenge.totalPrize + " (" + challenge.firstPlacePrize + ")"});
    }
    if (challenge.registrationStartDate || challenge.registrationEndDate) {
        html += template({key: "Registration Period", 
            value: _dateFormat(challenge.registrationStartDate) + " - " + _dateFormat(challenge.registrationEndDate)});
    }
    if (challenge.registrationOpen) {
        html += template({key: "Open for registration", value: challenge.registrationOpen});
    }
    if (challenge.submissionEndDate) {
        html += template({key: "Submissions Due", value: _dateFormat(challenge.submissionEndDate)});
    }
    if (challenge.challengeType || challenge.challengeCommunity) {
        html += template({key: "Type", value: challenge.challengeType + " / " + challenge.challengeCommunity });
    }
        
    return html;
 
};

/**
 * Given an array of challenges, build an RSS feed as XML data
 * 
 * @param {Array.<Challenge>} challenges
 * @return {XML} feed
 */
exports.buildFeedXML = function (challenges) {
    
    var feed = new RSS(config.FEED_OPTIONS);

    // Sort and iterate challenges to create feed items.
    _.chain(challenges)
            .sortBy("registrationStartDate")
            .reverse()
            .forEach(function (challenge) {
                feed.item({
                    title: challenge.challengeName,
                    url: (challenge.problemId ?
                        ("https://community.topcoder.com/longcontest/?module=ViewProblemStatement&rd=" + challenge.roundId + "&pm=" + challenge.problemId) :
                        ("https://www.topcoder.com/challenge-details/" + challenge.challengeId + "/?type=" + challenge.challengeCommunity)),
                    guid: challenge.challengeId || challenge.problemId,
                    date: challenge.registrationStartDate,
                    description: _buildChallengeInfoBlurb(challenge)
                });
            })
            .commit();  // for the lodash chain to finalize
        
    return feed.xml();
};