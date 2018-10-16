---
layout: post
title: How to enable CORS requests against Drupal 8
description: "Explanaition to enable CORS request against Drupal 8 using .htacess"
categories: [articles]
tags: [CORS, Drupal, .htacess]
draft: false
---
#The Problem

Nowadays I was creating a new version of my library <a target="_blank" href="https://github.com/enzolutions/backbone.drupal">https://github.com/enzolutions/backbone.drupal</a> to enable to use Drupal 8 in mode <strong>Headless Drupal</strong> using front end in a different domain or subdomain.

The problem I found with <a href="{{site.url}}/articles/2014/05/31/what-is-cross-origin-resource-sharing-cors/">CORS</a> requests is related with the way jQuery execute the first request Ajax, because before to do an execution of a GET|PUT|DELETE|POST|PATCH request an <a target="_blank" href="http://restpatterns.org/HTTP_Methods/OPTIONS">OPTIONS</a> request is executed to validate request methods accepted for backend server more information at <a href="http://api.jquery.com/jquery.ajax/">http://api.jquery.com/jquery.ajax/</a> in **contentType** section.

The current status of Rest module (part of Drupal Core) doesn't implement the OPTIONS method, so my first approach was implement that method in class **Drupal\rest\Plugin\rest\resource\EntityResource** using the following code

```
public function options(EntityInterface $entity) {
   $response = new ResourceResponse();
   $response->setStatusCode(ResourceResponse::HTTP_OK);
   $response->headers->set('Allow', 'GET,POST,PATCH,DELETE,OPTIONS');
   return $response->send();
  }
```

After add that extra function in class **EntityResource** the method was available and double checked with module <a target="_blank" href="https://www.drupal.org/project/restui">RestUI</a>, but this solution wasn't enough because I can't enable OPTIONS method without authentication and jQuery trigger the OPTIONS method without CRC Token or Basic Auth method even if you provide in the original call.

#The Solution

In order to resolve the problem I use .htaccess and Apache <a target="_blank" href="http://httpd.apache.org/docs/current/mod/mod_rewrite.html">mod_rewrite</a> to enable CORS and intercept the OPTIONS request to avoid Drupal reject the request because doesn't have the proper credentials, I did a patch for Drupal 8 and you can download the patch <a target="_blank" href="https://www.drupal.org/files/issues/core-cors-headers-1869548-26.patch">here</a>.

But let me explain the changes introduced in my patch.

##Intercept OPTIONS Request

I add a Mod Rewrite Condition and Rule to avoid all OPTIONS request be processed by Drupal and rejected, instead of a <a target="_blank" href="http://en.wikipedia.org/wiki/List_of_HTTP_status_codes#2xx_Success">HTTP 200 OK</a> code is returned in order to enable jQuery request continue with the normal workflow.

Check the code below.

```
RewriteCond %{REQUEST_METHOD} OPTIONS
RewriteRule .* / [R=200,L]
```
##Enable CORS
If you search how to enable CORS using .htaccess you will find tons of similar information and this information usually works, but in our case we have a special situation the intercept process we implemented above.

Because the interception the normal statements to enable CORS doesn't work and apache will reject our request, to resolve this problem I found the condition <a target="_blank" href="http://httpd.apache.org/docs/2.0/mod/mod_headers.html">always</a> for Header directive.

Check the implementation below.

```
Header always set Access-Control-Allow-Origin "*"
Header always set Access-Control-Allow-Methods "POST, GET, OPTIONS, PATCH, DELETE"
Header always set Access-Control-Allow-Headers: Authorization
```

I strongly recommend to change <strong>*</strong> for your frontend domain i.e frontend-example.com.

I expect you have found this entry useful.

