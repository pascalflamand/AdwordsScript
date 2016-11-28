// Comma-separated list of recipients.
var RECIPIENT_EMAIL = 'Your Email';
// Spreadsheet template.
var SPREADSHEET_URL = 'Your Spreed sheet URL';

/**
 * This script computes an Ad performance report
 * and outputs it to a Google spreadsheet
 */
function main() {
  var spreadsheet = copySpreadsheet(SPREADSHEET_URL);
  var headlineSheet = spreadsheet.getSheetByName('Headline');
  var destinationUrlSheet = spreadsheet.getSheetByName('Destination Url');
  outputSegmentation(headlineSheet, 'Headline', function(ad) {
    return ad.getHeadline();
  });
  outputSegmentation(destinationUrlSheet, 'Destination Url', function(ad) {
    return ad.getDestinationUrl();
  });
  Logger.log('Ad performance report - ' + spreadsheet.getUrl());
  MailApp.sendEmail(
    RECIPIENT_EMAIL, 'New Report is ready.', spreadsheet.getUrl());
}

/**
 * Retrieves the spreadsheet identified by the URL.
 * @param {string} spreadsheetUrl The URL of the spreadsheet. 
 * @return {SpreadSheet} The spreadsheet. 
 */
function copySpreadsheet(spreadsheetUrl) {
  return SpreadsheetApp.openByUrl(spreadsheetUrl).copy(
    'Ad Performance Report ' + new Date());
}

/**
 * Generates statistical data for this segment.
 * @param {Sheet} sheet Sheet to write to. 
 * @param {string} segmentName The Name of this segment for the header row. 
 * @param {function(AdWordsApp.Ad): string} segmentFunc Function that returns 
 *        a string used to segment the results by.
 */
function outputSegmentation(sheet, segmentName, segmentFunc) {
  // Output header row
  var rows = [];
  var header = [
    segmentName,
    'Num Ads',
    'Impressions',
    'Clicks',
    'CTR (%)',
    'Cost'
  ];
  rows.push(header);

  var segmentMap = {};

  // Compute data
  var adIterator = AdWordsApp.ads()
      .forDateRange('LAST_WEEK')
      .withCondition('Impressions > 0').get();
  while (adIterator.hasNext()) {
    var ad = adIterator.next();
    var stats = ad.getStatsFor('LAST_WEEK');
    var segment = segmentFunc(ad);
    if (!segmentMap[segment]) {
      segmentMap[segment] = {
        numAds: 0,
        totalImpressions: 0,
        totalClicks: 0,
        totalCost: 0.0
      };
    }
    var data = segmentMap[segment];
    data.numAds++;
    data.totalImpressions += stats.getImpressions();
    data.totalClicks += stats.getClicks();
    data.totalCost += stats.getCost();
  }

  // Write data to our rows.
  for (var key in segmentMap) {
    if (segmentMap.hasOwnProperty(key)) {
      var ctr = 0;
      if (segmentMap[key].numAds > 0) {
        ctr = (segmentMap[key].totalClicks /
          segmentMap[key].totalImpressions) * 100;
      }
      var row = [
        key,
        segmentMap[key].numAds,
        segmentMap[key].totalImpressions,
        segmentMap[key].totalClicks,
        ctr.toFixed(2),
        segmentMap[key].totalCost];
      rows.push(row);
    }
  }
  sheet.getRange(1, 1, rows.length, 6).setValues(rows);
}
