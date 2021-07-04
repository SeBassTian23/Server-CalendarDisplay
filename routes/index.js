/**
 * Route for calendar request to receive 2 weeks or 20 events
 */
var express = require('express');
var router = express.Router();

/* Date and Time functions */
var dayjs = require('dayjs');
var utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

var gmtoffset = dayjs().utcOffset();

var icalToJSON = require('../models/parse_ical.js');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const CALENDAR_TOKEN = process.env.CALENDAR_TOKEN;

/* Calendar data */
const ical = require('ical');
const jetpack = require('fs-jetpack');

/* Check calendar files */
if( !jetpack.exists('./calendars')){
  jetpack.dir('./calendars');
}
var files = jetpack.find('./calendars', { matching: ['*.ics'] }) || [];

var calendarchecksums = {};
var calendars = {};

/* GET users listing. */
router.get('/', function (req, res, next) {

  if (req.query.token === undefined || req.query.token !== CALENDAR_TOKEN) {
    res.status(403).json({
      error: `Provide the correct token to get data.`
    });
    return;
  }

  var resetCache = false;
  var useCache = true;
  var filteredEvents = [];

  // Check if the cache is from the day before, so it can be updated if needed.
  if (!jetpack.exists('calendars/.cache.json') || !dayjs().isSame(dayjs(jetpack.inspect('calendars/.cache.json', { times: true }).modifyTime), 'day')) {
    resetCache = true;
    useCache = false;
    console.log('Cache outdated');
  }

  var files = jetpack.find('./calendars', { matching: ['*.ics'] }) || [];
  
  // Match the current calendar files
  for(var c in files){
    // Add file if it doesn't exist
    if(calendars[ files[c] ] === undefined ){
      calendars[ files[c] ] = null;
      calendarchecksums[ files[c] ] = null;
    }
  }
  // Remove old files
  for( c in calendars){
    if( !jetpack.exists(c) ){
      delete calendars[c];
      resetCache = true;
    }
  }
  for( c in calendarchecksums){
    if( !jetpack.exists(c) ){
      delete calendarchecksums[c];
      resetCache = true;
    }
  }

  var merged = {};

  for (var f in files) {
    var file = files[f];
    var md5 = jetpack.inspect( file, { checksum: 'md5' }).md5;
    if (calendarchecksums[file] != md5 || !calendars[file] || resetCache) {
      console.log(`${file} changed`);
      calendarchecksums[file] = md5;
      calendars[file] = ical.parseICS( jetpack.read( file ) || "" );
      if (file.match(/birthdays\.ics/i)) {
        Object.keys(calendars[file]).map(function (key) {
          if (calendars[file][key].categories === undefined)
            calendars[file][key].categories = ['Birthdays'];
          else if (Array.isArray(calendars[file][key].categories) && calendars[file][key].categories.indexOf('Birthdays') == -1)
            calendars[file][key].categories.push('Birthdays');
        });
      }
      useCache = false;
    }
    merged = { ...merged, ...calendars[file] };
  }

  if (useCache) {
    filteredEvents = jetpack.read('calendars/.cache.json', "json");
    console.log('Deliver from Cache');
  }
  else {
    filteredEvents = icalToJSON(merged);
    jetpack.write('calendars/.cache.json', filteredEvents);
    console.log('Update Cache');
  }

  res.json({
    msg: `${filteredEvents.length} events found.`,
    cached: useCache,
    count: filteredEvents.length,
    gmtoffset: gmtoffset,
    events: filteredEvents
  });
});

module.exports = router;
