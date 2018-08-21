# realmeye-api changelog

**2018-08-20** v0.2.0

- Redis caching implemented over all lookup request data
- Cache updates obtain write locks and fallback on stale or inflight caches when failed
- System logging facilities added
- Added runtimeID for request tracing

**2018-08-18** v0.1.0

- Abandoned browser library due to CORS headaches
- Converted to NodeJS
- Can be imported as a library or ran as restful api web server

**2017-09-26** v0.0.1

- Search by player name for summary and character list
- Search top characters by class