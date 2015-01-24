/************************************
* AdWords Account Audit Checklist
* Version 1.1
* ChangeLog v1.1 - Fixed issue with extension selector.
* Based on the blog post by Phil Kowalski
* http://www.wordstream.com/blog/ws/2013/07/02/adwords-account-audit-checklist
* Created By: Russ Savage
* FreeAdWordsScripts.com
************************************/
function main() {
  //1. Campaigns
  //  a. Target the right locations
  var includedLocList = ['United States','Canada']; // <-- the list of places your campaigns should be targeting
  verifyTargetedLocations(includedLocList);
   
  var excludedLocList = ['Europe']; // <-- the list of places your campaigns should be excluding
  verifyExcludedLocations(excludedLocList);
   
  //  b. Language - Can't be done using scripts yet :(
  //  c. Search vs Display
  verifySearchAndDisplay();
   
  //  d. Check Mobile Strategy
  verifyMobileModifiers();
   
  //2. AdGroups
  //  a. Check for AdGroups with more than 20-30 keywords
  var ADGROUP_SIZE = 25; // <-- this is the max number of keywords you want in an AdGroup
  verifyAdGroupSize(ADGROUP_SIZE);
   
  //  b. Check for topic. Difficult to do with scripts
  //  c. Check for ads
  var NUMBER_OF_ADS = 3; // <-- this is the minimum number of ads in an AdGroup
  verifyAdGroupNumberOfAds(NUMBER_OF_ADS);
   
  //3. Keywords
  //  a. Check for MatchTypes
  printMatchTypes();
   
  //4. Search Queries
  //  This analysis is probably worth it's own script
   
  //5. Other
  //  a. Conversion Tracking
  verifyConversionTracking();
   
  //  b. AdExtensions
  verifyAdExtensions();
}
 
function verifyConversionTracking() {
  //Assume that if the account has not had a conversion in 7 days, something is wrong.
  var campsWithConversions = AdWordsApp.campaigns()
    .withCondition('Status = ENABLED')
    .forDateRange('LAST_7_DAYS')
    .withCondition('Conversions > 0')
    .get().totalNumEntities();
  if(campsWithConversions == 0) {
    warn('Account is probably missing conversion tracking.');
  }
}
 
function verifyAdExtensions() {
  var campIter = AdWordsApp.campaigns().withCondition('Status = ENABLED').get();
  while(campIter.hasNext()) {
    var camp = campIter.next();
    var phoneNumExtCount = camp.extensions().phoneNumbers().get().totalNumEntities();
    if(phoneNumExtCount == 0) {
      warn('Campaign: "'+camp.getName()+'" is missing phone number extensions.');
    }
    var siteLinksExtCount = camp.extensions().sitelinks().get().totalNumEntities();
    if(siteLinksExtCount < 6) {
      warn('Campaign: "'+camp.getName()+'" could use more site links. Currently has: '+siteLinksExtCount);
    }
    var mobileAppsExtCount = camp.extensions().mobileApps().get().totalNumEntities();
    if(mobileAppsExtCount == 0) {
      warn('Campaign: "'+camp.getName()+'" is missing mobile apps extension.');
    }
  }
}
 
function printMatchTypes() {
  var numBroad = AdWordsApp.keywords()
    .withCondition('Status = ENABLED')
    .withCondition('AdGroupStatus = ENABLED')
    .withCondition('CampaignStatus = ENABLED')
    .withCondition('KeywordMatchType = BROAD')
    .get().totalNumEntities();
  var numPhrase = AdWordsApp.keywords()
    .withCondition('Status = ENABLED')
    .withCondition('AdGroupStatus = ENABLED')
    .withCondition('CampaignStatus = ENABLED')
    .withCondition('KeywordMatchType = PHRASE')
    .get().totalNumEntities();
  var numExact = AdWordsApp.keywords()
    .withCondition('Status = ENABLED')
    .withCondition('AdGroupStatus = ENABLED')
    .withCondition('CampaignStatus = ENABLED')
    .withCondition('KeywordMatchType = EXACT')
    .get().totalNumEntities();
  var total = numBroad+numPhrase+numExact;
  var percBroad = Math.round(numBroad/total*100);
  var percPhrase = Math.round(numPhrase/total*100);
  var percExact = Math.round(numExact/total*100);
  info('Out of a total of: '+total+' active keywords in your account:');
  info('\tBroad: '+numBroad+' or '+percBroad+'%');
  info('\tPhrase: '+numPhrase+' or '+percPhrase+'%');
  info('\tExact: '+numExact+' or '+percExact+'%');
}
 
