#!/bin/bash
# Script requires npm, bower and grunt
# If you are on a less shit system (e.g. Linux) then sudo may not be needed for the npm commands

bower install

sudo npm install grunt-bowercopy --save-dev

grunt bowercopy
