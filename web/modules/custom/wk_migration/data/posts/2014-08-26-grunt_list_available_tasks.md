---
layout: post
title: Grunt How to list available tasks
description: "Add plugin to Grunt to list available tasks."
categories: [articles]
tags: [Github, BitBucket, TOC, Node.js]
draft: false
---
In the blog entry <a href="{{ site.url }}/articles/2014/06/18/introduction-to-grunt/">Introduction to Grunt</a> I  explained how we could use Grunt to automate tasks, but the only way to detect the available tasks is review the Gruntfile.js file or perform the tasks, but it's not be a good idea execute tasks that do not know what they do .

Fortunately there is a plugin that allows  Grunt toe review tasks available, this plugin is <a href="https://github.com/ben-eb/grunt-available-tasks">grunt-available-tasks</a>. Lets see how we can implement it in our  project.

#Install plugin.

The first thing to do is install the plugin available-tasks running assuming you have npm installed just execute the following command.

```
$ npm install grunt-available-tasks --save-dev
```

The above command will add the respective dependency in your package.json file and you will get a similar entry to the following file.

```
"grunt-available-tasks":"0.5.0"
```

#Add task to Grunt.

Having as base the file **Gruntfile.js** created in previous entry "Introduction to Grunt" we will include the necessary configuration to add the task to list the available tasks as shown below.

```
availabletasks: {
  tasks: {
    options: {
      filter: 'exclude',
      tasks: ['availabletasks', 'tasks']
    }
  }              
},
```

The above action registers the configuration for the plugin **available-tasks** indicating that we want to exclude from the list of tasks "availabletasks" and "tasks " the last one  is an alias to configure later.

#Load the plugin.

In order to execute the comand availabletasks/tasks we have load the plugin with the following settings Gruntfile.js close the end of file as shown in the following listing

```
grunt.loadNpmTasks('grunt-available-tasks');
```

#Register the task.

Finally lets register the task using an alias to facilitate their implementation, for which we just add the following code at the end of the configuration file.

```
grunt.registerTask('tasks', ['availabletasks']);
```

#Run the command

At this point we could get the tasks available and should just run the following command.

```
$ grunt tasks
```

The above command would get an output  similar to the following image.

<img src="{{ site.url }}/assets/img/grunt-tasks.png"/>

The image above was executed within the project <a href="https://github.com/enzolutions/community-bookstore">Community Bookstore</a>. See the full configuration file at <a href="https://github.com/enzolutions/community-bookstore/blob/master/frontend/Gruntfile.js">https://github.com/enzolutions/community-bookstore/blob/master/frontend/Gruntfile.js</a>.

I hope you have been to his liking.
