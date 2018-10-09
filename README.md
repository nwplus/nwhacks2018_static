# nwhacks2018_static
This is the website, registration and check-in system for nwHacks 2018. https://2018.nwhacks.io

## Setup
1. Clone/fork the repository.
2. Run `bower install` in main directory.

## Preview Changes
If you want to preview the changes you made, you should run it locally.

To do this, run `http-server` in the main directory.

## Build Changes
After making a change, you will have to run the build process for them to go live.
1. To do this, run `make` from the main directory.
2. This will compile the site into the `build/default` directory and will automatically copy the files from that directory to the `docs` directory. 
This is important because the `docs` directory contains the files that are pushed live.

If you have made a change but are having trouble building the changes, feel free to submit a pull request anyway and we can just build the changes locally on our machines.

## Style Guide

### Javascript

Our Javascript mostly follows the "Javascript Standard Style". New code should be written in it, and old code should be updated as you come across it. You can view all rules at https://standardjs.com/rules.html.

### Polymer

Polymer code should be written using the ES6 class based style. This is default for Polymer 2.0. See https://www.polymer-project.org/2.0/docs/devguide/registering-elements for more details.
