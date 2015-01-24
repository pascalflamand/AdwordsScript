// Comma-separated list of recipients.
var RECIPIENT_EMAIL = 'pflamand@conversio.ca';
// Spreadsheet template.
var SPREADSHEET_URL = 'https://docs.google.com/a/google.com/spreadsheet/ccc?key=0Aoxp01WxRqn2dFE3aHhSRVk4bWdNZlpqNDlVV2JEenc#gid=0';

/**
 * This script computes a keyword performance report
 * and outputs it to a Google spreadsheet. The spreadsheet
 * url is logged and emailed.
 */
function main() {
  var spreadsheet = copySpreadsheet(SPREADSHEET_URL);
  var sheet = spreadsheet.getSheetByName('Report');
  outputQualityScoreData(sheet);
  outputPositionData(sheet);
  Logger.log('Keyword performance report - ' + spreadsheet.getUrl());
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
    'Keyword Performance Report ' + new Date());
}

/**
 * Outputs Quality score related data to the spreadsheet
 * @param {Sheet} sheet The sheet to output to. 
 */
function outputQualityScoreData(sheet) {
  // Output header row
  var header = [
    'Quality Score',
    'Num Keywords',
    'Impressions',
    'Clicks',
    'CTR (%)',
    'Cost'
  ];
  sheet.getRange(1, 1, 1, 6).setValues([header]);

  // Initialize
  var qualityScoreMap = [];
  for (i = 1; i <= 10; i++) {
    qualityScoreMap[i] = {
      numKeywords: 0,
      totalImpressions: 0,
      totalClicks: 0,
      totalCost: 0.0
    };
  }

  // Compute data
  var keywordIterator = AdWordsApp.keywords()
      .forDateRange('LAST_WEEK')
      .withCondition('Impressions > 0')
      .get();
  while (keywordIterator.hasNext()) {
    var keyword = keywordIterator.next();
    var stats = keyword.getStatsFor('LAST_WEEK');
    var data = qualityScoreMap[keyword.getQualityScore()];
    if (data) {
      data.numKeywords++;
      data.totalImpressions += stats.getImpressions();
      data.totalClicks += stats.getClicks();
      data.totalCost += stats.getCost();
    }
  }

  // Output data to spreadsheet
  var rows = [];
  for (var key in qualityScoreMap) {
    var ctr = 0;
    var cost = 0.0;
    if (qualityScoreMap[key].numKeywords > 0) {
      ctr = (qualityScoreMap[key].totalClicks /
        qualityScoreMap[key].totalImpressions) * 100;
    }
    var row = [
      key,
      qualityScoreMap[key].numKeywords,
      qualityScoreMap[key].totalImpressions,
      qualityScoreMap[key].totalClicks,
      ctr.toFixed(2),
      qualityScoreMap[key].totalCost];
    rows.push(row);
  }
  sheet.getRange(2, 1, rows.length, 6).setValues(rows);
}

/**
 * Outputs average position related data to the spreadsheet.
 * @param {Sheet} sheet The sheet to output to. 
 */
function outputPositionData(sheet) {
  // Output header row
  headerRow = [];
  var header = [
    'Avg Position',
    'Num Keywords',
    'Impressions',
    'Clicks',
    'CTR (%)',
    'Cost'
  ];
  headerRow.push(header);
  sheet.getRange(14, 1, 1, 6).setValues(headerRow);

  // Initialize
  var positionMap = [];
  for (i = 1; i <= 12; i++) {
    positionMap[i] = {
      numKeywords: 0,
      totalImpressions: 0,
      totalClicks: 0,
      totalCost: 0.0
    };
  }

  // Compute data
  var keywordIterator = AdWordsApp.keywords()
      .forDateRange('LAST_WEEK')
      .withCondition('Impressions > 0')
      .get();
  while (keywordIterator.hasNext()) {
    var keyword = keywordIterator.next();
    var stats = keyword.getStatsFor('LAST_WEEK');
    if (stats.getAveragePosition() <= 11) {
      var data = positionMap[Math.ceil(stats.getAveragePosition())];
    } else {
      // All positions greater than 11
      var data = positionMap[12];
    }
    data.numKeywords++;
    data.totalImpressions += stats.getImpressions();
    data.totalClicks += stats.getClicks();
    data.totalCost += stats.getCost();
  }

  // Output data to spreadsheet
  var rows = [];
  for (var key in positionMap) {
    var ctr = 0;
    var cost = 0.0;
    if (positionMap[key].numKeywords > 0) {
      ctr = (positionMap[key].totalClicks /
        positionMap[key].totalImpressions) * 100;
    }
    var row = [
      key <= 11 ? key - 1 + ' to ' + key : '>11',
      positionMap[key].numKeywords,
      positionMap[key].totalImpressions,
      positionMap[key].totalClicks,
      ctr.toFixed(2),
      positionMap[key].totalCost
    ];
    rows.push(row);
  }
  sheet.getRange(15, 1, rows.length, 6).setValues(rows);
}
