/*
* TG_Org
* @constructor
*
*
*/

(function(tg){

  tg.levelHeight = 8; // across view and org
  var lev_ht = tg.levelHeight; // local
  var $ = jQuery;
   /*
    * @constructor
  */
  tg.TGOrg = function() {

    this.blocks = [];
    this.ids = [];
    this.vis = [];
    this.tree = [];
    var me = this;
 

    /// TODO::: REMOVE BLOCK (i.e. to/from same arrangement);
   
   
    /*
    * ******** PUBLIC METHODS **********
    */
  
    
    /*
    * TGOrg.addBlock
    * Adds a 2D geometric block object, corresponding to an event
    * into the "borg" layout.
    * 
    * @param {object} evob Event object including position values: left, width, top, height
                           -- no need for right and bottom
    * @param {string/number} tickScope This either "sweep" or the serial of a single tick (Number)
    * 
    */
    this.addBlock = function (evob, tickScope) {
       evob.right = evob.left + evob.width;
       evob.bottom = evob.top + evob.height;
       evob.tickScope = tickScope;
       me.blocks.push(evob);
    };
    
    
    /*
    * TGOrg.getBorg
    *
    * @return {object} This particular "borg" object with its blocks, etc
    * 
    */
    this.getBorg = function () {
      return this;
    };

    /*
    * TGOrg.getBlocks
    * 
    * @return {array} An array of placement blocks (objects), each corresponding
    *                 to an event on the timeline.
    * 
    */
    this.getBlocks = function () {
      return this.blocks;
    };

    /*
    * TGOrg.getHTML
    * @param {string/number} tickScope This either "sweep" or the serial of a single tick (Number)
    * @return {string} HTML with events passed back to view for actual layout of timeline
    */
    this.getHTML = function (tickScope) {
      if (tickScope == "sweep") { 
        freshTree();
        this.vis = [];
      }
      
      var level_tree = me.tree;

      this.blocks.sort(sortBlocksByImportance);
      // cycle through events and move overlapping event up
      
      var positioned = [], blHeight, lastPos, padding = 6,
      span_selector_class, span_div, img = "", html = '', b = {},
      blength = this.blocks.length, title_adj = 0;
      
      for (var i=0; i<blength; i++) {
        b = this.blocks[i];

        if (b.tickScope == tickScope) {

          if (jQuery.inArray(b.id, this.vis) == -1) {
            this.vis.push(b.id);
            
            // if it has an image, it's either in "layout" mode (out on timeline full size)
            // or it's going to be thumbnailed into the "bar"
            title_adj = 0;
            if (b.image) {
              if (b.image_class == "layout") {
                title_adj = b.image_size.height + 4;
              }
              img = "<div class='timeglider-event-image-" + b.image_class + "'><img src='" + b.image + "'></div>";
            } else {
              // no image at all
              img = "";
            } 
      
            // starts out checking block against the bottom layer
            checkAgainstLevel(b, 0);
           
            b.fontsize < 10 ? b.opacity = b.fontsize / 10 : b.opacity=1;
            if (b.span == true) {
              span_selector_class = "timeglider-event-spanning";
              span_div = "<div class='timeglider-event-spanner' style='height:" + b.fontsize + "px;width:" + b.spanwidth + "px'></div>"
            } else {
              span_selector_class = ""; 
              span_div = "";
            }
            
            if (b.y_position > 0) {
              debug.log("y positon > 0:" + b.y_position);
              b.top = -1 * b.y_position;
            }

            html += "<div class='timeglider-timeline-event " + span_selector_class + "' id='ev_" + b.id + "' "
            + "style='width:" + b.width  + "px;"
            + "height:" + b.height + "px;"
            + "left:" + b.left  + "px;" 
            + "opacity:" + b.opacity + ";"
            + "top:" + b.top + "px;"
            + "font-size:" + b.fontsize  + "px;'>"
            + "<img class='timeglider-event-icon' src='" + b.icon + "' style='height:"
            + b.fontsize + "px;left:-" + (b.fontsize + 2) + "px; top:" + title_adj + "px'>" + img + span_div 
            + "<div class='timeglider-event-title' style='top:" + title_adj + "px'>" 
            + b.title
            + "</div></div>";
            

            } // end check for visible... EXPENSIVE!!!!
            } // end tickScope check
            } // end for()

            return html;
  }; /// end getHTML



  /*
  * freshTree
  * Wipes out the old tree and sets up 100 empty levels
  */
   var freshTree = function () {
     me.tree = [];
     for (var a=0; a < 300; a++) {
       // create 50 empty nested arrays for "quad tree"
       me.tree[a] = [];
     }
   };
   
   /*
   * Sorter helper for sorting events by importance
   * @param a {Number} 1st sort number
   * @param b {Number} 2nd sort number
   */
   var sortBlocksByImportance = function (a, b) {
            var x = b.importance, y = a.importance;
            /// !TODO  
            /// if either is missing or invalid,. return -1
            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
          };

  /*
   * 
   * Takes two objects and sees if the prospect overlaps with
   * an existing object [part of loop in checkAgainstLevel()]
   *
   * @param {object} b1 Timeline-event object already in place
   * @param {object} b2 Timeline-event object being added to blocks
   */       
   var isOverlapping = function (b1, b2) {
 
        if ((b2.left > b1.right) || (b2.right < b1.left)) {
          // Nice: it's clear to left or right.
          return false;

        } else {

          if (  
            ((b2.left >= b1.left) && (b2.left <= b1.right)) || 
            ((b2.right >= b1.left) && (b2.right <= b1.right)) || 
            ((b2.right >= b1.right) && (b2.left <= b1.left)) || 
            ((b2.right <= b1.right) && (b2.left >= b1.left))  
          ) {
      
            // Some kind of left-right overlap is happening...
            // passes first test of possible overlap: left-right overlap
            if (  ((b2.bottom <= b1.bottom) && (b2.bottom >= b1.top)) || ((b2.top <= b1.bottom) && (b2.top >= b1.top)) || ((b2.top == b1.bottom) && (b2.top == b1.top))  ) {
              // passes 2nd test -- it's overlapping
              return true;

            } else {
              return false;
            }
            // end first big if: fails initial test
          }  
          return false;
        }

        // return false;

    };


   var checkAgainstLevel = function (block, level_num) {
       
      var ol = false, ol2 = false, tree = me.tree,

        // level_blocks is the array of blocks at a level
        level_blocks = tree[level_num],
        next_level = level_num + 1,
        collision = false,
        brick_height = 2;
        bump_ht = lev_ht;
                
      if (level_blocks != undefined) {
        
        // Go through all the blocks on that level...
        for (var e=0; e < level_blocks.length; e++) {
    
          ol = isOverlapping(level_blocks[e],block);
          // Add more isOverlapping checks here for taller blocks
  
          if (ol == true) {
            // BUMP UP
            block.top -= bump_ht; // timeglider.levelHeight;
            block.bottom -= bump_ht; // timeglider.levelHeight;
            // THEN CHECK @ NEXT LEVEL
            
            // *** RECURSIVE ***
            checkAgainstLevel(block,next_level);
            
            collision = true;
            // STOP LOOP -- there's a collision
            break;
          } 
          } // end for

          if (collision == false) {
            // ADD TO TREE OF PLACED EVENTS
            block.top -= block.fontsize;
          
            // Place block in level
            level_blocks.push(block);
         
            // find out how many (lev_ht px) levels (bricks) the event is high
            brick_height = Math.ceil(block.height / lev_ht);
            var k=0, levToAddTo;
            
            for (k=1; k<=brick_height; k++) {
              levToAddTo = level_num + k;
              tree[levToAddTo].push(block);
            }
   
          } // end if collision if false
        
      }  // end if level_blocks != undefined
      }; // end checkAgainstLevel()
 
 
  }; ///// END TGOrg
      
      
	
})(timeglider);	