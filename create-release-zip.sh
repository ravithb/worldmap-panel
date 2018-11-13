#!/bin/bash

REV=`git rev-parse --short HEAD`
mv custom-worldmap custom-worldmap-panel-$REV
zip -r custom-worldmap-panel-$REV custom-worldmap-panel-$REV
