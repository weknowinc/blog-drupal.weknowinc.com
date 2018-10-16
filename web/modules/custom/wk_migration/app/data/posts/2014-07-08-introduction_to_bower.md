---
layout: post
title: Introduction to Bower
description: "What is Bower and how to use."
categories: [articles]
tags: [Bower, Node.js, Web, Resources]
draft: false
---

<img style="float:left; margin-right: 20px;;" src="{{site.url }}/assets/img/bower-logo.png"/> Continuing with the serie *Hot & Sexy tools* available these days for web developers started with the entry of Blog <a target="_blank" href="{{site.url }}/articles/2014/06/18/introduction-to-grunt/">Introduction to Grunt</a>, now I come to speak of <a target="_blank" href="http://bower.io/">Bower</a>.

Bower by definition is a package manager for the web, now that simple English means a tool that allows us to define required libraries in our web applications and the bower detect the dependencies of required packages.

When bower check all package dependencies requested and find any inconsistency. It presents a menu to choose which version you want to use.

Now if you ask what kind of packages are available, ranging from packets like <a target="_blank" href="https://github.com/jquery/jquery">jQuery</a> and <a target="_blank" href="https://github.com/twbs/bootstrap">Bootstrap</a> to <a target="_blank"href="https://github.com/torvalds/linux">Linux</a>. All depends on what are our project needs, today bower has nearly fourteen thousand packages.

## How to install Bower.

Bower is a npm package therefore <a target="_blank" href="http://npmjs.org/">Node.js</a> is needed, with the following command we can install Bower.


```
$ npm install -g bower
```

With the above command bower would be available to all system users.

## How to use Bower.

Once Bower is installed you can use immediately in your application to download the packages you want, let's say you need jQuery in your project, well you only need to use the following command to include it.

```
$ bower install jQuery
```

The above command will have the following output, which informs us that versión of jQuery was downloaded.

```
bower cached        git://github.com/jquery/jquery.git#2.1.1
bower validate      2.1.1 against git://github.com/jquery/jquery.git#*
bower install       jQuery#2.1.1
```

If you're wondering where jQuery is installed in the directory where you run the command, you would have a structure similar to the following representation:

```
.
└── bower_components
    └── jQuery
        ├── MIT-LICENSE.txt
        ├── bower.json
        ├── dist
        └── src
```

You see you get the minimized version of jQuery and files for normal development of jQuery is up to us to decide what files must be include in our application.

If you want a specific package version you must provide this information in the install process as shown in the following command:

```
$ bower install <package>#<version>
```

## Group project dependencies.

As we saw is quite easy to add new components, but it depends on someone memory  to install the required packages, to define all the required packages for our project we use the bower.json file.

Fortunately bower provides us a command that lets you create a basic bower.json file, you can see an output of interactive command *$ bower init*.

```
$ bower init
[?] name: MegaProject
[?] version: 0.1.0-alpha
[?] description: Not Available
[?] main file: assets/js/main.js, assets/css/main.css
[?] what types of modules does this package expose?
[?] keywords: HTML5
[?] authors: enzo - Eduardo Garcia <enzo@anexusit.com>
[?] license: MIT
[?] homepage: http://enzolutions.com
[?] set currently installed components as dependencies? Yes
[?] add commonly ignored files to ignore list? Yes
[?] would you like to mark this package as private which prevents it from being [?] would you like to mark this package as private which prevents it from being accidentally published to the registry? No
```

This command above will generate a file called bower.json with the following content.

```
{
  "name": "MegaProject",
  "version": "0.1.0-alpha",
  "authors": [
    "enzo - Eduardo Garcia <enzo@anexusit.com>"
  ],
  "description": "Not Available",
  "main": "assets/js/main.js, assets/css/main.css",
  "keywords": [
    "HTML5"
  ],
  "license": "MIT",
  "homepage": "http://enzolutions.com",
  "ignore": [
    "**/.*",
    "node_modules",
    "bower_components",
    "test",
    "tests"
  ],
  "dependencies": {
    "jQuery": "~2.1.1"
  }
}
```

Now what advantage we get from file bower.js file? The first one is portability because we just need put this file in our version control system and when a new developer arrive to team for sure we will need set up his environment; then he just need download the bower.json and run the following command:

```
$ bower install
```

In this case bower detects the existence of a bower.json file and will proceed to install packages included in the file, allowing us to maintain our system clean and avoid having stored 50 versions of jQuery when in the end we are interested in last version of jQuery.

## Specify destination packages.

As we saw before the default destination is *bower_components* folder, but it is very likely that this location is not to our liking, if we want to specify a custom destination folder we need to create a file .bowerrc to inform bower about our needs, as shown below.

```
{
    "directory": "web/vendor"
}
```

Which will make the packets are stored in the folder *web/vendor* or any other you want.

I hope you have been to his liking.
