#!/bin/sh

#./compile.sh

# does not include jquery or jquery UI!!

java -jar compiler.jar --js js/underscore-min.js --js js/backbone-min.js --js js/ba-debug.min.js --js js/jquery.tmpl.min.js --js js/jquery.mousewheel.min.js --js js/jquery.ui.ipad.js --js js/raphael-min.js --js js/glob/jquery.glob.min.js --js js/ba-tinyPubSub.js --js js/timeglider/TG_Date.js --js js/timeglider/TG_Org.js --js js/timeglider/TG_timeline.js  --js js/timeglider/TG_TimelineView.js --js js/timeglider/TG_Mediator.js --js js/timeglider/timeglider.timeline.widget.js --js_output_file js/timeglider-0.0.1.min.js
