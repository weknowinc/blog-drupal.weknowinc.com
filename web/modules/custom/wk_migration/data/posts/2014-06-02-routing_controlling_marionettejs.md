---
layout: post
title: Routing and Controlling with MarionetteJS
description: "Implementing Routing & Contrilling with MarionetteJS."
categories: [articles]
tags: [Ajax, Javascript, RequireJS, MarionetteJS, BackboneJS, MarionetteJS]
draft: false
---

<a target="_blank" href="http://marionettejs.com/">MarionetteJS</a>  is a layer that sits on <a target="_blank" href="http://backbonejs.org">BackboneJS</a> to create scalable and professional applications.

Some features of MarionetteJS are :

* Scalable: applications are built in modules, and with event-driven architecture
* Sensible defaults: Underscore templates are used for view rendering
* Easily modifiable: make it work with your application's specific needs
* Reduce boilerplate for views, with specialized view types
* Build on a modular architecture with an Application and modules that attach to it
* Compose your application's visuals at runtime, with the Region and Layout objects
* Nested views and layouts within visual regions
* Built-in memory management and zombie-killing in views, regions and layouts
* Event-driven architecture with Backbone.Wreqr.EventAggregator
* Flexible, "as-needed" architecture allowing you to pick and choose what you need
* And much, much more

In this example I will take the structure of libraries and dependencies explained in the blog entry <a target="_blank" href="{{ site.url }}/articles/2014/06/01/what-is-and-how-it-works-requirejs/">What is and how it works RequireJS</a> to create a MarionetteJS application.

# 1. Router Module.

MarionetteJS  implements the object <a target="_blank" href="https://github.com/marionettejs/backbone.marionette/blob/master/docs/marionette.approuter.md">Marionette.AppRouter</a> that allows you to define the paths that respond to your application. Using <a target="_blank" href="http://requirejs.org/">RequireJS</a> we can create a module that defines an object for our routes, also allows us to create multiple  Route objects that can be instantiated for other applications by convenience.

In our application we create a folder where modules live, named modules. See an example definition of a Route.

````
define(["marionette"], function (Marionette) {
  var Router = Marionette.AppRouter.extend({
    appRoutes: {
      "": "home",
    },
    /* standard routes can be mixed with appRoutes/Controllers above */
    routes : {
      "hello/:username": "helloBuddy"
    },
    helloBuddy : function (buddy) {
      // Without controller the routing functions live in Router object
      alert("Hello " + buddy);
    }
  });
 
  return Router;
});
````

As you can see the code has an anonymus definition that returns a Router object, which then will be required for our application.

Then we must define the properties that are response functions of our application routes.

*AppRoutes*: Property that allows the definition of routes with convention: URL : Method Name, the method must be defined in the Controller module that is associated with the Route within the application. This option allows the response functions change dramatically, depending on the controller being involved in Route.

*routes*: Property that defines routes, but unlike the previous methods will be defined within the Router object. This option ensures that certain (s) routes have a specific desired behavior.

Both properties can be used in the same definition without problem, but the routes should not be repeated.

When the application starts the Router indicate which methods are executed in response to a route visited by a user.

In the definition of Route we use the property routes with dynamic parameters. in the  route hello:username, username is a dynamic value passed as a parameter to the method of response to the route.

## 2. Controller Module.

In the same way we did  for Routing will create a module for the controller, as shown below

````
define(["marionette"], function (Marionette) {
 
    var Controller = Marionette.Controller.extend({
        initialize : function(options) {
             //TODO: code to initialize
         },
        start: function() {
            //TODO: code to start
        },
 
        /**
         * Initialized on start, without hash
         * @method
         */
         home :  function () {
            alert('Hello Marionette');
        },
    });
 
    return Controller;
});
````

This module is anonymous and extend the <a target="_blank" href="https://github.com/marionettejs/backbone.marionette/blob/master/docs/marionette.controller.md">Marionette.Controller</a> object as seen have initialize and start methods to perform tasks that are required at the time of the creation of the controller.

Then you must define the properties that are response functions of our application routes. In our case we define the hello method.

## 3. Invoking Controller  and Router

When we declare our application we load the objects that define the Router and Controller, as shown below.

````
// Loading dependences and module to execute Marionette App
require( ["marionette","../modules/AppRouter", "../modules/AppController"], function (Marionette, AppRouter, AppController) {
    // set up the app instance
    var MyApp = new Marionette.Application();
 
    // initialize the app controller
    var controller = new AppController({});
 
    // initialize the app router
    MyApp.addInitializer(function(options) {
        // initialize the router
        var router = new AppRouter({
          controller : controller
        });
    });
 
    MyApp.on("initialize:after", function(){
      // Start Backbone history a necessary step for bookmarkable URL's
      Backbone.history.start();
    });
 
    MyApp.start({});
});
````

Although Route and Controller modules were anonymous, using RequireJS we can do load modules using the relative path of the modules as shown in detail in the next line.

````
require( ["marionette","../modules/AppRouter", "../modules/AppController"], function (Marionette, AppRouter, AppController) {
````

The returned objects are passed as a parameter to the anonymous function that defines the application.

As seen proceeds to create an instance of the Controller object, which will be later used in the definition of the Router.

````
// initialize the app controller
var controller = new AppController({});
````

In the initialization of our MarionetteJS application, we create the Router using the Controller.

````
// initialize the app router
MyApp.addInitializer(function(options) {
  // initialize the router
  var router = new AppRouter({
    controller : controller
  });
});
````

Finally after finishing the initialization of our application should be activated BackboneJS history of what that will activate the process of routing.

````
MyApp.on("initialize:after", function(){
  // Start Backbone history a necessary step for bookmarkable URL's
  Backbone.history.start();
});
````

When it loads the application we will getan alert with the message "Hello Marionette" and if you change the URL to index.html#hello/ enzo you will get a resul similar to the following output.

<img src="http://7sabores.com/sites/default/files/styles/large/public/marionette_routing_sample.png?itok=2lla5O-u"/>
