---
layout: post
title: "How to customize a Search API filters in Drupal 7"
categories: [articles]
tags: [Drupal,,Search API]
---
Last week I show you <a href="{{site.url }}/articles/2015/06/02/how-to-add-customs-fields-to-solr-index-using-entity-api-amp-search-api/">How to add customs fields to SOLR index using Entity API & Search API</a>, 
continues with that line of concept I will to show you how to manipulate a Search API query to include a custom logic in 
your queries.

Firstly, let imagine an hypothetical scenario when we need to run a different query for anonymous and registered users.

Using the custom fields created in previous referenced above we will show today's list of events, in the other hand for 
registered users we will show events in progress (including multi day events) and events coming soon.

#Alter Search API query.

To modify our queries we will use hook [hook_search_api_query_alter()](http://www.drupalcontrib.org/api/drupal/contributions!search_api!search_api.api.php/function/hook_search_api_query_alter/7) 
as you can see in the following example

```
function MYMODULE_search_api_query_alter(SearchApiQueryInterface $query) {
  global $user;
  // Filter from where the Search API query will be trigger 
  if(arg(0) == 'events' && arg(1) == 'list') {
    
    $start_day = strtotime(date('Y-m-d'));

    if($user->uid == 0 ) {
      $query->condition('event_start_day', $start_day, '<=');
      $query->condition('event_end_day', $start_day, '>=');
    }
    else {
      // Select events in progress
      $left_filter = $query->createFilter('AND');
      $left_filter->condition('event_start_day', $start_day, '<=');
      $left_filter->condition('event_end_day', $start_day, '>=');
     
      // Select events with a start date in the future
      $right_filter = $query->createFilter('AND');
      $right_filter->condition('event_start_day', time(), '>=');

      $main_filter = $query->createFilter('OR');
      $main_filter->filter($left_filter);
      $main_filter->filter($right_filter);
      
      $query->filter($main_filter);
     }
}     
```

Let dissect the previous piece of code. If user is anonymous we will [SearchApiQueryInterface::condition](http://www.drupalcontrib.org/api/drupal/contributions%21search_api%21includes%21query.inc/function/SearchApiQueryInterface%3A%3Acondition/7) method 
to include new filters to determine events who are happening today, even though if those events are multi day events.

In the case of registered users, the same method is used but with a subtle variation. By default all conditions are added 
using an **AND** operator which is fine most of the times. However, in our case is required include to groups of validation 
in same query for that reason an **OR** operator is required.

Using the [SearchApiQueryInterface::createFilter](http://www.drupalcontrib.org/api/drupal/contributions%21search_api%21includes%21query.inc/function/SearchApiQueryInterface%3A%3AcreateFilter/7) is 
possible create groups of filters using AND or OR operator.

In addition, using [SearchApiQueryInterface::filter](http://www.drupalcontrib.org/api/drupal/contributions%21search_api%21includes%21query.inc/function/SearchApiQueryInterface%3A%3Afilter/7) is possible 
include those group of filters inside a **SearchApiQueryInterface** object.

In summary the snippet of code above create a filter similar to
```
(event_start_day <= time() AND event_end_day >= time()) OR (event_start_day >= time())
```

You can create any combination of filters required in your logic.

I hope you found this article useful.


