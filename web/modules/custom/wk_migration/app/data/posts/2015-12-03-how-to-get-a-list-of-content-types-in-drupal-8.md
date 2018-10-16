---
layout: post
title: "How to get a list of content types in Drupal 8"
categories: [articles]
tags: [Drupal,Drupal 8,PHP]
---
Continuing with the series of articles about how to do Drupal development common tasks using Drupal 8 way I will share today how you could get a list of content types available programmatically.

Using the following code you could print the complete list

```
$contentTypes = \Drupal::service('entity.manager')->getStorage('node_type')->loadMultiple();

$contentTypesList = [];
foreach ($contentTypes as $contentType) {
    $contentTypesList[$contentType->id()] = $contentType->label();
}

print_r($contentTypesList);
```

After executing the code above you will output similar to the following snippet:

```
Array
(
    [article] => Article
    [page] => Basic page
)
```

Off course in my example I Just want a list of values machine-name -> human label, but you can manipulate the [Drupal\node\Entity\NodeType](https://api.drupal.org/api/drupal/core!modules!node!src!Entity!NodeType.php/class/NodeType/8) entity to do advanced things.

I hope you found this article useful.


