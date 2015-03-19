
# Usage
## Supported parameters
- `track`: optional (default = "all").  valid values are {"all", "develop", "design", "data"}.
Two other deprecated parameters are also accepted (for backwards compatibility) but are disregarded if `track` is supplied: `type`, `contestType`
- `list`: optional (default = "active").  valid values are {"active", "open", "past", "upcoming"}

## Parameters supported only for design/develop tracks
- `challengeType` optional, no default.  Valid only for develop and design tracks
- `technologies`
- `platforms`

## Examples
/challenges/feed?track=design&list=upcoming
/challenges/feed?track=all&list=upcoming
/challenges/feed?track=develop&list=open&technologies=JavaScript

# Running
## Underlying APIs used
http://docs.tcapi.apiary.io/#softwarechallenges

## Required ENV params
- API_HOST || "http://api.topcoder.com"

to support the RSS headers:

- FEED_TITLE
- FEED_DESC
- FEED_URL
- FEED_SITE_URL

## Optional ENV params
- CACHE_TIME || 5 //in minutes
- REQUEST_TIMEOUT || 25 //inbound timeout (seconds)
- API_TIMEOUT || 20 //outbound TC API timeout (seconds)
- PAGE_SIZE || 51 // page size sent to TC API
- DESC_TRUNC_LENGTH || 500 // number of characters to limit challenge description included in feed