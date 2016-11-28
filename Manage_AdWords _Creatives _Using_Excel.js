var FOLDER_PATH = 'AdWordsData'; //The path where the file will be stored on GDrive
var FILE_NAME = 'creatives.csv'; //The name of the file on GDrive
  
var INCLUDE_STATS = true; // Set to false to remove stats from the file
var DATE_RANGE = 'LAST_30_DAYS'; //The date range for the stats
  
var INCLUDE_PAUSED_ADS = true; //Set to false to only report on active ads
var DELETE_ORIGINAL_ADS = true; //When set to false, the original ads will be paused instead of deleted
  
function main() {
  var file = getFile(FILE_NAME,FOLDER_PATH);
  if(!file) {
    file = createNewFile(FILE_NAME,FOLDER_PATH,buildCreativesFile());
    return;
  }
   
  var fileContent = file.getBlob().getDataAsString();
  var creatives = {};
  if(fileContent) {
    creatives = parseFileContent(fileContent);
  }
   
  var creativeIter = getAdIterator();
  while(creativeIter.hasNext()) {
    var creative = creativeIter.next();
    var adId = creative.getId();
    if(creatives[adId]) {
      //ok we found the ad.
      //Checking status
      var isEnabledFile = (creatives[adId]['Status'] === 'Enabled');
      if(creative.isEnabled() != isEnabledFile) {
        if(isEnabledFile) { 
          creative.enable(); 
        } else { 
          creative.pause(); 
        }
      }
       
      if(hadAdChanged(creative,creatives[adId])) {
        if(DELETE_ORIGINAL_ADS) {
          creative.remove();
        } else {
          creative.pause();
        }
        createNewAd(creative.getAdGroup(),creatives[creative.getId()]);
      }
    }
  }
  file.setContent(buildCreativesFile());
}
  
//Helper function to create a new ad
function createNewAd(ag,newAd) {
  var optArgs = {
    isMobilePreferred: (newAd['Device'] === 'Mobile') ? true : false
  };
  ag.createTextAd(newAd['Headline'],newAd['Desc1'],newAd['Desc2'],newAd['DisplayUrl'],newAd['DestinationUrl'],optArgs);
}
  
//This checks to see if the ad has been changed
function hadAdChanged(ad,oldAd) {
  var newAdText = [ad.getHeadline(),
                   ad.getDescription1(),
                   ad.getDescription2(),
                   ad.getDisplayUrl(),
                   ad.getDestinationUrl(),
                   (ad.isMobilePreferred()) ? 'Mobile' : 'Desktop'].join('~~!~~');
  var oldAdText = [oldAd['Headline'],
                   oldAd['Desc1'],
                   oldAd['Desc2'],
                   oldAd['DisplayUrl'],
                   oldAd['DestinationUrl'],
                   oldAd['Device']].join('~~!~~');
  Logger.log(newAdText);
  Logger.log(oldAdText);
  return (newAdText !== oldAdText);
}
  
//This builds the creatives file from all the ads in the account.
function buildCreativesFile() {
  var report = getReportColumns();
  var creativeIter = getAdIterator();
  while(creativeIter.hasNext()) {
    var creative = creativeIter.next();
    report += getReportRow(creative);
  }
  return report;
}
  
//This returns the ad iterator based on options.
function getAdIterator() {
  var adSelector = AdWordsApp.ads().withCondition("Type = 'TEXT_AD'"); 
  if(!INCLUDE_PAUSED_ADS) {
    adSelector = adSelector.withCondition('CampaignStatus = ENABLED')
                           .withCondition('AdGroupStatus = ENABLED')
                           .withCondition('Status = ENABLED');
  }
  return adSelector.get();
}
  
//This returns a CSV fow for the report.
function getReportRow(ad) {
  var retVal = [
    ad.getId(),
    ad.getCampaign().getName(),(ad.getCampaign().isPaused()) ? 'Paused' : 'Enabled',
    ad.getAdGroup().getName(),(ad.getAdGroup().isPaused()) ? 'Paused' : 'Enabled',
    ad.getHeadline(),
    ad.getDescription1(),
    ad.getDescription2(),
    ad.getDisplayUrl(),
    ad.getDestinationUrl(),
    (ad.isPaused()) ? 'Paused' : 'Enabled',
    (ad.isMobilePreferred()) ? 'Mobile' : 'Desktop',
  ];
  if(INCLUDE_STATS) {
    var stats = ad.getStatsFor(DATE_RANGE);
    retVal = retVal.concat([
      stats.getImpressions(),
      stats.getClicks(),
      stats.getCtr(),
      stats.getCost(),
      stats.getAverageCpc(),
      stats.getConversions(),
      stats.getConversionRate(),
      stats.getAveragePageviews(),
      stats.getAveragePosition(),
      stats.getAverageTimeOnSite(),
      stats.getBounceRate()
      ]);
  }
  return '"' + retVal.join('","') + '"\n';
}
  
//This returns the column headings used for the report.
function getReportColumns() {
  var columnHeadings = [
    'AdId',
    'CampaignName','CampaignStatus',
    'AdGroupName','AdGroupStatus',
    'Headline',
    'Desc1',
    'Desc2',
    'DisplayUrl',
    'DestinationUrl',
    'Status',
    'Device'];
  if(INCLUDE_STATS) {
    columnHeadings = columnHeadings.concat([
      'Impressions',
      'Clicks',
      'Ctr',
      'Cost',
      'Cpc',
      'Conversions',
      'ConversionRate',
      'AveragePageviews',
      'AvgPosition',
      'AvgTimeOnSite',
      'BounceRate'
      ]);
  }
  return '"' + columnHeadings.join('","') + '"\n';
}   
  
//This function parses the creatives file into an object for processing
function parseFileContent(fileContent) {
  var headers = [];
  var idHash = {};
  var data = Utilities.parseCsv(fileContent);
  for(var i in data) {
    var cells = data[i]
    if(cells.length == 1) { continue; } //skip any empty rows
    if(i == 0) { 
      headers = cells; 
    } else {
      var rowMap = {};
      for(var x in headers) {
        headers[x] = headers[x];
        cells[x] = cells[x];
        rowMap[headers[x]] = cells[x];
      }
      idHash[rowMap['AdId']] = rowMap;
    }
  }
  return idHash;
}
  
//This function gets the file from GDrive
function getFile(fileName,folderPath) {
  var folder = getFolder(folderPath);
  if(folder.getFilesByName(fileName).hasNext()) {
    return folder.getFilesByName(fileName).next();
  } else {
    return null;
  }
}
  
//This function creates a new file on GDrive
function createNewFile(fileName,folderPath,content) {
  if(!fileName) { throw 'createNewFile: Missing filename.'; }
  var folder = getFolder(folderPath);
   
  return folder.createFile(fileName, content);
}
  
//This function finds the folder for the file and creates folders if needed
function getFolder(folderPath) {
  var folder = DriveApp.getRootFolder();
  if(folderPath) {
    var pathArray = folderPath.split('/');
    for(var i in pathArray) {
      var folderName = pathArray[i];
      if(folder.getFoldersByName(folderName).hasNext()) {
        folder = folder.getFoldersByName(folderName).next();
      } else {
        folder = folder.createFolder(folderName);
      }
    }
  }
  return folder;
}
