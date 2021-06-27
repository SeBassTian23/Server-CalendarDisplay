/* Date and Time functions */
var dayjs = require('dayjs');
var localizedFormat = require('dayjs/plugin/localizedFormat');
var isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
var isBetween = require('dayjs/plugin/isBetween');
var timezone = require('dayjs/plugin/timezone');
var utc = require('dayjs/plugin/utc');
dayjs.extend(localizedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

const icalToJSON = function (data) {
  var rangeStart = dayjs().startOf('day').toDate();
  var rangeEnd = dayjs().endOf('day').add(2, 'week').toDate();
  var formatted = [];

  var i = j = 0;
  for (let k in data) {
    if (data.hasOwnProperty(k)) {
      var ev = data[k];
      if (ev.type == 'VEVENT') {

        // Event Object
        var event = {
          type: 'VEVENT',
          uid: ev.uid,
          start: dayjs(ev.start).unix(),
          end: dayjs(ev.end).unix() || null,
          allday: false,
          tzid: ev.start.tz || null,
          categories: (ev.categories !== undefined) ? ev.categories.join(",") : null || null
        };

        if (ev.summary && typeof (ev.summary) == 'object')
          event.summary = ev.summary.val.replace(/\n/g, ' ');
        else if (ev.summary)
          event.summary = ev.summary.replace(/\n/g, ' ');
        else
          event.summary = null;

        if (ev.location && typeof (ev.location) == 'object')
          event.location = ev.location.val.replace(/\n/g, ' ');
        else if (ev.location)
          event.location = ev.location.replace(/\n/g, ' ');
        else
          event.location = null;

        if (ev.start && !ev.end || ev.start && ev.end && dayjs(ev.end).diff(ev.start, 'hour') >= 24)
          event.allday = true;

        // Check if there is an event with an alarm
        var keys = Object.keys(ev);
        for (var a in keys) {
          if (typeof ev[keys[a]] === 'object' && ev[keys[a]].type !== undefined && ev[keys[a]].type == 'VALARM') {
            event.alarm = ev[keys[a]];
          }
        }

        // Events in the next two weeks without rrule
        if (!ev.rrule && dayjs().isSameOrBefore(ev.start, 'date') && dayjs().add(2, 'week').isAfter(ev.start, 'date')) {
          formatted.push({ ...event });
        }
        else if (ev.rrule) {
          // For recurring events, get the set of event start dates that fall within the range
          // of dates we're looking for.
          var dates = ev.rrule.between(
            rangeStart,
            rangeEnd,
            true,
            function (date, i) {
              return true;
            }
          );

          // The "dates" array contains the set of dates within our desired date range range that are valid
          // for the recurrence rule.  *However*, it's possible for us to have a specific recurrence that
          // had its date changed from outside the range to inside the range.  One way to handle this is
          // to add *all* recurrence override entries into the set of dates that we check, and then later
          // filter out any recurrences that don't actually belong within our range.
          if (ev.recurrences !== undefined) {
            for (var r in ev.recurrences) {
              // Only add dates that weren't already in the range we added from the rrule so that 
              // we don't double-add those events.
              if (dayjs(new Date(r)).isBetween(rangeStart, rangeEnd) != true) {
                dates.push(new Date(r));
              }
            }
          }

          // Loop through the set of date entries to see which recurrences should be printed.
          for (i in dates) {
            var date = dates[i];
            var curEvent = ev;
            var showRecurrence = true;

            // Calculate the events duration
            var curDuration = parseInt(dayjs(curEvent.end).unix()) - parseInt(dayjs(curEvent.start).unix());

            startDate = dayjs(date);

            // Use just the date of the recurrence to look up overrides and exceptions (i.e. chop off time information)
            var dateLookupKey = date.toISOString().substring(0, 10);

            // For each date that we're checking, it's possible that there is a recurrence override for that one day.
            if ((curEvent.recurrences !== undefined) && (curEvent.recurrences[dateLookupKey] !== undefined)) {
              // We found an override, so for this recurrence, use a potentially different title, start date, and duration.
              curEvent = curEvent.recurrences[dateLookupKey];
              startDate = dayjs(curEvent.start);
              curDuration = parseInt(dayjs(curEvent.end).unix()) - parseInt(startDate.unix());
            }
            // If there's no recurrence override, check for an exception date.  Exception dates represent exceptions to the rule.
            else if ((curEvent.exdate !== undefined) && (curEvent.exdate[dateLookupKey] !== undefined)) {
              // This date is an exception date, which means we should skip it in the recurrence pattern.
              showRecurrence = false;
            }

            // Set the the title and the end date from either the regular event or the recurrence override.
            // var recurrenceTitle = curEvent.summary;
            if (curEvent.summary && typeof (curEvent.summary) == 'object')
              event.summary = curEvent.summary.val.replace(/\n/g, ' ');
            else if (curEvent.summary)
              event.summary = curEvent.summary.replace(/\n/g, ' ');
            else
              event.summary = null;

            endDate = dayjs(startDate).add(curDuration, 'second');

            // If this recurrence ends before the start of the date range, or starts after the end of the date range, 
            // don't process it.
            if (endDate.isBefore(rangeStart) || startDate.isAfter(rangeEnd)) {
              showRecurrence = false;
            }

            if (showRecurrence === true) {

              // Build UTC string to correct for daylight savings
              var str = startDate.format('YYYY-MM-DD') + dayjs(curEvent.start).format(' HH:mm');
              startDate = dayjs(str);
              endDate = dayjs(startDate).add(curDuration, 'second');
              //format('YYYY-MM-DDThh:mm:ss[Z]')

              event.start = startDate.unix();
              event.end = endDate.unix();
              event.gmtoffset = dayjs(startDate).utcOffset();

              find = formatted.findIndex(function (e) {
                return (e.uid == event.uid && e.start == event.start);
              });

              if (find == -1) {
                formatted.push({ ...event });
              }
            }
          }
        }
        else {
          continue;
        }
      }
    }
  }

  // sort by date
  formatted = formatted.sort(function (a, b) {
    // Turn your strings into dates, and then subtract them
    // to get a value that is either negative, positive, or zero.
    return dayjs(a.start) - dayjs(b.start);
  });

  return formatted;
};

module.exports = icalToJSON;