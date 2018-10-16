---
layout: post
title: What is Cross-Origin Resource Sharing (CORS)
description: "Explanation about Cross-Origin Resource Sharing (CORS)."
categories: [articles]
tags: [Ajax, CORS, WWW]
draft: false
---

Nowdays is pretty common to transfer data between web applications via Web Services to  clients that require information on different interfaces such as REST, XMLRPC, JSON, JSON-RPC, SOAP and others.

Almost all sites today are built using JavaScript, generating AJAX calls with XMLHttpRequest mechanism to get information  from external sites. To enable this kind of comunication is necessary implement "cross-domain" requests would otherwise be forbidden by web browsers, per the <a target="_blank" href="http://en.wikipedia.org/wiki/Same_origin_policy">same origin security policy</a>.


Lets imagine the following scenery: we have a frontend application using the domain http://a.com and this application wants to use data provided by a  backend site located in domain http://b.com. For security this type of communication is blocked and the end user will be only able to get the information from http://a.com, this scenario is exemplified in the following image.

<img src="{{ site.url }}/assets/img/crossdomain.png"/>

To enable this kind of communication is requiered that your backed server (http//b.com) returns the specific HTTP Headers to enable CORS comunication. Below you can see an example of HTTP Header required.

````
Access-Control-Allow-Credentials:true
Access-Control-Allow-Headers:X-CSRF-Token
Access-Control-Allow-Methods:POST,ADD,GET,PUT,DELETE,OPTIONS
Access-Control-Allow-Origin:http://localhost:8080
````

The header *Access-Control-Allow-Credentials* is only used if your request require some kind of authentication. You can read more information about all HTTP Headers at <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS">Access Controls - CORS</a>.
