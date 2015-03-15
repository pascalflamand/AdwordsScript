/***************************************************
* Original source 
* Store Search Query Perf Report in Google Doc
* Version 1.1
* CHangelog v1.1 - Removed apiVersion, Updated formatting
* Created By: Russ Savage
* FreeAdWordsScripts.com
****************************************************/

var DATE_RANGE = 'LAST_14_DAYS';
var IGNORE_EXACT = true;
var TO = ["email1,email2"];
var SPREADSHEET_URL = "Google Spreadsheet URL";  
var ACTIVE_SHEET_NAME = "Active Sheet Name"

function main() {
  var columns = ['AccountDescriptiveName',
                 'CampaignName',
                 'AdGroupName',
                 'KeywordTextMatchingQuery',
                 'MatchType',
                 'Query',
                 'Device',
                 'Impressions',
                 'Clicks',
                 'Cost',
                 'Conversions',
                 'AverageCpc',
                 'CostPerConversion',
                 'ConversionRate',
                 'Ctr'];
  var columnsStr = columns.join(',') + " "; 
  var sheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL).getSheetByName(ACTIVE_SHEET_NAME);
  sheet.clear();
  sheet.appendRow(columns);
  
  var reportIter = AdWordsApp.report( //https://developers.google.com/adwords/scripts/docs/reference/adwordsapp/adwordsapp_report
    'SELECT ' + columnsStr +
    'FROM SEARCH_QUERY_PERFORMANCE_REPORT ' + // to see all available repports https://www.awql.me/adwords-awql-help/ 
    'DURING ' + DATE_RANGE, {
    includeZeroImpressions: false //Whether or not to include entities that had zero impressions in the report. Defaults to true.
    }).rows();
    
//I don't fully understand this section     
  while(reportIter.hasNext()) {
    var row = reportIter.next();
    if(IGNORE_EXACT && row['MatchType'].indexOf('exact') >= 0) { continue; }
    var rowArray = [];
    for(var i in columns) {
      rowArray.push(row[columns[i]]);
    }
    sheet.appendRow(rowArray); 
  }
  
  for(var i in TO) {
    MailApp.sendEmail(TO[i], ACTIVE_SHEET_NAME , SPREADSHEET_URL);
  }
}