function verifyAdGroupNumberOfAds(requiredNumberOfAds) {
  var agIter = AdWordsApp.adGroups()
    .withCondition('Status = ENABLED')
    .withCondition('CampaignStatus = ENABLED')
    .get();
  while(agIter.hasNext()) {
    var ag = agIter.next();
    var adCount = ag.ads().withCondition('Status = ENABLED').get().totalNumEntities();
    if(adCount < requiredNumberOfAds) {
      warn('Campaign: "'+ag.getCampaign().getName()+'" AdGroup: "'+ag.getName()+'" does not have enough ads: '+adCount);
    }
    if(adCount > (requiredNumberOfAds+2)) {
      warn('Campaign: "'+ag.getCampaign().getName()+'" AdGroup: "'+ag.getName()+'" has too many ads: '+adCount);
    }
  }
}
 
function verifyAdGroupSize(size) {
  var agIter = AdWordsApp.adGroups()
    .withCondition('Status = ENABLED')
    .withCondition('CampaignStatus = ENABLED')
    .get();
  while(agIter.hasNext()) {
    var ag = agIter.next();
    var kwSize = ag.keywords().withCondition('Status = ENABLED').get().totalNumEntities();
    if(kwSize >= size) {
      warn('Campaign: "'+ag.getCampaign().getName()+'" AdGroup: "'+ag.getName()+'" has too many keywords: '+kwSize);
    }
  }
}
 
function verifyMobileModifiers() {
  var campIter = AdWordsApp.campaigns().withCondition('Status = ENABLED').get();
  while(campIter.hasNext()) {
    var camp = campIter.next();
    var desktop = camp.targeting().platforms().desktop().get().next();
    //var tablet = camp.targeting().platforms().tablet().get().next();
    var mobile = camp.targeting().platforms().mobile().get().next();
    //check for mobile modifiers
    if(desktop.getBidModifier() == 1 && mobile.getBidModifier() == 1) {
      warn('Campaign: "'+camp.getName()+'" has no mobile modifier set.');
    }
  }
}
 
function verifyTargetedLocations(locList) {
  var campIter = AdWordsApp.campaigns().withCondition('Status = ENABLED').get();
  while(campIter.hasNext()) {
    var camp = campIter.next();
    var locIter = camp.targeting().targetedLocations().get();
    reportOnLocations(camp,locIter,locList);
  } 
}
 
function verifyExcludedLocations(locList) {
  var campIter = AdWordsApp.campaigns().withCondition('Status = ENABLED').get();
  while(campIter.hasNext()) {
    var camp = campIter.next();
    var locIter = camp.targeting().excludedLocations().get();
    reportOnLocations(camp,locIter,locList);
  } 
}
 
function reportOnLocations(camp,locIter,locList) {
  var campLocList = [];
  while(locIter.hasNext()) {
    var loc = locIter.next();
    campLocList.push(loc.getName());
    if(!locList) {
      warn('Campaign: "'+camp.getName()+'" targeting: "'+loc.getName()+'"');
    }
  }
  if(locList && campLocList.sort() != locList.sort()) {
    for(var i in campLocList) {
      if(locList.indexOf(campLocList[i]) == -1) {
        warn('Campaign: "'+camp.getName()+'" incorrectly targeting: "'+campLocList[i]+'"');
      }
    }
    for(var i in locList) {
      if(campLocList.indexOf(locList[i]) == -1) {
        warn('Campaign: "'+camp.getName()+'" not targeting: "'+locList[i]+'"');
      }
    }
  }
}
 
function verifySearchAndDisplay() {
  var API_VERSION = { includeZeroImpressions : false };
  var cols = ['CampaignId','CampaignName','AdNetworkType1','Impressions'];
  var report = 'CAMPAIGN_PERFORMANCE_REPORT';
  var query = ['select',cols.join(','),'from',report,'during','LAST_30_DAYS'].join(' ');
  var results = {}; // { campId : { agId : [ row, ... ], ... }, ... }
  var reportIter = AdWordsApp.report(query, API_VERSION).rows();
  while(reportIter.hasNext()) {
    var row = reportIter.next();
    if(results[row.CampaignId]) {
      warn('Campaign: "'+row.CampaignName+'" is targeting the Display and Search networks.');
    } else {
      results[row.CampaignId] = row;
    }
  }
  return results;
}
 
function warn(msg) {
  Logger.log('WARNING: '+msg);
}
 
function info(msg) {
  Logger.log(msg);
}