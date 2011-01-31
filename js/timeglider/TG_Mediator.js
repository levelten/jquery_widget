/*
* Timeglider jQuery plugin Timeglider
* jquery.timeglider.js
* http://timeglider.com/jquery
*
* © 2010 Timeglider / Mnemograph LLC
* Author: Michael Richardson
* Licences are still to be determined : )
*
*/

/*******************************
TIMELINE MEDIATOR
handles timeline behavior, 
reflects state back to view

********************************/

(function(tg){
  

  var TGDate = tg.TGDate;
  var options = {};

  // MOVE THIS TO Models
  tg.TimegliderTimeline = function (data) {
    return data;
  }
    
  tg.TimegliderMediator = function (wopts) {
    
    // broadcast wires
    this.options = options;
    options = wopts;
    this.anonEventId = 0;
    this._focusDate = {};
    this._zoomInfo = {};
    this._ticksReady = false;
    this._ticksArray = [];
    this._startSec = 0;
    this._activeTimelines = [];
    this.max_zoom = 100;
    this.min_zoom = 1;
    this.gesturing = false;
    this.gestureStartZoom = 0;
    this.filterObject = {};

    this.eventPool = [],
    this.timelinePool = {};


    } // end model head
    

tg.TimegliderMediator.prototype = {

/*
TODO
Put this stuff into backbone collection of TimelineModel() instances
*/
loadTimelineData : function (src) {

  var M = this; // model ref
  var ct = 0;

  jQuery.getJSON(src, function(data){
    var dl = data.length, ti = {}, t = {};

    for (var i=0; i<dl;i++) {

      t = new timeglider.TimegliderTimeline(data[i]); // the timeline		

      ti = M.chewTimeline(t, true); // indexed, etc
      if (t.id.length > 0) { ct++; }// at least one timeline was loaded
      M.swallowTimeline(ti);	
    }

    if (ct === 0) { 
      alert("ERROR loading data @ " + src + ": Check JSON with jsonLint"); 
    } else {
      M.setInitialTimelines();
    }

    }); // end getJSON


  },

  /*
  * objectifies string dates
  * creates hashbase of events indexed by unit serial

TODO ==> re-chew function for renewing stuff like startSeconds, etc
==> move to Timeline really needs to be it's own class with methods...
*/
    chewTimeline : function (tdata, init) {

      // TODO ==> add additional units
      var dhash                       = {"da":[], "mo":[], "ye":[], "de":[], "ce":[], "thou":[], 
                                          "tenthou":[], "hundredthou":[], "mill":[], "tenmill":[], "hundredmill":[],
                                          "bill":[]};
      var units                       = TGDate.units; 
      tdata.startSeconds              = [];
      tdata.endSeconds                = [];
      tdata.spans                     = [];

      // TODO: VALIDATE COLOR, centralize default color(options?)
      if (!tdata.color) { tdata.color = "#333333"; }

      if (tdata.events) {

        var date, ev, id, unit, ser, tWidth;
        var l = tdata.events.length;

        for(var ei=0; ei< l; ei++) {

          ev=tdata.events[ei];
          // id = ev.id;
          if (ev.id) { 
            // TODO :: make sure it's unique... append with timeline id?
            id = ev.id 
          } else { 
            ev.id = id = "anon" + this.anonEventId++; 
          }

          //  objects will include seconds, rata die
          //  done coupled so end can validate off start
          var startEnd = TGDate.validateEventDates(ev.startdate,ev.enddate);

          ev.startdateObj = startEnd.s; // TGDate.makeDateObject(ev.startdate);
          ev.enddateObj = startEnd.e; // TGDate.makeDateObject(ev.enddate);

          
          // default icon
          ev.icon = options.icon_folder + (ev.icon || "triangle_orange.png");          
          ev.titleWidth = tg.getStringWidth(ev.title) + 20;
          
          if (ev.image) {
            if (!ev.image_class) { 
              ev.image_class = "layout"; 
              // get image size?
              ev.image_size = tg.getImageSize(ev.image);
              debug.log("image height:" + ev.image_size.height);
              }
          }

          // microtimeline for collapsed view and other metrics
          tdata.startSeconds.push(ev.startdateObj.sec);
          tdata.endSeconds.push(ev.enddateObj.sec);

          // time span?
          if (ev.enddateObj.sec > ev.startdateObj.sec) {
            ev.span =true;
            tdata.spans.push({id:ev.id, start:ev.startdateObj.sec, end:ev.enddateObj.sec})
          } else {
            ev.span = false;
          }
          //// !! TODO VALIDATE DATE respecting startdate, too
          var uxl=units.length;
          for (var ux=0; ux < uxl; ux++) {
            unit = units[ux];
            ///// DATE HASHING in action 
            ser = TGDate.getTimeUnitSerial(ev.startdateObj, unit);
            if (dhash[unit][ser] !== undefined) {
              dhash[unit][ser].push(id);
            } else {
              // create the array
              dhash[unit][ser] = [id];
            }
            ///////////////////////////////
          } 

          // add*modify indexed pool
          this.eventPool["ev_" + id] = ev;

          }// end cycling through timeline's events

          // adding event secs to catalog of entire timeline
          var allsec = jQuery.merge(tdata.startSeconds,tdata.endSeconds);
          var fl = timeglider.getLowHigh(allsec);
          /// bounds of timeline
          tdata.bounds = {"first": fl.low, "last":fl.high };

      } /// end if there are events!

      // bypass hashing if ! events
      if (init === true) {
        tdata.display = "expanded";
      }

      tdata.dateHash = dhash;

      return tdata;
    },


    /* Makes an indexed array of timelines */
    swallowTimeline : function (obj) {
      this.timelinePool[obj.id] = obj;	
      jQuery.publish("mediator.timelineListChangeSignal");
    },

    ///  end of methods that need to go into (backbone) data model
    ///////////////////////////

    /* TODO: turn to $each, adding to activeTimelines:
    i.e. could be more than one 
    */
    setInitialTimelines : function () {
      var me = this;
      var tid = this.initial_timeline_id;
      if (tid) {
        setTimeout(function () { 
          me.toggleTimeline(tid);
          }, 500);
        }
      },

      refresh : function () {
        jQuery.publish("mediator.refreshSignal");
      },

      // !!!TODO ---- get these back to normal setTicksReady, etc.
      setTicksReady : function (bool) {
        this._ticksReady = bool;
        if (bool === true) { 
          jQuery.publish("mediator.ticksReadySignal");
          }
      },

      getTicksReady : function () {
        return this._ticksReady;
      },

      getFocusDate : function () {
        return this._focusDate;
      },

      setFocusDate : function (fd) {
        // !TODO :: VALIDATE FOCUS DATE
        if (fd != this._focusDate && "valid" == "valid") {
          // "fillout" function which redefines fd ?
          fd.mo_num = TGDate.getMonthNum(fd); 
          fd.rd = TGDate.getRataDie(fd);      
          fd.sec = TGDate.getSec(fd);

          this._focusDate = fd; 

        }
      },

      getZoomLevel : function () {
        return Number(this._zoomLevel);
      },


      /*	This is the setter for
      other zoomInfo attributes : width, label, tickWidth
      @param z ==> integer from 1-100, other zoom info comes from zoomTree array
      */
      setZoomLevel : function (z) {

        if (z <= this.max_zoom && z >= this.min_zoom) {

          // focusdate has to come first for combined zoom+focusdate switch
          this._startSec = this._focusDate.sec;
          // output ("startsec:" + this._startSec, "note");

          if (z != this._zoomLevel) {
            this._zoomLevel = z;
            this._zoomInfo = timeglider.zoomTree[z];
            
            jQuery.publish("mediator.zoomLevelChange");
            
          }

          output("z:" + this._zoomLevel + " / " + this._zoomInfo.label, "zoomlevel");

          // end min/max check
          } else { return false; }

        }, 


        getZoomInfo : function () {
          return this._zoomInfo;
        },
        
        /*
        
        */
        setFilterObject : function (obj) {
           this.filterObject = {include:obj.include, exclude:obj.exclude}
           jQuery.publish("mediator.filterObjectChange");
           this.refresh();      
         },
         

        setGestureStart : function () {
          alert("z:" + this.getZoomLevel());
          this.gestureStartZoom = this.getZoomLevel();
        },

        getTicksOffset : function () {
          return this._ticksOffset;
        },


        setTicksOffset : function (newOffset) {
          // This would be the same as the focus date...
          // main listener hub for date focus and tick-appending
          this._ticksOffset = newOffset;
          /* In other words, ticks are being dragged! */
          jQuery.publish( "mediator.ticksOffsetChange" );
        },


        getTickBySerial : function (serial) {
          var ta = this._ticksArray,
          tal = ta.length;
          for (var t=0; t<tal; t++) {
            var tick = ta[t];
            if (tick.serial == serial) { return tick; }
          }
          return false;
        },

        /*
        *	@param obj -----  
        *		serial: #initial tick
        *		type:init|l|r
        *		unit:ye | mo | da | etc
        *		width: #px
        *		left: #px
        *	@param focusDate ----
        *		used for initial tick; others set off init
        */
        addToTicksArray : function (obj, focusDate) {

          if (obj.type == "init") {
            // CENTER
            obj.serial = TGDate.getTimeUnitSerial(focusDate, obj.unit);
            this._ticksArray = [obj];
          } else if (obj.type == "l") {
            // LEFT
            obj.serial = this._ticksArray[0].serial - 1;
            this._ticksArray.unshift(obj);
          } else {
            // RIGHT SIDE
            obj.serial = this._ticksArray[this._ticksArray.length -1].serial + 1;
            this._ticksArray.push(obj);
          }


          // this.ticksArrayChange.broadcast();
          jQuery.publish( "mediator.ticksArrayChange" );
          
          return obj.serial;
        },


        toggleTimeline : function (id) {

          var lt = this.timelinePool[id];
          var ia = jQuery.inArray(id, this._activeTimelines);

          if (ia == -1) {
            // not active ---- bring it on and focus to it
            this._activeTimelines.push(id);

            // setting FD does NOT refresh automatically
            this.setFocusDate(TGDate.makeDateObject(lt.focus_date));
            // resetting zoomLevel DOES refresh
            this.setZoomLevel(lt.initial_zoom);

          } else {
            // it's active, remove it
            this._activeTimelines.splice(ia,1);
            this.refresh();
          }

          jQuery.publish( "mediator.activeTimelinesChange" );


        }


        }; ///// end model methods
        
        
        tg.getLowHigh = function (arr) {

        	var i, n, 
        		high = parseFloat(arr[0]), 
        		low = high;

        	for (i=0; i<arr.length; i++) {
        		n = parseFloat(arr[i]);
        		if (n<low) low = n;
        		if (n>high) high = n;
        	}

        	return {"high":high, "low":low}

        };
        
   
        /* a div with id of "hiddenDiv" has to be pre-loaded */
        tg.getStringWidth  = function (str) {
        		// var size = obj.fontSize; 
        		var $ms = jQuery("#TimegliderMeasureSpan").html('');
        		$ms.html(str + "");
        		var w = $ms.width() + 4;
        		$ms.html('');
        		return w;
        };
        
        tg.getImageSize = function (img) {
            // var size = obj.fontSize; 
        		var $ms = jQuery("#TimegliderMeasureSpan").html('');
        		$ms.append("<img id='test_img' src='" + img + "'>");
        		var w = jQuery("#test_img").width();
        		var h = jQuery("#test_img").height();
        		$ms.html('');
        		
        		return {width:w, height:h};
        }
        
        
        // DORMANT
        tg.validateOptions = function (widget_settings) {	
            
            this.optionsMaster = { initial_focus:{type:"date"}, 
          	editor:{type:"string"}, 
          	backgroundColor:{type:"color"}, 
          	backgroundImage:{type:"color"}, 
          	min_zoom:{type:"number", min:1, max:100}, 
          	max_zoom:{type:"number", min:1, max:100}, 
          	initial_zoom:{type:"number", min:1, max:100}, 
          	show_centerline:{type:"boolean"}, 
          	data_source:{type:"url"}, 
          	basic_fontsize:{type:"number", min:9, max:100}, 
          	mouse_wheel:{type:"string", 
          	possible:["zoom","pan"]}, 
          	initial_timeline_id:{type:"string"} }

        		var me = this;
        			// msg: validates when empty 
        			msg = "",
        			// line break: /n for alert, <br> for html modal
        			lb = "\n";

        		jQuery.each(widget_settings, function(key, value) {

        			if (me.optionsMaster[key]) {
        				//trace ("key:" + key + ", type:" + optionsTypes[key].type);
        				switch (me.optionsMaster[key].type) {
        					case "string": 
        						if (typeof value != "string") { msg += (key + " needs to be a string." + lb); }
        						if (me.optionsMaster[key].possible) {
        							if (jQuery.inArray(value, me.optionsMaster[key].possible) == -1) {
        								msg += (key + " must be: " + me.optionsMaster[key].possible.join(" or "));
        							}
        						}
        					break;

        					case "number":
        						if (typeof value != "number") { msg += (value + " needs to be a number." + lb); }
        						if (me.optionsMaster[key].min) {
        							if (value < me.optionsMaster[key].min) {
        								msg += (key + " must be greater than or equal to " + me.optionsMaster[key].min + lb);
        							}
        						}

        						if (me.optionsMaster[key].max) {
        							if (value > me.optionsMaster[key].max) {
        								msg += (key + " must be less than or equal to " + me.optionsMaster[key].max + lb);
        							}
        						}
        					break;

        					case "date":
        						// TODO validate a date string using TG_Date...
        					break;

        					case "boolean":
        						if (typeof value != "boolean") msg += (value + " needs to be a number." + lb);
        					break;

        					case "url":
        						// TODO test for pattern for url....
        					break;

        					case "color":
        						/// TODO test for pattern for color, including "red", "orange", etc
        					break;

        					default: trace ("is there a default for validating options?");

        				}
        			}
        		}); // end each

        		return msg;

        };

})(timeglider);