---
layout: post
title: "Getting node comments programmatically in Drupal 8"
categories: [Articles]
tags: [Drupal 8,Drupal,PHP]
---
This article belongs to tips and tricks section in Drupal 8 because I will explain to you how to get entity comments from a particular entity node.

Before to start to code, I want to clarify that in Drupal 8 comments could be inside **Content type** definition as a standard field.

I will handle comments here as a separate entity. To get comments I will use [EntityQuery](https://api.drupal.org/api/drupal/core!lib!Drupal.php/function/Drupal%3A%3AentityQuery/8) using this approach, we will avoid writing explicit SQL queries, and our code will portable.

```
$cids = \Drupal::entityQuery('comment')
   ->condition('entity_id', $ticketID)
   ->condition('entity_type', 'node')
   ->sort('cid', 'DESC')
   ->execute();

$comments = [];

foreach($cids as $cid) {
 $comment = Comment::load($cid);

 $comments[] = [
     'cid' => $cid,
     'uid' => $comment->getOwnerId(),
     'subject' => $comment->get('subject')->value,
     'body' => $comment->get('field_comment_body')->value,
     'created' => $comment->get('created')->value
 ];
}
```

Let's review the code above in detail; As you can see, is required to specify to what kind of entity we are trying to get comments, that tell us that in Drupal 8 is possible to link comments to any entity.

Additionally, I have specified the Entity ID required to get comments, is possible add more conditions; this is useful taking in count that comments are entities and is possible that comments have customs fields with extra information.

When we create the EntityQuery, we define what kind of entity we want to process, as the result the query execution will return a list primary keys of entities matching the conditions, in this case, the main key is represented by cid.

Using the list of comments ids or cids, we load the comment object. I just traverse the option to create an arbitrary array, only to show how do you have to access to comment entity property, usually is required to use the method get, but there are some exceptions like comment owner ID.

I hope do you found this article useful.


