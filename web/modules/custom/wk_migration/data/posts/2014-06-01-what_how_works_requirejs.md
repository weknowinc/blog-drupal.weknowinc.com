---
layout: post
title: What is and how it works RequireJS
description: "Explanation about how to implement RequireJS."
categories: [articles]
tags: [Ajax, Javascript, RequireJS, MarionetteJS]
draft: false
---

<a target="_blank" href="http://requirejs.org/">RequireJS</a> is a JavaScript library that allows us to isolate the components of our JS application as modules and resolve their dependencies.

RequireJS implements the design pattern of software <a target="_blank" href="http://en.wikipedia.org/wiki/Asynchronous_module_definition">AMD</a> (Asynchronous Module Definition) which you could say is very similar to <a target="_blank" href="http://en.wikipedia.org/wiki/Dependency_injection">Dependency injection</a> implemented by frameworks like <a target="_blank" href="http://symfony.com/">Symfony</a>.

Let's check how we can use in our JS application in simple steps.

## 1. Define entry point for RequireJS.

We must download the lastest version of RequireJS library available on the website <a target="_blank" href="http://requirejs.org">http://requirejs.org</a>, after download will put in a directory called libs just for purposes of this example (tested with version 2.1.11).

Now we need to  define a html file and could named index.html where RequireJS is loading as shown below.

````
<!DOCTYPE html>
<html>
<head>
</head>
<body>
  <script data-main="libs/main" src="libs/require.js"></script>
</body>
</html>
````

As you can see the inclusión is done with the script tag at the end of the HTML tag body, but it could also be done within the head tag.

It's also possible to include RequireJS remotely using the URL <a target="_blank" href="http://requirejs.org/docs/release/2.1.11/minified/require.js">http://requirejs.org/docs/release/2.1.11/minified/require.js</a> or similar, but it is a desition of the reader.

As can be seen RequireJS  use the meta-data property *data-main*(, with this property we can define the entry point for RequireJS configuration, which is a relative path for the file we choose to load teh RequireJS configuraton (is necesarry exlude the js extension).

## 2. Configure RequireJS

In the file libs/main.js we define the RequireJS options. The first thing we should to define is which JS libraries will use in our application as shown below.

````
require.config({
    baseUrl: 'libs',
    paths : {
      backbone : 'backbone',
      underscore : 'underscore',
      jquery : 'jquery',
      marionette : 'backbone.marionette',
      wreqr : 'backbone.wreqr',
      eventbinder : 'backbone.eventbinder',
      babysitter : 'backbone.babysitter'
  }
});
````
All files are seek in the directory defined using the *baseUrl* property, and the *paths* property allow define the location of the libraries required with a key to refer to the library later. The js extension is not required and will be added by RequireJS later.

As its name suggests the pattern AMD makes an asynchronous load of packages. But because not all the libraries implement the AMD pattern, is likely to a library A try to use a function defined in library B not yet loaded causing a fatal error.

To resolve this issue we use the property *Shim* part of  RequireJS configuration, as we see below.

````
require.config({,
  shim : {
    jquery : {
      exports : 'jQuery'
    },
    underscore : {
      exports : '_'
    },
    backbone : {
      deps : ['jquery', 'underscore'],
      exports : 'Backbone'
    },
    wreqr: {
      deps : ['backbone']
    },
    eventbinder : {
      deps : ['backbone']
    },
    babysitter : {
      deps: ['backbone']
    },
    marionette : {
      deps: ['wreqr', 'eventbinder', 'babysitter'],
      exports : 'Marionette'
    }
  }
});
````

Using Shim we can define dependencies between libraries and allow to export global variables that can be used within other libraries such as jQuery library which  export  the variable jQuery.

The configuration with the Shim is a replacement for Order plugin used before version 2.0 of RequireJS.

The exports variable can also be an anonymous function to return the call noConflict function, if the library supports it.

Using the *deps* property, you can define multiple dependencies of libraries should be loaded before including the library that are defining, such as backbone that depends on jquery and underscore to be used.

Of course if we want to use the library with RequireJS  and supports AMD configuration pattern Shim isn't required.

## 3. How to execute code required.

Once defined libraries and its dependencies if necessary, we can now rewrite the code we need as shown below.

````
// Loading dependences and execute Marionette App
require( ["marionette"], function (Marionette) {
    // set up the app instance
    var MyApp = new Marionette.Application();
 
    MyApp.on("initialize:after", function(){
      alert("Application has started!");
    });
 
    MyApp.start();
});
````

The above code checks that all the libraries needed to run Marionette are loaded before executing the code and get the exported global variable as a parameter.

In the anonymous function will create a Marionette Application and start it, As result we  will get an alert with the message "Application has started".

The require function has the same effect of an anonymous function, meaning that run without problems but can not be used later.

## 4. How to create named modules.

If we want encapsulate our App we must create named modules using the funcion *define*; The diference with require function is  an extra parameter that is used to name the module and returns an object or variable that will be used when the module is instantiated.

Then consider the previous example as a named module.

````
define( 'MyApp', ["marionette"], function (Marionette) {
 
    // set up the app instance
    var MyApp = new Marionette.Application();
 
    MyApp.on("initialize:after", function(){
      alert("Application has started!");
    });
 
    // export the app from this module
    return MyApp;
});
 
// Fetch and execute Marionette App
require( ["MyApp"], function (MyApp) {
    // Execute App
    MyApp.start();
});
````

As you see we register a named module *MyApp* and  returns an object defined in Marionette.

Then with a *require* function the module is loaded, it receives as parameters the object returns by the module and can thus start our application.

It might seem a waste of time doing it this way as it is in the same file, but the idea is to create a module for file and using the configuration of RequireJS load all the libraries that define modules and then use these modules in our application.

You can download the <a target="_blank" href="{{ site.url }}/projects/marionettejs_skeleton_app">Marionette App Skeleton</a> repository which implements the concepts discussed here.

I hope you have been to his liking.
