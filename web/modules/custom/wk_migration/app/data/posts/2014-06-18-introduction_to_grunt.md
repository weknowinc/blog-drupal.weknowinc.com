---
layout: post
title: Introduction to Grunt
description: "What is Grunt and how to use."
categories: [articles]
tags: [Grunt, Node.js, NPM, Automation, Tasks]
draft: false
---

<img style="float:left; margin-right: 20px;;" src="{{site.url }}/assets/img/grunt-logo.png"/> Today I come to speak of some of those tools that are part of the set of Hot and Sexy for all developers speak nowadays, much to our regret if another tool that apparently there is more to learn: P.

From my own experience I know how difficult it is to have enough time to learn all these Sexy tools, I'll try to explain it in the most practical and easiest way possible.

## What's Grunt.?

Grunt is a tool to automate tasks is our web projects. The idea is that all of those routine tasks that we do in our projects Grunt make them for us. Among the most common tasks are:

- Concat files (CSS, JS, etc)
- Minify files (CSS, JS, etc)
- Optimize images.
- Compilation (SASS -> CSS and others)
- Unit Test

Each of these tasks is implemented by a Grunt plugin, which today has nearly three thousand plugins, you can see the full list of plugins in <a targe="_blank" href="http://gruntjs.com/plugins">http://gruntjs.com/plugins</a>.

Grunt is built with is Javascript  and require <a target="_blank" href="http://nodejs.org/">Node.js</a> to be executed which makes Grunt multi platform.

##How install Grunt.

As I said earlier Grunt uses Node.js to run, but you don't need to know anything about Node.js to use Grunt, is only required to install and execute, it in the same way we you don't need to know Java to run programs that use the Java JRE.

The first is to install Node.js, you can find an installer for your platform at <a target="_blank" href="http://nodejs.org/download/">http://nodejs.org/download/</a>.

After install Node.js we will have NPM (Node Packaged Modules) available, NPM allows us to install packages, all packages available are listed in <a target="_blank" href="https://www.npmjs.org">https://www.npmjs.org</a>. Right now there are almost 80,000 packages and one of them is Grunt.

Now we have to install the package <a target="_blank" href="https://www.npmjs.org/package/grunt-cli">grunt-cli</a>, grunt-cli is a command line interface to interact with grunt. Use the following command to install it.

```
npm install grunt-cli -g
```

The -g option indicates that the package will be install in overall system instead of local.

Now to install the <a target="_blank" href="https://www.npmjs.org/package/grunt">grunt</a> package to execute tasks we have two options.

### Defining package.json

In our application we need to create a file named *package.json* that will read by the npm command:

```
{
  "name": "example-project",
  "version": "0.1.0",
  "devDependencies": {
    "grunt": "~0.4.1"
  }
}
```

Then run the command:

```
$ npm install
```

The previous command will read and process the package.json file; installing grunt and his dependencies. Generating an output similar to the following list:

```
grunt@0.4.5 node_modules/grunt
├── which@1.0.5
├── dateformat@1.0.2-1.2.3
├── eventemitter2@0.4.13
├── getobject@0.1.0
├── rimraf@2.2.8
├── colors@0.6.2
├── hooker@0.2.3
├── async@0.1.22
├── grunt-legacy-util@0.2.0
├── exit@0.1.2
├── lodash@0.9.2
├── coffee-script@1.3.3
├── underscore.string@2.2.1
├── iconv-lite@0.2.11
├── nopt@1.0.10 (abbrev@1.0.5)
├── minimatch@0.2.14 (sigmund@1.0.0, lru-cache@2.5.0)
├── grunt-legacy-log@0.1.1 (underscore.string@2.3.3, lodash@2.4.1)
├── findup-sync@0.1.3 (lodash@2.4.1, glob@3.2.11)
├── glob@3.1.21 (inherits@1.0.0, graceful-fs@1.2.3)
└── js-yaml@2.0.5 (esprima@1.0.4, argparse@0.1.15)
```

Grunt and his dependencies remain within the node_modules folder and our directory tree will be similar to the following list:

```
$ tree -L 3
.
├── node_modules
│   └── grunt
│       ├── CONTRIBUTING.md
│       ├── LICENSE-MIT
│       ├── README.md
│       ├── appveyor.yml
│       ├── internal-tasks
│       ├── lib
│       ├── node_modules
│       └── package.json
└── package.json
```

### Generate dependencies in package.json

If you do not know which version of Grunt we need, we can request to NPM to auto generated grunt dependencies and store in package.json file. We have to create a create a generic package.json file as shown below:

```
{
  "name": "example-project",
  "version": "0.1.0",
  "devDependencies": {
  }
}
```

Now run the installation of grunt informing we want auto generate dependencies as shown in the following command:

```
$ npm install grunt --save-dev
```

After installing grunt and his dependencies our archive package.json will look similar to below:

```
{
  "name": "example-project",
  "version": "0.1.0",
  "devDependencies": {
    "grunt": "^0.4.5"
  }
}
```

## How to create Grunt Tasks.

At this point we have everything you need to start building tasks you want to use, the first thing to do is create a Gruntfile.js file to define the tasks to automate.

Let's check a minimum file Grunt.

```
'use strict';
 
module.exports = function (grunt) {
 
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
    });
 
    // Where we tell Grunt we plan to use some plug-ins.
    //grunt.loadNpmTasks('grunt-contrib-xxxx');
 
 
    // Where we tell Grunt what to do when we type "grunt" into the terminal.
    //grunt.registerTask('default', ['xxxx']);
};
```
As seen the file has 3 sections.

- Initconfig: In this area we define tasks to be execute by Grunt
- LoadNpmTask: You should make a proper load plugin for the tasks we wish to define.
- RegisterTask: We must register the tasks to be run, they can be less than defined tasks.


### Install Grunt plugin.

As an example we will install the plugin <a target="_blank" href="https://github.com/gruntjs/grunt-contrib-concat">concat</a> to merge files, run the following command inside the folder of your project.

```
$ npm install grunt-contrib-concat --save-dev
```

The option - save-dev  amending package.json to add the dependency in file.

### Plugin usage.

With the plugin concat installed, now we just have to configure in Gruntfile.js file as shown below.

```
'use strict';
 
module.exports = function (grunt) {
 
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            dist: {
                src: [
                    'js/libs/*.js', // All JS in the libs folder
                    '/js/global.js'  // This specific file
                ],
                dest: '/js/build/production.js',
            }
        }
    });
 
    // Where we tell Grunt we plan to use some plug-ins.
    grunt.loadNpmTasks('grunt-contrib-concat');
 
    // Where we tell Grunt what to do when we type "grunt" into the terminal.
    grunt.registerTask('default', ['concat']);
};
```

With this definition we indicate where the files are and where we want the concatenate file be stored, then we load the NPM package and finally register the task.

As you can see on the origin of the files to be concatenated we can use the special character * to define a large group of files.

### Execute task.

To run the task we just use one of the following commands:

```
$ grunt
 
$ grunt concat
```

The first command runs all available tasks and the second specifies the concat task, as we only have one tasks the result will be the same and we will get an output similar to the following.

```
Running "concat:dist" (concat) task
File "web/js/build/production.js" created.
 
Done, without errors.
```

We can continue increasing our tasks, for instance use output of concat to add a task to minify the file.

All depends on what you need, the limit are  plugins available in grunt (nearly 3,000) and the needs of your project.

I hope you have been to his liking.
