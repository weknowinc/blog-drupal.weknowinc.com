---
layout: post
title: How to pass parameters to RequireJS modules
description: "Explanaition about how to implement Dependency injection in RequireJS modules "
categories: [articles]
tags: [Javascript, RequireJS]
draft: false
---
RequireJS is a great library for managing JavaScript dependencies and create JavaScript modules to encapsulate concepts in your application. If you are totally new with RequiteJS maybe you want to read the post entry <a target='_blank' href="{{site.url}}//articles/2014/06/01/what-is-and-how-it-works-requirejs/">What is and how it works RequireJS</a>.

#The Problem
With <a target='_blank' href="http://requirejs.org/">RequireJS</a> you can encapsulate concepts to re use in other areas of your Front End application.

Let me show you an example of a RequireJS module.

```
define([
  'backbone.marionette',
  'communicator'
],
function (Marionette, Communicator) {
    'use strict';

    var RegionManager = Marionette.Controller.extend({

      initialize: function (options) {
        console.log('Initialize a Region Manager');

        /* internal region manager */
        this._regionManager = new Marionette.RegionManager();

        /* event API */
        Communicator.reqres.setHandler('RM:addRegion', this.addRegion, this);
        Communicator.reqres.setHandler('RM:removeRegion', this.removeRegion, this);
        Communicator.reqres.setHandler('RM:getRegion', this.getRegion, this);
      },

      /* add region facade */
      addRegion: function (regionName, regionId) {
        var region = this.getRegion(regionName);

        if (region) {
          console.log('REGION ALREADY CREATED TO JUST RETURN REF');
          return region;
        }

        return this._regionManager.addRegion(regionName, regionId);
      },

      /* remove region facade */
      removeRegion: function (regionName) {
        this._regionManager.removeRegion(regionName);
      },

      /* get region facade */
      getRegion: function (regionName) {
        return this._regionManager.get(regionName);
      }
    });

    return RegionManager;
  });
```
To use this module in other module you have to load the module as you can see below

```
define([
  'backbone.marionette','regionManager'],
   function (Marionette, RegionManager) {
  'use strict';

  var regionManager = new RegionManager();

});
```

The problem with previous implementación is you can't send parameter to *RegionManager* module to use in the creación of RegionManager instance.

#The Solution

To resolve this issue we need to do an implementation of patter design <a target='_blank' href="http://en.wikipedia.org/wiki/Dependency_injection">Dependency injection</a>.

Now do this implementation of Dependency injection, let me change a little bit how a Module is created adding a function to object returned as you can see in the following implementation.

```
define(function(){
    return {
        init: function(Router){
          Router.appRoute('', 'home');
          Router.appRoute('login', 'login');
        }
    };
});
```
As you can see in the above code the init function receive and object *Router* and we use this object to add two Routes.

Now let me show you how the module Routes is call from other module.

```
define([
  'backbone.marionette','router','routes'],
   function (Marionette, Router, Routes) {

    // Create Router instance.
    this._router = new Router({ App: this});

    // Set routes in router using dependency injection.
    Routes.init(this._router);
});
```

Also you can use this kind of function in module to set a local variable to be used later for other internal functions.

I hope you found this blog entry useful.

