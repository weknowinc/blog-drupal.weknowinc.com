---
layout: post
title: How to validate Bower files.
description: "Script to validate Bower files before to publish"
categories: [articles]
tags: [Node.js, Bower]
draft: false
---
<img style="float:left; margin-right: 20px;;" src="{{site.url }}/assets/img/bower-logo.png"/> If we want to enable people to use our libraries via <a href="bower.io" target="_blank">Bower</a> we need to follow some simple steps.

* Add a bower.json files to our project.
* Create a release matching the info in our bower file.
* Run *bower register* command to share our project.

# The Problem

The problem I found is the publishing process don't validate the bower.json, so is probable after publish when people try to use your library even if the system detect the library is available they get an awful error like this

```
bower backform#~0.0.1-alpha EMALFORMED Failed to read /var/folders/bh/8fr0bx9113n0plkjjkt2s5d40000gn/T/enzo/bower/backform-20375-ST4wT6/bower.json

Additional error details:
Unexpected token n
```

# The solution.

Fortunately there is a Node.js package to validate the bower.json before to publish.

We need to install the package with the following command.

```
$ npm install bower-json
```
Execute this command inside the folder of your library or use the option *-g* to install globally is up to you.

Now we will use the following Node.js scrit to validate the bower.json file, let name this script as **check_bower.js**

```
var bowerJson = require('bower-json');

// Can also be used by simply calling bowerJson()
bowerJson.read('./bower.json', function (err, json) {
    if (err) {
        console.error('There was an error reading the file');
        console.error(err.message);
        return;
    }

    console.log('JSON: ', json);
});
```

To use this script execute the following command.

```
$ node check_bower.js
```

As you can imagine you will get the same error in the first execution, so you need to work in your file until you get an output similar to this

```
JSON:  { name: 'backform',
  main: [ 'src/backform.js' ],
  version: '0.0.1-alpha',
  homepage: 'https://github.com/AmiliaApp/backform',
  author: { name: 'Martin Drapeau', email: 'martindrapeau@gmail.com' },
  description: 'Backform takes a Backbone model and transforms it into an HTML form',
  keywords: [ 'backbone', 'form', 'underscore' ],
  license: 'MIT',
  ignore: [ '**/.*', 'node_modules', 'bower_components', 'test', 'tests' ],
  dependencies: { backbone: '1.0.0 - 1.1.2', underscore: '1.4.4 - 1.6.0' } }
```

You can see a bower file sample at <a href="https://github.com/enzolutions/backbone.drupal/blob/master/bower.json" target="_blank">https://github.com/enzolutions/backbone.drupal/blob/master/bower.json</a>.

Last but not least important use the [documentation](http://bower.io/docs/creating-packages) about what elements must be used in a a bower.json to be valid.

#Readers Contribution
One of my readers [Josh Habdas](https://disqus.com/by/jhabdas/) recommend also the tool [Package.json validator](http://package-json-validator.com/) to validate before to send.

I hope you found this blog entry useful.


