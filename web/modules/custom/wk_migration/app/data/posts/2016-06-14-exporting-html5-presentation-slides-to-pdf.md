---
layout: post
title: "Exporting HTML5 presentation slides to PDF"
categories: [Articles]
tags: [PDF, Export, HTML5]
---
Nowadays there are a lot of tools to create online presentations, because are more dynamic and with more effect, in summary, because are fancy and hipster.

The problem I face and I am sure a lot of people are in the same situation, is how to create an offline version of those online slides. 

Following instructions from my friend [Jesus Manuel](http://jmolivas.com) I ran a process to export to PDF using another sexy tool as you can imagine and I am going to document here.

Firstly, you need to install [Decktape](https://github.com/astefanutti/decktape) which is a is a high-quality PDF exporter for HTML5 presentation frameworks built on top of a forked version [PhantomJS](http://phantomjs.org/).

```
$ git clone --depth 1 https://github.com/astefanutti/decktape.git
```

Secondly, you need to install the PhantomJS fork available for your platform.

```
$ cd decktape
$ curl -L http://astefanutti.github.io/decktape/downloads/phantomjs-osx-cocoa-x86-64 -o bin/phantomjs
$ chmod +x bin/phantomjs
```

Current list of versions available

```
# Windows (MSVC 2013), 64-bit, for Windows Vista or later, bundles VC++ Runtime 2013
 $ curl -L http://astefanutti.github.io/decktape/downloads/phantomjs-msvc2013-win64.exe -o bin\phantomjs.exe
 # Mac OS X (Cocoa), 64-bit, for OS X 10.6 or later
 $ curl -L http://astefanutti.github.io/decktape/downloads/phantomjs-osx-cocoa-x86-64 -o bin/phantomjs
 # Linux (CentOS 6), 64-bit
 $ curl -L http://astefanutti.github.io/decktape/downloads/phantomjs-linux-centos6-x86-64 -o bin/phantomjs
 # Linux (CentOS 7), 64-bit
 $ curl -L http://astefanutti.github.io/decktape/downloads/phantomjs-linux-centos7-x86-64 -o bin/phantomjs
 # Linux (Debian 8), 64-bit
 $ curl -L http://astefanutti.github.io/decktape/downloads/phantomjs-linux-debian8-x86-64 -o bin/phantomjs
```

Finally, you can export your slides as PDF, check the example below.

```
$ bin/phantomjs decktape.js http://drupal8slides2.dev/index.html ~/Desktop/srijan-mastering-d8.pdf --screenshots-size=800x600
```

In my case, my slides were built with [Reveal.js](http://lab.hakim.se/reveal-js/#/), but you can use any HTML presentation framework.

I hope did you found this articel useful.
