---
layout: post
title: "How to enable CORS in Drupal 8 in non Apache webservers"
categories: [articles]
tags: [Drupal8,Drupal,CORS]
---
As you maybe know [Drupal 8](https://www.drupal.org/drupal-8.0) is almost ready to be released, could be in next
[DrupalCon Europe](https://events.drupal.org/barcelona2015) held in Barcelona.

However if you are interested in CORS applications you must to wait until Drupal 8.1 to get native support to CORS in Drupal
more information at [issue](https://www.drupal.org/node/1869548#comment-9365043).

Long time ago I wrote the article <a href="{{site.url }}/articles/2014/09/08/how-to-enable-cors-requests-against-drupal-8/">How to enable CORS requests against Drupal 8</a>
but that approach only works in environments using Apache Web Server, but in servers using a non Apache web server like
 [Ngix](http://nginx.org/) that solution is useless. Today I face that problem in [Pantheon](https://pantheon.io).


Therefore, I implemented a solution hacking the file index.php to enable CORS. Let me split the change in two stages.

Firstly we have to guarantee the REST method OPTIONS return the proper value, because Drupal 8 can't handle that request right now, check the code to implement that

```
  if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    $response = new Response(200);
    $response->headers->set('Access-Control-Allow-Origin', '*');
    $response->headers->set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PATCH, DELETE');
    $response->headers->set('Access-Control-Allow-Headers', 'Authorization');
    $response->send();
    exit;
  }
```

Secondly, we have to modify normal requests to enable remote requests from any source desired, as you can see in the following snippet of code

```
  $response = $kernel
      ->handle($request)
      // Handle the response object.
      ->prepare($request);

  // Enable CORS requests, Change '*' for any specific domain or ip address
  $response->headers->set('Access-Control-Allow-Origin', '*');
  $response->headers->set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PATCH, DELETE');
  $response->headers->set('Access-Control-Allow-Headers', 'Authorization');
```

You can apply this <a href="{{site.url}}/assets/attaches/d8-cors-index.patch.txt">patch</a> against Drupal 8 beta 10.

I know there are initiatives to enable this feature using contributed modules, but meanwhile we get a definite solution, 
this is temporary solution flexible enough using Drupal 8 style to start using Drupal as backend in a Decoupled solution.
 
I hope you found this post useful. 