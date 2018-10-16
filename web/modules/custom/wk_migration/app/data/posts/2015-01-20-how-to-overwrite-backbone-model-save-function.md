---
layout: post
title: "How to overwrite Backbone Model save function"
categories: [articles]
tags: [Backbone,,Javascript,Rest,Drupal]
---
<img style="float:left; margin-right: 20px;;" src="{{site.url }}/assets/img/backbonejs-logo-small.png"/> <a href="http://backbonejs.org" target="_blank">Backbone JS</a> enables you to create a JS application to connect with your existing API over a RESTful JSON interface.

Backbone define some <a href="http://es.wikipedia.org/wiki/Representational_State_Transfer" target="_blank">REST</a> states to operate over models for instance:

- Model Fetch: **GET**
- Model New: **POST**
- Model Update: **PUT**

But is possible our API doesn't implement all REST States, for instance <a href="http://www.drupal.org" target="_blank">Drupal</a> 8 (version in development) don't implement the method PUT to save Drupal Entities yet.

In exchange the REST State PATCH is used by Drupal to save models.

So if I try to create a regular Model as you can see in the following snippet.

```
Node = Backbone.Model.extend({
        initialize: function(){
            alert("Welcome to this world");
        }
    });

var node = new Node({ id: 1, title: 'Node Sample in Backbone'});

node.save(userDetails, {
    success: function (user) {
        alert(user.toJSON());
    }
})
```

The code above will execute an Ajax call using PUT method.

If you are a Drupal Developer you will notice the model doesn't match the Drupal Entity structure with language and deltas, but I just want to show a simply logic about Backbone save.

Now let me show you how we can overwrite the save function to change the REST method.

```
Node = Backbone.Model.extend({
        initialize: function(){
            alert("Welcome to this world");
        },
        save: function(attrs, options) {
          options.patch = true;
          // Proxy the call to the original save function
          Backbone.Model.prototype.save.call(this, attrs, options);
        }
    });

var node = new Node({ id: 1, title: 'Node Sample in Backbone'});

node.save(userDetails, {
    success: function (user) {
        alert(user.toJSON());
    }
})
```
Now our model will execute and Ajax request using PATCH method.

I used this technique to enable the library <a href="https://github.com/enzolutions/backbone.drupal" target="_blank">Backbone.Drupal</a> send models to Drupal 8 using REST method PATCH.

I hope you found this blog entry useful.
