---
layout: post
title: "How to add customs fields to SOLR index using Entity API &amp; Search API"
categories: [articles]
tags: [Drupal, Entity API, Search API , SOLR]
---
Nowadays the ability to search in website almost compulsory and most of the times is took for granted.

Using Drupal we have two main options [SOLR](http://lucene.apache.org/solr/) and [Elastic Search](https://www.elastic.co/). 
Today I will explore how to work SOLR server.
 
In Drupal there are two popular modules to connect it with **SOLR** [apachesolr](https://www.drupal.org/project/apachesolr) and 
 [search_api](https://www.drupal.org/project/search_api) and I decided to use **search_api** to interact with SOLR in 
this article.
 
#The problem
 
Lets imagine this problem: We have an Event content type with a Date field to determine the start date and end date (optional).
 
Using Search API that field could be indexed without mayor problems, but if we try to do a view to list all event in a date range
 is difficult because Views modules doesn't provide the Between operator for SOLR views, this operator is only available
 for views using **Entity Fields**
 
#The Solution

Because all events have minute granularity we can't use **equal** operator to determine if an event belongs to a specific day, to 
solve that problem we add extra information to SOLR creating two new fields to store the day event in timestamp in order to be 
able to use the equal operator.

To create these new fields in our node entities we will use [Entity API](http://drupal.org/project/entity) and more specifically 
hook [hook_entity_property_info_alter](http://www.drupalcontrib.org/api/drupal/contributions!entity!entity.api.php/function/hook_entity_property_info_alter/7).
  
Let me show you an implementation example.
  
```
/**
 * Implements hook_entity_property_info_alter().
 */
function MYMODULE_entity_property_info_alter(&$info) {
  $info['node']['properties']['event_start_day'] = array(
    'type' => 'integer',
    'label' => t('Event Start Day'),
    'sanitized' => TRUE,
    'getter callback' => 'MYMODULE_search_api_property_event_start_day_getter_callback',
  );
  $info['node']['properties']['event_end_day'] = array(
    'type' => 'integer',
    'label' => t('Event End Day'),
    'sanitized' => TRUE,
    'getter callback' => 'MYMODULE_search_search_api_property_event_end_day_getter_callback',
  );
}
```

As you can see we are modifying entity definition to include two new properties **event_start_day** and **event_end_day**,
probably the most information is the **getter callback** which is a function used to calculate the proper values for each 
property. 

The functions defined in getter callback is used by Search API in the process of indexing to store the value in SOLR index.

Let me show an example of implementation of those getter functions.

```
/**
 * Getter callback for event start day.
 */
function MYMODULE_search_api_property_event_start_day_getter_callback($item) {
  return strtotime(substr($item->field_event_date[LANGUAGE_NONE][0]['value'], 0, 10)); 
}
 
/**
 * Getter callback for event end day.
 */
function MYMODULE_search_search_api_property_event_end_day_getter_callback($item) {
  // Set time at midnight of end day of event
  if($item->field_event_date[LANGUAGE_NONE][0]['value2'] != '') {
    return strtotime(substr($item->field_event_date[LANGUAGE_NONE][0]['value2'], 0, 10)) + 86399;
  }
  else {
    return strtotime(substr($item->field_event_date[LANGUAGE_NONE][0]['value'], 0, 10)) + 86399;
  }
}
```

Off course you can implement any logic required here, the variable $item is an object representing a Drupal node.

After clear your cache the new fields will be able to select to be indexed by SOLR, you can do this accessing the URL 
**http://example.com/admin/config/search/search_api/index/YOUR_INDEX/fields** as you can see in the following 
image.

<img style="float:left; margin-right: 20px;" src="{{site.url }}/assets/img/entity_fields_solr_index_search_api.png"/>

When the process of re-index run again the new fields will be stored in SOLR and will be able to be selected in a View.

I hope you found this post useful. 