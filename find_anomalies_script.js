
   var DATE_RANGE = 'LAST_30_DAYS';
  var DECIMAL_PLACES = 3;
  var STANDARD_DEVIATIONS = 2;
  var TO = ['Your Email'];
    
function main() {
    // This will add labels to and send emails about adgroups, keywords and ads. Remove any if you like.
    var levels_to_tag = ['adgroup','keyword','ad'];
    for(var x in levels_to_tag) {
      var report = getContentRows(levels_to_tag[x]);
      var entity_map = buildEntityMap(levels_to_tag[x]);
      for(var parent_id in entity_map) {
        var child_list = entity_map[parent_id];
        var stats_list = Object.keys(child_list[0].stats);
        for(var i in stats_list) {
          var mean = getMean(child_list,stats_list[i]);
          var stand_dev = getStandardDev(child_list,mean,stats_list[i]);
          var label_name = stats_list[i]+"_anomaly";
          report += addLabelToAnomalies(child_list,mean,stand_dev,stats_list[i],label_name,levels_to_tag[x]);
        }
      }
      sendResultsViaEmail(report,levels_to_tag[x]);
    }
  }
     
  //Takes a report and the level of reporting and sends and email
  //with the report as an attachment.
  function sendResultsViaEmail(report,level) {
    var rows = report.match(/\n/g).length - 1;
    if(rows == 0) { return; }
    var options = { attachments: [Utilities.newBlob(report, 'text/csv', level+"_anomalies_"+_getDateString()+'.csv')] };
    var email_body = "There are " + rows + " " + level + "s that have abnormal performance. See attachment for details.";
    var subject = 'Abnormal ' + _initCap(level) + ' Entities Report - ' + _getDateString();
    for(var i in TO) {
      MailApp.sendEmail(TO[i], subject, email_body, options);
    }
  }
     
  //Helper function to return a single row of the report formatted correctly
  function toReportRow(entity,level,label_name) {
    var ret_val = [AdWordsApp.currentAccount().getCustomerId(),
                   entity.getCampaign().getName()];
    ret_val.push( (level == 'adgroup') ? entity.getName() : entity.getAdGroup().getName() );
    if(level == 'keyword') {
      ret_val = ret_val.concat([entity.getText(),entity.getMatchType()]); 
    } else if(level == 'ad') {
      ret_val = ret_val.concat([entity.getHeadline(),entity.getDescription1(),entity.getDescription2(),entity.getDisplayUrl()]); 
    }
    ret_val.push(label_name);
    return '"' + ret_val.join('","') + '"\n';
  }
     
  //Helper function to return the column headings for the report
  function getContentRows(level) {
    var ret_val = ['AccountId','CampaignName','AdGroupName'];
    if(level == 'keyword') {
      ret_val = ret_val.concat(['KeywordText','MatchType']); 
    } else if(level == 'ad') {
      ret_val = ret_val.concat(['Headline','Description1','Description2','DisplayUrl']);
    }
    ret_val.push('LabelName');
    return '"' + ret_val.join('","') + '"\n';
  }
     
  //Function to add the labels to the entities based on the standard deviation and mean.
  //It returns a csv formatted string for reporting
  function addLabelToAnomalies(entites,mean,sd,stat_key,label_name,level) {
    createLabelIfNeeded(label_name);
    var report = '';
    for(var i in entites) {
      var entity = entites[i]['entity'];
      var deviation = Math.abs(entites[i]['stats'][stat_key] - mean);
      if(sd != 0 && deviation/sd >= STANDARD_DEVIATIONS) {
        entity.applyLabel(label_name);
        report += toReportRow(entity,level,label_name);
      } else {
        entity.removeLabel(label_name);
      }
    }
    return report;
  }
     
  //This is a helper function to create the label if it does not already exist
  function createLabelIfNeeded(name) {
    if(!AdWordsApp.labels().withCondition("Name = '"+name+"'").get().hasNext()) {
      AdWordsApp.createLabel(name);
    }
  }
     
  //This function returns the standard deviation for a set of entities
  //The stat key determines which stat to calculate it for
  function getStandardDev(entites,mean,stat_key) {
    var total = 0;
    for(var i in entites) {
      total += Math.pow(entites[i]['stats'][stat_key] - mean,2);
    }
    if(Math.sqrt(entites.length-1) == 0) {
      return 0;
    }
    return round(Math.sqrt(total)/Math.sqrt(entites.length-1));
  }
     
  //Returns the mean (average) for the set of entities
  //Again, stat key determines which stat to calculate this for
  function getMean(entites,stat_key) {
    var total = 0;
    for(var i in entites) {
      total += entites[i]['stats'][stat_key];
    }
    if(entites.length == 0) {
      return 0;
    }
    return round(total/entites.length);
  }
     
  //This function returns a map of the entities that I am processing.
  //The format for the map can be found on the first line.
  //It is meant to work on AdGroups and Keywords
  function buildEntityMap(entity_type) {
    var map = {}; // { parent_id : [ { entity : entity, stats : entity_stats } ], ... }
    var iter = getIterator(entity_type);
    while(iter.hasNext()) {
      var entity = iter.next();
      var stats = entity.getStatsFor(DATE_RANGE);
      var stats_map = getStatsMap(stats);
      var parent_id = getParentId(entity_type,entity);
      if(map[parent_id]) { 
        map[parent_id].push({entity : entity, stats : stats_map});
      } else {
        map[parent_id] = [{entity : entity, stats : stats_map}];
      }
    }
    return map;
  }
     
  //Given an entity type (adgroup or keyword) this will return the parent id
  function getParentId(entity_type,entity) {
    switch(entity_type) {
      case 'adgroup' :
        return entity.getCampaign().getId();
      case 'keyword':
        return entity.getAdGroup().getId();
      case 'ad':
        return entity.getAdGroup().getId();
    }
  }
     
  //Given an entity type this will return the iterator for that.
  function getIterator(entity_type) {
    switch(entity_type) {
      case 'adgroup' :
        return AdWordsApp.adGroups().forDateRange(DATE_RANGE).withCondition("Impressions > 0").get();
      case 'keyword' :
        return AdWordsApp.keywords().forDateRange(DATE_RANGE).withCondition("Impressions > 0").get();
      case 'ad' :
        return AdWordsApp.ads().forDateRange(DATE_RANGE).withCondition("Impressions > 0").get();
    }
  }
     
  //This returns a map of all the stats for a given entity.
  //You can comment out the things you don't really care about.
  function getStatsMap(stats) {
    return { // You can comment these out as needed.
            avg_cpc : stats.getAverageCpc(),
            avg_cpm : stats.getAverageCpm(),
            avg_pv : stats.getAveragePageviews(),
            avg_pos : stats.getAveragePosition(),
            avg_tos : stats.getAverageTimeOnSite(),
            bounce : stats.getBounceRate(),
            clicks : stats.getClicks(),
            cv : stats.getConversionRate(),
            conv : stats.getConversions(),
            cost : stats.getCost(),
            ctr : stats.getCtr(),
            imps : stats.getImpressions()
           };
  }
     
  //Helper function to format todays date
  function _getDateString() {
    return Utilities.formatDate((new Date()), AdWordsApp.currentAccount().getTimeZone(), "yyyy-MM-dd");
  }
     
  //Helper function to capitalize the first letter of a string.
  function _initCap(str) {
    return str.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
  }
   
  // A helper function to make rounding a little easier
  function round(value) {
    var decimals = Math.pow(10,DECIMAL_PLACES);
    return Math.round(value*decimals)/decimals;
  }
