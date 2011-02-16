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
  
  var MED = {};
  var TGDate = tg.TGDate;
  var options = {};
  var $ = jQuery;

 
  tg.TimelineCollection = Backbone.Collection.extend({
    model: timeglider.Timeline
  });
  

  tg.TimegliderMediator = function (wopts) {
  
  
    this.options = options = wopts;
    this.timelineMenuOpen = false;
    this.anonEventId = 0;
    this._focusDate = {};
    this._zoomInfo = {};
    this._ticksReady = false;
    this._ticksArray = [];
    this._startSec = 0;
    this._activeTimelines = [];
    
    this.max_zoom = options.max_zoom;
    this.min_zoom = options.min_zoom;
    this.fixed_zoom = (this.max_zoom == this.min_zoom) ? true : false;
    this.gesturing = false;
    this.gestureStartZoom = 0;
    this.filterObject = {};

    this.eventPool = [],
    this.timelinePool = {};
    
    this.setZoomLevel(options.initial_zoom);
    this.initial_timeline_id = options.initial_timeline_id;
  
    MED = this;

    } // end mediator head
    

tg.TimegliderMediator.prototype = {

  /*
  TODO
  Put this stuff into backbone collection of TimelineModel() instances
  */
  
  /*
  * loadTimelineData
  * @param src {object} object OR json data to be parsed for loading
  * TODO: create option for XML input
  */
  loadTimelineData : function (src) {
    var M = this; // model ref
    // Allow to pass in either the url for the data or the data itself.
    if (typeof src === "object") {
      M.parseData(src);
    }
    else {
      jQuery.getJSON(src, function(data){
        M.parseData(data);
      }); // end getJSON
    }
  },

  /*
  * parseData
  * @param data {object} Multiple (1+) timelines object derived from data in loadTimelineData
  */
  parseData : function (data) {
    var M = this; // model ref
    var ct = 0;
    var dl = data.length, ti = {}, ondeck = {};

    for (var i=0; i<dl;i++) {
      ondeck = data[i];
      ondeck.mediator = M;
      ti = new timeglider.Timeline(ondeck).toJSON(); // the timeline
    
    if (ti.id.length > 0) {ct++;}// at least one timeline was loaded
      // put the Model into a "collection"
      // TODO: create Backbone collection
      M.swallowTimeline(ti);
    }

    if (ct === 0) {
      alert("ERROR loading data: Check JSON with jsonLint");
    } else {
      M.setInitialTimelines();
    }
  },



    /* Makes an indexed array of timelines */
    swallowTimeline : function (obj) {
      this.timelinePool[obj.id] = obj;	
      $.publish("mediator.timelineListChangeSignal");
    },

    ///  end of methods that need to go into (backbone) data model
    ///////////////////////////

    /* TODO: turn to $each, adding to activeTimelines:
    i.e. could be more than one 
    */
    setInitialTimelines : function () {
      debug.log("setInitialTimelines...");
      var me = this;
      var tid = this.initial_timeline_id;
      if (tid) {
        setTimeout(function () { 
          me.toggleTimeline(tid);
          }, 1000);
        }
      },

      refresh : function () {
        $.publish("mediator.refreshSignal");
      },

      // !!!TODO ---- get these back to normal setTicksReady, etc.
      setTicksReady : function (bool) {
        this._ticksReady = bool;
        
        if (bool === true) { 
          $.publish("mediator.ticksReadySignal");
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


      /* 
      *  setZoomLevel
      *  This in turn sets other zoomInfo attributes : width, label, tickWidth
      *  Other zoom info comes from the zoomTree array
      *  @param z ==> integer from 1-100
      *  
      */
      setZoomLevel : function (z) {
        if (isNaN(z)) { debug.log("zoom level NaN"); return false; }
          
        if (z <= this.max_zoom && z >= this.min_zoom) {
          
          // focusdate has to come first for combined zoom+focusdate switch
          this._startSec = this._focusDate.sec;

          if (z != this._zoomLevel) {
            this._zoomLevel = z;
            this._zoomInfo = timeglider.zoomTree[z];
            debug.log("publishing zoomLevelChange !!");
            $.publish("mediator.zoomLevelChange");
            
          }
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
           $.publish("mediator.filterObjectChange");   
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
          $.publish( "mediator.ticksOffsetChange" );
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
          $.publish( "mediator.ticksArrayChange" );
          
          return obj.serial;
        },


        toggleTimeline : function (id) {
          var lt = this.timelinePool[id];
          var ia = $.inArray(id, this._activeTimelines);

          if (ia == -1) {
            // The timeline is 
            // not active ---- bring it on
            this._activeTimelines.push(id);
            // setting FD does NOT refresh
            this.setFocusDate(TGDate.makeDateObject(lt.focus_date));
            // resetting zoomLevel DOES refresh
            this.setZoomLevel(lt.initial_zoom);
            
          } else {
            // it's active, remove it
            this._activeTimelines.splice(ia,1);
            this.refresh();
          }
          // this will change the menu list/appearance
          $.publish( "mediator.activeTimelinesChange" );

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
        		var $ms = $("#timeglider-measure-span").html('');
        		$ms.html(str + "");
        		var w = $ms.width() + 4;
        		$ms.html('');
        		return w;
        };
        
        tg.getImageSize = function (img) {
            // var size = obj.fontSize; 
        		var $ms = $("#timeglider-measure-span").html('');
        		$ms.append("<img id='test_img' src='" + img + "'>");
        		var w = $("#test_img").width();
        		var h = $("#test_img").height();
        		$ms.html('');
        		
        		return {width:w, height:h};
        }
        
        
        tg.validateOptions = function (widget_settings) {	
            
            this.optionsMaster = { initial_focus:{type:"date"}, 
            	editor:{type:"string"}, 
            	backgroundColor:{type:"color"}, 
            	backgroundImage:{type:"color"}, 
            	min_zoom:{type:"number", min:1, max:100}, 
            	max_zoom:{type:"number", min:1, max:100}, 
            	initial_zoom:{type:"number", min:1, max:100}, 
            	show_centerline:{type:"boolean"}, 
            	display_zoom_level:{type:"boolean"}, 
            	data_source:{type:"url"}, 
            	basic_fontsize:{type:"number", min:9, max:100}, 
            	mouse_wheel:{type:"string", 
            	possible:["zoom","pan"]}, 
            	initial_timeline_id:{type:"string"}
          	}
          	
        		// msg: will be return value: validates when empty 
        		// change lb to <br> if the error is returned in HTML (vs alert())
        		var me = this, msg = "", lb = "\n";

        		$.each(widget_settings, function(key, value) { 

        			if (me.optionsMaster[key]) {

        				switch (me.optionsMaster[key].type) {
        					case "string": 
        						if (typeof value != "string") { msg += (key + " needs to be a string." + lb); }
        						if (me.optionsMaster[key].possible) {
        							if ($.inArray(value, me.optionsMaster[key].possible) == -1) {
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

        				}
        			}
        		}); // end each

        		return msg;

        };
        
        

})(timeglider);